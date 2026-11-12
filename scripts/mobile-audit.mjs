// npm run audit:mobile [-- 360 390]   (with the site running; SMOKE_URL picks the address)
//
// Opens every important page and state at phone, tablet and desktop widths (320, 360, 390, 768, 1280 px by
// default) in a hidden browser (Edge or Chrome already on the machine) and reports, objectively:
//   - any page that scrolls sideways, and the elements sticking out
//   - tap targets smaller than 40 px
//   - text smaller than 12 px
//   - broken images and JavaScript errors
// Screenshots go to tmp/mobile-audit/<width>/. Exit code 1 if anything fails.
import fs from "node:fs";
import path from "node:path";
import { runAudit } from "./audit-core.mjs";
import { SignJWT } from "jose";
import { DatabaseSync } from "node:sqlite";

const BASE = process.env.SMOKE_URL ?? "http://localhost:3001";
const widths = process.argv.slice(2).map(Number).filter(Boolean);
const WIDTHS = widths.length ? widths : [320, 360, 390, 768, 1280];
const executablePath = [process.env.BROWSER, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean).find((p) => fs.existsSync(p));
if (!executablePath) throw new Error("No Chrome/Edge found. Set BROWSER=/path/to/chrome");

// a few real rows to visit, read from the local database file
const D1 = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const file = fs.readdirSync(D1).filter((f) => f.endsWith(".sqlite")).map((f) => path.join(D1, f)).find((f) => new DatabaseSync(f, { readOnly: true }).prepare("select 1 from sqlite_master where name = 'listings'").get());
const db = new DatabaseSync(file, { readOnly: true });
const live = db.prepare("select id from listings where status != 'ended' and image is not null order by auction_at limit 1").get();
const noPhoto = db.prepare("select id from listings where status != 'ended' and image is null limit 1").get();
const ended = db.prepare("select id from listings where status = 'ended' limit 1").get();
db.close();

const adminCookie = await new SignJWT({ admin: true }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.AUTH_SECRET));

// name, path, optional steps run after load (open a menu, a filter panel, ...), optional cookie
const PAGES = [
  { name: "home", path: "/" },
  { name: "list", path: "/auctions" },
  { name: "list-filtered", path: "/auctions?type=flat&city=Chennai&sort=price-desc" },
  { name: "list-empty", path: "/auctions?q=zzzzzzzz" },
  { name: "list-past", path: "/auctions?status=ended" },
  { name: "detail", path: `/auction/${live.id}` },
  ...(noPhoto ? [{ name: "detail-no-photo", path: `/auction/${noPhoto.id}` }] : []),
  ...(ended ? [{ name: "detail-ended", path: `/auction/${ended.id}` }] : []),
  { name: "sources", path: "/sources" },
  { name: "not-found", path: "/auction/99999999" },
  { name: "menu-open", path: "/", steps: async (p, w) => { if (w < 1024) await p.click("header summary"); } },
  { name: "filters-open", path: "/auctions", steps: async (p, w) => { if (w < 1024) { await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Filters/.test(b.textContent))?.click()); } } },
  { name: "admin-login", path: "/admin/login" },
  { name: "admin", path: "/admin", cookie: `ga_admin=${adminCookie}` },
];


const failed = await runAudit({ BASE, PAGES, WIDTHS, executablePath });
process.exit(failed ? 1 : 0);
