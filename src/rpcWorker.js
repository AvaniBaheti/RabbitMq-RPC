import amqplib from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672';
const REQ_Q    = process.env.RPC_REQUEST_QUEUE || 'rpc.requests';
const PREFETCH = Number(process.env.RPC_PREFETCH || 1); 

const sleep = (ms) => new Promise(r => setTimeout(r, ms));


async function doWork(payload) {
  const action = (payload?.action || 'sum').toLowerCase();

  switch (action) {
    case 'uppercase': {
      const text = String(payload?.text ?? '');
      await sleep(300); 
      return { action, text, upper: text.toUpperCase() };
    }

    case 'sum':
    default: {
      const n = Number(payload?.n ?? 0);
      let sum = 0;
      for (let i = 0; i < n; i++) sum += i;
      await sleep(300); 
      return { action: 'sum', echo: payload, sum };
    }
  }
}

(async () => {
  const conn = await amqplib.connect(AMQP_URL);
  const ch = await conn.createChannel();

  await ch.assertQueue(REQ_Q, { durable: true });

  ch.prefetch(PREFETCH);

  console.log(`[rpc-worker] connected. Waiting on "${REQ_Q}" (prefetch=${PREFETCH})`);

  await ch.consume(REQ_Q, async (msg) => {
    if (!msg) return;

    const startedAt = Date.now();
    const correlationId = msg.properties.correlationId;
    const replyTo = msg.properties.replyTo;

    try {
      const reqStr = msg.content.toString();
      const req = JSON.parse(reqStr);

      console.log(`[rpc-worker] ↘ received cid=${correlationId} payload=`, req);

      const result = await doWork(req);

      if (replyTo && correlationId) {
        ch.sendToQueue(
          replyTo,
          Buffer.from(JSON.stringify(result)),
          { correlationId, persistent: true }
        );
        console.log(
          `[rpc-worker] ↗ replied  cid=${correlationId} in ${Date.now() - startedAt}ms`
        );
      } else {
        console.warn(`[rpc-worker] missing replyTo/correlationId, skipping reply (cid=${correlationId})`);
      }

      ch.ack(msg);
    } catch (e) {
      console.error('[rpc-worker] error while processing message:', e);
      ch.nack(msg, false, false);
    }
  });

  const cleanup = async () => {
    try {
      console.log('[rpc-worker] shutting down…');
      await ch.close();
      await conn.close();
    } catch {}
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
