import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { demoData, demoSelectors } from "../lib/demo-data.ts";
import { runAgentTool } from "../lib/agent-tools.ts";

test("portfolio has exactly 12 consortia and 348 uniquely-owned units", () => {
  assert.equal(demoData.consortia.length, 12);
  assert.equal(demoData.portfolio.consortia, 12);
  assert.equal(demoData.units.length, 348);
  assert.equal(demoData.portfolio.units, 348);
  assert.equal(new Set(demoData.units.map((unit) => unit.id)).size, 348);
  const organizations = new Set(demoData.consortia.map((item) => item.name));
  assert.ok(demoData.units.every((unit) => organizations.has(unit.consortium)));
});

test("debt and pending-unit totals derive from canonical units", () => {
  assert.equal(demoSelectors.debtTotal(), 8_700_000);
  assert.equal(demoData.collections.pending, demoSelectors.debtTotal());
  assert.equal(demoSelectors.pendingUnits().length, 42);
  assert.equal(demoData.collections.unitsWithBalance, 42);
  assert.equal(demoData.consortia.reduce((sum, item) => sum + item.pending, 0), 42);
  for (const consortium of demoData.consortia) {
    const units = demoData.units.filter((unit) => unit.consortium === consortium.name);
    assert.equal(consortium.units, units.length);
    assert.equal(consortium.pending, units.filter((unit) => unit.outstanding > 0).length);
    assert.equal(consortium.debt, units.reduce((sum, unit) => sum + unit.outstanding, 0));
  }
});

test("attention and confirmation arithmetic derive from real cases", () => {
  assert.equal(demoData.reconciliation.requiresDecision, demoData.reconciliation.decisionCases.length);
  assert.equal(demoData.reconciliation.requiresInformation, demoData.reconciliation.informationCases.length);
  assert.equal(demoSelectors.attentionCases().length, 4);
  assert.equal(demoSelectors.decisionCases().length, 3);
  assert.equal(demoSelectors.identifiedToday(true) - demoSelectors.identifiedToday(false), demoData.reconciliation.featuredPayment.amount);
  assert.equal(demoSelectors.resolvedToday(true) - demoSelectors.resolvedToday(false), 1);
});

test("unit identities and signals are canonical", () => {
  for (const profile of demoData.unitProfiles) {
    const unit = demoSelectors.unit(profile.consortium, profile.unit);
    assert.ok(unit);
    assert.equal(profile.owner, unit.owner);
  }
  const suffix = demoData.reconciliation.featuredPayment.signal.match(/\d+$/)?.[0];
  assert.equal(suffix, "4812");
  assert.ok(demoData.unitProfiles.every((profile) => profile.bankSignal.endsWith(suffix!)));
  assert.equal(demoData.communications.examples[0].signal, demoData.reconciliation.featuredPayment.signal);
});

test("documents reference canonical suppliers", () => {
  const providers = new Set(demoData.providers);
  assert.ok(demoData.documents.every((document) => providers.has(document.provider)));
  assert.ok(providers.has("Christophersen Ascensores"));
});

test("financial equation is explicit and reconciles", () => {
  const collections = demoData.collections;
  assert.equal(collections.currentPeriodIssued - collections.currentPeriodCollected, collections.currentPeriodOutstanding);
  assert.equal(collections.currentPeriodOutstanding + collections.priorPeriodsOutstanding, collections.pending);
});

test("agent tools expose exactly the canonical screen facts", () => {
  const portfolio = runAgentTool("PORTFOLIO_OVERVIEW", {}).data;
  assert.equal(portfolio.consortia, demoData.portfolio.consortia);
  assert.equal(portfolio.units, demoData.portfolio.units);
  assert.equal(portfolio.attention, demoSelectors.attentionCases().length);
  assert.equal(portfolio.decisions, demoSelectors.decisionCases().length);
  assert.equal(portfolio.pending, demoData.collections.pending);
  const debt = runAgentTool("DEBT_OVERVIEW", { scope: "portfolio", organization: null }).data;
  assert.equal(debt.organization.name, "Arenales 2210");
  assert.equal(debt.organization.debt, demoData.consortia.find((item) => item.name === "Arenales 2210")?.debt);
  const unit = runAgentTool("UNIT_LOOKUP", { organization: "Arenales 2210", unit: "2A" }).data;
  assert.equal(unit.owner, "María Fernández");
  assert.equal(unit.outstanding, 540_000);
});

test("UI consumes selectors instead of contradictory legacy totals", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const legacy of ["$1.494.000", "$1.284.000", "Arenales 2210 · 8 unidades", "<b>92%</b>", "<b>$8,7M</b>", "terminada en 2193"]) assert.equal(page.includes(legacy), false, `legacy literal remains: ${legacy}`);
  assert.ok(page.includes("demoSelectors.identifiedToday(resolved)"));
  assert.ok(page.includes("demoSelectors.attentionCases(resolved)"));
  assert.ok(page.includes("demoSelectors.debtTotal()"));
  assert.ok(page.includes("featuredSignalSuffix"));
});

test("Vercel agent preserves server-only, stateless and read-only protections", async () => {
  const [route, limiter, page, packageJson] = await Promise.all([
    readFile(new URL("../app/api/assistant/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/rate-limit.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.ok(route.includes("process.env.OPENAI_API_KEY"));
  assert.ok(route.includes("store: false"));
  assert.ok(route.includes("parallel_tool_calls: false"));
  assert.ok(route.includes("max_output_tokens: 160"));
  assert.equal(route.includes("NEXT_PUBLIC_OPENAI"), false);
  assert.equal(page.includes("OPENAI_API_KEY"), false);
  assert.ok(limiter.includes('fixedWindow(30, "1 h")'));
  assert.ok(limiter.includes('fixedWindow(20, "24 h")'));
  assert.ok(limiter.includes("UPSTASH_REDIS_REST_KV_REST_API_URL"));
  assert.ok(limiter.includes("UPSTASH_REDIS_REST_KV_REST_API_TOKEN"));
  assert.equal(limiter.includes("new Map"), false);
  assert.equal(packageJson.includes("vinext"), false);
  assert.equal(packageJson.includes("wrangler"), false);
  assert.equal(packageJson.includes("vite"), false);
});

test("analytics never includes prompts, responses, or canonical operational facts", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analytics/route.ts", import.meta.url), "utf8"),
  ]);
  const events = [...page.matchAll(/trackShowroomEvent\(([^\n;]+)\)/g)].map((match) => match[1]);
  assert.ok(events.length >= 5);
  for (const event of events) {
    assert.equal(/\bq\b|input|message|answer|amount|unit|document|provider/i.test(event), false, `analytics payload may expose content: ${event}`);
  }
  assert.equal(/x-forwarded-for|sessionId|prompt|answer|amount|documentId|unitId|provider/i.test(route), false);
  assert.ok(route.includes("EVENTS.has(body.event)"));
  assert.ok(route.includes("VIEWS.has(body.properties.view)"));
});

test("official wordmark replaces the legacy isotipo without recreating the logo", async () => {
  const [page, styles, brand] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../lib/brand-asset.ts", import.meta.url), "utf8"),
  ]);
  assert.ok(page.includes("CONCILIA_WORDMARK_DATA_URI"));
  assert.ok(page.includes('alt="ConcilIA"'));
  assert.equal(page.includes("brand-symbol"), false);
  assert.equal(styles.includes(".brand-symbol"), false);
  assert.ok(brand.includes("data:image/png;base64,"));
});
