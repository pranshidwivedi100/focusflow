import session from "express-session";
import RedisStore from "connect-redis";
import { redisClient } from "./redis.js";
import { env } from "./env.js";

function isNgrokUrl(url?: string): boolean {
  return typeof url === "string" && /ngrok/i.test(url);
}

// When testing OAuth via ngrok, callback requests are cross-site. Cookies must
// be SameSite=None;Secure to survive provider -> ngrok redirect.
const useCrossSiteCookie =
  isNgrokUrl(env.frontendUrl) ||
  isNgrokUrl(env.googleCallbackUrl) ||
  isNgrokUrl(env.slackRedirectUri) ||
  isNgrokUrl(env.jiraRedirectUri);

const cookieSecure = env.isProd || useCrossSiteCookie;
const cookieSameSite: "none" | "lax" = useCrossSiteCookie ? "none" : "lax";

/**
 * Express session middleware backed by Redis.
 *
 * Why Redis-backed sessions over JWT?
 * - Sessions can be invalidated server-side instantly (logout = destroy session)
 * - No token size bloat in cookies
 * - Redis handles TTL/expiry natively
 *
 * Why SameSite=Lax and not Strict?
 * - The Google OAuth redirect (google.com → our callback) is a cross-site top-level
 *   navigation. SameSite=Strict would block the cookie on that redirect, breaking login.
 *   Lax allows cookies on top-level navigations, which is exactly what we need.
 */
export const sessionMiddleware = session({
  store: new RedisStore({
    client: redisClient,
    prefix: "focusflow:sess:",
  }),
  proxy: true,
  secret: env.sessionSecret,
  name: "focusflow.sid",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // JS cannot read the cookie — prevents XSS theft
    secure: cookieSecure, // Required for SameSite=None and HTTPS tunnels
    sameSite: cookieSameSite, // Use None for cross-site OAuth via ngrok
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});
