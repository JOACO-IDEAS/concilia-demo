export const DEMO_DATE = "2026-08-21T11:00:00-03:00";

type PendingSeed = { unit: string; owner: string; amount: number; days?: number; lastContact?: string; promise?: string | null; status?: string };
type ConsortiumSeed = { name: string; neighborhood: string; units: number; collectionRate: number; debt: number; pending: number; status: string; pendingSeeds?: PendingSeed[]; reconciliationPending?: number; documentsUpcoming?: number };

const consortiumSeeds: ConsortiumSeed[] = [
  { name: "Santa Fe 1842", neighborhood: "Recoleta", units: 48, collectionRate: 94, debt: 620000, pending: 3, status: "Atención", pendingSeeds: [{ unit: "4B", owner: "Laura Méndez", amount: 310000, days: 45, lastContact: "12 ago 2026", promise: null, status: "Mora alta" }] },
  { name: "Arenales 2210", neighborhood: "Recoleta", units: 27, collectionRate: 86, debt: 4820000, pending: 27, reconciliationPending: 3, documentsUpcoming: 2, status: "Prioridad", pendingSeeds: [
    { unit: "2A", owner: "María Fernández", amount: 540000, days: 74, lastContact: "11 ago 2026", promise: null, status: "Mora crítica" },
    { unit: "7C", owner: "Sofía Bianchi", amount: 390000, days: 51, lastContact: "12 ago 2026", promise: "19 ago 2026", status: "Mora alta" },
    { unit: "8C", owner: "Ana Paredes", amount: 285000, days: 47, lastContact: "15 ago 2026", promise: null, status: "Sin promesa" },
    { unit: "6A", owner: "Nicolás Suárez", amount: 245000, days: 34, lastContact: "18 ago 2026", promise: "28 ago 2026", status: "Promesa activa" },
    { unit: "12A", owner: "María Paz Roldán", amount: 198000, days: 31, lastContact: "17 ago 2026", promise: null, status: "Seguimiento sugerido" },
  ] },
  { name: "Paraguay 1450", neighborhood: "Palermo", units: 32, collectionRate: 97, debt: 415000, pending: 1, status: "Estable" },
  { name: "Juncal 2860", neighborhood: "Recoleta", units: 26, collectionRate: 96, debt: 310000, pending: 1, status: "Estable" },
  { name: "Las Heras 1735", neighborhood: "Recoleta", units: 35, collectionRate: 91, debt: 780000, pending: 3, status: "Atención" },
  { name: "Pueyrredón 1180", neighborhood: "Balvanera", units: 30, collectionRate: 95, debt: 280000, pending: 1, status: "Estable" },
  { name: "Montevideo 950", neighborhood: "Recoleta", units: 24, collectionRate: 96, debt: 250000, pending: 1, status: "Estable" },
  { name: "Charcas 3120", neighborhood: "Palermo", units: 28, collectionRate: 94, debt: 240000, pending: 1, status: "Estable" },
  { name: "Libertad 1280", neighborhood: "Recoleta", units: 22, collectionRate: 99, debt: 0, pending: 0, status: "Al día" },
  { name: "Córdoba 2450", neighborhood: "Balvanera", units: 29, collectionRate: 93, debt: 300000, pending: 1, status: "Atención" },
  { name: "Ayacucho 1560", neighborhood: "Recoleta", units: 25, collectionRate: 97, debt: 230000, pending: 1, status: "Estable" },
  { name: "Billinghurst 2045", neighborhood: "Palermo", units: 22, collectionRate: 94, debt: 455000, pending: 2, status: "Estable" },
];

