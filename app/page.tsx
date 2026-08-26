"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { demoData, demoSelectors } from "../lib/demo-data";
import { CONCILIA_WORDMARK_DATA_URI } from "../lib/brand-asset";
import { trackShowroomEvent } from "../lib/client-analytics";

type View =
  | "home"
  | "reconciliation"
  | "resolution"
  | "debt"
  | "consortia"
  | "consortium"
  | "documents"
  | "evidence"
  | "agent"
  | "settings";
type IconName =
  | "home"
  | "reconcile"
  | "debt"
  | "building"
  | "document"
  | "agent"
  | "settings"
  | "search"
  | "bell"
  | "arrow"
  | "check"
  | "clock"
  | "alert"
  | "info"
  | "whatsapp"
  | "upload"
  | "mail"
  | "api"
  | "close"
  | "filter"
  | "chevron"
  | "history"
  | "bank"
  | "user";

const icons: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  reconcile: (
    <>
      <path d="M20 7h-9m6-3 3 3-3 3M4 17h9m-6-3-3 3 3 3" />
    </>
  ),
  debt: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M16 8.5c-.7-.7-1.7-1.1-3-1.1-1.8 0-3 .8-3 2s1.1 1.8 3 2.2 3 1 3 2.5-1.3 2.5-3.2 2.5c-1.4 0-2.5-.4-3.2-1.2M13 5v14" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V4h12v17M2 21h20M8 8h4M8 12h4M8 16h4M19 10v11" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  agent: (
    <>
      <path d="m12 3-1.3 3.7L7 8l3.7 1.3L12 13l1.3-3.7L17 8l-3.7-1.3Z" />
      <path d="m18.5 14-.8 2.2-2.2.8 2.2.8.8 2.2.8-2.2 2.2-.8-2.2-.8Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.4 3h-4l-.4 3a8 8 0 0 0-1.8 1L6 6.1 4 9.5 6 11a8 8 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.8 1l.4 3h4l.4-3a8 8 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.5 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20 11.5a8 8 0 0 1-11.8 7L3 20l1.5-5A8 8 0 1 1 20 11.5Z" />
      <path d="M8.5 8.5c1 3 2.5 4.5 5.5 5.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  api: (
    <>
      <path d="M8 9 4 12l4 3m8-6 4 3-4 3M14 5l-4 14" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  filter: <path d="M4 5h16l-6 7v5l-4 2v-7Z" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6M12 7v5l3 2" />
    </>
  ),
  bank: (
    <>
      <path d="m3 9 9-5 9 5M5 10h14M6 10v7m4-7v7m4-7v7m4-7v7M3 20h18" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

const formatMoney = (value: number) => `$${value.toLocaleString("es-AR")}`;
const formatMovementDate = (value: string) => new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value)).replace(",", " ·");
const featuredPayment = demoData.reconciliation.featuredPayment;
const featuredAmount = formatMoney(featuredPayment.amount);
const featuredDate = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(featuredPayment.receivedAt));
const featuredSignalSuffix = featuredPayment.signal.match(/\d+$/)?.[0] ?? "";
const consortia = demoData.consortia.map((item) => ({ name: item.name, units: item.units, collectionRate: item.collectionRate, debt: formatMoney(item.debt), open: item.pending, status: item.status }));
const documents = demoData.documents.map((item, index) => ({ id: `doc-${index}`, type: item.type, title: item.provider, period: item.date, place: item.consortium, amount: "amount" in item && typeof item.amount === "number" ? formatMoney(item.amount) : "—", status: item.status }));

