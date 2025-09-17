import amqplib from 'amqplib';
import { nanoid } from 'nanoid';
import {
  AMQP_URL, RPC_REQUEST_QUEUE, RPC_REPLY_QUEUE, RPC_TIMEOUT_MS
} from './utils.js';

let conn, ch;
let replyConn, replyCh;

export async function initRpcClient() {
  conn = await amqplib.connect(AMQP_URL);
  ch = await conn.createChannel();
  await ch.assertQueue(RPC_REQUEST_QUEUE, { durable: true });

  replyConn = await amqplib.connect(AMQP_URL);
  replyCh = await replyConn.createChannel();
  await replyCh.assertQueue(RPC_REPLY_QUEUE, { durable: true });
}

const pending = new Map();

export async function rpcCall(payload) {
  if (!ch || !replyCh) await initRpcClient();

  const correlationId = nanoid();
  const body = Buffer.from(JSON.stringify(payload));

  // set up consumer once (idempotent)
  if (!replyCh._consuming) {
    await replyCh.consume(RPC_REPLY_QUEUE, (msg) => {
      if (!msg) return;
      const cid = msg.properties.correlationId;
      const waiter = pending.get(cid);
      if (waiter) {
        try {
          const data = JSON.parse(msg.content.toString());
          waiter.resolve(data);
        } catch (e) {
          waiter.reject(e);
        } finally {
          pending.delete(cid);
        }
      }
      replyCh.ack(msg);
    });
    replyCh._consuming = true;
  }

  const p = new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      pending.delete(correlationId);
      reject(new Error('RPC timeout'));
    }, RPC_TIMEOUT_MS);
    pending.set(correlationId, {
      resolve: (v) => { clearTimeout(t); resolve(v); },
      reject: (e) => { clearTimeout(t); reject(e); }
    });
  });

  await ch.sendToQueue(
    RPC_REQUEST_QUEUE,
    body,
    { correlationId, replyTo: RPC_REPLY_QUEUE, persistent: true }
  );

  return p;
}
