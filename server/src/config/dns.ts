import dns from "node:dns";

let isConfigured = false;

/**
 * Sets up a resilient DNS resolver.
 * On some Windows networks or ISP connections, the local DNS server may refuse
 * or fail to resolve cloud provider subdomains (such as Neon AWS pooler or Upstash Redis).
 * This interceptor falls back to public DNS (Google 8.8.8.8 and Cloudflare 1.1.1.1)
 * via c-ares dns.resolve4 when OS getaddrinfo fails.
 */
export function setupDnsResolver(): void {
  if (isConfigured) return;

  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);

    const originalLookup = dns.lookup;

    (dns as any).lookup = function (
      hostname: string,
      options: any,
      callback: any,
    ) {
      if (typeof options === "function") {
        callback = options;
        options = {};
      }

      originalLookup(hostname, options, (err, address, family) => {
        if (!err && address) {
          return callback(null, address, family);
        }

        // If local OS getaddrinfo failed, try resolving via public DNS
        dns.resolve4(hostname, (resErr, addresses) => {
          if (!resErr && addresses && addresses.length > 0) {
            if (options && options.all) {
              return callback(
                null,
                addresses.map((a) => ({ address: a, family: 4 })),
              );
            }
            return callback(null, addresses[0], 4);
          }
          // If fallback resolve4 also fails, return the original error
          callback(err || resErr);
        });
      });
    };

    isConfigured = true;
  } catch (err) {
    console.warn("[DNS] Fallback DNS resolver initialization skipped:", err);
  }
}
