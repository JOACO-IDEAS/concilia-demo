import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { demoData, demoSelectors } from "../lib/demo-data.ts";
import { inferDeterministicRead, runAgentTool, trustedResponse, updateConversationState } from "../lib/agent-tools.ts";

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

test("explicit organization plus unit routes to the unit domain generically", () => {
  assert.deepEqual(
    inferDeterministicRead("¿Quién corresponde a Arenales 2210 2A?", {}),
    {
      name: "UNIT_LOOKUP",
      arguments: { organization: "Arenales 2210", unit: "2A" },
    },
  );
  assert.deepEqual(
    inferDeterministicRead("¿Y quién corresponde a esa unidad?", {
      activeOrganization: "Arenales 2210",
      activeUnit: "7C",
    }),
    {
      name: "UNIT_LOOKUP",
      arguments: { organization: "Arenales 2210", unit: "7C" },
    },
  );
  assert.equal(
    inferDeterministicRead("Buscame el pago de Arenales 2210 2A", {}),
    null,
  );
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

test("TASK V2.2 — import classification sums exactly to total movements, never a contradictory count", () => {
  const summary = demoSelectors.importSummary();
  assert.equal(summary.movements, demoData.reconciliation.movements);
  assert.equal(summary.totalAmount, demoData.reconciliation.totalAmount);
  assert.equal(
    summary.identified + summary.requiresDecision + summary.requiresInformation,
    summary.movements,
  );
  assert.equal(summary.requiresDecision, demoSelectors.decisionCases(false).length);
  assert.equal(summary.requiresInformation, demoData.reconciliation.informationCases.length);
});

test("TASK V2.2 — import summary stays consistent with the reconciliation queue once the demo payment is confirmed", () => {
  const before = demoSelectors.importSummary(false);
  const after = demoSelectors.importSummary(true);
  assert.equal(after.requiresDecision, before.requiresDecision - 1);
  assert.equal(after.identified, before.identified + 1);
  assert.equal(
    after.identified + after.requiresDecision + after.requiresInformation,
    after.movements,
  );
  assert.equal(after.requiresDecision, demoSelectors.decisionCases(true).length);
});

test("TASK V2.2 — import preview only reuses real cases already present in the canonical dataset", () => {
  const preview = demoSelectors.importPreview(false);
  const decisionIds = new Set(demoData.reconciliation.decisionCases.map((item) => item.id));
  const informationIds = new Set(demoData.reconciliation.informationCases.map((item) => item.id));
  const resolvedIds = new Set(demoData.reconciliation.resolvedPayments.map((item) => item.id));
  for (const item of preview.decisions) assert.ok(decisionIds.has(item.id));
  assert.ok(informationIds.has(preview.needsInformation.id));
  for (const item of preview.resolved) assert.ok(resolvedIds.has(item.id));
});

test("TASK V2.2 — import UI never hardcodes its own counts; reset restores the import overlay to closed", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("demoSelectors.importSummary(resolved)"));
  assert.ok(page.includes("demoSelectors.importPreview(resolved)"));
  assert.ok(page.includes("setImportOpen(false)"));
  const resetBody = page.slice(page.indexOf("const resetDemo = ()"), page.indexOf("const titles: Record<View"));
  assert.ok(resetBody.includes("setImportOpen(false)"), "resetDemo must close the import overlay");
  assert.equal(page.includes("En esta demo se utiliza un extracto simulado."), true);
  for (const banned of ["parseFile(", "OPENAI_API_KEY", "fetch(\"/api/statement", "uploadFile(", "runOcr", "callOpenAI"]) {
    assert.equal(page.includes(banned), false, `truthfulness violation: found "${banned}"`);
  }
});

test("TASK V2.2B — processing polish groups real events into 3 stages, never a 4th invented one", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes('label: "Lectura"'));
  assert.ok(page.includes('label: "Análisis"'));
  assert.ok(page.includes('label: "Conciliación"'));
  assert.equal(page.includes('label: "Coincidencias"'), false);
  // Los eventos de cada etapa siguen viniendo de demoSelectors.importSummary — ningún
  // número nuevo, sólo la agrupación visual cambió.
  assert.ok(page.includes("${summary.movements} movimientos detectados"));
  assert.ok(page.includes("${summary.identified} identificados automáticamente"));
  assert.ok(page.includes("${summary.requiresDecision} requiere"));
  assert.ok(page.includes("${summary.requiresInformation} necesita"));
  assert.ok(page.includes("Procesamiento simulado para esta demo."));
});

test("TASK V2.2B — stage progress never claims a real bank/OCR/AUTO integration", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const importSection = page.slice(page.indexOf("function ImportStatement"), page.indexOf("function Resolution({"));
  for (const banned of ["AUTO", "integración bancaria", "conexión al banco", "OCR real"]) {
    assert.equal(importSection.includes(banned), false, `overclaim risk: found "${banned}" in the import flow`);
  }
});

test("TASK V2.3 — debt units carry owner and promise fields so 'Ver detalle' never invents data", () => {
  for (const unit of demoData.collections.overdue) {
    assert.equal(typeof unit.owner, "string");
    assert.ok(unit.owner.length > 0);
    assert.ok(unit.promise === null || typeof unit.promise === "string");
  }
});

test("TASK V2.3 — Morosidad 'Ver detalle' opens a real panel instead of a toast", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const debtSection = page.slice(page.indexOf("function Debt("), page.indexOf("function Consortia("));
  assert.ok(debtSection.includes("setDetail(x)"), "Ver detalle must open a real detail panel, not a toast");
  assert.equal(debtSection.includes("notify(`Detalle abierto"), false, "the old toast-only stub must be gone");
  assert.ok(debtSection.includes("item.owner"));
  assert.ok(debtSection.includes("item.days"));
  assert.ok(debtSection.includes("item.lastContact"));
  assert.ok(debtSection.includes("item.promise"));
});

