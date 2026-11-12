// The audit engine shared by the project scripts: starts a hidden Edge/Chrome, opens every page at every
// width, measures sideways scroll, tap targets, tiny text, broken images and script errors, saves
// screen-sized screenshots to tmp/mobile-audit/<width>/, and always closes the browser again.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";

export async function runAudit({ BASE, PAGES, WIDTHS, executablePath, onDone = () => {} }) {
  // Edge's launcher process exits at once after starting the real (hidden) browser, which makes
  // puppeteer.launch think it failed. So start it ourselves and connect to its debugging port.
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "audit-profile-"));
  const PORT = 9300 + Math.floor(Math.random() * 500);
  spawn(executablePath, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "about:blank"], { stdio: "ignore", detached: false }).unref();
  let browser;
  for (let i = 0; i < 60 && !browser; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${PORT}` }); } catch {}
  }
  if (!browser) throw new Error("the hidden browser did not start");

  function measure(page) {
    return page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = { overflow: [], small: [], tiny: [], broken: [], scrollW: document.documentElement.scrollWidth, vw };
      const label = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).split(/\s+/).slice(0, 3).join(".")}`.slice(0, 80) + ` "${(el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 26)}"`;
      const inScroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === "auto" || o === "scroll") && p.scrollWidth > p.clientWidth) return true; } return false; };
      for (const el of document.querySelectorAll("body *")) {
        const st = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const closed = el.closest("details:not([open])");
        if ((closed && !(el.tagName === "SUMMARY" && el.parentElement === closed)) || el.closest("[data-audit-skip]")) continue; // hidden menus and decorative bits
        if (st.visibility === "hidden" || st.display === "none" || !r.width || !r.height || st.position === "fixed" && r.right <= vw + 1) continue;
        if (r.right > vw + 1 && !inScroller(el) && st.position !== "fixed") out.overflow.push(`${label(el)} right=${Math.round(r.right)}`);
        const tag = el.tagName;
        const interactive = tag === "BUTTON" || tag === "SELECT" || tag === "TEXTAREA" || tag === "SUMMARY" || (tag === "INPUT" && !["hidden", "checkbox", "radio"].includes(el.type)) || el.getAttribute("role") === "button" || (tag === "A" && el.getAttribute("href"));
        if (interactive) {
          const inline = tag === "A" && getComputedStyle(el).display === "inline" && el.parentElement && /^(P|LI|SPAN|DD|DIV|H\d)$/.test(el.parentElement.tagName) && el.parentElement.innerText.trim().length > el.innerText.trim().length + 8;
          const sr = el.className && String(el.className).includes("sr-only");
          if (!inline && !sr && vw < 1024 && (r.height < 40 || r.width < 40) && r.top < 100000) out.small.push(`${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(st.fontSize) < 12) out.tiny.push(`${label(el)} ${st.fontSize}`);
        if (tag === "IMG" && el.complete && el.naturalWidth === 0 && el.currentSrc && !el.closest("[aria-hidden=true]")) out.broken.push(el.currentSrc.slice(-60));
      }
      return out;
    });
  }

  const failures = [];
  const rows = [];
  try {
  for (const w of WIDTHS) {
    fs.mkdirSync(`tmp/mobile-audit/${w}`, { recursive: true });
    for (const pg of PAGES) {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
      page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text().slice(0, 120)));
      await page.setViewport({ width: w, height: w < 700 ? 800 : 900, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 });
      if (pg.cookie) { const [n, v] = pg.cookie.split("="); await page.setCookie({ name: n, value: v, url: BASE }); }
      try {
        await page.goto(BASE + pg.path, { waitUntil: "networkidle2", timeout: 60000 });
        await new Promise((r) => setTimeout(r, 600));
        if (pg.steps) { await pg.steps(page, w); await new Promise((r) => setTimeout(r, 400)); }
        const m = await measure(page);
        // images that are still lazy-loading or slow are not broken; only decoded-and-empty ones count
        // screen-sized slices (what a person actually sees), scrolling so reveal animations play
        const total = await page.evaluate(() => document.documentElement.scrollHeight);
        const vh = w < 700 ? 800 : 900;
        for (let i = 0, y = 0; i < (w < 700 ? 4 : 2) && y < total; i++, y += vh - 40) {
          await page.evaluate((top) => window.scrollTo(0, top), y);
          await new Promise((r) => setTimeout(r, 450));
          await page.screenshot({ path: `tmp/mobile-audit/${w}/${pg.name}-${i}.png` });
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        const bad = [];
        if (m.scrollW > m.vw + 1) bad.push(`sideways scroll (${m.scrollW}px on a ${m.vw}px screen): ${[...new Set(m.overflow)].slice(0, 6).join(" | ")}`);
        if (m.small.length) bad.push(`${m.small.length} small tap target(s): ${[...new Set(m.small)].slice(0, Number(process.env.AUDIT_MAX ?? 7)).join(" | ")}`);
        if (m.tiny.length) bad.push(`${m.tiny.length} tiny text: ${[...new Set(m.tiny)].slice(0, 6).join(" | ")}`);
        if (errors.length) bad.push(`script errors: ${errors.slice(0, 2).join(" | ")}`);
        rows.push({ w, name: pg.name, bad, broken: m.broken.length });
        if (bad.length) failures.push({ w, name: pg.name, bad });
      } catch (e) {
        rows.push({ w, name: pg.name, bad: [`could not open: ${String(e.message).slice(0, 100)}`], broken: 0 });
        failures.push({ w, name: pg.name, bad: [`could not open: ${String(e.message).slice(0, 100)}`] });
      }
      await page.close();
    }
  }
  } finally {
    // always, so no hidden browser is left running: ask it to quit, then make sure
    try { await browser.close(); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    if (process.platform === "win32") {
      const { execSync } = await import("node:child_process");
      try { execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${path.basename(profile)}*' } | ForEach-Object { taskkill /PID $_.ProcessId /T /F | Out-Null }"`, { stdio: "ignore" }); } catch {}
    }
    fs.rmSync(profile, { recursive: true, force: true });
  }

  for (const w of WIDTHS) {
    const mine = rows.filter((r) => r.w === w);
    console.log(`${String(w).padStart(5)} px  ${mine.filter((r) => !r.bad.length).length}/${mine.length} pages clean`);
  }
  for (const f of failures) {
    console.log(`\n${f.w}px ${f.name}`);
    for (const b of f.bad) console.log(`   - ${b}`);
  }
  const brokenImgs = rows.reduce((n, r) => n + r.broken, 0);
  console.log(`\nbroken images (all pages): ${brokenImgs}`);
  console.log(failures.length ? `\n${failures.length} page/size combination(s) need work` : "\nall pages clean at every size");
  onDone();
  return failures.length;
}