const makeGeneratedPending = (seed: ConsortiumSeed, reserved: Set<string>) => {
  const explicit = seed.pendingSeeds ?? [];
  const missing = seed.pending - explicit.length;
  const remainingDebt = seed.debt - explicit.reduce((sum, unit) => sum + unit.amount, 0);
  const base = missing > 0 ? Math.floor(remainingDebt / missing) : 0;
  let remainder = missing > 0 ? remainingDebt - base * missing : 0;
  const generated: PendingSeed[] = [];
  for (let index = 1; index <= missing; index += 1) {
    let unit = `U${String(index).padStart(2, "0")}`;
    while (reserved.has(unit)) unit = `${unit}X`;
    reserved.add(unit);
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    generated.push({ unit, owner: `Propietario sintético ${seed.name} ${index}`, amount: base + extra, days: 22 + (index % 28), lastContact: "18 ago 2026", promise: null, status: index % 3 === 0 ? "Seguimiento sugerido" : "Mora moderada" });
  }
  return [...explicit, ...generated];
};

const units = consortiumSeeds.flatMap((seed) => {
  const reserved = new Set((seed.pendingSeeds ?? []).map((unit) => unit.unit));
  const pending = makeGeneratedPending(seed, reserved);
  const rows = pending.map((unit) => ({ id: `${seed.name}:${unit.unit}`, consortium: seed.name, unit: unit.unit, owner: unit.owner, outstanding: unit.amount, days: unit.days ?? 30, lastContact: unit.lastContact ?? "18 ago 2026", promise: unit.promise ?? null, status: unit.status ?? "Mora moderada" }));
  for (let index = rows.length + 1; index <= seed.units; index += 1) {
    let unit = `U${String(index).padStart(2, "0")}`;
    while (reserved.has(unit)) unit = `${unit}X`;
    reserved.add(unit);
    rows.push({ id: `${seed.name}:${unit}`, consortium: seed.name, unit, owner: `Propietario sintético ${seed.name} ${index}`, outstanding: 0, days: 0, lastContact: "—", promise: null, status: "Al día" });
  }
  return rows;
});

const consortia = consortiumSeeds.map((seed) => {
  const ownUnits = units.filter((unit) => unit.consortium === seed.name);
  return { name: seed.name, neighborhood: seed.neighborhood, units: ownUnits.length, collectionRate: seed.collectionRate, debt: ownUnits.reduce((sum, unit) => sum + unit.outstanding, 0), pending: ownUnits.filter((unit) => unit.outstanding > 0).length, reconciliationPending: seed.reconciliationPending, documentsUpcoming: seed.documentsUpcoming, status: seed.status };
});

const featuredPayment = {
  id: "p210", amount: 248500, receivedAt: "2026-08-18T10:51:00-03:00", bank: "Banco Galicia", reference: "TRF 0092187", payer: "No identificado", signal: "teléfono terminado en •4812", place: "Arenales 2210", unitLabel: "Unidad 2A", status: "Alta confianza", tone: "success", copy: "ConcilIA encontró una coincidencia probable.",
  candidates: [
    { consortium: "Arenales 2210", unit: "2A", obligation: 248500, period: "agosto 2026", evidence: ["Importe compatible", "Obligación pendiente", "Tres confirmaciones anteriores"] },
    { consortium: "Arenales 2210", unit: "7C", obligation: 248500, period: "agosto 2026", evidence: ["Importe compatible", "Obligación pendiente", "Sin historial suficiente"] },
  ],
};