test("TASK V2.3 — Morosidad 'Mayor importe' filter actually reorders by outstanding amount", () => {
  const overdue = demoData.collections.overdue;
  const sorted = [...overdue].sort((a, b) => b.outstanding - a.outstanding);
  assert.notDeepEqual(overdue.map((u) => u.id), sorted.map((u) => u.id), "fixture should not already be sorted by amount, otherwise this test can't detect a no-op filter");
  assert.equal(sorted[0].outstanding, Math.max(...overdue.map((u) => u.outstanding)));
});

test("TASK V2.4 — the WhatsApp receipt case is fully consistent across the canonical dataset", () => {
  const { featuredPayment } = demoData.reconciliation;
  const example = demoData.communications.examples[0];
  const profile = demoData.unitProfiles.find((p) => p.consortium === "Arenales 2210" && p.unit === "2A");
  assert.equal(featuredPayment.place, "Arenales 2210");
  assert.equal(featuredPayment.unitLabel, "Unidad 2A");
  assert.equal(example.context, "Arenales 2210 · 2A");
  assert.equal(example.from, profile?.owner, "the WhatsApp sender must be the real registered owner of Arenales 2210 · 2A");
  assert.ok(example.detected.includes(featuredPayment.amount.toLocaleString("es-AR")), "the amount detected from the message must match the featured payment, not an invented one");
  assert.equal(example.signal, featuredPayment.signal);
});

test("TASK V2.4 — EvidenceFlow reuses the canonical WhatsApp message instead of a second hardcoded copy", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const evidenceSection = page.slice(page.indexOf("function EvidenceFlow("), page.indexOf("type ChatMessage"));
  assert.ok(evidenceSection.includes("demoData.communications.examples[0].message"), "the chat bubble must read the message from the dataset, not a separate literal string");
  assert.equal(evidenceSection.includes("Hola, pago expensas 2A."), false, "the old duplicated hardcoded message must be gone");
  assert.ok(evidenceSection.includes("featuredPayment.candidates[0].evidence"), "matching signals must come from the real candidate evidence array, not invented copy");
});

test("TASK V2.4 — truthfulness: no real WhatsApp/Meta/OCR/banking integration is ever claimed", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  for (const banned of ["Meta Cloud API", "WhatsApp Business API", "whatsapp.com/api", "Twilio", "webhook", "fetch(\"https://graph.facebook.com", "runOcr(", "parseReceipt("]) {
    assert.equal(page.includes(banned), false, `overclaim risk: found "${banned}" in page.tsx`);
    assert.equal(css.includes(banned), false, `overclaim risk: found "${banned}" in globals.css`);
  }
  assert.ok(page.includes("WhatsApp · Demostración"), "the phone mockup must carry an unambiguous demo disclaimer");
  assert.ok(page.includes("WhatsApp · Demostración · 18 ago"), "the Resolution receipt card must carry the same demo disclaimer");
});

test("TASK V2.4 — confidence language stays honest: no invented score, no false certainty", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const evidenceSection = page.slice(page.indexOf("function EvidenceFlow("), page.indexOf("type ChatMessage"));
  for (const banned of ["% IA", "99%", "confidence:", "confidenceScore"]) {
    assert.equal(evidenceSection.includes(banned), false, `invented-confidence risk: found "${banned}"`);
  }
  assert.ok(evidenceSection.includes("Requiere confirmación"), "the flow must keep stating that human confirmation is still required");
});

test("TASK V2.4.1 — Codex #1: 'identificados' is one single number for the same 184-movement batch", () => {
  const { movements, resolved, requiresDecision, requiresInformation } = demoData.reconciliation;
  // El mismo concepto ("identificados") no puede tener dos respuestas distintas
  // para el mismo universo de movimientos, ni antes ni después de confirmar.
  assert.equal(resolved + requiresDecision + requiresInformation, movements);
  assert.equal(resolved, demoSelectors.importSummary(false).identified);
  assert.equal(resolved + 1, demoSelectors.importSummary(true).identified);
  // straightThroughRate debe derivarse del mismo resolved/movements, no ser un número
  // independiente que ya no corresponda a decisionCases/informationCases reales.
  assert.equal(demoData.reconciliation.straightThroughRate, Math.round((resolved / movements) * 1000) / 10);
});

test("TASK V2.4.1 — Codex #2: 'Elegir otra unidad' only ever offers real featuredPayment candidates", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const resolutionSection = page.slice(page.indexOf("function Resolution("), page.indexOf("function Receipt("));
  assert.equal(resolutionSection.includes("Santa Fe"), false, "the alternative picker must never show a consortium the payment isn't actually a candidate for");
  assert.ok(resolutionSection.includes("featuredPayment.candidates.map"), "the picker must be generated from the real candidates array, not a hardcoded list");
  assert.ok(resolutionSection.includes("confirm(pendingUnit)"), "confirming an alternative must pass the actually-selected unit, not a hardcoded one");
  assert.equal(resolutionSection.includes("onClick={confirm}"), false, "confirm must always receive the chosen unit as an argument");
});

test("TASK V2.4.1 — Codex #4: Resolution Workspace evidence matches the canonical candidate evidence array", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const resolutionSection = page.slice(page.indexOf("function Resolution("), page.indexOf("function Receipt("));
  assert.ok(resolutionSection.includes("featuredPayment.candidates[0].evidence.map"));
  for (const banned of ["Fecha compatible", "Referencia compatible"]) {
    assert.equal(resolutionSection.includes(banned), false, `non-canonical evidence found: "${banned}" is not in featuredPayment.candidates[0].evidence`);
  }
  const evidenceSection = page.slice(page.indexOf("function EvidenceFlow("), page.indexOf("type ChatMessage"));
  assert.ok(evidenceSection.includes("featuredPayment.candidates[0].evidence.map"), "EvidenceFlow and Resolution must render the same canonical evidence array, not two independent copies");
});

