import { initRpcClient } from './rpcClient.js';
import { startReplyRouter } from './replyRouter.js';
import { startHttpServer } from './httpServer.js';

(async () => {
  const workerId = 1; 
  await initRpcClient();
  await startReplyRouter();
  await startHttpServer(workerId);
  console.log(`[worker ${workerId}] up`);
})();
