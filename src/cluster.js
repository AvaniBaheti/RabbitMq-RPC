import { startHttpServer } from './httpServer.js';
import { initRpcClient } from './rpcClient.js';

(async () => {
  await initRpcClient();
  await startHttpServer();
})();
