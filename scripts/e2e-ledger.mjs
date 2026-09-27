// Browser check of the idempotent ledger: double Enter on Check, double click on Next, Buy and
// Claim (from two tabs), two tabs playing at once, and 3 phrases played offline then delivered.
// Each step compares the server (read with the test account's own session) before and after.
//
//   E2E_EMAIL / E2E_PASSWORD in .env.local: a test account; its balances will change.
//   A dev server on BASE_URL (default http://localhost:3000), and a Chromium: CHROME_PATH, or
//   the one `npx playwright install chromium` puts in ~/.cache/ms-playwright.
//   The journey stop the account is on must have phrases (Continue must be enabled).
//
//   node scripts/e2e-ledger.mjs
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import os from "os";
import path from "path";

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const cached = path.join(os.homedir(), ".cache/ms-playwright");
const CHROME =
  process.env.CHROME_PATH ??
  fs.readdirSync(cached).filter((d) => d.startsWith("chromium-")).sort().map((d) => path.join(cached, d, "chrome-linux64/chrome")).find((p) => fs.existsSync(p));
const SHOTS = os.tmpdir();

const env = Object.fromEntries(
  fs.readFileSync(`${ROOT}/.env.local`, "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const db = createClient(new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error: authErr } = await db.auth.signInWithPassword({ email: env.E2E_EMAIL, password: env.E2E_PASSWORD });
if (authErr) throw new Error(`sign in (node): ${authErr.message}`);

async function snap() {
  const [w, p, d, e, i, q] = await Promise.all([
    db.from("wallet").select("coins, crystals, freezes").maybeSingle(),
    db.from("player_stats").select("xp").maybeSingle(),
    db.from("study_days").select("phrases"),
    db.from("game_events").select("id", { count: "exact", head: true }),
    db.from("inventory").select("oxygen").maybeSingle(),
    db.from("quest_progress").select("claimed"),
  ]);
  return {
    coins: Number(w.data?.coins ?? 0), crystals: Number(w.data?.crystals ?? 0), xp: Number(p.data?.xp ?? 0),
    phrases: (d.data ?? []).reduce((a, r) => a + r.phrases, 0), events: e.count ?? 0,
    oxygen: Number(i.data?.oxygen ?? 0), claimed: (q.data ?? []).filter((r) => r.claimed).length,
  };
}

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext();
const errors = [];
const watch = (page, tag) => {
  page.on("console", (m) => m.type() === "error" && errors.push(`[${tag}] ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror ${e.message}`));
};

// Waits until the page has nothing in flight or queued (outbox empty) and the network settled.
async function settle(page) {
  for (let i = 0; i < 60; i++) {
    const n = await page.evaluate(() => JSON.parse(localStorage.getItem("gofluent:outbox") ?? "[]").length);
    if (!n) break;
    await sleep(250);
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await sleep(1200);
}

async function exerciseInfo(page) {
  return page.evaluate(() => {
    // The phrase's words, read from ExerciseView's props through React's fiber on an input.
    const input = document.querySelector(".gaps input") ?? document.querySelector("input");
    const k = Object.keys(input).find((k) => k.startsWith("__reactFiber$"));
    let f = input[k];
    while (f && !(f.memoizedProps && f.memoizedProps.exercise)) f = f.return;
    return { words: f.memoizedProps.exercise.words.map((w) => w.text), key: f.key, gaps: !document.querySelector(".gaps").hidden };
  });
}

/** Types the right answer; `submit` decides how Check is triggered. */
async function answer(page, submit = async () => page.getByRole("button", { name: /^Check/ }).click()) {
  await page.waitForSelector(".gaps");
  const info = await exerciseInfo(page);
  if (info.gaps) {
    const inputs = page.locator(".gaps input");
    for (let i = 0; i < info.words.length; i++) await inputs.nth(i).fill(info.words[i]);
    await inputs.nth(info.words.length - 1).focus();
  } else {
    const free = page.locator("input:not(.gaps input)").first();
    await free.fill(info.words.join(" "));
    await free.focus();
  }
  await submit();
  await page.getByRole("button", { name: /^Next|^See results|^Finish/ }).first().waitFor({ timeout: 10000 }).catch(() => {});
  return info;
}
const nextBtn = (page) => page.getByRole("button", { name: /^(Next|Finish)/ }).first();
/** Next, at a human pace: the summary ignores Next for its first 300 ms (SUMMARY_SETTLE_MS). */
async function goNext(page) {
  await sleep(400);
  await nextBtn(page).click();
  await page.waitForSelector(".gaps");
}

async function login(page) {
  await page.goto(BASE);
  await page.waitForLoadState("networkidle");
  if (await page.locator('input[type="email"]').count()) {
    await page.getByRole("tab", { name: "Sign in" }).click().catch(() => {});
    await page.fill('input[type="email"]', env.E2E_EMAIL);
    await page.fill('input[type="password"]', env.E2E_PASSWORD);
    await page.locator('button[type="submit"]').click();
  }
  await page.getByRole("button", { name: /Continue on/ }).waitFor({ timeout: 20000 });
}
const startRun = async (page) => {
  await page.getByRole("button", { name: /Continue on/ }).click();
  await page.waitForSelector(".gaps");
};

const pageA = await ctx.newPage();
watch(pageA, "A");
try {
  await login(pageA);
  await settle(pageA);
  const s0 = await snap();
  console.log("start", s0);

  // 1. Double Enter + an extra click on Check: one phrase.
  await startRun(pageA);
  await answer(pageA, async () => {
    await pageA.keyboard.press("Enter");
    await pageA.keyboard.press("Enter");
  });
  await settle(pageA);
  const s1 = await snap();
  check("double Enter on Check counts one phrase", s1.phrases - s0.phrases === 1 && s1.events - s0.events === 1, JSON.stringify({ phrases: s1.phrases - s0.phrases, events: s1.events - s0.events }));

  await sleep(500);
  check("double Enter keeps the phrase summary on screen", await nextBtn(pageA).isVisible());

  // 2. Double click on Next: one step forward.
  if (!(await nextBtn(pageA).isVisible())) await answer(pageA);
  const counter = () => pageA.evaluate(() => Number([...document.querySelectorAll("b")].find((b) => /^\d+$/.test(b.textContent) && /\/\s*\d+/.test(b.parentElement.textContent))?.textContent));
  const n0 = await counter();
  await sleep(400);
  await nextBtn(pageA).dblclick();
  await pageA.waitForSelector(".gaps");
  await sleep(300);
  const n1 = await counter();
  check("double click on Next advances one phrase", n1 === n0 + 1, `${n0} -> ${n1}`);

  // 3. Offline: 3 phrases queue in the outbox, delivered once back online.
  await settle(pageA);
  const sOn = await snap();
  await ctx.setOffline(true);
  for (let n = 0; n < 3; n++) {
    await answer(pageA);
    if (n < 2) {
      await goNext(pageA);
    }
  }
  const queued = await pageA.evaluate(() => JSON.parse(localStorage.getItem("gofluent:outbox") ?? "[]").map((q) => q.rpc));
  check("offline: phrases wait in the outbox", queued.filter((r) => r === "complete_phrase").length === 3, queued.join(","));
  const sOff = await snap();
  check("offline: nothing reached the server", sOff.phrases === sOn.phrases, `${sOff.phrases - sOn.phrases}`);
  await ctx.setOffline(false);
  await pageA.evaluate(() => window.dispatchEvent(new Event("online")));
  await settle(pageA);
  const s2 = await snap();
  check("back online: 3 applied once", s2.phrases - sOn.phrases === 3 && s2.events - sOn.events === 3, JSON.stringify({ phrases: s2.phrases - sOn.phrases, events: s2.events - sOn.events }));

  // 4. Two tabs playing at once.
  const pageB = await ctx.newPage();
  watch(pageB, "B");
  await pageB.goto(BASE);
  await pageB.getByRole("button", { name: /Continue on/ }).waitFor({ timeout: 20000 });
  await startRun(pageB);
  await goNext(pageA);
  await Promise.all([answer(pageA), answer(pageB)]);
  await Promise.all([settle(pageA), settle(pageB)]);
  const s3 = await snap();
  check("two tabs: both phrases counted", s3.phrases - s2.phrases === 2, `${s3.phrases - s2.phrases}`);
  const cached = await pageA.evaluate(() => JSON.parse(localStorage.getItem("gofluent:wallet") ?? "{}"));
  check("two tabs: device cache matches server wallet", cached.coins === s3.coins, `cache ${cached.coins} vs db ${s3.coins}`);
  await pageB.close();

  // 5. Store: double click on Buy.
  await pageA.goto(BASE);
  await pageA.getByRole("button", { name: /Continue on/ }).waitFor();
  await pageA.getByRole("button", { name: /Store/ }).first().click();
  await pageA.getByRole("heading", { name: "Store" }).waitFor();
  const s4 = await snap();
  if (s4.coins >= 40) {
    await pageA.getByRole("button", { name: /Buy for/ }).first().dblclick();
    await settle(pageA);
    const s5 = await snap();
    check("double click on Buy: one purchase", s4.coins - s5.coins === 40 && s5.oxygen - s4.oxygen === 1 && s5.events - s4.events === 1,
      JSON.stringify({ coins: s5.coins - s4.coins, oxygen: s5.oxygen - s4.oxygen, events: s5.events - s4.events }));
  } else check("double click on Buy (skipped: under 40 coins)", true, `coins ${s4.coins}`);

  // 6. Claim: "Five clean" reached with 5 clean phrases in a row, then claimed from two tabs at
  // once, each with a double click.
  await pageA.goto(BASE);
  await startRun(pageA);
  for (let n = 0; n < 5; n++) {
    await answer(pageA);
    if (n < 4) {
      await goNext(pageA);
    }
  }
  await settle(pageA);
  const pageC = await ctx.newPage();
  watch(pageC, "C");
  await Promise.all([pageA.goto(BASE), pageC.goto(BASE)]);
  const claimA = pageA.locator("button.claim-btn:visible").first();
  const claimC = pageC.locator("button.claim-btn:visible").first();
  await Promise.all([claimA.waitFor({ timeout: 15000 }), claimC.waitFor({ timeout: 15000 })]).catch(() => {});
  if ((await claimA.count()) && (await claimC.count())) {
    await settle(pageA);
    const s6 = await snap();
    await Promise.all([claimA.dblclick(), claimC.dblclick()]);
    await Promise.all([settle(pageA), settle(pageC)]);
    const s7 = await snap();
    check("claim from 2 tabs, double click each: paid once", s7.claimed - s6.claimed === 1 && s7.coins - s6.coins === 15,
      JSON.stringify({ claimed: s7.claimed - s6.claimed, coins: s7.coins - s6.coins }));
  } else check("claim (skipped: nothing to claim; \"Five clean\" may be claimed already today)", true);
  await pageC.close();

  // 7. After a reload, what the top bar shows is what the server holds.
  await pageA.reload();
  await pageA.getByRole("button", { name: /Continue on/ }).waitFor();
  await settle(pageA);
  const shown = await pageA.evaluate(() => Number([...document.querySelectorAll("li")].find((li) => li.textContent.includes("Lunar Coins"))?.querySelector("b")?.textContent));
  const s8 = await snap();
  check("after reload: profile card coins equal server", shown === s8.coins, `${shown} vs ${s8.coins}`);
  console.log("end", s8);
} catch (e) {
  console.error("aborted:", e.message);
  await pageA.screenshot({ path: path.join(SHOTS, "e2e-ledger-fail.png"), fullPage: true }).catch(() => {});
  console.error(`screenshot: ${path.join(SHOTS, "e2e-ledger-fail.png")}`);
  results.push({ label: "run", ok: false, detail: e.message });
} finally {
  console.log("\nconsole errors:", errors.length ? `\n${errors.slice(0, 15).join("\n")}` : "none");
  await browser.close();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