const decisionCases = [
  featuredPayment,
  { id: "p385", amount: 385400, receivedAt: "2026-08-18T09:28:00-03:00", bank: "Banco Galicia", reference: "TRF 0092044", payer: "No identificado", signal: "sin señal histórica", place: "Arenales 2210", unitLabel: "2 unidades posibles", status: "Requiere revisión", tone: "warning", copy: "Hay dos unidades posibles para este pago.", candidates: [{ consortium: "Arenales 2210", unit: "8C", obligation: 385400, period: "agosto 2026", evidence: ["Importe compatible"] }, { consortium: "Arenales 2210", unit: "6A", obligation: 385400, period: "agosto 2026", evidence: ["Importe compatible"] }] },
  { id: "p312", amount: 312000, receivedAt: "2026-08-17T16:20:00-03:00", bank: "Banco Ciudad", reference: "TRF 0089941", payer: "No identificado", signal: "nombre bancario parcial", place: "Santa Fe 1842", unitLabel: "Unidad 4B", status: "Requiere revisión", tone: "warning", copy: "La identidad del pagador necesita confirmación.", candidates: [{ consortium: "Santa Fe 1842", unit: "4B", obligation: 312000, period: "agosto 2026", evidence: ["Importe compatible", "Nombre parcial"] }] },
];
const informationCases = [{ id: "p146", amount: 146800, receivedAt: "2026-08-13T17:42:00-03:00", bank: "Banco Galicia", reference: "TRF 0087710", place: null, unitLabel: "Sin propuesta", status: "Evidencia insuficiente", tone: "neutral", copy: "No encontramos información suficiente para identificar la unidad." }];
const resolvedPayments = [
  { id: "r098", amount: 98400, receivedAt: "2026-08-21T10:48:00-03:00", place: "Libertad 1280", unitLabel: "Unidad 4B", status: "Identificado", tone: "success" },
  { id: "r172", amount: 172000, receivedAt: "2026-08-21T10:12:00-03:00", place: "Paraguay 1450", unitLabel: "Unidad 6A", status: "Por historial", tone: "success" },
];
const documents = [
  { type: "Factura", provider: "Christophersen Ascensores", number: "B 0003-00001842", date: "04/03/2026", amount: 340000, consortium: "Arenales 2210", status: "Disponible" },
  { type: "Seguro integral", provider: "Seguridad Urbana", date: "14/09/2026", consortium: "Arenales 2210", status: "Próximo a vencer" },
  { type: "Mantenimiento ascensor", provider: "Ascensores Delta", date: "15/08/2026", consortium: "Arenales 2210", status: "Vigente" },
  { type: "Certificación eléctrica", provider: "ElectroConsorcio", date: "11/09/2026", consortium: "Arenales 2210", status: "Vence en 21 días" },
  // TASK V3 — completa la lectura operativa de documentación de Arenales 2210
  // (Vigentes / Próximos a vencer / Requieren atención) sin inventar un proveedor nuevo.
  { type: "Matafuegos", provider: "Seguridad Urbana", date: "20/09/2026", consortium: "Arenales 2210", status: "Próximo a vencer" },
];

// TASK V3 — Facturas / obligaciones con proveedores. Sólo Arenales 2210 tiene datos
// por ahora: es el edificio canónico de la demo comercial, no se inventa cobertura
// de cartera completa. El proveedor de ascensores es el MISMO que ya aparece en
// `documents` y en `maintenanceAssets` — una sola relación, contada tres veces.
const invoices = [
  { id: "inv-arenales-ascensores", provider: "Christophersen Ascensores", concept: "Mantenimiento de ascensores", amount: 340000, dueDate: "15/09/2026", consortium: "Arenales 2210", status: "Pendiente" },
  { id: "inv-arenales-agua", provider: "Aguas del Río", concept: "Servicio de agua", amount: 128000, dueDate: "05/09/2026", consortium: "Arenales 2210", status: "Próxima a vencer" },
  { id: "inv-arenales-luz", provider: "Luz Metropolitana", concept: "Servicio eléctrico", amount: 96500, dueDate: "28/08/2026", consortium: "Arenales 2210", status: "Pagada" },
];

// TASK V3 — Mantenimiento / ascensores. "Operativo" es un estado registrado en la
// demo, no telemetría en tiempo real: ConcilIA no controla ni monitorea el ascensor.
const maintenanceAssets = [
  {
    id: "asc-arenales-a",
    name: "Ascensor A",
    consortium: "Arenales 2210",
    status: "Operativo",
    provider: "Christophersen Ascensores",
    lastMaintenance: "15 ago 2026",
    nextMaintenance: "15 sep 2026",
    lastIncident: { description: "Puerta piso 6", status: "Resuelta", date: "10 ago 2026" },
    timeline: [
      { date: "15 jul 2026", event: "Mantenimiento preventivo" },
      { date: "10 ago 2026", event: "Incidencia · Puerta piso 6 · Resuelta" },
      { date: "15 ago 2026", event: "Mantenimiento preventivo" },
    ],
  },
];

