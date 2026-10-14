import { z } from "zod";

// Zod 4 JIT uses `new Function`, which Cloudflare Workers disallow.
// Must run before any schema parse (see getCloudflareEnv / cloudflareEnvParser).
z.config({ jitless: true });