export default function ProductDemo() {
  const [view, setView] = useState<View>("home");
  const [resolved, setResolved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [doc, setDoc] = useState<(typeof documents)[number] | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState("Arenales 2210");
  useEffect(() => {
    const engaged = window.setTimeout(() => trackShowroomEvent("engagement_30s"), 30_000);
    return () => window.clearTimeout(engaged);
  }, []);
  const go = (next: View) => {
    trackShowroomEvent("view_opened", { view: next });
    if (next === "agent") trackShowroomEvent("agent_opened");
    setView(next);
    setSearchOpen(false);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2600);
  };
  const confirm = () => {
    setResolved(true);
    notify("Conciliación confirmada · el historial fue actualizado");
    window.setTimeout(() => go("home"), 700);
  };
  const resetDemo = () => {
    trackShowroomEvent("demo_reset");
    setResolved(false);
    setDoc(null);
    setNotifications(false);
    setSearchOpen(false);
    setSelectedOrganization("Arenales 2210");
    setView("home");
    notify("Demo reiniciada · estado inicial restaurado");
  };
  const titles: Record<View, [string, string]> = {
    home: [
      "Buenas tardes, Joaquín",
      `Hay ${demoSelectors.attentionCases(resolved).length} situaciones que requieren tu atención.`,
    ],
    reconciliation: [
      "Conciliación",
      "ConcilIA propone una unidad para cada pago. Vos revisás lo que falta.",
    ],
    resolution: [
      "Resolver pago",
      "Revisá la propuesta y la evidencia antes de confirmar.",
    ],
    debt: [
      "Morosidad",
      "Priorizá la cobranza por impacto, antigüedad y contexto.",
    ],
    consortia: ["Consorcios", "Una vista operacional de toda tu cartera."],
    consortium: [selectedOrganization, "Vista operacional completa del consorcio."],
    documents: [
      "Documentos",
      "Encontrá facturas, comprobantes y contratos en segundos.",
    ],
    evidence: [
      "Comprobantes",
      "De una señal recibida a una conciliación preparada.",
    ],
    agent: ["Agente", "Preguntale a ConcilIA sobre tu operación."],
    settings: [
      "Configuración",
      "Integraciones, permisos y políticas de automatización.",
    ],
  };
  const nav: [View, IconName, string][] = [
    ["home", "home", "Inicio"],
    ["reconciliation", "reconcile", "Conciliación"],
    ["debt", "debt", "Morosidad"],
    ["consortia", "building", "Consorcios"],
    ["documents", "document", "Documentos"],
    ["agent", "agent", "Agente"],
  ];
  const active =
    view === "resolution" || view === "evidence"
      ? "reconciliation"
      : view === "consortium"
        ? "consortia"
        : view;
  return (
    <div className="product-shell">
      <aside className={`sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <span className="brand-wordmark" aria-label="ConcilIA">
            <img src={CONCILIA_WORDMARK_DATA_URI} alt="ConcilIA" />
          </span>
          <small>Operación</small>
        </div>
        <button className="mobile-menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label="Abrir navegación" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? "close" : "filter"} />
        </button>
        <div className="workspace">
          <span>AC</span>
          <div>
            <b>Administración Central</b>
            <small>{demoData.portfolio.consortia} consorcios activos</small>
          </div>
          <Icon name="chevron" size={15} />
        </div>
        <nav>
          {nav.map(([id, icon, label]) => (
            <button
              key={id}
              className={active === id ? "active" : ""}
              onClick={() => { go(id); setMenuOpen(false); }}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {id === "reconciliation" && demoSelectors.decisionCases(resolved).length > 0 && <em>{demoSelectors.decisionCases(resolved).length}</em>}
              {id === "debt" && <em>{demoData.collections.requireFollowUp}</em>}
            </button>
          ))}
        </nav>
        <button className="settings-link" onClick={() => go("settings")}>
          <Icon name="settings" />
          <span>Configuración</span>
        </button>
        <button className="reset-demo" onClick={resetDemo}>
          <Icon name="history" />
          <span>Reiniciar demo</span>
        </button>
        <div className="demo-mode">
          <span>
            <Icon name="check" size={14} />
          </span>
          <div>
            <b>Entorno de demostración</b>
            <small>Datos sintéticos coherentes</small>
          </div>
        </div>
        <div className="profile">
          <span>JC</span>
          <div>
            <b>Joaquín</b>
            <small>Administrador</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <button className="global-search" onClick={() => setSearchOpen(true)}>
            <Icon name="search" size={17} />
            <span>Buscar pagos, unidades, consorcios…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="top-actions">
            <span className="data-label">DATOS SIMULADOS</span>
            <button
              className="bell"
              onClick={() => setNotifications(!notifications)}
              aria-label="Notificaciones"
            >
              <Icon name="bell" />
              <i>3</i>
            </button>
          </div>
          {notifications && (
            <Notifications close={() => setNotifications(false)} go={go} />
          )}
        </header>
        <section className={`page ${view}`}>
          {view !== "resolution" && view !== "agent" && (
            <div className="page-head">
              <div>
                <p>ADMINISTRACIÓN CENTRAL · 21 AGOSTO 2026</p>
                <h1>{titles[view][0]}</h1>
                <span>{titles[view][1]}</span>
              </div>
              {view === "home" && (
                <button className="primary" onClick={() => go("agent")}>
                  <Icon name="agent" size={16} /> Preguntarle al Agente
                </button>
              )}
            </div>
          )}
          {view === "home" && <Home resolved={resolved} go={go} />}
          {view === "reconciliation" && (
            <Reconciliation resolved={resolved} go={go} />
          )}
          {view === "resolution" && <Resolution confirm={confirm} go={go} />}
          {view === "debt" && <Debt notify={notify} />}
          {view === "consortia" && <Consortia go={go} select={(name) => { setSelectedOrganization(name); go("consortium"); }} />}
          {view === "consortium" && <Consortium go={go} organizationName={selectedOrganization} />}
          {view === "documents" && <Documents open={setDoc} />}
          {view === "evidence" && <EvidenceFlow go={go} />}
          {view === "agent" && <Agent go={go} />}
          {view === "settings" && <Settings />}
        </section>
      </main>
      {searchOpen && (
        <GlobalSearch
          close={() => setSearchOpen(false)}
          go={go}
          openDoc={(d) => {
            setDoc(d);
            setSearchOpen(false);
          }}
          selectOrganization={(name) => { setSelectedOrganization(name); go("consortium"); setSearchOpen(false); }}
        />
      )}
      {doc && <DocumentPreview doc={doc} close={() => setDoc(null)} />}
      {toast && (
        <div className="toast">
          <span>
            <Icon name="check" size={15} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

function Home({ resolved, go }: { resolved: boolean; go: (v: View) => void }) {
  const decisions = demoSelectors.decisionCases(resolved);
  const informationCase = demoData.reconciliation.informationCases[0];
  const recent = demoSelectors.activity(resolved);
  return (
    <div className="home-grid">
      <section className="work-queue">
        <SectionTitle
          eyebrow="REQUIERE DECISIÓN"
          title={`${decisions.length} casos necesitan tu criterio`}
        />
        {decisions.map((item, i) => (
            <article className="decision-row" key={item.id}>
              <span className="payment-icon">
                <Icon name="bank" />
              </span>
              <div className="decision-main">
                <small>PAGO RECIBIDO</small>
                <b>{formatMoney(item.amount)}</b>
                <p>{item.place} · {item.unitLabel}</p>
              </div>
              <div className="decision-copy">
                <p>{item.copy}</p>
                <Status tone={item.tone}>{item.status}</Status>
              </div>
              <button
                onClick={() =>
                  i === 0 && !resolved ? go("resolution") : go("reconciliation")
                }
              >
                {i === 0 && !resolved ? "Revisar" : "Resolver"}
                <Icon name="arrow" size={15} />
              </button>
            </article>
          ))}
      </section>
      <section className="needs-info">
        <SectionTitle
          eyebrow="REQUIERE INFORMACIÓN"
          title={`${demoData.reconciliation.informationCases.length} movimiento sin identificar`}
        />
        <article>
          <span>
            <Icon name="info" />
          </span>
          <div>
            <b>Transferencia de {formatMoney(informationCase.amount)}</b>
            <p>{informationCase.copy}</p>
          </div>
          <button onClick={() => go("reconciliation")}>Ver caso</button>
        </article>
      </section>
      <section className="home-priorities">
        <button onClick={() => go("debt")}>
          <span className="payment-icon"><Icon name="debt" /></span>
          <p><small>MOROSIDAD PRIORITARIA</small><b>{demoData.collections.requireFollowUp} unidades requieren seguimiento</b></p>
          <Icon name="arrow" size={15} />
        </button>
        <button onClick={() => go("documents")}>
          <span className="payment-icon"><Icon name="document" /></span>
          <p><small>DOCUMENTACIÓN</small><b>2 documentos vencen próximamente</b></p>
          <Icon name="arrow" size={15} />
        </button>
      </section>
      <section className="recent card">
        <SectionTitle
          eyebrow="ACTIVIDAD RECIENTE"
          title="La operación avanza detrás de escena"
        />
        {recent.slice(0, 5).map((item, i) => (
          <div className="timeline" key={item.event + item.time}>
            <span className={i === 0 && resolved ? "new" : ""}>
              <Icon name="check" size={13} />
            </span>
            <time>{item.time}</time>
            <p>
              <b>{item.event}</b>
              <small>{item.meta}</small>
            </p>
          </div>
        ))}
      </section>
      <aside className="home-side">
        <section className="resolved-card">
          <SectionTitle eyebrow="RESUELTO HOY" title="Trabajo completado" />
          <div className="resolved-number">
            <strong>{demoSelectors.resolvedToday(resolved)}</strong>
            <span>conciliaciones</span>
          </div>
          <dl>
            <div>
              <dt>{formatMoney(demoSelectors.identifiedToday(resolved))}</dt>
              <dd>identificados</dd>
            </div>
            <div>
              <dt>3</dt>
              <dd>comprobantes vinculados</dd>
            </div>
            <div>
              <dt>{demoSelectors.historyCasesToday(resolved)}</dt>
              <dd>casos por historial</dd>
            </div>
          </dl>
        </section>
        <section className="overview-card">
          <SectionTitle
            eyebrow="PANORAMA OPERATIVO"
            title="Todo en una mirada"
          />
          {[
            ["Conciliación", `${demoSelectors.identificationRate(resolved)}%`, "identificado"],
            ["Mora", formatMoney(demoData.collections.pending), "pendiente"],
            ["Consorcios", String(demoData.portfolio.consortia), "activos"],
          ].map((x) => (
            <button
              key={x[0]}
              onClick={() =>
                go(
                  x[0] === "Conciliación"
                    ? "reconciliation"
                    : x[0] === "Mora"
                      ? "debt"
                      : "consortia",
                )
              }
            >
              <span>{x[0]}</span>
              <b>{x[1]}</b>
              <small>{x[2]}</small>
              <Icon name="chevron" size={14} />
            </button>
          ))}
        </section>
      </aside>
    </div>
  );
}

function Reconciliation({
  resolved,
  go,
}: {
  resolved: boolean;
  go: (v: View) => void;
}) {
  const [tab, setTab] = useState("Requieren atención");
  const rows = demoSelectors.attentionCases(resolved).map((item) => ({ id: item.id, amount: formatMoney(item.amount), date: formatMovementDate(item.receivedAt), place: item.place || "Sin consorcio", unit: item.unitLabel, status: item.status, tone: item.tone, action: item.id === demoData.reconciliation.featuredPayment.id ? "Revisar" : item.place ? "Resolver" : "Ver caso" }));
  const resolvedRows = [
    ...demoData.reconciliation.resolvedPayments.map((item) => ({ id: item.id, amount: formatMoney(item.amount), date: formatMovementDate(item.receivedAt), place: item.place, unit: item.unitLabel, status: item.status, tone: item.tone })),
    ...(resolved ? [{ id: demoData.reconciliation.featuredPayment.id, amount: formatMoney(demoData.reconciliation.featuredPayment.amount), date: "Ahora", place: demoData.reconciliation.featuredPayment.place, unit: demoData.reconciliation.featuredPayment.unitLabel, status: "Confirmado", tone: "success" }] : []),
  ];
  const data =
    tab === "Resueltos"
      ? resolvedRows
      : tab === "Todos los movimientos"
        ? [...rows, ...resolvedRows]
        : rows;
  return (
    <div className="reconciliation-page">
      <div className="summary-strip">
        <span>
          <b>{demoData.reconciliation.movements}</b>
          <small>movimientos</small>
        </span>
        <span>
          <b>{formatMoney(demoData.reconciliation.totalAmount)}</b>
          <small>recibidos</small>
        </span>
        <span>
          <b>{demoData.reconciliation.resolved + (resolved ? 1 : 0)}</b>
          <small>identificados</small>
        </span>
        <span className="attention">
          <b>{demoSelectors.attentionCases(resolved).length}</b>
          <small>requieren atención</small>
        </span>
      </div>
      <div className="tabs">
        {["Requieren atención", "Resueltos", "Todos los movimientos"].map(
          (x) => (
            <button
              className={tab === x ? "active" : ""}
              onClick={() => setTab(x)}
              key={x}
            >
              {x}
            </button>
          ),
        )}
      </div>
      <section className="movement-table card">
        <div className="table-head">
          <span>Movimiento</span>
          <span>Consorcio</span>
          <span>Propuesta</span>
          <span>Estado</span>
          <span>Siguiente acción</span>
        </div>
        {data.map((x, i) => (
          <button
            className="table-row"
            key={x.amount + x.date}
            onClick={() =>
              x.id === featuredPayment.id && !resolved
                ? go("resolution")
                : undefined
            }
          >
            <span>
              <b>{x.amount}</b>
              <small>{x.date}</small>
            </span>
            <span>
              <b>{x.place}</b>
              <small>Transferencia bancaria</small>
            </span>
            <span>
              <b>{x.unit}</b>
              <small>
                {x.unit.includes("2 unidades")
                  ? "Necesita tu criterio"
                  : "Importe e historial compatibles"}
              </small>
            </span>
            <Status tone={x.tone}>{x.status}</Status>
            <strong>
              {"action" in x ? String(x.action) : "Ver detalle"}
              <Icon name="arrow" size={14} />
            </strong>
          </button>
        ))}
      </section>
      <button className="evidence-link" onClick={() => go("evidence")}>
        <Icon name="whatsapp" />
        <span>
          <b>Ver cómo llega un comprobante</b>
          <small>WhatsApp → datos detectados → movimiento → conciliación</small>
        </span>
        <Icon name="arrow" />
      </button>
    </div>
  );
}

function Resolution({
  confirm,
  go,
}: {
  confirm: () => void;
  go: (v: View) => void;
}) {
  const [other, setOther] = useState(false);
  const [rejected, setRejected] = useState(false);
  if (rejected)
    return (
      <StatePanel
        icon="alert"
        title="Propuesta rechazada"
        text="El caso volvió a Requiere información. ConcilIA no ejecutó ninguna conciliación."
        action="Volver a conciliación"
        onClick={() => go("reconciliation")}
      />
    );
  return (
    <div className="resolution-page">
      <button className="back" onClick={() => go("reconciliation")}>
        <Icon name="arrow" size={15} /> Volver a conciliación
      </button>
      <div className="resolution-header">
        <div>
          <p>TRANSFERENCIA BANCARIA · {featuredDate}</p>
          <h1>{featuredAmount}</h1>
          <span>{featuredPayment.bank} · señal terminada en {featuredSignalSuffix}</span>
        </div>
        <Status tone="warning">Requiere tu confirmación</Status>
      </div>
      <div className="resolution-grid">
        <div className="resolution-main">
          <section className="proposal-card card">
            <p className="eyebrow">PROPUESTA DE CONCILIA</p>
            <div className="proposal-top">
              <span>
                <Icon name="building" />
              </span>
              <div>
                <h2>Unidad 2A</h2>
                <p>Arenales 2210</p>
              </div>
              <Status tone="success">Alta confianza</Status>
            </div>
            <blockquote>
              El importe coincide con la obligación y existen antecedentes
              consistentes para este pagador.
            </blockquote>
          </section>
          <section className="evidence-card card">
            <SectionTitle
              eyebrow="POR QUÉ"
              title="Evidencia que sostiene la propuesta"
            />
            <div className="evidence-list">
              {[
                [
                  "Importe compatible",
                  `La obligación de agosto es de ${featuredAmount}`,
                ],
                [
                  "Fecha compatible",
                  "El pago llegó dentro del período esperado",
                ],
                [
                  "Referencia compatible",
                  "La señal bancaria coincide con antecedentes",
                ],
              ].map((x) => (
                <div key={x[0]}>
                  <span>
                    <Icon name="check" size={14} />
                  </span>
                  <p>
                    <b>{x[0]}</b>
                    <small>{x[1]}</small>
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section className="history-card card">
            <SectionTitle
              eyebrow="HISTORIAL"
              title="ConcilIA reconoce este patrón"
            />
            <div className="history-highlight">
              <Icon name="history" />
              <p>
                <b>
                  3 pagos anteriores de este pagador fueron confirmados para
                  Unidad 2A.
                </b>
                <span>El historial refuerza la propuesta.</span>
              </p>
            </div>
            <div className="history-events">
              {["Julio · $205.000", "Junio · $198.500", "Mayo · $191.200"].map(
                (x) => (
                  <span key={x}>
                    <Icon name="check" size={12} />
                    {x}
                  </span>
                ),
              )}
            </div>
            <div className="learning-path">
              {["1ª confirmación", "2ª confirmación", "3ª confirmación"].map((step) => <span key={step}><Icon name="check" size={12} />{step}<small>Humano confirmó 2A</small></span>)}
              <strong>✦ ConcilIA reconoce el patrón</strong>
              <p>Puede reconocer esta relación con suficiente evidencia. AUTO permanece deshabilitado.</p>
            </div>
            <div className="multi-unit">
              <Icon name="info" size={16} />
              <p>
                <b>Este pagador también tiene antecedentes en otra unidad.</b>
                <span>Por eso ConcilIA requiere tu confirmación.</span>
              </p>
            </div>
          </section>
        </div>
        <aside>
          <Receipt />
          <section className="decision-card card">
            <SectionTitle eyebrow="DECISIÓN" title="¿Cómo querés resolverlo?" />
            {other ? (
              <div className="unit-picker">
                <label>
                  <input type="radio" name="unit" defaultChecked /> Santa Fe
                  1842 · 2A
                </label>
                <label>
                  <input type="radio" name="unit" /> Arenales 2210 · 7C
                </label>
                <button className="primary" onClick={confirm}>
                  Confirmar unidad elegida
                </button>
                <button className="text" onClick={() => setOther(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <button className="primary wide" onClick={confirm}>
                  <Icon name="check" /> Confirmar conciliación
                </button>
                <button
                  className="secondary wide"
                  onClick={() => setOther(true)}
                >
                  Elegir otra unidad
                </button>
                <button
                  className="danger-text"
                  onClick={() => setRejected(true)}
                >
                  Rechazar propuesta
                </button>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Receipt() {
  return (
    <section className="receipt-card card">
      <div className="receipt-title">
        <span>
          <Icon name="whatsapp" />
        </span>
        <p>
          <b>Comprobante recibido</b>
          <small>WhatsApp · 18 ago · 10:49</small>
        </p>
        <Status tone="success">Datos detectados</Status>
      </div>
      <div className="receipt-preview">
        <div className="paper">
          <span>COMPROBANTE DE TRANSFERENCIA</span>
          <b>{featuredAmount}</b>
          <i />
          <p>
            Fecha <strong>{featuredDate}</strong>
          </p>
          <p>
            Referencia <strong>{featuredPayment.reference}</strong>
          </p>
          <em>Operación realizada</em>
        </div>
      </div>
      <dl>
        <div>
          <dt>Importe detectado</dt>
          <dd>{featuredAmount}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{featuredDate}</dd>
        </div>
        <div>
          <dt>Referencia</dt>
          <dd>{featuredPayment.reference}</dd>
        </div>
      </dl>
    </section>
  );
}

function Debt({ notify }: { notify: (x: string) => void }) {
  const [filter, setFilter] = useState("Todas");
  const debts = demoData.collections.overdue.map((item) => ({ unit: item.unit, place: item.consortium, amount: formatMoney(item.outstanding), days: item.days, lastContact: item.lastContact, priority: item.status, tone: item.days > 60 ? "danger" : item.days > 30 ? "warning" : "neutral" }));
  const over60 = demoData.collections.overdue.filter((item) => item.days > 60);
  return (
    <div className="debt-page">
      <div className="kpis">
        <Kpi label="Total pendiente" value={formatMoney(demoData.collections.pending)} note={`${formatMoney(demoData.collections.currentPeriodOutstanding)} del período + ${formatMoney(demoData.collections.priorPeriodsOutstanding)} anteriores`} />
        <Kpi label="Más de 60 días" value={String(over60.length)} note={formatMoney(over60.reduce((sum, item) => sum + item.outstanding, 0))} tone="danger" />
        <Kpi label="Seguimientos" value={String(demoData.collections.requireFollowUp)} note="requieren atención" />
        <Kpi
          label="Recuperado este mes"
          value={formatMoney(demoData.collections.collected)}
          note="cobrado en agosto"
          tone="success"
        />
      </div>
      <section className="priority-list card">
        <div className="list-toolbar">
          <SectionTitle
            eyebrow="PRIORIDAD DE COBRANZA"
            title="Unidades ordenadas por impacto"
          />
          <div className="filters">
            <Icon name="filter" size={15} />
            {["Todas", "+60 días", "Mayor importe"].map((x) => (
              <button
                className={filter === x ? "active" : ""}
                onClick={() => setFilter(x)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
        {debts
          .filter((x) => filter !== "+60 días" || x.days > 60)
          .map((x) => (
            <article key={x.place + x.unit}>
              <div className="unit-avatar">{x.unit}</div>
              <div>
                <b>{x.place}</b>
                <small>
                  Unidad {x.unit} · última gestión {x.lastContact}
                </small>
              </div>
              <strong>{x.amount}</strong>
              <span>{x.days} días</span>
              <Status tone={x.tone}>{x.priority}</Status>
              <button
                onClick={() =>
                  notify(`Detalle abierto · ${x.place} · ${x.unit}`)
                }
              >
                Ver detalle
                <Icon name="arrow" size={14} />
              </button>
            </article>
          ))}
      </section>
    </div>
  );
}

function Consortia({ go, select }: { go: (v: View) => void; select: (name: string) => void }) {
  return (
    <div className="consortia-page">
      <div className="portfolio-bar">
        <span>
          <b>{demoData.portfolio.consortia}</b>
          <small>consorcios activos</small>
        </span>
        <span>
          <b>{demoData.portfolio.units}</b>
          <small>unidades</small>
        </span>
        <span>
          <b>{demoSelectors.averageCollectionRate()}%</b>
          <small>cobranza promedio</small>
        </span>
        <span>
          <b>{formatMoney(demoSelectors.debtTotal())}</b>
          <small>mora total</small>
        </span>
      </div>
      <section className="consortia-list card">
        <div className="table-head">
          <span>Consorcio</span>
          <span>Cobranza</span>
          <span>Mora</span>
          <span>Situaciones abiertas</span>
          <span>Estado</span>
        </div>
        {consortia.map((x) => (
          <button
            className="consortium-row"
            key={x.name}
            onClick={() => select(x.name)}
          >
            <span>
              <i className="building-avatar">
                <Icon name="building" />
              </i>
              <p>
                <b>{x.name}</b>
                <small>{x.units} unidades</small>
              </p>
            </span>
            <span>
              <b>{x.collectionRate}%</b>
              <i className="progress">
                <em style={{ width: `${x.collectionRate}%` }} />
              </i>
            </span>
            <strong>{x.debt}</strong>
            <span>{x.open}</span>
            <Status
              tone={
                x.status === "Prioridad"
                  ? "danger"
                  : x.open
                    ? "warning"
                    : "success"
              }
            >
              {x.status}
            </Status>
          </button>
        ))}
      </section>
    </div>
  );
}

function Consortium({ go, organizationName }: { go: (v: View) => void; organizationName: string }) {
  const [tab, setTab] = useState("Resumen");
  const organization = demoData.consortia.find((item) => item.name === organizationName) || demoData.consortia[0];
  const organizationDocuments = demoData.documents.filter((item) => item.consortium === organization.name);
  const pendingReconciliations = "reconciliationPending" in organization ? Number(organization.reconciliationPending) : 0;
  return (
    <div className="consortium-detail">
      <button className="back" onClick={() => go("consortia")}>
        <Icon name="arrow" size={15} /> Todos los consorcios
      </button>
      <div className="consortium-status">
        <div className="building-large">
          <Icon name="building" size={28} />
        </div>
        <div>
          <p>CONSORCIO</p>
          <h1>{organization.name}</h1>
          <span>{organization.neighborhood} · {organization.units} unidades</span>
        </div>
        <Status tone={organization.status === "Prioridad" ? "danger" : "warning"}>{organization.pending} situaciones requieren atención</Status>
      </div>
      <div className="detail-tabs">
        {[
          "Resumen",
          "Pagos",
          "Mora",
          "Documentos",
          "Proveedores",
          "Actividad",
        ].map((x) => (
          <button
            className={tab === x ? "active" : ""}
            onClick={() => setTab(x)}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      {tab === "Resumen" ? (
        <>
          <div className="kpis">
            <Kpi
              label="Cobranza del mes"
              value={`${organization.collectionRate}%`}
              note={`${pendingReconciliations} para revisar`}
              tone="success"
            />
            <Kpi label="Unidades" value={String(organization.units)} note="administradas" />
            <Kpi
              label="Pendiente"
              value={formatMoney(organization.debt)}
              note={`${organization.pending} unidades`}
              tone="warning"
            />
            <Kpi
              label="Documentos"
              value={String(organizationDocuments.length)}
              note="en el legajo"
              tone="warning"
            />
          </div>
          <section className="detail-activity card">
            <SectionTitle eyebrow="ACTIVIDAD RECIENTE" title={organization.name} />
            {[
              ...demoData.reconciliation.decisionCases.filter((payment) => payment.candidates.some((candidate) => candidate.consortium === organization.name)).map((payment) => ({ time: formatMovementDate(payment.receivedAt), event: `Pago de ${formatMoney(payment.amount)} requiere confirmación` })),
              ...demoData.activity.filter((item) => item.meta.includes(organization.name)).map((item) => ({ time: item.time, event: `${item.event} · ${item.meta}` })),
            ].map((item) => (
              <div key={item.time + item.event}>
                <time>{item.time}</time>
                <span>
                  <Icon name="check" size={13} />
                </span>
                <p>{item.event}</p>
              </div>
            ))}
          </section>
        </>
      ) : (
        <StatePanel
          icon={
            tab === "Documentos"
              ? "document"
              : tab === "Mora"
                ? "debt"
                : "building"
          }
          title={`${tab} de ${organization.name}`}
          text="Esta vista conserva el contexto del consorcio y muestra únicamente la información necesaria para operar."
          action={
            tab === "Documentos" ? "Abrir Documentos" : "Volver al resumen"
          }
          onClick={() =>
            tab === "Documentos" ? go("documents") : setTab("Resumen")
          }
        />
      )}
    </div>
  );
}

function Documents({
  open,
}: {
  open: (d: (typeof documents)[number]) => void;
}) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Todos");
  const filtered = documents.filter(
    (x) =>
      (cat === "Todos" || cat === "Proveedores" || cat === "Otros" || x.type === cat.slice(0, -1)) &&
      `${x.type} ${x.title} ${x.place}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="documents-page">
      <div className="document-search">
        <Icon name="search" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar facturas, comprobantes, contratos…"
        />
      </div>
      <div className="category-tabs">
        {[
          "Todos",
          "Facturas",
          "Comprobantes",
          "Contratos",
          "Proveedores",
          "Otros",
        ].map((x) => (
          <button
            className={cat === x ? "active" : ""}
            onClick={() => setCat(x)}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      <section className="document-list card">
        <div className="table-head">
          <span>Documento</span>
          <span>Consorcio</span>
          <span>Período</span>
          <span>Importe</span>
          <span>Estado</span>
        </div>
        {filtered.length ? (
          filtered.map((x) => (
            <button className="document-row" key={x.id} onClick={() => open(x)}>
              <span>
                <i>
                  <Icon name="document" />
                </i>
                <p>
                  <b>{x.title}</b>
                  <small>{x.type}</small>
                </p>
              </span>
              <b>{x.place}</b>
              <span>{x.period}</span>
              <strong>{x.amount}</strong>
              <Status
                tone={x.status.toLowerCase().includes("vencer") ? "warning" : "success"}
              >
                {x.status}
              </Status>
            </button>
          ))
        ) : (
          <div className="empty-state">
            <Icon name="search" />
            <b>No encontramos documentos</b>
            <span>Probá con otro término o categoría.</span>
          </div>
        )}
      </section>
    </div>
  );
}

function EvidenceFlow({ go }: { go: (v: View) => void }) {
  const steps = [
    ["Recibido", "WhatsApp · 10:49"],
    ["Datos detectados", `${featuredAmount} · ${featuredDate}`],
    ["Movimiento encontrado", `Transferencia · ${featuredPayment.bank}`],
    ["Unidad identificada", `${featuredPayment.candidates[0].consortium} · ${featuredPayment.candidates[0].unit}`],
    ["Conciliación preparada", "Requiere confirmación"],
  ];
  return (
    <div className="evidence-page">
      <div className="source-row">
        {[
          ["whatsapp", "WhatsApp"],
          ["upload", "Carga web"],
          ["mail", "Email"],
          ["api", "API"],
        ].map((x, i) => (
          <span className={i === 0 ? "active" : ""} key={x[1]}>
            <Icon name={x[0] as IconName} />
            {x[1]}
          </span>
        ))}
        <em>Flujo demostrativo</em>
      </div>
      <section className="flow-card card">
        <div className="phone-demo">
          <div className="phone-head">
            <Icon name="whatsapp" /> María Fernández <small>Unidad 2A</small>
          </div>
          <div className="chat-bubble">
            Hola, pago expensas 2A.
            <span className="file-chip">
              <Icon name="document" size={15} /> comprobante_{featuredSignalSuffix}.pdf
            </span>
            <small>10:49 ✓✓</small>
          </div>
        </div>
        <div className="flow-steps">
          {steps.map((x, i) => (
            <div key={x[0]} className={i < 4 ? "done" : "attention"}>
              <span>{i < 4 ? <Icon name="check" size={14} /> : i + 1}</span>
              <p>
                <b>{x[0]}</b>
                <small>{x[1]}</small>
              </p>
              {i < steps.length - 1 && <i />}
            </div>
          ))}
        </div>
        <div className="evidence-summary">
          <div>
            <p>COMPROBANTE #{featuredSignalSuffix}</p>
            <h2>{featuredAmount}</h2>
            <span>{featuredDate} · referencia {featuredPayment.reference}</span>
          </div>
          <div>
            <p>MOVIMIENTO COMPATIBLE</p>
            <h3>Transferencia {featuredAmount}</h3>
            <span>{featuredPayment.bank} · {formatMovementDate(featuredPayment.receivedAt)}</span>
          </div>
          <button className="primary" onClick={() => go("resolution")}>
            Ver relación
            <Icon name="arrow" size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  topic?: string;
  action?: { label: string; view: View } | null;
  suggestions?: string[];
  result?: unknown;
};
function Agent({ go }: { go: (v: View) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationState, setConversationState] = useState<Record<string, unknown>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Consultando la operación…");
  const [sessionId] = useState(() => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `demo-${Date.now()}`);
  const suggestions = [
    "¿Qué requiere mi atención hoy?",
    "¿Qué pagos necesitan revisión?",
    "¿Dónde tengo mayor mora?",
    `Buscame el movimiento de ${featuredAmount}`,
    "¿Cómo está Arenales 2210?",
    "Buscame la factura del ascensor de marzo.",
  ];
  const send = async (text = input) => {
    const q = text.trim();
    if (!q || loading) return;
    trackShowroomEvent("agent_question_sent");
    const conversation = [...messages, { role: "user" as const, text: q }];
    setMessages(conversation);
    setInput("");
    const normalized = q.toLowerCase();
    setLoadingLabel(normalized.includes("document") || normalized.includes("factura") || normalized.includes("vence") ? "Buscando documentos…" : normalized.includes("mora") || normalized.includes("deben") ? "Revisando morosidad…" : normalized.includes("pago") || normalized.includes("concil") ? "Revisando conciliaciones…" : "Consultando la operación…");
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation.map((m) => ({
            role: m.role,
            content: m.text,
          })),
          state: conversationState,
          sessionId,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        answer?: string;
        topic?: string;
        suggested_questions?: string[];
        action?: { label: string; view: View } | null;
        result?: unknown;
        state?: Record<string, unknown>;
      };
      if (!response.ok || !data.answer) throw new Error(data.error || "No pude consultar el Agente.");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: data.answer!,
          topic: data.topic || "general",
          action: data.action || null,
          suggestions: data.suggested_questions || [],
          result: data.result,
        },
      ]);
      if (data.state) setConversationState(data.state);
    } catch (error) {
      setMessages((m) => [...m, { role: "assistant", text: error instanceof Error ? error.message : "No pude consultar el Agente en este momento.", suggestions: ["Reintentar"] }]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="agent-page">
      <button className="agent-history-toggle" onClick={() => setHistoryOpen((open) => !open)}>{historyOpen ? "Ocultar conversaciones" : "Conversaciones"}</button>
      <aside className={`agent-history ${historyOpen ? "mobile-open" : ""}`}>
        <button className="new-chat" onClick={() => { setMessages([]); setConversationState({}); }}>
          <Icon name="agent" /> Nueva conversación
        </button>
        <p>CONVERSACIONES</p>
        <button className="active">
          <b>Operación de hoy</b>
          <small>Prioridades y excepciones</small>
        </button>
        <button>
          <b>Conciliaciones</b>
          <small>Pagos y movimientos</small>
        </button>
        <button>
          <b>Morosidad</b>
          <small>Cobranza prioritaria</small>
        </button>
        <div className="human-control">
          <Icon name="check" />
          <p>
            <b>Control humano activo</b>
            <small>El Agente prepara. Vos confirmás.</small>
          </p>
        </div>
      </aside>
      <section className="agent-chat">
        {messages.length === 0 ? (
          <div className="agent-empty">
            <span>
              <Icon name="agent" size={25} />
            </span>
            <h1>¿Qué querés saber de tu operación?</h1>
            <p>
              Buscá, compará y entendé pagos, mora, consorcios y documentos
              conversando.
            </p>
            <div>
              {suggestions.map((x) => (
                <button onClick={() => send(x)} key={x}>
                  {x}
                  <Icon name="arrow" size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="agent-thread" aria-live="polite">
            {messages.map((m, i) => (
              <div className={`agent-message ${m.role}`} key={i}>
                <span>
                  {m.role === "assistant" ? (
                    <Icon name="agent" size={16} />
                  ) : (
                    "JC"
                  )}
                </span>
                <div>
                  <p>{m.text}</p>
                  {m.role === "assistant" && (
                    <AgentResult topic={m.topic || "general"} result={m.result} />
                  )}{" "}
                  {m.action && (
                    <button
                      className="deep-link"
                      onClick={() => { trackShowroomEvent("primary_click", { target: "agent_deep_link" }); go(m.action!.view); }}
                    >
                      {m.action.label}
                      <Icon name="arrow" size={14} />
                    </button>
                  )}
                  {m.suggestions && (
                    <div className="followups">
                      {m.suggestions.slice(0, 3).map((x) => (
                        <button onClick={() => send(x === "Reintentar" ? [...messages].reverse().find((item) => item.role === "user")?.text || x : x)} key={x}>
                          {x}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="agent-loading">
                <i />
                <i />
                <i /> {loadingLabel}
              </div>
            )}
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Preguntá sobre pagos, mora, consorcios, movimientos…"
            maxLength={800}
          />
          <button disabled={!input.trim() || loading}>
            <Icon name="arrow" />
          </button>
          <small>
            IA generativa · Datos simulados · Las acciones sensibles requieren
            confirmación.
          </small>
        </form>
      </section>
    </div>
  );
}

function AgentResult({ topic, result }: { topic: string; result?: unknown }) {
  const data = result as any;
  const money = (value: unknown) => typeof value === "number" ? `$${value.toLocaleString("es-AR")}` : "—";
  if (!data || topic === "general") return null;
  if (topic === "portfolio") return <div className="agent-result"><span><small>CONSORCIOS</small><b>{data.consortia}</b></span><span><small>UNIDADES</small><b>{data.units}</b></span><span><small>PENDIENTE</small><b>{money(data.pending)}</b></span></div>;
  if ((topic === "payment" || topic === "evidence") && (data.amount || data.payment?.amount)) {
    const payment = data.payment || data;
    const candidate = data.candidate || data.candidates?.[0];
    return (
      <div className="agent-result">
        <span>
          <small>MOVIMIENTO</small>
          <b>{money(payment.amount)}</b>
        </span>
        <span>
          <small>REFERENCIA</small>
          <b>{payment.reference || "—"}</b>
        </span>
        <span>
          <small>PROPUESTA</small>
          <b>{candidate ? `${candidate.consortium} · ${candidate.unit}` : "Revisión requerida"}</b>
        </span>
      </div>
    );
  }
  if (topic === "debt") {
    const top = data.organization;
    return (
      <div className="agent-result debt">
        <span>
          <small>CONSORCIO</small>
          <b>{top?.name || "Cartera"}</b>
        </span>
        <span>
          <small>PENDIENTE TOTAL</small>
          <b>{money(top?.debt)}</b>
        </span>
        <span>
          <small>UNIDADES</small>
          <b>{top?.pending ?? "—"}</b>
        </span>
      </div>
    );
  }
  if (topic === "debt_units" && data.units) return (
    <div className="agent-result-list">
      {data.units.map((unit: any) => <div key={unit.unit}><b>{unit.unit}</b><span>{money(unit.amount)}</span><small>{unit.status}</small></div>)}
    </div>
  );
  if (topic === "document" && data.documents?.[0]) {
    const doc = data.documents[0];
    return (
      <div className="agent-result">
        <span>
          <small>FACTURA</small>
          <b>{doc.provider}</b>
        </span>
        <span>
          <small>IMPORTE</small>
          <b>{money(doc.amount)}</b>
        </span>
        <span>
          <small>CONSORCIO</small>
          <b>{doc.consortium}</b>
        </span>
      </div>
    );
  }
  if (topic === "organization") return <div className="agent-result"><span><small>CONSORCIO</small><b>{data.name}</b></span><span><small>COBRANZA</small><b>{data.collectionRate}%</b></span><span><small>PENDIENTE</small><b>{money(data.debt)}</b></span></div>;
  if (topic === "documents_upcoming" && data.documents) return <div className="agent-result-list">{data.documents.map((doc: any) => <div key={`${doc.type}-${doc.consortium}`}><b>{doc.type}</b><span>{doc.consortium}</span><small>{doc.status}</small></div>)}</div>;
  if (topic === "unit") return <div className="agent-result"><span><small>UNIDAD</small><b>{data.consortium} · {data.unit}</b></span><span><small>PROPIETARIO</small><b>{data.owner}</b></span><span><small>SALDO</small><b>{money(data.outstanding)}</b></span></div>;
  if (topic === "activity" && data[0]) return <div className="agent-priorities">{data.slice(0,3).map((x: any) => <span key={`${x.time}-${x.event}`}><b>{x.time}</b> {x.event}</span>)}</div>;
  if (topic === "reconciliation") return <div className="agent-result"><span><small>REQUIEREN DECISIÓN</small><b>{data.summary?.requiresDecision}</b></span><span><small>NECESITAN INFORMACIÓN</small><b>{data.summary?.requiresInformation}</b></span><span><small>RESOLUCIÓN AUTOMÁTICA</small><b>{data.summary?.straightThroughRate}%</b></span></div>;
  if (topic !== "today") return null;
  return (
    <div className="agent-priorities">
      <span>
        <b>{data.decisions}</b> pagos para decidir
      </span>
      <span>
        <b>{data.needsInformation}</b> necesitan información
      </span>
      <span>
        <b>{data.deadlines?.length ?? 0}</b> documentos por atender
      </span>
    </div>
  );
}

function Settings() {
  return (
    <div className="settings-grid">
      {[
        ["building", "Organización", "Usuarios, permisos y cartera"],
        ["bank", "Bancos e integraciones", "Bancos, ERP, WhatsApp y email"],
        [
          "check",
          "Políticas de conciliación",
          "Revisión, confirmación y auditoría",
        ],
        ["debt", "Políticas de cobranza", "Tono, seguimientos y aprobaciones"],
      ].map((x) => (
        <article className="card" key={x[1]}>
          <span>
            <Icon name={x[0] as IconName} />
          </span>
          <h2>{x[1]}</h2>
          <p>{x[2]}</p>
          <span className="settings-note">Disponible en el producto final</span>
        </article>
      ))}
      <section className="automation-setting card">
        <div>
          <p>AUTOMATIZACIÓN</p>
          <h2>Modo conservador</h2>
          <span>Toda decisión sensible requiere confirmación humana.</span>
        </div>
        <Status tone="success">Política activa</Status>
      </section>
    </div>
  );
}

function GlobalSearch({
  close,
  go,
  openDoc,
  selectOrganization,
}: {
  close: () => void;
  go: (v: View) => void;
  openDoc: (d: (typeof documents)[number]) => void;
  selectOrganization: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [close]);
  const groups = [
    {
      title: "MOVIMIENTOS",
      items: [
        {
          label: `Transferencia ${featuredAmount}`,
          meta: `${formatMovementDate(featuredPayment.receivedAt)} · ${featuredPayment.candidates[0].consortium} · ${featuredPayment.candidates[0].unit}`,
          action: () => go("resolution"),
        },
      ],
    },
    {
      title: "UNIDADES",
      items: demoData.unitProfiles.map((unit) => ({ label: `${unit.consortium} · ${unit.unit}`, meta: `${unit.owner} · ${unit.history[0].status}`, action: () => selectOrganization(unit.consortium) })),
    },
    {
      title: "CONSORCIOS",
      items: demoData.consortia.map((organization) => ({ label: organization.name, meta: `${organization.units} unidades · ${formatMoney(organization.debt)} pendiente`, action: () => selectOrganization(organization.name) })),
    },
    {
      title: "DOCUMENTOS",
      items: documents.map((document) => ({ label: `${document.type} · ${document.title}`, meta: `${document.place} · ${document.period} · ${document.amount}`, action: () => openDoc(document) })),
    },
    {
      title: "PROVEEDORES",
      items: [...new Set(demoData.documents.map((document) => document.provider))].map((provider) => ({ label: provider, meta: `${demoData.documents.filter((document) => document.provider === provider).length} documentos`, action: () => { const document = documents.find((item) => item.title === provider); if (document) openDoc(document); } })),
    },
  ];
  return (
    <div className="modal-overlay" onClick={close}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input">
          <Icon name="search" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar pagos, unidades, consorcios…"
          />
          <button onClick={close}>
            <Icon name="close" />
          </button>
        </div>
        {groups.map((g) => {
          const items = g.items.filter((x) =>
            `${x.label} ${x.meta}`.toLowerCase().includes(q.toLowerCase()),
          );
          return items.length ? (
            <section key={g.title}>
              <p>{g.title}</p>
              {items.map((x) => (
                <button key={x.label} onClick={x.action}>
                  <span>
                    <b>{x.label}</b>
                    <small>{x.meta}</small>
                  </span>
                  <Icon name="arrow" size={14} />
                </button>
              ))}
            </section>
          ) : null;
        })}
      </div>
    </div>
  );
}
function Notifications({
  close,
  go,
}: {
  close: () => void;
  go: (v: View) => void;
}) {
  return (
    <div className="notifications">
      <div>
        <b>Notificaciones</b>
        <button onClick={close}>
          <Icon name="close" size={15} />
        </button>
      </div>
      {[
        ["alert", "3 situaciones requieren revisión", "Conciliación"],
        ["whatsapp", "Nuevo comprobante recibido", "WhatsApp · ahora"],
        ["info", "Movimiento sin identificar", "$146.800"],
      ].map((x, i) => (
        <button
          key={x[1]}
          onClick={() => {
            close();
            go(i === 1 ? "evidence" : "reconciliation");
          }}
        >
          <span>
            <Icon name={x[0] as IconName} />
          </span>
          <p>
            <b>{x[1]}</b>
            <small>{x[2]}</small>
          </p>
        </button>
      ))}
    </div>
  );
}
function DocumentPreview({
  doc,
  close,
}: {
  doc: (typeof documents)[number];
  close: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={close}>
      <div className="document-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <p>{doc.type.toUpperCase()}</p>
            <h2>{doc.title}</h2>
          </div>
          <button onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        <div className="document-paper">
          <span>{doc.type}</span>
          <h3>{doc.title}</h3>
          <p>{doc.place}</p>
          <div>
            <small>PERÍODO</small>
            <b>{doc.period}</b>
          </div>
          <div>
            <small>IMPORTE</small>
            <b>{doc.amount}</b>
          </div>
          <i />
          <p className="legal">
            Documento sintético para demostración de producto.
          </p>
        </div>
        <footer>
          <Status
            tone={doc.status.toLowerCase().includes("vencer") ? "warning" : "success"}
          >
            {doc.status}
          </Status>
          <button className="secondary" onClick={close}>
            Cerrar vista previa
          </button>
        </footer>
      </div>
    </div>
  );
}
function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-title">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}
function Status({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span className={`status ${tone}`}>
      <i />
      {children}
    </span>
  );
}
function Kpi({
  label,
  value,
  note,
  tone = "",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <article className={`kpi ${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}
function StatePanel({
  icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: IconName;
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="state-panel card">
      <span>
        <Icon name={icon} size={25} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="primary" onClick={onClick}>
        {action}
      </button>
    </div>
  );
}
