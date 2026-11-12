## This is NOT the Next.js you know

This version has breaking changes (async params/searchParams/cookies, proxy.ts, and more). Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.

# Gnananetra Auctions

Aggregator of bank property auctions. Human docs: README.md. Sync engine: lib/sync/. Sources: lib/sync/sources.ts.

- before saying anything works: `npm run check` (typecheck + 14 sync tests + build)
- data in Cloudflare D1; one statement may bind at most 100 values (chunk bulk writes)
- every listing links to its source; we never run auctions or take bids
- BAANKNET's terms need written consent before this goes public (see README); keep indexing off until then
- the Cloudflare account is shared with other live apps: never reuse their Worker names, never deploy unless the user asks
- no em or en dashes in visitor-facing text; no AI co-author lines in commits

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