const currentPeriodIssued = 24820000;
const currentPeriodCollected = 20000000;
const currentPeriodOutstanding = currentPeriodIssued - currentPeriodCollected;
const priorPeriodsOutstanding = consortia.reduce((sum, consortium) => sum + consortium.debt, 0) - currentPeriodOutstanding;

// TASK V2.4.1 — "identificados"/"resuelto" para este lote de 184 movimientos se deriva
// UNA sola vez acá, desde decisionCases/informationCases. Import (demoSelectors.importSummary),
// Conciliación (summary-strip) y el straight-through rate leen todos este mismo valor:
// nunca dos números distintos para el mismo concepto en el mismo journey.
const reconciliationMovements = 184;
const reconciliationTotalAmount = 24800000;
const reconciliationResolved = reconciliationMovements - decisionCases.length - informationCases.length;
const reconciliationStraightThroughRate = Math.round((reconciliationResolved / reconciliationMovements) * 1000) / 10;

export const demoData = {
  environment: { label: "DATOS SIMULADOS", administration: "Administración Central", date: "21 agosto 2026", locale: "es-AR" },
  portfolio: { consortia: consortia.length, units: units.length, underControl: consortia.filter((item) => item.status === "Estable" || item.status === "Al día").length, attention: consortia.filter((item) => item.status === "Atención").length, risk: consortia.filter((item) => item.status === "Prioridad").length },
  consortia,
  units,
  reconciliation: { period: "agosto 2026", movements: reconciliationMovements, totalAmount: reconciliationTotalAmount, resolved: reconciliationResolved, decisionCases, informationCases, resolvedPayments, requiresInformation: informationCases.length, requiresDecision: decisionCases.length, straightThroughRate: reconciliationStraightThroughRate, featuredPayment, identifiedTodayBefore: 1284000, resolvedTodayBefore: 4, historyCasesTodayBefore: 2 },
  collections: { currentPeriodIssued, currentPeriodCollected, currentPeriodOutstanding, priorPeriodsOutstanding, pending: currentPeriodOutstanding + priorPeriodsOutstanding, unitsWithBalance: units.filter((unit) => unit.outstanding > 0).length, requireFollowUp: units.filter((unit) => unit.outstanding > 0 && unit.days >= 45).length, overdue: units.filter((unit) => unit.outstanding > 0), issued: currentPeriodIssued, collected: currentPeriodCollected },
  unitProfiles: [
    { consortium: "Arenales 2210", unit: "2A", owner: "María Fernández", occupant: "Carlos Fernández", payer: "Carlos Fernández", bankSignal: "•••• 4812", history: [{ period: "ago 2026", amount: 248500, status: "Pendiente" }, { period: "jul 2026", amount: 205000, status: "Pagada" }, { period: "jun 2026", amount: 198500, status: "Pagada" }, { period: "may 2026", amount: 191200, status: "Pagada" }] },
    { consortium: "Arenales 2210", unit: "7C", owner: "Sofía Bianchi", occupant: "Sofía Bianchi", payer: "Carlos Fernández", bankSignal: "•••• 4812", history: [{ period: "ago 2026", amount: 248500, status: "Pendiente" }, { period: "jul 2026", amount: 204600, status: "Pagada" }] },
  ],
  documents,
  invoices,
  maintenanceAssets,
  providers: ["Ascensores Delta", "Christophersen Ascensores", "Limpieza Integral SRL", "Seguridad Urbana", "Servicios Sanitarios BA", "ElectroConsorcio", "Aguas del Río", "Luz Metropolitana"],
  communications: { today: 23, evidenceDetected: 8, receiptsLinked: 5, requiresConfirmation: 1, examples: [
    { from: "María Fernández", context: "Arenales 2210 · 2A", message: "Hola, transferí hoy las expensas. Te mando el comprobante.", detected: "Posible comprobante · $248.500", signal: "teléfono terminado en •4812" },
    { from: "Ana Paredes", context: "Arenales 2210 · 8C", message: "Este mes voy a pagar el viernes.", detected: "Posible promesa de pago · 28 agosto" },
  ] },
  intelligence: { humanInterventionMonth1: 23, humanInterventionCurrent: 9, resolvedWithoutIntervention: 91, recognizedUsingHistory: 14, estimatedHoursSaved: 18.4, learnedRelations: 428, interventionCauses: ["Identidad nueva", "Ambigüedad", "Información insuficiente", "Historial contradictorio"] },
  activity: [
    { time: "10:48", event: "Pago conciliado", meta: "$98.400 · Libertad 1280 · 4B" },
    { time: "10:35", event: "Comprobante vinculado", meta: "WhatsApp simulado · Santa Fe 1842" },
    { time: "10:12", event: "Pago identificado mediante historial", meta: "$172.000 · Paraguay 1450 · 6A" },
    { time: "09:44", event: "Mora actualizada", meta: "Arenales 2210 · 27 unidades" },
  ],
};