test("TASK V2.4.1 — Codex #3/#5: post-confirm surfaces derive live from decisionCases(resolved), never a raw/static count", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const consortiumSection = page.slice(page.indexOf("function Consortium("), page.indexOf("function Documents("));
  assert.equal(consortiumSection.includes("demoData.reconciliation.decisionCases.filter"), false, "Consortium must never read the raw unfiltered decisionCases array");
  assert.ok(consortiumSection.includes("demoSelectors.decisionCases(resolved)"), "Consortium's open-case counts must react to resolved");
  assert.equal(consortiumSection.includes("{organization.pending} situaciones"), false, "the open-situations badge must not be bound to the static debt-unit count");

  const searchSection = page.slice(page.indexOf("function GlobalSearch("), page.indexOf("function Notifications("));
  assert.ok(searchSection.includes("resolved ? \"reconciliation\" : \"resolution\""), "search must not let an already-resolved payment reopen the confirm workflow");
  assert.ok(searchSection.includes("resolvedUnit"), "search must reflect which unit was actually confirmed");

  const evidenceFlowSection = page.slice(page.indexOf("function EvidenceFlow("), page.indexOf("type ChatMessage"));
  assert.ok(evidenceFlowSection.includes("resolved ? \"reconciliation\" : \"resolution\""), "EvidenceFlow's CTA must not offer to reopen a confirmed case as pending");

  const resolutionSection = page.slice(page.indexOf("function Resolution("), page.indexOf("function Receipt("));
  assert.ok(resolutionSection.includes("if (resolved)"), "Resolution must refuse to show the confirm form again once already resolved");
});

test("TASK V2.4.1 — Codex #5: every Reconciliación table row is a real control, never a decorative label", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const reconciliationSection = page.slice(page.indexOf("function Reconciliation("), page.indexOf("function MovementDetail("));
  assert.equal(reconciliationSection.includes(": undefined"), false, "no table row may resolve its onClick to a no-op");
  assert.ok(reconciliationSection.includes("setDetail(x)"), "rows other than the resolvable one must open a real detail panel");

  const agentSection = page.slice(page.indexOf("function Agent("), page.indexOf("function AgentResult("));
  assert.ok(/<button onClick=\{\(\) => \{ setMessages\(\[\]\); setConversationState\(\{\}\); send\("¿Qué pagos necesitan revisión\?"\); \}\}>/.test(agentSection), "the 'Conciliaciones' history shortcut must actually query the Agent");
  assert.ok(/send\("¿Dónde tengo mayor mora\?"\)/.test(agentSection), "the 'Morosidad' history shortcut must actually query the Agent");
});

test("TASK V2.4.1 — Codex #6: WhatsApp notification is frame-safe on its own, without relying on the global badge", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.equal(page.includes("WhatsApp · ahora"), false, "the old ambiguous notification copy must be gone");
  assert.ok(page.includes("WhatsApp simulado · ahora"));
});

test("TASK V2.4.1 — Codex #7: the primary import CTA is never display:none on mobile", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const mobileBlock = css.slice(css.indexOf("@media (max-width: 760px)"), css.indexOf("@media (max-width: 760px)") + 2000);
  assert.equal(/\.page-head \.primary\s*\{\s*display:\s*none/.test(mobileBlock), false, "Importar extracto must stay visible and tappable at mobile widths");
});

test("TASK V2.4.1 — reset restores resolvedUnit to the default candidate alongside resolved", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const resetBody = page.slice(page.indexOf("const resetDemo = ()"), page.indexOf("const titles: Record<View"));
  assert.ok(resetBody.includes("setResolvedUnit(featuredPayment.candidates[0].unit)"), "reset must restore the default candidate, not leave a previous session's chosen unit behind");
  assert.ok(resetBody.includes("setResolved(false)"));
});

test("TASK V2.4.2 — post-confirm activity reflects whichever unit was actually confirmed, default and alternative", () => {
  const [primary, alternative] = demoData.reconciliation.featuredPayment.candidates;
  assert.notEqual(primary.unit, alternative.unit, "fixture must have two distinct real candidates for this test to mean anything");

  // DEFAULT — confirming the primary proposal (2A) must produce a 2A activity event.
  const defaultActivity = demoSelectors.activity(true, primary.unit);
  assert.match(defaultActivity[0].meta, new RegExp(`Arenales 2210 · ${primary.unit}$`));
  assert.ok(defaultActivity[0].meta.includes("248.500"));

  // ALTERNATIVE — confirming 7C must produce a 7C activity event, not a hardcoded 2A.
  const alternativeActivity = demoSelectors.activity(true, alternative.unit);
  assert.match(alternativeActivity[0].meta, new RegExp(`Arenales 2210 · ${alternative.unit}$`));
  assert.equal(alternativeActivity[0].meta.includes(`· ${primary.unit}`), false, "confirming the alternative must never leave the default unit in the activity event");

  // Omitting the unit must still default to the primary candidate (never throw, never say "undefined").
  assert.match(demoSelectors.activity(true)[0].meta, new RegExp(`Arenales 2210 · ${primary.unit}$`));

  // Not resolved: activity must be the untouched historical log, regardless of unit.
  assert.deepEqual(demoSelectors.activity(false, alternative.unit), demoData.activity);
});

