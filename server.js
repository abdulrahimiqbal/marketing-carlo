// Tiny static server for Railway. The Campaign Canvas engine is 100% client-
// side (§3); this just serves the built SPA on the port Railway provides and
// falls back to index.html for client-side routes.
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { messageCheckHandler } from './api/message-check.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

const app = express();

// Health check for Railway.
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Optional §11 LLM message check (qualitative only; requires ANTHROPIC_API_KEY).
app.post('/api/message-check', express.json({ limit: '64kb' }), messageCheckHandler);

// Hashed asset filenames can be cached aggressively; index.html must not be.
app.use(
  express.static(distDir, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

// SPA fallback — every other route returns the app shell.
app.get('*', (_req, res) => {
  res.sendFile(join(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Campaign Canvas running on http://0.0.0.0:${PORT}`);
});
