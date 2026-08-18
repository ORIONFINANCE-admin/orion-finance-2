import { getAll, getOne, put, queueChange } from "./db.js";
import { makeId, nowISO, todayISO } from "./utils.js";

const FREQUENCIES = Object.freeze({
  mensal: "Mensal",
  quinzenal: "A cada 15 dias",
  semanal: "Semanal",
  anual: "Anual",
  personalizado: "Personalizado"
});

export function recurringFrequencyLabel(value) {
  return FREQUENCIES[value] || "Personalizado";
}

export async function getRecurringExpenses() {
  const items = await getAll("despesas_recorrentes");
  return items.sort((a,b) =>
    String(a.status === "inativo").localeCompare(String(b.status === "inativo")) ||
    Number(a.dia_vencimento || 99) - Number(b.dia_vencimento || 99) ||
    String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
  );
}

export async function saveRecurringExpense(input) {
  const previous = input.recorrente_id ? await getOne("despesas_recorrentes", input.recorrente_id) : null;
  const value = Number(input.valor_previsto || 0);
  if (!(value > 0)) throw new Error("Informe um valor previsto maior que zero.");
  const name = String(input.nome || "").trim();
  if (!name) throw new Error("Informe o nome da despesa recorrente.");
  if (!String(input.categoria_id || "")) throw new Error("Selecione uma categoria.");

  const now = nowISO();
  const record = {
    recorrente_id: previous?.recorrente_id || makeId("rec"),
    nome: name,
    categoria_id: String(input.categoria_id || ""),
    valor_previsto: value,
    frequencia: String(input.frequencia || "mensal"),
    dia_vencimento: Number(input.dia_vencimento || 0) || "",
    conta_id: String(input.conta_id || ""),
    forma_pagamento: String(input.forma_pagamento || "pix"),
    status: String(input.status || previous?.status || "ativo"),
    ultimo_valor: Number(previous?.ultimo_valor || 0) || "",
    ultima_data: String(previous?.ultima_data || ""),
    observacao: String(input.observacao || "").trim(),
    criado_em: previous?.criado_em || now,
    atualizado_em: now
  };

  await put("despesas_recorrentes", record);
  await queueChange("DESPESAS_RECORRENTES", record);
  return record;
}

export async function setRecurringStatus(id, status) {
  const item = await getOne("despesas_recorrentes", id);
  if (!item) throw new Error("Despesa recorrente não encontrada.");
  const updated = { ...item, status, atualizado_em: nowISO() };
  await put("despesas_recorrentes", updated);
  await queueChange("DESPESAS_RECORRENTES", updated);
  return updated;
}

export async function markRecurringRegistered(id, value, date = todayISO()) {
  const item = await getOne("despesas_recorrentes", id);
  if (!item) return null;
  const updated = {
    ...item,
    ultimo_valor: Number(value || 0),
    ultima_data: date,
    atualizado_em: nowISO()
  };
  await put("despesas_recorrentes", updated);
  await queueChange("DESPESAS_RECORRENTES", updated);
  return updated;
}

export function recurringDueState(item, today = todayISO()) {
  if (item.status === "inativo") return "inativo";
  if (item.frequencia !== "mensal" || !item.dia_vencimento) return "ativo";
  const [y,m,d] = today.split("-").map(Number);
  if (!y || !m || !d) return "ativo";
  const due = Number(item.dia_vencimento);
  if (String(item.ultima_data || "").slice(0,7) === today.slice(0,7)) return "pago";
  if (d > due) return "atrasado";
  if (d === due || due-d <= 3) return "proximo";
  return "ativo";
}
