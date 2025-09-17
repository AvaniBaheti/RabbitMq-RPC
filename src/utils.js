import dotenv from 'dotenv';
dotenv.config();

export const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const RPC_REQUEST_QUEUE = process.env.RPC_REQUEST_QUEUE || 'rpc.requests';
export const RPC_REPLY_QUEUE = process.env.RPC_REPLY_QUEUE || 'rpc.replies';
export const RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS || 10000);

export const HTTP_PORT = Number(process.env.PORT || 3000);