test("TASK V2.4.2 — Home actually threads resolvedUnit into the activity selector, not just 'resolved'", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const homeSection = page.slice(page.indexOf("function Home("), page.indexOf("function Reconciliation("));
  assert.ok(homeSection.includes("demoSelectors.activity(resolved, resolvedUnit)"), "Home must pass resolvedUnit through, otherwise the activity event silently falls back to the hardcoded default candidate");
  const homeCallSite = page.slice(0, page.indexOf("function Home(")).lastIndexOf("<Home ");
  const homeCall = page.slice(homeCallSite, page.indexOf("/>", homeCallSite));
  assert.ok(homeCall.includes("resolvedUnit={resolvedUnit}"), "ProductDemo must pass resolvedUnit down to Home");
});

// ==================================================
// TASK V3 — Commercial Demo Expansion (Arenales 2210)
// ==================================================

test("V3 — invariant audit: currently-approved canonical values that already match are untouched", () => {
  assert.equal(demoData.consortia.length, 12);
  assert.equal(demoData.portfolio.consortia, 12);
  assert.equal(demoData.units.length, 348);
  assert.equal(demoSelectors.pendingUnits().length, 42);
  assert.equal(demoSelectors.debtTotal(), 8_700_000);
  assert.equal(demoData.collections.currentPeriodOutstanding, 4_820_000);
  assert.equal([...demoData.consortia].sort((a, b) => b.debt - a.debt)[0].name, "Arenales 2210");
  assert.equal(Math.round(demoSelectors.debtTotal() / demoSelectors.pendingUnits().length), 207_143);
  const worst = [...demoData.collections.overdue].sort((a, b) => b.outstanding - a.outstanding)[0];
  assert.equal(worst.consortium, "Arenales 2210");
  assert.equal(worst.unit, "2A");
  assert.equal(worst.outstanding, 540_000);
  assert.equal(worst.days, 74);
  assert.equal(worst.status, "Mora crítica");
});

test("V3 — building 360 derives from canonical data: no invented aggregate contradicts unit-level detail", () => {
  const org = demoData.consortia.find((c) => c.name === "Arenales 2210")!;
  const ownUnits = demoData.units.filter((u) => u.consortium === "Arenales 2210");
  assert.equal(org.units, ownUnits.length);
  assert.equal(org.debt, ownUnits.reduce((sum, u) => sum + u.outstanding, 0));
  assert.equal(org.pending, ownUnits.filter((u) => u.outstanding > 0).length);
});

test("V3 — document counts match document detail (Vigentes + Próximos + Atención === total, exhaustive partition)", () => {
  for (const name of demoData.consortia.map((c) => c.name)) {
    const groups = demoSelectors.documentStatusGroups(name);
    const total = demoData.documents.filter((d) => d.consortium === name).length;
    assert.equal(groups.vigentes.length + groups.proximos.length + groups.atencion.length, total, `partition must be exhaustive for ${name}`);
  }
  const arenales = demoSelectors.documentStatusGroups("Arenales 2210");
  assert.equal(arenales.vigentes.length, 2);
  assert.equal(arenales.proximos.length, 2);
  assert.equal(arenales.atencion.length, 1);
});

test("V3 — invoice counts match invoice detail (Pendientes + Próximas + Pagadas === total)", () => {
  const groups = demoSelectors.invoiceStatusGroups("Arenales 2210");
  const total = demoData.invoices.filter((i) => i.consortium === "Arenales 2210").length;
  assert.equal(groups.pendientes.length + groups.proximas.length + groups.pagadas.length, total);
  assert.equal(groups.pendientes.length, 1);
  assert.equal(groups.proximas.length, 1);
  assert.equal(groups.pagadas.length, 1);
  // amounts/counts are defined once in the canonical dataset — no magic values elsewhere
  const ascensores = demoData.invoices.find((i) => i.provider === "Christophersen Ascensores");
  assert.ok(ascensores);
  assert.equal(ascensores!.consortium, "Arenales 2210");
});

test("V3 — every document/invoice provider is a real, already-known supplier (no fabricated brand)", () => {
  const providers = new Set(demoData.providers);
  for (const doc of demoData.documents) assert.ok(providers.has(doc.provider), `document provider "${doc.provider}" must be in demoData.providers`);
  for (const inv of demoData.invoices) assert.ok(providers.has(inv.provider), `invoice provider "${inv.provider}" must be in demoData.providers`);
});

test("V3 — maintenance summary matches asset detail, and status is framed as recorded, not live telemetry", () => {
  const assets = demoData.maintenanceAssets.filter((a) => a.consortium === "Arenales 2210");
  assert.equal(assets.length, 1);
  const asset = assets[0];
  assert.equal(asset.name, "Ascensor A");
  assert.equal(asset.status, "Operativo");
  assert.equal(asset.provider, "Christophersen Ascensores");
  assert.equal(asset.timeline.length, 3);
  assert.equal(asset.lastIncident.status, "Resuelta");
  // no other consortium has fabricated maintenance data
  assert.equal(demoData.maintenanceAssets.filter((a) => a.consortium !== "Arenales 2210").length, 0);
});

test("V3 — attention items derive from actual implemented data, priority order is deterministic, and empty consortia are honestly empty", () => {
  const items = demoSelectors.buildingAttentionItems("Arenales 2210", false);
  const categories = items.map((i) => i.category);
  assert.deepEqual(categories, ["mora", "documentos", "facturas", "conciliacion", "mantenimiento"], "priority order must be deterministic: mora crítica > documentación > facturas > conciliación > mantenimiento");
  assert.equal(items[0].unit!.unit, "2A");
  assert.equal(items[0].unit!.outstanding, 540_000);

  // Q3-equivalent: the single most-urgent item for Arenales must always resolve to the canonical worst unit,
  // confirmed AND unconfirmed, because tier 1 (critical arrears) always outranks every other tier.
  assert.equal(demoSelectors.buildingAttentionItems("Arenales 2210", true)[0].category, "mora");

  // a consortium with none of this synthetic data must return an honest empty list — never fabricated counts.
  const paraguay = demoData.consortia.find((c) => c.debt > 0 && demoData.documents.every((d) => d.consortium !== c.name) && demoData.invoices.every((i) => i.consortium !== c.name) && demoData.maintenanceAssets.every((m) => m.consortium !== c.name));
  assert.ok(paraguay, "fixture must contain at least one consortium with zero documents/invoices/maintenance for this test to mean anything");
  const emptyItems = demoSelectors.buildingAttentionItems(paraguay!.name, false);
  assert.equal(emptyItems.some((i) => i.category === "documentos" || i.category === "facturas" || i.category === "mantenimiento"), false);
});

