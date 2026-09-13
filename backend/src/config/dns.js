import dns from 'node:dns';
import { promisify } from 'node:util';

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];
const ORIGINAL_DNS_SERVERS = dns.getServers();
const resolveSrv = promisify(dns.resolveSrv);

let fixed = false;

const srvHostFromUri = (uri = '') => {
  if (!uri.startsWith('mongodb+srv://')) return null;
  const rest = uri.slice('mongodb+srv://'.length);
  const hostPart = rest.includes('@') ? rest.slice(rest.lastIndexOf('@') + 1) : rest;
  const host = hostPart.split(/[/?#]/)[0];
  return host || null;
};

/**
 * Ensure Node's DNS resolver can resolve the Atlas SRV record behind a
 * `mongodb+srv://` URI.
 *
 * The mongodb driver uses Node's `dns.resolveSrv` for SRV URIs. On some
 * Windows machines the configured resolver is a broken 127.0.0.1:53 listener
 * (Windows ICS / SharedAccess), which refuses every query while ordinary
 * OS-level lookups keep working. When detected, we switch Node's resolver to
 * public DNS and re-probe. Cached: only ever touches the resolver once per
 * process. No-op for plain `mongodb://` URIs.
 */
export const ensureNodeDns = async () => {
  const host = srvHostFromUri(process.env.MONGODB_URI || '');
  if (!host) return true;

  const target = `_mongodb._tcp.${host}`;
  const tryResolve = async () => {
    const records = await resolveSrv(target);
    return records.length > 0;
  };

  try {
    if (await tryResolve()) return true;
  } catch {
    // fall through to fallback DNS
  }

  if (fixed) return false;
  fixed = true;

  dns.setServers(FALLBACK_DNS_SERVERS);
  console.log(
    `⚠️  System DNS (${ORIGINAL_DNS_SERVERS.join(', ') || 'none'}) failed SRV lookup; ` +
      `switched Node resolver to ${FALLBACK_DNS_SERVERS.join(', ')}.`
  );

  try {
    return await tryResolve();
  } catch {
    return false;
  }
};

export default ensureNodeDns;