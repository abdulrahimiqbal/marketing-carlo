import type { NodeTypes } from '@xyflow/react';
import { ChannelNodeCard } from './ChannelNodeCard';

/** All channel nodes render through one custom node type. */
export const nodeTypes: NodeTypes = {
  channel: ChannelNodeCard,
};