export const demoSelectors = {
  pendingUnits: () => demoData.units.filter((unit) => unit.outstanding > 0),
  debtTotal: () => demoData.units.reduce((sum, unit) => sum + unit.outstanding, 0),
  decisionCases: (resolved = false) => demoData.reconciliation.decisionCases.filter((item) => !(resolved && item.id === demoData.reconciliation.featuredPayment.id)),
  attentionCases: (resolved = false) => [...demoSelectors.decisionCases(resolved), ...demoData.reconciliation.informationCases],
  identifiedToday: (resolved = false) => demoData.reconciliation.identifiedTodayBefore + (resolved ? demoData.reconciliation.featuredPayment.amount : 0),
  resolvedToday: (resolved = false) => demoData.reconciliation.resolvedTodayBefore + (resolved ? 1 : 0),
  historyCasesToday: (resolved = false) => demoData.reconciliation.historyCasesTodayBefore + (resolved ? 1 : 0),
  identificationRate: (resolved = false) => Math.round(((demoData.reconciliation.resolved + (resolved ? 1 : 0)) / demoData.reconciliation.movements) * 100),
  // TASK V2.4.2 — la unidad del evento post-confirmación es la que efectivamente
  // eligió el administrador (resolvedUnit), nunca "2A" hardcodeado: si confirmó
  // 7C, la actividad de Inicio debe decir 7C, igual que Conciliación/búsqueda/estado.
  activity: (resolved = false, unit = demoData.reconciliation.featuredPayment.candidates[0].unit) => resolved ? [{ time: "Ahora", event: "Conciliación confirmada", meta: `$${demoData.reconciliation.featuredPayment.amount.toLocaleString("es-AR")} · Arenales 2210 · ${unit}` }, ...demoData.activity] : demoData.activity,
  averageCollectionRate: () => Math.round(demoData.consortia.reduce((sum, item) => sum + item.collectionRate, 0) / demoData.consortia.length),
  unit: (consortium: string, unit: string) => demoData.units.find((item) => item.consortium === consortium && item.unit === unit),
  // TASK V2.2 — clasificación derivada exclusivamente de reconciliation.*: nunca un
  // total independiente. `identified` se calcula, nunca se hardcodea, así que
  // identified + requiresDecision + requiresInformation === movements por construcción.
  // `resolved` es el mismo flag que ya usa decisionCases/attentionCases — si el
  // administrador ya confirmó el pago destacado, este resumen lo refleja igual
  // que el badge del sidebar, para que nunca queden dos números distintos
  // (import vs. cola real) sobre el mismo caso.
  importSummary: (resolved = false) => {
    const { movements, totalAmount, informationCases } = demoData.reconciliation;
    const requiresDecision = demoSelectors.decisionCases(resolved).length;
    const requiresInformation = informationCases.length;
    return { movements, totalAmount, identified: movements - requiresDecision - requiresInformation, requiresDecision, requiresInformation };
  },
  // Casos reales reutilizados tal cual del dataset canónico — ningún movimiento
  // sintético nuevo se crea para esta pantalla.
  importPreview: (resolved = false) => ({
    decisions: demoSelectors.decisionCases(resolved).slice(0, 2),
    needsInformation: demoData.reconciliation.informationCases[0],
    resolved: demoData.reconciliation.resolvedPayments.slice(0, 1),
  }),
  // TASK V3 — documentos agrupados en las 3 categorías que pide la vista comercial
  // (Vigentes/Próximos a vencer/Requieren atención). Partición exhaustiva por status:
  // todo documento cae en exactamente un balde, así la suma siempre da el total real.
  documentStatusGroups: (organizationName: string) => {
    const docs = demoData.documents.filter((d) => d.consortium === organizationName);
    return {
      vigentes: docs.filter((d) => d.status === "Vigente" || d.status === "Disponible"),
      proximos: docs.filter((d) => d.status === "Próximo a vencer"),
      atencion: docs.filter((d) => d.status !== "Vigente" && d.status !== "Disponible" && d.status !== "Próximo a vencer"),
    };
  },
  // Facturas agrupadas por estado real — mismo criterio de partición exhaustiva.
  invoiceStatusGroups: (organizationName: string) => {
    const inv = demoData.invoices.filter((i) => i.consortium === organizationName);
    return {
      pendientes: inv.filter((i) => i.status === "Pendiente"),
      proximas: inv.filter((i) => i.status === "Próxima a vencer"),
      pagadas: inv.filter((i) => i.status === "Pagada"),
    };
  },
  // TASK V3 — "Requiere tu atención" para un consorcio: la MISMA lista que usa tanto
  // la UI (Consorcio 360) como el Agente (ATTENTION_SUMMARY), para que nunca existan
  // dos resúmenes distintos del mismo estado. El orden del array ES la prioridad
  // determinística: mora crítica > documentación > facturas > conciliación > mantenimiento.
  buildingAttentionItems: (organizationName: string, resolved = false) => {
    const items: Array<{ category: string; count: number; view: string; unit?: (typeof demoData.collections.overdue)[number]; documents?: typeof documents; invoices?: typeof invoices; payment?: (typeof decisionCases)[number]; asset?: (typeof maintenanceAssets)[number] }> = [];

    const criticalUnits = demoData.collections.overdue.filter((u) => u.consortium === organizationName && u.status === "Mora crítica").sort((a, b) => b.outstanding - a.outstanding);
    if (criticalUnits.length) items.push({ category: "mora", count: criticalUnits.length, unit: criticalUnits[0], view: "debt" });

    const { proximos, atencion } = demoSelectors.documentStatusGroups(organizationName);
    const urgentDocuments = [...atencion, ...proximos];
    if (urgentDocuments.length) items.push({ category: "documentos", count: urgentDocuments.length, documents: urgentDocuments, view: "documents" });

    const { pendientes, proximas: proximasFacturas } = demoSelectors.invoiceStatusGroups(organizationName);
    const urgentInvoices = [...pendientes, ...proximasFacturas];
    if (urgentInvoices.length) items.push({ category: "facturas", count: urgentInvoices.length, invoices: urgentInvoices, view: "invoices" });

    const orgDecisionCases = demoSelectors.decisionCases(resolved).filter((payment) => payment.candidates.some((c) => c.consortium === organizationName));
    if (orgDecisionCases.length) items.push({ category: "conciliacion", count: orgDecisionCases.length, payment: orgDecisionCases[0], view: "reconciliation" });

    const orgMaintenance = demoData.maintenanceAssets.filter((m) => m.consortium === organizationName);
    if (orgMaintenance.length) items.push({ category: "mantenimiento", count: orgMaintenance.length, asset: orgMaintenance[0], view: "maintenance" });

    return items;
  },
};

export const demoContext = JSON.stringify(demoData);