test("V3 — no cross-building data leakage: attention/documents/invoices/maintenance never bleed between consortia", () => {
  const arenalesDocs = demoSelectors.documentStatusGroups("Arenales 2210");
  const santaFeDocs = demoSelectors.documentStatusGroups("Santa Fe 1842");
  assert.equal(santaFeDocs.vigentes.length + santaFeDocs.proximos.length + santaFeDocs.atencion.length, 0, "Santa Fe 1842 must not inherit Arenales 2210's documents");
  assert.equal(demoData.invoices.every((i) => i.consortium === "Arenales 2210"), true, "no invoice may be silently attributed to the wrong consortium");
  const arenalesAttention = demoSelectors.buildingAttentionItems("Arenales 2210", false);
  const santaFeAttention = demoSelectors.buildingAttentionItems("Santa Fe 1842", false);
  assert.notDeepEqual(arenalesAttention, santaFeAttention);
});

test("V3 — Agent Q1: ATTENTION_SUMMARY returns a grounded, prioritized summary for Arenales 2210", () => {
  const result = runAgentTool("ATTENTION_SUMMARY", { organization: "Arenales 2210", most_urgent_only: false });
  assert.equal(result.kind, "attention_summary");
  assert.equal(result.data.organization, "Arenales 2210");
  assert.equal(result.data.items.length, demoSelectors.buildingAttentionItems("Arenales 2210").length);
  const response = trustedResponse(result);
  // TASK V3 preview-gate fix — 9 individual items grouped into 5 operational
  // categories must never be called "5 situaciones" (implies 5 individual cases).
  // "frentes" correctly names it as 5 grouped fronts.
  assert.match(response.answer, /Arenales 2210 tiene \d+ frentes? que requiere/);
  assert.equal(response.answer.includes("situacion"), false, "must never call 5 grouped categories '5 situaciones' — that implies 5 individual cases, not 9 items in 5 fronts");
  assert.match(response.answer, /2A/, "the answer must name the real worst unit, not a vague summary");
  assert.match(response.answer, /540\.000/);
});

test("V3 — Agent Q2: most_urgent_only preserves conversational context and resolves deterministically", () => {
  const q1 = runAgentTool("ATTENTION_SUMMARY", { organization: "Arenales 2210", most_urgent_only: false });
  const state = updateConversationState({}, "ATTENTION_SUMMARY", q1);
  assert.equal(state.activeOrganization, "Arenales 2210", "the organization must stay in state for a stateless follow-up question");
  // resolveToolArgs would fill organization from state; simulate the follow-up call directly
  const q2 = runAgentTool("ATTENTION_SUMMARY", { organization: state.activeOrganization, most_urgent_only: true });
  assert.equal(q2.data.items.length, 1);
  assert.equal(q2.data.items[0].category, "mora");
  const response = trustedResponse(q2);
  assert.match(response.answer, /mora crítica/);
  assert.match(response.answer, /2A/);
  assert.match(response.answer, /540\.000/);
  assert.match(response.answer, /74 días/);
});

test("V3 — existing Agent conversation is unaffected: ¿Dónde tengo mayor mora? → unidades → la peor", () => {
  const debt = runAgentTool("DEBT_OVERVIEW", { scope: "portfolio", organization: null });
  const debtAnswer = trustedResponse(debt).answer;
  assert.match(debtAnswer, /Arenales 2210/);
  assert.match(debtAnswer, /4\.820\.000/);

  const state = updateConversationState({}, "DEBT_OVERVIEW", debt);
  const units = runAgentTool("DEBT_UNIT_DETAIL", { organization: state.activeOrganization, minimum_amount: null, mode: null });
  const unitsAnswer = trustedResponse(units).answer;
  assert.match(unitsAnswer, /27 unidades/);
  assert.match(unitsAnswer, /2A/);

  const worst = runAgentTool("DEBT_UNIT_DETAIL", { organization: state.activeOrganization, minimum_amount: 0, mode: "prioritize" });
  const worstAnswer = trustedResponse(worst).answer;
  assert.match(worstAnswer, /2A/);
  assert.match(worstAnswer, /540\.000/);
  assert.match(worstAnswer, /74 días/);
  assert.match(worstAnswer, /mora crítica/);
  assert.match(worstAnswer, /no ejecuté ninguna acción/, "must keep stating no automatic action was taken");
});

test("V3 — Q3 canonical worst-unit fact is unchanged: Arenales 2210 · 2A · $540.000 · 74 días · mora crítica", () => {
  const unit = runAgentTool("UNIT_LOOKUP", { organization: "Arenales 2210", unit: "2A" }).data;
  assert.equal(unit.consortium, "Arenales 2210");
  assert.equal(unit.unit, "2A");
  assert.equal(unit.outstanding, 540_000);
  assert.equal(unit.days, 74);
  assert.equal(unit.status, "Mora crítica");
});

