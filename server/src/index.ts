import { setupDnsResolver } from './config/dns.js';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { env } from './config/env.js';

// Initialize resilient public DNS fallback for cloud databases
setupDnsResolver();

/**
 * Server bootstrap — connects to Postgres + Redis, then starts Express.
 * If either database connection fails, the process exits immediately
 * (fail fast — don't serve requests with a broken data layer).
 */
async function main() {
  try {
    console.log(`[Server] Starting in ${env.nodeEnv} mode...`);

    // Connect to data stores before accepting requests
    await connectDatabase();
    await connectRedis();

    const app = createApp();

    app.listen(env.port, () => {
      console.log(`[Server] Listening on http://localhost:${env.port}`);
      console.log(`[Server] Frontend expected at ${env.frontendUrl}`);
      console.log(`[Server] Google callback: ${env.googleCallbackUrl}`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

main();
