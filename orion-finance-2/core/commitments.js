
import { getAll } from "./db.js";
import { getDebts } from "./orion.js";
import { getRecurringExpenses } from "./recurring.js";

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}
function isMonth(value, month) {
  return String(value || "").slice(0,7) === month;
}
export async function getMonthlyCommitments(now = new Date()) {
  const month = monthKey(now);
  const [recurring, debts, cards] = await Promise.all([
    getRecurringExpenses(), getDebts(), getAll("cartoes_credito")
  ]);
  const recurringActive = recurring.filter(r => r.status !== "inativo");
  const recurringTotal = recurringActive.reduce((s,r)=>s+Number(r.valor_previsto||0),0);
  const debtItems = debts.filter(d => d.status !== "quitada" && (!d.proximo_vencimento || isMonth(d.proximo_vencimento,month) || isMonth(d.vencimento,month)));
  const debtTotal = debtItems.reduce((s,d)=>s+Number(d.valor_pagamento_planejado||d.valor_atual||0),0);
  const cardItems = cards.filter(c=>c.status !== "inativo").map(c=>({
    nome:c.nome||"Cartão",
    valor:Math.max(0,Number(c.limite_total||0)-Number(c.limite_disponivel||0)),
    vencimento:c.dia_vencimento||""
  })).filter(c=>c.valor>0);
  const cardTotal = cardItems.reduce((s,c)=>s+c.valor,0);
  return {
    total: recurringTotal + debtTotal + cardTotal,
    recurringTotal, debtTotal, cardTotal,
    recurringCount: recurringActive.length,
    debtCount: debtItems.length,
    cardCount: cardItems.length
  };
}