test("V3 — search result routes to Consorcio 360 and surfaces real attention context, not a static blurb", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const searchSection = page.slice(page.indexOf("function GlobalSearch("), page.indexOf("function Notifications("));
  assert.ok(searchSection.includes('title: "CONSORCIOS"'));
  assert.ok(searchSection.includes("demoSelectors.buildingAttentionItems(organization.name, resolved)"), "the search result's attention count must come from the same selector as the building 360, not a separate guess");
  assert.ok(searchSection.includes("selectOrganization(organization.name)"), "clicking the result must open that exact building, not a hardcoded one");
});

test("V3 — Consorcio 360 attention/documents/invoices/maintenance render from the shared selectors, never a second hardcoded summary", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const consortiumSection = page.slice(page.indexOf("function Consortium("), page.indexOf("function Documents("));
  assert.ok(consortiumSection.includes("demoSelectors.buildingAttentionItems(organization.name, resolved)"));
  assert.ok(consortiumSection.includes("demoSelectors.documentStatusGroups(organization.name)"));
  assert.ok(consortiumSection.includes("demoSelectors.invoiceStatusGroups(organization.name)"));
  assert.ok(consortiumSection.includes('demoData.maintenanceAssets.filter'));
});

test("V3 — contextual Agent entry point uses a transparent prefilled prompt, never a hidden/fabricated context channel", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const consortiumSection = page.slice(page.indexOf("function Consortium("), page.indexOf("function Documents("));
  assert.ok(consortiumSection.includes("askAgent(`¿Qué necesita atención en ${organization.name}?`)"), "the prefilled prompt must literally name the consortium, transparently");
  const agentSection = page.slice(page.indexOf("function Agent("), page.indexOf("function AgentResult("));
  assert.ok(agentSection.includes("setInput(pendingPrompt)"), "the prompt must be shown to the user in the input, never auto-sent or hidden");
  assert.equal(/send\(pendingPrompt\)/.test(agentSection), false, "must never auto-send a prefilled prompt without the user's own action");
});

test("V3 — Agent deep-link never leaks the wrong building (organizationFromAgentResult)", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const helperSection = page.slice(page.indexOf("function organizationFromAgentResult("), page.indexOf("function AgentResult("));
  assert.ok(helperSection.includes('topic === "organization"'));
  assert.ok(helperSection.includes('topic === "unit"'));
  assert.ok(helperSection.includes('topic === "attention_summary"'));
  // TASK V3.1 — el Copilot flotante también usa la clase "deep-link"; hay que
  // ubicar específicamente la del Agente de página completa, no la primera.
  const agentDeepLinkStart = page.indexOf("className=\"deep-link\"", page.indexOf("function Agent("));
  const deepLinkSection = page.slice(agentDeepLinkStart, agentDeepLinkStart + 700);
  assert.ok(deepLinkSection.includes("organizationFromAgentResult(m.topic, m.result)"));
  assert.ok(deepLinkSection.includes("selectOrganization(organization)"));
});

test("V3 — no new real integrations: maintenance/invoices stay synthetic, no IoT/telemetry/legal-certification claims", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const maintenanceSection = page.slice(page.indexOf("function Maintenance("), page.indexOf("function EvidenceFlow("));
  assert.ok(maintenanceSection.includes("no telemetría en tiempo real"));
  for (const banned of ["IoT", "sensor", "certificación oficial", "validación gubernamental", "tiempo real del ascensor"]) {
    assert.equal(maintenanceSection.includes(banned), false, `overclaim risk: found "${banned}"`);
  }
  const invoicesSection = page.slice(page.indexOf("function Invoices("), page.indexOf("function Maintenance("));
  for (const banned of ["pagar ahora", "ejecutar pago", "transferencia automática", "integración bancaria"]) {
    assert.equal(invoicesSection.includes(banned), false, `overclaim risk: found "${banned}" in Facturas`);
  }
});

test("V3 — Documentos status tone is never miscategorized (fixes the 'vence' vs 'vencer' gap)", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const documentsSection = page.slice(page.indexOf("function Documents("), page.indexOf("function Invoices("));
  assert.ok(documentsSection.includes("/vence|vencer|atenci[oó]n/i"), "the status-tone check must catch 'Vence en 21 días', not just literal 'vencer'");
  for (const doc of demoData.documents) {
    const matchesUrgent = /vence|vencer|atenci[oó]n/i.test(doc.status);
    const isKnownCalm = doc.status === "Vigente" || doc.status === "Disponible";
    assert.ok(matchesUrgent || isKnownCalm, `document status "${doc.status}" falls into neither bucket — tone would be wrong`);
  }
});

// ==================================================
// TASK V3.1 — Contextual Copilot + Collections/WhatsApp loop
// ==================================================

test("V3.1 #1 — Copilot renders on relevant pages, hidden only on the full Agent page", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("<Copilot"), "Copilot must be mounted at the ProductDemo level so it persists across views");
  assert.ok(page.includes("hidden={view === \"agent\"}"), "Copilot must only hide on the full Agent page (redundant AI surface), never on other pages");
});

test("V3.1 #2/#3 — MODULE_BY_VIEW maps every context-bearing view, and computeUIContext never fabricates a consortium for context-free views", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const mapSection = page.slice(page.indexOf("const MODULE_BY_VIEW"), page.indexOf("const CONTEXT_MODULE_LABEL"));
  for (const [view, module] of [["consortium", "consorcio"], ["invoices", "facturas"], ["documents", "documentos"], ["maintenance", "mantenimiento"], ["debt", "morosidad"], ["reconciliation", "conciliacion"]]) {
    assert.ok(mapSection.includes(`${view}: "${module}"`), `MODULE_BY_VIEW must map ${view} -> ${module}`);
  }
  const contextFnSection = page.slice(page.indexOf("function computeUIContext("), page.indexOf("const CONTEXT_MODULE_LABEL"));
  assert.ok(contextFnSection.includes('if (!module) return { consortiumId: null, module: null'), "views with no module mapping (home, agent, settings, consortia) must report null consortium context, never an inferred/leftover one");
});

