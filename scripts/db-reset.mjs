// npm run db:reset   wipes the LOCAL D1 database (then `npm run db` recreates it empty)
import fs from "node:fs";
const dir = ".wrangler/state/v3/d1";
if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
console.log("local D1 removed");
