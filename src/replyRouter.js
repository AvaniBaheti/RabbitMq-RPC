import amqplib from 'amqplib';
import Redis from 'ioredis';
import { AMQP_URL, REDIS_URL, RPC_REPLY_QUEUE } from './utils.js';

export async function startReplyRouter() {
  const redis = new Redis(REDIS_URL);
  const pub = new Redis(REDIS_URL);

  const conn = await amqplib.connect(AMQP_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue(RPC_REPLY_QUEUE, { durable: true });

  await ch.consume(RPC_REPLY_QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const correlationId = msg.properties.correlationId;
      const payload = JSON.parse(msg.content.toString());
      const pendingKey = `rpc:pending:${correlationId}`;
      const owner = await redis.hget(pendingKey, 'owner');
      if (owner) {
        await pub.publish(`worker:${owner}`, JSON.stringify({ correlationId, data: payload }));
      }
      ch.ack(msg);
    } catch {
      ch.nack(msg, false, false);
    }
  });

  return { conn, ch };
}