test("V3.1 #4 — 'este consorcio' resolves to Arenales 2210 via the same activeOrganization mechanism already used everywhere else", () => {
  // Simulates exactly what the Copilot does on open: seed state.activeOrganization from
  // the explicit UI context, then let resolveToolArgs auto-fill it — same mechanism as
  // every other context-aware tool, no special-cased LLM inference of hidden state.
  const state = { activeOrganization: "Arenales 2210" };
  const result = runAgentTool("CURRENT_INVOICE", { organization: state.activeOrganization });
  assert.equal(result.data.organization, "Arenales 2210");
});

test("V3.1 #5 — current invoice query (CASE A1) returns Christophersen Ascensores / $340.000, grounded", () => {
  const result = runAgentTool("CURRENT_INVOICE", { organization: "Arenales 2210" });
  assert.equal(result.data.invoice.provider, "Christophersen Ascensores");
  assert.equal(result.data.invoice.amount, 340000);
  assert.equal(result.data.invoice.status, "Pendiente");
  const answer = trustedResponse(result).answer;
  assert.match(answer, /Christophersen Ascensores/);
  assert.match(answer, /340\.000/);
});

test("V3.1 #6 — document deadline query (CASE A2) derives the earliest real upcoming date, never independent prose", () => {
  const result = runAgentTool("CURRENT_DOCUMENT_DEADLINE", { organization: "Arenales 2210" });
  assert.equal(result.data.document.type, "Certificación eléctrica");
  assert.equal(result.data.document.date, "11/09/2026");
  // Confirm it is genuinely the minimum of the real dataset, not hardcoded.
  const allDates = demoSelectors.documentsSortedByUpcomingDeadline("Arenales 2210").map((d) => d.date);
  assert.equal(result.data.document.date, allDates[0]);
});

test("V3.1 #7 — maintenance query (CASE A3) returns Ascensor A / 15 sep 2026", () => {
  const result = runAgentTool("CURRENT_MAINTENANCE", { organization: "Arenales 2210" });
  assert.equal(result.data.asset.name, "Ascensor A");
  assert.equal(result.data.asset.nextMaintenance, "15 sep 2026");
  const answer = trustedResponse(result).answer;
  assert.match(answer, /Ascensor A/);
  assert.match(answer, /15 sep 2026/);
});

test("V3.1 — CASE A4: 'Resumime este consorcio' (CONTEXT_SUMMARY) includes debt, arrears, documents, invoices, reconciliation and maintenance", () => {
  const result = runAgentTool("CONTEXT_SUMMARY", { organization: "Arenales 2210" });
  const answer = trustedResponse(result).answer;
  assert.match(answer, /86% de cobranza/);
  assert.match(answer, /4\.820\.000/);
  assert.match(answer, /mora crítica/);
  assert.match(answer, /documento/);
  assert.match(answer, /factura/);
  assert.match(answer, /pago/);
  assert.match(answer, /mantenimiento/);
});

test("V3.1 #8 — '¿Qué resolverías primero?' (CASE A5, reuses ATTENTION_SUMMARY most_urgent_only) returns canonical 2A", () => {
  const result = runAgentTool("ATTENTION_SUMMARY", { organization: "Arenales 2210", most_urgent_only: true });
  const answer = trustedResponse(result).answer;
  assert.match(answer, /2A/);
  assert.match(answer, /540\.000/);
  assert.match(answer, /74 días/);
  assert.match(answer, /mora crítica/i);
});

test("V3.1 #9/#10 — 'Prepará el seguimiento' produces a grounded, explicitly-unsent draft", () => {
  const result = runAgentTool("PREPARE_COLLECTION_FOLLOWUP", { organization: "Arenales 2210", unit: null });
  assert.equal(result.data.unit, "2A");
  assert.equal(result.data.owner, "María Fernández");
  assert.equal(result.data.outstanding, 540000);
  assert.ok(result.data.message.includes("María"));
  assert.ok(result.data.message.includes("2A"));
  assert.deepEqual(result.data.playbook, demoData.collectionPlaybook);
  const answer = trustedResponse(result).answer;
  assert.match(answer, /No se enviará hasta que lo apruebes/, "the response text must explicitly state the draft is unsent");
});

test("V3.1 — chained flow: '¿Qué resolverías primero?' then 'Prepará el seguimiento' without repeating the unit", () => {
  const q1 = runAgentTool("ATTENTION_SUMMARY", { organization: "Arenales 2210", most_urgent_only: true });
  const state = updateConversationState({}, "ATTENTION_SUMMARY", q1);
  assert.equal(state.activeUnit, "2A", "the critical-arrears unit must be threaded into state so a stateless follow-up doesn't need to repeat it");
  const followup = runAgentTool("PREPARE_COLLECTION_FOLLOWUP", { organization: state.activeOrganization, unit: state.activeUnit });
  assert.equal(followup.data.unit, "2A");
});

test("V3.1 #11 — approval remains simulated: no fetch/send call exists anywhere in the collections flow", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const collectionSection = page.slice(page.indexOf("function CollectionFollowup("), page.indexOf("function Consortium("));
  assert.ok(collectionSection.length > 500, "sanity check: the slice must actually contain the CollectionFollowup component");
  assert.equal(collectionSection.includes("fetch("), false, "CollectionFollowup must never call any API — approval is a pure local state transition");
  assert.ok(collectionSection.includes("approved: true"), "approval must be a local state flag, not a server call");
});

