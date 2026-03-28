import { createServer } from "node:http";
import { env } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { closePool } from "./db/pool.js";
import { createApp } from "./app.js";

async function start() {
  await runMigrations();

  const app = createApp();
  const server = createServer(app);

  server.listen(env.PORT, () => {
    console.log(`RumahQu server listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
