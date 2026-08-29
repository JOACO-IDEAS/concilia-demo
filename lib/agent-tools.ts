import { demoData, demoSelectors } from "./demo-data.ts";

type Json = Record<string, unknown>;
export type ConversationState = {
  activeOrganization?: string | null;
  activeUnit?: string | null;
  activePayment?: string | null;
  activeDocument?: string | null;
  activeProvider?: string | null;
  lastTool?: string | null;
  lastKind?: string | null;
  lastMinimumAmount?: number | null;
};
export type ToolResult = { kind: string; data: any; empty?: boolean; args?: Json };

export const agentTools = [
  { type: "function", name: "PORTFOLIO_OVERVIEW", description: "Totales de cartera: cantidad de consorcios, unidades, situaciones de atención, decisiones y deuda pendiente.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
  { type: "function", name: "TODAY_ATTENTION", description: "Prioridades, decisiones, información pendiente y vencimientos de hoy.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
  { type: "function", name: "RECONCILIATION_REVIEW", description: "Conciliaciones que requieren revisión, opcionalmente para el consorcio activo.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { organization: { type: ["string", "null"] } }, required: ["organization"] } },
  { type: "function", name: "RECONCILIATION_LOOKUP", description: "Busca un pago por importe, consorcio, unidad o referencia.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { amount: { type: ["number", "null"] }, organization: { type: ["string", "null"] }, unit: { type: ["string", "null"] }, reference: { type: ["string", "null"] } }, required: ["amount", "organization", "unit", "reference"] } },
  { type: "function", name: "DEBT_OVERVIEW", description: "Resumen y ranking de mora. Usar scope portfolio para saber dónde está la mayor mora y active_organization para el consorcio en contexto.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { organization: { type: ["string", "null"] }, scope: { type: "string", enum: ["portfolio", "active_organization"] } }, required: ["organization", "scope"] } },
  { type: "function", name: "DEBT_UNIT_DETAIL", description: "Lista, filtra o prioriza unidades morosas de un consorcio.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { organization: { type: ["string", "null"] }, minimum_amount: { type: ["number", "null"] }, mode: { type: ["string", "null"], enum: ["list", "prioritize", null] } }, required: ["organization", "minimum_amount", "mode"] } },
  { type: "function", name: "ORGANIZATION_LOOKUP", description: "Resumen de un consorcio: estado, unidades, cobranza, mora, conciliaciones y documentos.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { organization: { type: ["string", "null"] } }, required: ["organization"] } },
  { type: "function", name: "UNIT_LOOKUP", description: "Busca una unidad canónica y devuelve su consorcio, propietario, saldo y estado.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { organization: { type: ["string", "null"] }, unit: { type: ["string", "null"] } }, required: ["organization", "unit"] } },
  { type: "function", name: "DOCUMENT_LOOKUP", description: "Busca documentos por proveedor, consorcio, período o tipo.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { provider: { type: ["string", "null"] }, organization: { type: ["string", "null"] }, period: { type: ["string", "null"] }, document_type: { type: ["string", "null"] } }, required: ["provider", "organization", "period", "document_type"] } },
  { type: "function", name: "UPCOMING_DOCUMENTS", description: "Documentos próximos a vencer o incompletos, opcionalmente del consorcio activo.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { organization: { type: ["string", "null"] } }, required: ["organization"] } },
  { type: "function", name: "PAYMENT_EVIDENCE", description: "Evidencia y motivo de propuesta para un pago o candidato.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { reference: { type: ["string", "null"] }, organization: { type: ["string", "null"] }, unit: { type: ["string", "null"] } }, required: ["reference", "organization", "unit"] } },
  { type: "function", name: "DOCUMENT_PAYMENT_STATUS", description: "Consulta si existe una relación explícita entre el documento activo y un pago.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { document: { type: ["string", "null"] } }, required: ["document"] } },
  { type: "function", name: "ATTENTION_SUMMARY", description: "Resumen priorizado de todo lo que requiere atención en un consorcio: mora crítica, documentos, facturas, conciliación y mantenimiento. Usar most_urgent_only=true cuando preguntan específicamente qué es lo más urgente/prioritario.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { organization: { type: ["string", "null"] }, most_urgent_only: { type: "boolean" } }, required: ["organization", "most_urgent_only"] } },
] as const;

const norm = (value: unknown) => String(value ?? "").toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const includes = (actual: unknown, wanted: unknown) => !wanted || norm(actual).includes(norm(wanted));
const money = (value: number) => `$${value.toLocaleString("es-AR")}`;
const shortDate = (value: string) => new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value)).replace(" de ", " ").replace(" de ", " ");
const orgByName = (name: unknown) => demoData.consortia.find((x) => includes(x.name, name));
const needsDocumentAttention = (status: string) => norm(status).includes("vence") || norm(status).includes("vencer") || norm(status).includes("incompleta");

export function resolveToolArgs(name: string, raw: Json, state: ConversationState): Json {
  const args = { ...raw };
  if (["RECONCILIATION_REVIEW", "DEBT_UNIT_DETAIL", "ORGANIZATION_LOOKUP", "DOCUMENT_LOOKUP", "UPCOMING_DOCUMENTS", "PAYMENT_EVIDENCE", "ATTENTION_SUMMARY"].includes(name) && !args.organization) args.organization = state.activeOrganization ?? null;
  if (name === "DEBT_OVERVIEW" && args.scope === "active_organization" && !args.organization) args.organization = state.activeOrganization ?? null;
  if (name === "DEBT_UNIT_DETAIL" && args.minimum_amount == null && state.lastKind === "debt_units") args.minimum_amount = state.lastMinimumAmount ?? null;
  if (name === "RECONCILIATION_LOOKUP" && !args.reference && state.activePayment) args.reference = state.activePayment;
  if (name === "PAYMENT_EVIDENCE") {
    if (!args.reference) args.reference = state.activePayment ?? null;
    if (!args.unit) args.unit = state.activeUnit ?? null;
  }
  if (name === "DOCUMENT_LOOKUP" && !args.provider && state.activeProvider) args.provider = state.activeProvider;
  if (name === "DOCUMENT_PAYMENT_STATUS" && !args.document) args.document = state.activeDocument ?? null;
  if (name === "UNIT_LOOKUP") {
    if (!args.organization) args.organization = state.activeOrganization ?? null;
    if (!args.unit) args.unit = state.activeUnit ?? null;
  }
  return args;
}

export function inferDeterministicRead(
  message: string,
  state: ConversationState,
): { name: "UNIT_LOOKUP"; arguments: Json } | null {
  const text = norm(message);
  const explicitOrganization = demoData.consortia.find((item) =>
    text.includes(norm(item.name)),
  )?.name;
  const unitMatch = text.match(/\b(?:unidad\s*)?(\d{1,3}[a-z])\b/i);
  const explicitUnit = unitMatch?.[1]?.toUpperCase() ?? null;
  const asksAboutUnit =
    /\b(quien|propietari|corresponde|unidad|saldo|estado|debe)\b/.test(text);
  const asksAboutAnotherDomain =
    /\b(pago|transferencia|conciliacion|factura|documento|comprobante)\b/.test(
      text,
    );
  const organization = explicitOrganization ?? state.activeOrganization ?? null;
  const unit = explicitUnit ?? (asksAboutUnit ? state.activeUnit ?? null : null);
  if (organization && unit && asksAboutUnit && !asksAboutAnotherDomain) {
    return { name: "UNIT_LOOKUP", arguments: { organization, unit } };
  }
  return null;
}

export function runAgentTool(name: string, args: Json): ToolResult {
  switch (name) {
    case "PORTFOLIO_OVERVIEW": return { kind: "portfolio", args, data: { consortia: demoData.portfolio.consortia, units: demoData.portfolio.units, attention: demoSelectors.attentionCases().length, decisions: demoSelectors.decisionCases().length, pending: demoSelectors.debtTotal(), pendingUnits: demoSelectors.pendingUnits().length } };
    case "TODAY_ATTENTION":
      return { kind: "today", args, data: { decisions: demoSelectors.decisionCases().length, needsInformation: demoData.reconciliation.informationCases.length, priorityPayment: demoData.reconciliation.featuredPayment, priorityDebt: { ...demoData.collections.overdue[0], amount: demoData.collections.overdue[0].outstanding }, deadlines: demoData.documents.filter((d) => needsDocumentAttention(d.status)) } };
    case "RECONCILIATION_REVIEW": { const payments = demoData.reconciliation.decisionCases.filter((payment) => !args.organization || payment.candidates.some((candidate) => includes(candidate.consortium, args.organization))); return { kind: "reconciliation", args, data: { organization: args.organization || null, summary: demoData.reconciliation, payments }, empty: payments.length === 0 }; }
    case "RECONCILIATION_LOOKUP": { const p = demoData.reconciliation.featuredPayment; const match = (!args.amount || Number(args.amount) === p.amount) && includes(p.reference, args.reference) && p.candidates.some((c) => includes(c.consortium, args.organization) && includes(c.unit, args.unit)); return { kind: "payment", args, data: match ? p : null, empty: !match }; }
    case "DEBT_OVERVIEW": { const requested = args.scope === "active_organization" && args.organization ? orgByName(args.organization) : null; const ranked = [...demoData.consortia].sort((a,b) => b.debt-a.debt); const selected = requested || ranked[0]; return { kind: "debt", args, data: { scope: requested ? "organization" : "ranking", organization: selected, portfolio: { pending: demoData.collections.pending, unitsWithBalance: demoData.collections.unitsWithBalance }, ranking: ranked.map(({ name, debt, pending, status }) => ({ name, debt, unitsWithBalance: pending, status })) }, empty: !selected }; }
    case "DEBT_UNIT_DETAIL": { const organization = orgByName(args.organization); if (!organization) return { kind: "needs_context", args, data: { missing: "organization" }, empty: true }; const minimum = Number(args.minimum_amount || 0); const all = demoData.collections.overdue.filter((x) => x.consortium === organization.name).map((x) => ({ ...x, amount: x.outstanding })).sort((a,b) => b.amount-a.amount); const filtered = all.filter((x) => x.amount > minimum); const units = args.mode === "prioritize" ? filtered.slice(0, 1) : filtered; return { kind: "debt_units", args: { ...args, organization: organization.name, minimum_amount: minimum || null }, data: { organization: organization.name, totalDebt: organization.debt, totalUnits: organization.pending, minimumAmount: minimum || null, mode: args.mode || "list", detailedUnits: all.length, units }, empty: units.length === 0 }; }
    case "ORGANIZATION_LOOKUP": { const org = orgByName(args.organization); return { kind: org ? "organization" : "needs_context", args, data: org ? { ...org, overdue: demoData.collections.overdue.filter((x) => x.consortium === org.name), reconciliation: demoData.reconciliation.featuredPayment.candidates.some((c) => c.consortium === org.name) ? [demoData.reconciliation.featuredPayment] : [], documents: demoData.documents.filter((x) => x.consortium === org.name) } : { missing: "organization" }, empty: !org }; }
    case "UNIT_LOOKUP": { const organization = orgByName(args.organization); if (!organization || !args.unit) return { kind: "needs_context", args, data: { missing: organization ? "unit" : "organization" }, empty: true }; const unit = demoSelectors.unit(organization.name, String(args.unit)); return { kind: "unit", args, data: unit ?? null, empty: !unit }; }
    case "DOCUMENT_LOOKUP": { const docs = demoData.documents.filter((d) => includes(d.provider, args.provider) && includes(d.consortium, args.organization) && includes(d.type, args.document_type) && (!args.period || (norm(args.period).includes("marzo") ? d.date.includes("/03/") : norm(d.date).includes(norm(args.period))))); return { kind: "document", args, data: { filters: args, documents: docs }, empty: docs.length === 0 }; }
    case "UPCOMING_DOCUMENTS": { const docs = demoData.documents.filter((d) => includes(d.consortium, args.organization) && needsDocumentAttention(d.status)); return { kind: "documents_upcoming", args, data: { organization: args.organization || null, documents: docs }, empty: docs.length === 0 }; }
    case "PAYMENT_EVIDENCE": { const p = demoData.reconciliation.featuredPayment; const referenceMatches = !args.reference || includes(p.reference, args.reference); const candidate = p.candidates.find((c) => includes(c.consortium, args.organization) && includes(c.unit, args.unit)) || p.candidates[0]; return { kind: "evidence", args, data: referenceMatches ? { payment: { amount: p.amount, reference: p.reference, receivedAt: p.receivedAt }, candidate, alternatives: p.candidates.length, requiresHumanConfirmation: p.candidates.length > 1 } : null, empty: !referenceMatches }; }
    case "DOCUMENT_PAYMENT_STATUS": return { kind: "document_payment_status", args, data: { document: args.document || null, relationAvailable: false } };
    case "ATTENTION_SUMMARY": { const organization = orgByName(args.organization); if (!organization) return { kind: "needs_context", args, data: { missing: "organization" }, empty: true }; const items = demoSelectors.buildingAttentionItems(organization.name); const selected = args.most_urgent_only ? items.slice(0, 1) : items; return { kind: "attention_summary", args: { ...args, organization: organization.name }, data: { organization: organization.name, mostUrgentOnly: !!args.most_urgent_only, items: selected, totalCategories: items.length }, empty: items.length === 0 }; }
    default: return { kind: "unsupported", args, data: null, empty: true };
  }
}

export function updateConversationState(previous: ConversationState, tool: string, result: ToolResult): ConversationState {
  const next = { ...previous, lastTool: tool, lastKind: result.kind };
  const data = result.data;
  if (data?.organization?.name) next.activeOrganization = data.organization.name;
  else if (typeof data?.organization === "string") next.activeOrganization = data.organization;
  else if (data?.consortium) next.activeOrganization = data.consortium;
  if (data?.reference) next.activePayment = data.reference;
  if (data?.payment?.reference) next.activePayment = data.payment.reference;
  if (data?.payments?.[0]?.reference) { next.activePayment = data.payments[0].reference; next.activeUnit = data.payments[0].candidates?.[0]?.unit || next.activeUnit; next.activeOrganization = data.payments[0].candidates?.[0]?.consortium || next.activeOrganization; }
  if (data?.candidate?.unit) next.activeUnit = data.candidate.unit;
  if (data?.documents?.[0]) { next.activeDocument = data.documents[0].number || data.documents[0].type; next.activeProvider = data.documents[0].provider; next.activeOrganization = data.documents[0].consortium; }
  if (result.kind === "debt_units") next.lastMinimumAmount = data.minimumAmount;
  return next;
}

const CATEGORY_LABEL: Record<string, string> = { mora: "mora crítica", documentos: "documentación", facturas: "facturas", conciliacion: "conciliación", mantenimiento: "mantenimiento" };
function describeAttentionItem(item: any): string {
  switch (item.category) {
    case "mora": return `${item.count} unidad${item.count === 1 ? "" : "es"} en mora crítica (${item.unit.unit} · ${money(item.unit.outstanding)} · ${item.unit.days} días)`;
    case "documentos": return `${item.count} documento${item.count === 1 ? "" : "s"} próximo${item.count === 1 ? "" : "s"} a vencer o que requiere${item.count === 1 ? "" : "n"} atención (${item.documents.map((doc: any) => doc.type).join(", ")})`;
    case "facturas": return `${item.count} factura${item.count === 1 ? "" : "s"} pendiente${item.count === 1 ? "" : "s"} o próxima${item.count === 1 ? "" : "s"} a vencer (${item.invoices.map((inv: any) => inv.provider).join(", ")})`;
    case "conciliacion": return `${item.count} pago${item.count === 1 ? "" : "s"} para revisar (el más reciente: ${money(item.payment.amount)})`;
    case "mantenimiento": return `${item.count} mantenimiento${item.count === 1 ? "" : "s"} programado${item.count === 1 ? "" : "s"} (${item.asset.name}, próximo: ${item.asset.nextMaintenance})`;
    default: return "";
  }
}

export function trustedResponse(result: ToolResult) {
  const d = result.data;
  if (result.kind === "needs_context") return { answer: "Necesito saber de qué consorcio.", suggestions: ["¿Cómo está Arenales 2210?", "¿Cómo está Santa Fe 1842?"] };
  if (result.empty) return { answer: result.kind === "debt_units" ? "No encontré unidades que coincidan con ese filtro." : "No encontré resultados que coincidan en los datos simulados.", suggestions: [] };
  switch (result.kind) {
    case "portfolio": return { answer: `Administrás ${d.consortia} consorcios y ${d.units} unidades. Hoy hay ${d.attention} situaciones que requieren atención, de las cuales ${d.decisions} requieren decisión. La deuda pendiente total es ${money(d.pending)} en ${d.pendingUnits} unidades.`, suggestions: ["¿Qué requiere mi atención hoy?", "¿Dónde tengo mayor mora?", "Mostrame las conciliaciones"] };
    case "today": return { answer: `Hoy hay ${d.decisions} conciliaciones que requieren decisión y ${d.needsInformation} que necesitan información. La prioridad es revisar el pago de ${money(d.priorityPayment.amount)} y la unidad ${d.priorityDebt.unit} de ${d.priorityDebt.consortium}, con ${money(d.priorityDebt.amount)} pendientes.`, suggestions: ["Mostrame las conciliaciones", "Explicame la más urgente", "¿Hay algún documento que venza pronto?"] };
    case "reconciliation": return { answer: d.payments.length ? `Hay ${d.summary.requiresDecision} conciliaciones que requieren decisión. La más urgente es el pago de ${money(d.payments[0].amount)} recibido el ${shortDate(d.payments[0].receivedAt)}, con ${d.payments[0].candidates.length} unidades compatibles.` : "No encontré conciliaciones pendientes para ese consorcio.", suggestions: d.payments.length ? ["Explicame la más urgente", "¿Por qué corresponde a esa unidad?", `Buscame el pago de ${money(d.payments[0].amount)}`] : [] };
    case "payment": return { answer: `Encontré el pago de ${money(d.amount)}, referencia ${d.reference}. Tiene ${d.candidates.length} unidades compatibles y requiere confirmación humana.`, suggestions: ["¿Por qué corresponde a esa unidad?", "¿Llegó el comprobante?", "Mostrame las conciliaciones"] };
    case "evidence": return { answer: `ConcilIA propone ${d.candidate.consortium} · ${d.candidate.unit} por estas señales: ${d.candidate.evidence.join(", ").toLowerCase()}. Como hay ${d.alternatives} candidatos compatibles, requiere confirmación humana.`, suggestions: ["Mostrame las conciliaciones", "¿Cómo está ese consorcio?", "¿Dónde tengo mayor mora?"] };
    case "debt": return { answer: `La mayor mora está en ${d.organization.name}: ${money(d.organization.debt)} pendientes en ${d.organization.pending} unidades.`, suggestions: ["¿Cuáles son las unidades en mora?", "Mostrame sólo las que deben más de $300.000", "¿Cuál atenderías primero?"] };
    case "debt_units": { const first = d.units[0]; if (d.mode === "prioritize") return { answer: `Empezaría por ${d.organization} · ${first.unit}: tiene ${money(first.amount)} pendientes, ${first.days} días de atraso y estado ${first.status.toLowerCase()}. Es una recomendación de priorización; no ejecuté ninguna acción.`, suggestions: ["Mostrame todas las unidades en mora", `¿Cómo está ${d.organization}?`, "Mostrame sólo las que deben más de $300.000"] }; const lead = d.minimumAmount ? `Hay ${d.units.length} unidades de ${d.organization} que superan ${money(d.minimumAmount)}.` : `En ${d.organization} hay ${d.totalUnits} unidades con saldo pendiente. Estas son las ${d.units.length} situaciones con detalle disponible.`; const rows = d.units.map((x: any) => `${x.unit} — ${money(x.amount)} — ${x.status}`).join("\n"); return { answer: `${lead}\n${rows}`, suggestions: ["Mostrame sólo las que deben más de $300.000", "¿Cuál atenderías primero?", `¿Cómo está ${d.organization}?`] }; }
    case "organization": { const operational = typeof d.reconciliationPending === "number" ? ` Tiene ${d.reconciliationPending} conciliaciones para revisar y ${d.documentsUpcoming} documentos próximos a vencer.` : ""; return { answer: `${d.name} tiene ${d.units} unidades, ${d.collectionRate}% de cobranza, ${money(d.debt)} pendientes en ${d.pending} unidades y estado ${d.status.toLowerCase()}.${operational}`, suggestions: ["¿Cuáles son las unidades en mora?", "¿Qué pagos tengo para revisar?", "Buscame la factura del ascensor de marzo"] }; }
    case "unit": return { answer: `${d.consortium} · ${d.unit} corresponde a ${d.owner}. Tiene ${money(d.outstanding)} pendientes y estado ${d.status.toLowerCase()}.`, suggestions: [`¿Cómo está ${d.consortium}?`, "¿Cuáles son las unidades en mora?", "¿Dónde tengo mayor mora?"] };
    case "document": { const x = d.documents[0]; return { answer: `Encontré ${x.type.toLowerCase()} de ${x.provider}, ${x.consortium}, por ${money(x.amount)}, con fecha ${x.date}. Estado: ${x.status}.`, suggestions: ["¿Hay algún documento que venza pronto?", "¿Cómo está ese consorcio?", "¿Ya se pagó?"] }; }
    case "documents_upcoming": return { answer: `Hay ${d.documents.length} documentos que requieren atención: ${d.documents.map((x: any) => `${x.type} de ${x.consortium} (${x.status})`).join("; ")}.`, suggestions: ["Buscame la factura del ascensor de marzo", "¿Cómo está Arenales 2210?", "Volvamos a la mora. ¿Cuál atenderías primero?"] };
    case "document_payment_status": return { answer: "No puedo determinar de forma confiable si esa factura ya fue pagada porque el dataset no tiene una relación explícita entre ese documento y un pago.", suggestions: ["¿Hay algún documento que venza pronto?", "Volvamos a la mora. ¿Cuál atenderías primero?"] };
    case "attention_summary": {
      if (d.mostUrgentOnly) {
        const item = d.items[0];
        return { answer: `Lo más urgente en ${d.organization} es ${CATEGORY_LABEL[item.category]}: ${describeAttentionItem(item)}.`, suggestions: ["¿Qué más necesita atención?", "¿Dónde tengo mayor mora?", `¿Cómo está ${d.organization}?`] };
      }
      const lines = d.items.map((item: any) => describeAttentionItem(item));
      return { answer: `${d.organization} tiene ${d.items.length} ${d.items.length === 1 ? "frente" : "frentes"} que requiere${d.items.length === 1 ? "" : "n"} atención: ${lines.join("; ")}.`, suggestions: ["¿Qué es lo más urgente?", "¿Dónde tengo mayor mora?", `¿Cómo está ${d.organization}?`] };
    }
    default: return { answer: "Todavía no puedo consultar ese detalle.", suggestions: ["¿Qué requiere mi atención hoy?", "¿Dónde tengo mayor mora?"] };
  }
}

export function trustedPresentation(result: ToolResult) {
  const actionByKind: Record<string, { label: string; view: string } | null> = { portfolio: { label: "Ver inicio", view: "home" }, today: { label: "Ver prioridades", view: "home" }, reconciliation: { label: "Ver conciliaciones", view: "reconciliation" }, payment: { label: "Revisar pago", view: "resolution" }, evidence: { label: "Ver evidencia", view: "evidence" }, debt: { label: "Ver morosidad", view: "debt" }, debt_units: { label: "Ver morosidad", view: "debt" }, organization: { label: "Ver consorcio", view: "consortium" }, unit: { label: "Ver consorcio", view: "consortium" }, document: { label: "Ver documentos", view: "documents" }, documents_upcoming: { label: "Ver documentos", view: "documents" }, attention_summary: { label: "Ver consorcio", view: "consortium" } };
  return { topic: result.kind, result: result.data, action: actionByKind[result.kind] ?? null };
}