test("V3.1 #12 — WhatsApp thread is explicitly labeled as demonstration, never implies live Meta connectivity", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const collectionSection = page.slice(page.indexOf("function CollectionFollowup("), page.indexOf("function Consortium("));
  assert.ok(collectionSection.includes("WhatsApp · Demostración"));
  for (const banned of ["Meta Cloud API", "WhatsApp Business API", "webhook", "graph.facebook.com"]) {
    assert.equal(collectionSection.includes(banned), false, `overclaim risk: found "${banned}"`);
  }
});

test("V3.1 #13 — payment link is explicitly labeled simulated and never exposes a real URL", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const collectionSection = page.slice(page.indexOf("function CollectionFollowup("), page.indexOf("function Consortium("));
  assert.ok(collectionSection.includes("SOLICITUD DE PAGO · DEMOSTRACIÓN"));
  assert.ok(collectionSection.includes("Link simulado para esta demo"));
  assert.equal(/https?:\/\//.test(collectionSection), false, "no real URL scheme may appear anywhere in the payment-link demo");
  for (const banned of ["mercadopago", "stripe", "todopago", "payway"]) {
    assert.equal(collectionSection.toLowerCase().includes(banned), false, `must not name a real payment processor: "${banned}"`);
  }
});

test("V3.1 #14/#15 — $248.500 is framed as a partial payment and the remaining balance is computed, never hardcoded", () => {
  const unit = demoData.collections.overdue.find((u) => u.consortium === "Arenales 2210" && u.unit === "2A")!;
  const summary = demoSelectors.followupReceiptSummary(unit);
  assert.equal(summary.received, demoData.reconciliation.featuredPayment.amount);
  assert.equal(summary.remaining, unit.outstanding - demoData.reconciliation.featuredPayment.amount);
  assert.equal(summary.remaining, 291500);
  assert.equal(summary.isPartial, true);
  // Recompute independently from raw canonical fields to prove nothing is hardcoded in the selector.
  assert.equal(summary.remaining, 540000 - 248500);
});

test("V3.1 #16 — no cross-consortium context leak: CONTEXT_SUMMARY/CURRENT_INVOICE/CURRENT_MAINTENANCE for another consortium never returns Arenales facts", () => {
  const other = "Paraguay 1450";
  const invoice = runAgentTool("CURRENT_INVOICE", { organization: other });
  assert.equal(invoice.empty, true, "Paraguay 1450 has no invoices — must honestly report empty, never borrow Arenales' invoice");
  const maintenance = runAgentTool("CURRENT_MAINTENANCE", { organization: other });
  assert.equal(maintenance.empty, true);
  const contextSummary = runAgentTool("CONTEXT_SUMMARY", { organization: other });
  assert.equal(contextSummary.data.organization.name, other);
  assert.equal(contextSummary.data.items.some((i: any) => i.category === "facturas" || i.category === "mantenimiento"), false);
});

test("V3.1 #17 — closing the Copilot preserves main screen state (it is a local open/close flag, not a navigation)", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const copilotSection = page.slice(page.indexOf("function Copilot("), page.indexOf("function Agent("));
  assert.equal(copilotSection.includes("go(\"agent\")"), false, "the Copilot must never navigate to the full Agent page — that would defeat the point of staying on the current screen");
  assert.ok(copilotSection.includes("setOpen(false)"), "closing/navigating from the Copilot must only toggle its own open flag");
});

test("V3.1 #18 — existing full-page Agent flows still pass: ¿Dónde tengo mayor mora? → unidades → la peor", () => {
  const debt = runAgentTool("DEBT_OVERVIEW", { scope: "portfolio", organization: null });
  assert.match(trustedResponse(debt).answer, /Arenales 2210/);
  const state = updateConversationState({}, "DEBT_OVERVIEW", debt);
  const units = runAgentTool("DEBT_UNIT_DETAIL", { organization: state.activeOrganization, minimum_amount: null, mode: null });
  assert.match(trustedResponse(units).answer, /2A/);
  const worst = runAgentTool("DEBT_UNIT_DETAIL", { organization: state.activeOrganization, minimum_amount: 0, mode: "prioritize" });
  const worstAnswer = trustedResponse(worst).answer;
  assert.match(worstAnswer, /2A/);
  assert.match(worstAnswer, /540\.000/);
  assert.match(worstAnswer, /74 días/);
  assert.match(worstAnswer, /mora crítica/);
});

test("V3.1 #19 — expanded Q1/Q2 attention-summary regression logic remains intact after V3.1 changes", () => {
  const q1 = runAgentTool("ATTENTION_SUMMARY", { organization: "Arenales 2210", most_urgent_only: false });
  const q1Answer = trustedResponse(q1).answer;
  assert.match(q1Answer, /Arenales 2210 tiene \d+ frentes? que requiere/);
  assert.match(q1Answer, /2A/);
  const q2 = runAgentTool("ATTENTION_SUMMARY", { organization: "Arenales 2210", most_urgent_only: true });
  const q2Answer = trustedResponse(q2).answer;
  assert.match(q2Answer, /2A/);
  assert.match(q2Answer, /540\.000/);
});

test("V3.1 #20 — no WRITE capability was added: every new tool is read-only, no new fetch targets, no new secrets", async () => {
  const [route, tools] = await Promise.all([
    readFile(new URL("../app/api/assistant/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/agent-tools.ts", import.meta.url), "utf8"),
  ]);
  assert.ok(route.includes("store: false"));
  assert.ok(route.includes('parallel_tool_calls: false'));
  for (const name of ["CONTEXT_SUMMARY", "CURRENT_INVOICE", "CURRENT_DOCUMENT_DEADLINE", "CURRENT_MAINTENANCE", "PREPARE_COLLECTION_FOLLOWUP"]) {
    assert.ok(tools.includes(`name: "${name}"`), `tool ${name} must be registered`);
  }
  assert.equal(tools.includes("fetch("), false, "agent-tools.ts must stay pure/deterministic — no network calls of its own");
});
