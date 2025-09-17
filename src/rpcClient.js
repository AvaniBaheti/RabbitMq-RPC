import amqplib from 'amqplib';
import { nanoid } from 'nanoid';
import Redis from 'ioredis';
import {
  AMQP_URL, REDIS_URL,
  RPC_REQUEST_QUEUE, RPC_REPLY_QUEUE, RPC_TIMEOUT_MS
} from './utils.js';

let channel;
const redis = new Redis(REDIS_URL);

export async function initRpcClient() {
  const conn = await amqplib.connect(AMQP_URL);
  channel = await conn.createChannel();
  await channel.assertQueue(RPC_REQUEST_QUEUE, { durable: true });
  await channel.assertQueue(RPC_REPLY_QUEUE, { durable: true });
}

export async function rpcCall(workerId, payload) {
  const correlationId = nanoid();
  const pendingKey = `rpc:pending:${correlationId}`;
  const ttl = Math.ceil(RPC_TIMEOUT_MS / 1000) + 5;

  await redis.hmset(pendingKey, { owner: String(workerId), createdAt: String(Date.now()) });
  await redis.expire(pendingKey, ttl);

  await channel.sendToQueue(
    RPC_REQUEST_QUEUE,
    Buffer.from(JSON.stringify(payload)),
    { correlationId, replyTo: RPC_REPLY_QUEUE, persistent: true }
  );

  return new Promise((resolve, reject) => {
    const sub = new Redis(REDIS_URL);
    const myChan = `worker:${workerId}`;
    const timer = setTimeout(async () => {
      try { await redis.del(pendingKey); } catch {}
      try { await sub.unsubscribe(myChan); sub.disconnect(); } catch {}
      reject(new Error('RPC timeout'));
    }, RPC_TIMEOUT_MS);

    const onMsg = async (chan, message) => {
      try {
        const msg = JSON.parse(message);
        if (msg.correlationId !== correlationId) return;
        clearTimeout(timer);
        sub.off('message', onMsg);
        await sub.unsubscribe(myChan);
        sub.disconnect();
        await redis.del(pendingKey);
        resolve(msg.data);
      } catch (e) {}
    };

    sub.subscribe(myChan, () => sub.on('message', onMsg));
  });
}
