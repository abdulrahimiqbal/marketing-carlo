// §11 — optional LLM message check. A single qualitative call, distinct from
// the (v2) behavioral agent swarm. Given a draft organic post it returns who it
// resonates with, the top misread risk, and one sharper rewrite. Output is
// QUALITATIVE ONLY — it must never produce or modify any numbers. The API key
// stays server-side (this runs on Railway, not in the client bundle).
import Anthropic from '@anthropic-ai/sdk';

// Default to the most capable model; override with ANTHROPIC_MODEL if desired.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

const MAX_DRAFT_CHARS = 4000;

// Structured output guarantees valid, parseable JSON in exactly this shape.
const SCHEMA = {
  type: 'object',
  properties: {
    resonatesWith: {
      type: 'string',
      description:
        'Who this message most likely resonates with — the audience it actually speaks to, which may be narrower than intended.',
    },
    topMisreadRisk: {
      type: 'string',
      description:
        'The single biggest misread risk — the most likely way a skeptic or the wrong audience misinterprets this.',
    },
    sharperRewrite: {
      type: 'string',
      description:
        "One sharper rewrite of the post that keeps the author's voice but tightens the message.",
    },
  },
  required: ['resonatesWith', 'topMisreadRisk', 'sharperRewrite'],
  additionalProperties: false,
};

const SYSTEM = `You are a sharp, honest marketing copy critic helping an early-stage founder sanity-check a launch post before they publish it.

Given a draft post for a specific channel, return three things:
1. resonatesWith — who the message most likely resonates with (be specific about the actual audience it speaks to, which is often narrower than the author intends).
2. topMisreadRisk — the single biggest way the message could be misread or fall flat (the most likely misinterpretation by a skeptic or the wrong audience).
3. sharperRewrite — one tighter rewrite that keeps the author's voice and intent but lands harder.

Be specific and concrete. Do not give generic praise. This is a qualitative gut-check ONLY: never estimate, predict, invent, or mention any numbers, metrics, reach, impressions, follower counts, conversion rates, or performance figures of any kind. No quantitative claims whatsoever.`;

export async function messageCheckHandler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'not_configured',
      message:
        'Message check is not enabled on this deployment. Set ANTHROPIC_API_KEY on the server to turn it on.',
    });
  }

  const draft = typeof req.body?.draft === 'string' ? req.body.draft.trim() : '';
  const channel =
    typeof req.body?.channel === 'string' && req.body.channel.trim()
      ? req.body.channel.trim().slice(0, 80)
      : 'organic social post';

  if (draft.length < 10) {
    return res
      .status(400)
      .json({ error: 'invalid_input', message: 'Paste a draft post (at least a sentence) to check.' });
  }
  if (draft.length > MAX_DRAFT_CHARS) {
    return res.status(400).json({
      error: 'too_long',
      message: `Draft is too long — keep it under ${MAX_DRAFT_CHARS} characters.`,
    });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Channel: ${channel}\n\nDraft post:\n"""\n${draft}\n"""`,
        },
      ],
      // Structured outputs (GA on Opus 4.8 / Sonnet 4.6 / Haiku 4.5).
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    });

    // Always check the refusal stop reason before reading content.
    if (response.stop_reason === 'refusal') {
      return res
        .status(422)
        .json({ error: 'refused', message: 'The model declined to analyze this draft.' });
    }

    const text = response.content.find((b) => b.type === 'text')?.text;
    if (!text) {
      return res.status(502).json({ error: 'no_output', message: 'No analysis was returned. Try again.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res
        .status(502)
        .json({ error: 'parse_error', message: 'Could not parse the analysis. Try again.' });
    }

    return res.json({
      resonatesWith: String(parsed.resonatesWith ?? ''),
      topMisreadRisk: String(parsed.topMisreadRisk ?? ''),
      sharperRewrite: String(parsed.sharperRewrite ?? ''),
      model: response.model,
    });
  } catch (err) {
    // Typed SDK exceptions — most specific first.
    if (err instanceof Anthropic.RateLimitError) {
      return res
        .status(429)
        .json({ error: 'rate_limited', message: 'Rate limited by the API — try again in a moment.' });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return res
        .status(500)
        .json({ error: 'auth', message: 'The server API key is invalid or missing permissions.' });
    }
    if (err instanceof Anthropic.APIError) {
      return res
        .status(502)
        .json({ error: 'api_error', message: `Message check failed (HTTP ${err.status}).` });
    }
    // eslint-disable-next-line no-console
    console.error('message-check error:', err);
    return res.status(500).json({ error: 'unknown', message: 'Message check failed unexpectedly.' });
  }
}
