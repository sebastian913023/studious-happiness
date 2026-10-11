import "dotenv/config";
import { createServer } from "node:http";
import { createApp, log } from "./app";
import { serveStatic } from "./static";
import { registerSqlite } from "./storage";
import { SqliteStorage } from "./storage-sqlite";

registerSqlite(() => new SqliteStorage());

export { log };

(async () => {
  const app = await createApp();
  const httpServer = createServer(app);

  // Only set up Vite in development, after the API routes so the catch-all doesn't shadow them.
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => log(`serving on port ${port}`));

  const shutdown = (sig: string) => { log(`${sig} received, shutting down`); httpServer.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
