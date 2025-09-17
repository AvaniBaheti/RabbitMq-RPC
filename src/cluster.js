import cluster from 'node:cluster';
import os from 'node:os';
import { initRpcClient } from './rpcClient.js';
import { startReplyRouter } from './replyRouter.js';
import { startHttpServer } from './httpServer.js';

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`[master] starting ${numCPUs} HTTP workers`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();

  cluster.on('exit', (worker) => {
    console.log(`[master] worker ${worker.id} died. Spawning replacement...`);
    cluster.fork();
  });
} else {
  const workerId = cluster.worker.id;

  (async () => {
    await initRpcClient();
    await startReplyRouter();
    await startHttpServer(workerId);
    console.log(`[worker ${workerId}] up`);
  })().catch(err => {
    console.error(`[worker ${workerId}] fatal`, err);
    process.exit(1);
  });
}
