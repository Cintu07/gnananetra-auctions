import type { Fetcher } from "@/lib/sync/types";

// A polite fetcher: honest user agent, robots.txt respected, a pause between requests to the same
// site, a timeout, and a cap on the page size. Never sends cookies or logins.

export type Rules = { disallow: string[]; allow: string[] };

export function parseRobots(text: string, agent: string): Rules {
  let applies = false;
  let specific = false;
  const star: Rules = { disallow: [], allow: [] };
  const mine: Rules = { disallow: [], allow: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      const a = val.toLowerCase();
      applies = a === "*" || agent.toLowerCase().includes(a);
      specific = a !== "*" && applies;
    } else if (applies && val) {
      const target = specific ? mine : star;
      if (key === "disallow") target.disallow.push(val);
      if (key === "allow") target.allow.push(val);
    }
  }
  return mine.disallow.length || mine.allow.length ? mine : star;
}

export function robotsAllows(rules: Rules, path: string): boolean {
  const longest = (list: string[]) => list.filter((p) => path.startsWith(p.replace(/\*.*$/, ""))).reduce((n, p) => Math.max(n, p.length), -1);
  const d = longest(rules.disallow);
  const a = longest(rules.allow);
  return d < 0 || a >= d;
}

export function politeFetcher(userAgent: string, opts: { delayMs?: number; timeoutMs?: number; maxBytes?: number } = {}): Fetcher {
  const delayMs = opts.delayMs ?? 700;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const maxBytes = opts.maxBytes ?? 3_000_000;
  const robots = new Map<string, Rules>();
  const lastHit = new Map<string, number>();

  return async (url, init = {}) => {
    const u = new URL(url);
    if (!robots.has(u.origin)) {
      try {
        const r = await fetch(`${u.origin}/robots.txt`, { headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(8000) });
        robots.set(u.origin, r.ok ? parseRobots(await r.text(), userAgent) : { disallow: [], allow: [] });
      } catch {
        robots.set(u.origin, { disallow: [], allow: [] });
      }
    }
    if (!robotsAllows(robots.get(u.origin)!, u.pathname + u.search)) throw new Error(`robots.txt of ${u.host} asks bots not to fetch ${u.pathname}`);
    const wait = (lastHit.get(u.origin) ?? 0) + delayMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastHit.set(u.origin, Date.now());
    const res = await fetch(url, {
      ...init,
      headers: { "user-agent": userAgent, accept: "text/html,application/json;q=0.9,*/*;q=0.8", "accept-language": "en-IN,en;q=0.9", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > maxBytes) throw new Error(`page too large (${len} bytes)`);
    return res;
  };
}
