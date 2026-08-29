import { agentTools, inferDeterministicRead, resolveToolArgs, runAgentTool, trustedPresentation, trustedResponse, updateConversationState, type ConversationState } from "../../../lib/agent-tools";
import { consumeAgentQuota } from "../../../lib/rate-limit";

export const runtime = "edge";
type Message = { role: "user" | "assistant"; content: string };
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 14_000;

const plannerInstructions = `Sos el router conversacional del Agente Operativo de ConcilIA. Entendés español informal argentino, elipsis y referencias multi-turno.
Elegí exactamente UNA tool read-only por turno cuando la pregunta pueda responderse con las capabilities disponibles. Las tools son por dominio, no por frase.
Usá el ESTADO ESTRUCTURADO para completar referencias como ese consorcio, esas unidades, el anterior, la más urgente, ahí, volvamos a la mora o esa factura. No le pidas al usuario un dato que ya esté en el estado.
PORTFOLIO_OVERVIEW es para cantidades totales de consorcios, unidades, situaciones, decisiones o deuda de la cartera. DEBT_OVERVIEW con scope portfolio es para ranking o "dónde tengo mayor mora"; con scope active_organization es para el consorcio en contexto. DEBT_UNIT_DETAIL es para listar, filtrar o priorizar unidades; UNIT_LOOKUP para identificar propietario, saldo o estado de una unidad concreta; RECONCILIATION_REVIEW para la cola; PAYMENT_EVIDENCE para explicar una propuesta; DOCUMENT_PAYMENT_STATUS para preguntar si la factura activa fue pagada. ATTENTION_SUMMARY es para "qué necesita atención en [consorcio]" combinando mora, documentos, facturas, conciliación y mantenimiento de ese consorcio; usá most_urgent_only=true cuando pregunten específicamente qué es lo más urgente o prioritario (normalmente como seguimiento de una ATTENTION_SUMMARY anterior, usando el consorcio del estado).
CONTEXT_SUMMARY es para "resumime este/el consorcio". CURRENT_INVOICE es para "la factura pendiente de este consorcio" o similar, usando el consorcio en contexto (el copiloto contextual ya lo carga en el estado). CURRENT_DOCUMENT_DEADLINE es para "¿cuál vence primero?" sobre documentos. CURRENT_MAINTENANCE es para "¿cuándo es el próximo mantenimiento?". PREPARE_COLLECTION_FOLLOWUP es para "preparar/armar el seguimiento de cobranza" — SOLO prepara un borrador, nunca envía nada; si no se especifica unidad usa la unidad del estado o la de mora crítica del consorcio.
Nunca inventes argumentos. Si falta una entidad imprescindible y el estado no la tiene, llamá igualmente la tool con null: el servidor pedirá el dato. Si no existe capability adecuada, no llames ninguna tool.
No respondas la operación: solamente seleccioná la tool. El servidor construye la respuesta factual.`;

function cleanState(input: unknown): ConversationState {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const text = (key: string) => typeof raw[key] === "string" ? String(raw[key]).slice(0, 120) : null;
  return { activeOrganization: text("activeOrganization"), activeUnit: text("activeUnit"), activePayment: text("activePayment"), activeDocument: text("activeDocument"), activeProvider: text("activeProvider"), lastTool: text("lastTool"), lastKind: text("lastKind"), lastMinimumAmount: typeof raw.lastMinimumAmount === "number" ? raw.lastMinimumAmount : null };
}

export async function POST(request: Request) {
  const started = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "El Agente no está disponible temporalmente." }, { status: 503 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let tool = "none";
  try {
    const body = await request.json() as { messages?: Message[]; state?: ConversationState; sessionId?: string };
    const sessionId = typeof body.sessionId === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(body.sessionId) ? body.sessionId : "anonymous";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "visitor";
    const quota = await consumeAgentQuota(ip, sessionId);
    if (!quota.allowed) {
      if (quota.reason === "limit") return Response.json({ error: "Alcanzaste el límite de conversaciones de esta demo." }, { status: 429 });
      return Response.json({ error: "El Agente no está disponible temporalmente." }, { status: 503 });
    }
    const state = cleanState(body.state);
    const messages = (body.messages ?? []).filter((m): m is Message => (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-6).map((m) => ({ role: m.role, content: m.content.slice(0, 900) }));
    if (!messages.length || messages.at(-1)?.role !== "user") return Response.json({ error: "Escribí una consulta para continuar." }, { status: 400 });
    if ((messages.at(-1)?.content.length ?? 0) > 800) return Response.json({ error: "La consulta es demasiado larga para esta demo." }, { status: 400 });
    const latest = messages.at(-1)?.content.toLowerCase() || "";
    if (/system prompt|api[_ ]?key|ignor[aá].*instrucciones|ejecut[aá].*c[oó]digo|\bsql\b|borr[aá].*datos/.test(latest)) return Response.json({ answer: "No puedo ayudar con credenciales, instrucciones internas, código, SQL ni acciones destructivas. El Agente opera únicamente sobre datos sintéticos de ConcilIA y con consultas de solo lectura.", topic: "unsupported", result: null, action: null, suggested_questions: ["¿Qué requiere mi atención hoy?", "¿Qué pagos necesitan revisión?"], state });

    let plan: any = null;
    let call: any = inferDeterministicRead(messages.at(-1)?.content ?? "", state);
    if (call) {
      call = { name: call.name, arguments: JSON.stringify(call.arguments) };
    } else {
      const upstream = await fetch("https://api.openai.com/v1/responses", { method: "POST", signal: controller.signal, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: MODEL, instructions: `${plannerInstructions}\nESTADO ESTRUCTURADO ACTUAL:\n${JSON.stringify(state)}`, input: messages, tools: agentTools, tool_choice: "auto", parallel_tool_calls: false, max_output_tokens: 160, store: false }) });
      if (!upstream.ok) throw new Error(`upstream_${upstream.status}`);
      plan = await upstream.json() as any;
      call = (plan.output ?? []).find((x: any) => x.type === "function_call");
    }
    if (!call) return Response.json({ answer: "Todavía no puedo consultar ese detalle.", topic: "unsupported", result: null, action: null, suggested_questions: ["¿Qué requiere mi atención hoy?", "¿Dónde tengo mayor mora?"], state });
    tool = String(call.name);
    let rawArgs: Record<string, unknown> = {};
    try { rawArgs = JSON.parse(call.arguments || "{}"); } catch { rawArgs = {}; }
    const args = resolveToolArgs(tool, rawArgs, state);
    const result = runAgentTool(tool, args);
    const nextState = updateConversationState(state, tool, result);
    const response = trustedResponse(result);
    const presentation = trustedPresentation(result);
    console.info("agent_request", { model: MODEL, latencyMs: Date.now() - started, inputTokens: plan?.usage?.input_tokens ?? 0, outputTokens: plan?.usage?.output_tokens ?? 0, tool, status: "ok" });
    return Response.json({ answer: response.answer, suggested_questions: response.suggestions, ...presentation, state: nextState });
  } catch (error) {
    console.warn("agent_request", { model: MODEL, latencyMs: Date.now() - started, tool, status: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "error" });
    return Response.json({ error: "No pude consultar el Agente en este momento. Intentá nuevamente en unos segundos." }, { status: 502 });
  } finally { clearTimeout(timeout); }
}
