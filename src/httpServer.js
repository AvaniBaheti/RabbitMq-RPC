import express from 'express';
import { HTTP_PORT } from './utils.js';
import { rpcCall } from './rpcClient.js';

export async function startHttpServer(workerId) {
  const app = express();
  app.use(express.json());

  app.post('/compute', async (req, res) => {
    try {
      const payload = req.body || {};
      const result = await rpcCall(workerId, payload);
      res.json({ ok: true, result, servedBy: workerId });
    } catch (err) {
      res.status(504).json({ ok: false, error: err.message });
    }
  });

  return new Promise((resolve) => {
    const server = app.listen(HTTP_PORT, () => {
      console.log(`[worker ${workerId}] HTTP listening on :${HTTP_PORT}`);
      resolve(server);
    });
  });
}
