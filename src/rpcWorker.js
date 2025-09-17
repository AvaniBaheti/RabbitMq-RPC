import amqplib from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672';
const REQ_Q = process.env.RPC_REQUEST_QUEUE || 'rpc.requests';

function doWork(payload) {
  const n = Number(payload?.n ?? 0);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += i;
  return { echo: payload, sum };
}

(async () => {
  const conn = await amqplib.connect(AMQP_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue(REQ_Q, { durable: true });
  ch.prefetch(1);

  console.log(`[rpc-worker] waiting on ${REQ_Q}`);

  await ch.consume(REQ_Q, async (msg) => {
    if (!msg) return;
    try {
      const req = JSON.parse(msg.content.toString());
      const result = doWork(req);

      const replyTo = msg.properties.replyTo;
      const correlationId = msg.properties.correlationId;

      if (replyTo && correlationId) {
        await ch.sendToQueue(
          replyTo,
          Buffer.from(JSON.stringify(result)),
          { correlationId, persistent: true }
        );
      }
      ch.ack(msg);
    } catch (e) {
      console.error('[rpc-worker] error, dropping msg:', e);
      ch.nack(msg, false, false);
    }
  });
})();
