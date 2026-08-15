import { money } from "./utils.js";

const EPSILON = 0.005;

function accountLabel(account) {
  const type = String(account?.tipo || "");
  const name = String(account?.nome || "").trim();

  if (type === "reserva") return name && name.toLowerCase() !== "reserva" ? name : "Reserva";
  if (type === "reserva_secundaria") return name || "Cofrinho";
  if (type === "investimento_garantia") return name || "Investimento garantia";
  if (type === "beneficio") return "VA / Alimentação";
  if (type === "conta_corrente") return "Conta";
  if (type === "conta_pagamento") return "Disponível";
  return name || "Saldo";
}

function nearlyZero(value) {
  return Math.abs(Number(value || 0)) < EPSILON;
}

export function buildInstitutionCards({ accounts = [], institutions = [], cards = [] } = {}) {
  const institutionMap = new Map(institutions.map(i => [i.instituicao_id, i]));
  const grouped = new Map();

  for (const account of accounts) {
    if (!account?.instituicao_id) continue;
    const balance = Number(account.saldo_calculado || 0);
    const institution = institutionMap.get(account.instituicao_id) || {};
    const item = grouped.get(account.instituicao_id) || {
      instituicao_id: account.instituicao_id,
      name: institution.nome_curto || institution.nome || account.nome || "Instituição",
      color: institution.cor_primaria || "#334155",
      total: 0,
      lines: [],
      cards: []
    };

    item.total += balance;

    if (!nearlyZero(balance)) {
      item.lines.push({
        id: account.conta_id,
        label: accountLabel(account),
        value: balance,
        type: account.tipo || ""
      });
    }

    grouped.set(account.instituicao_id, item);
  }

  for (const card of cards) {
    if (!card?.instituicao_id) continue;
    const institution = institutionMap.get(card.instituicao_id) || {};
    const item = grouped.get(card.instituicao_id) || {
      instituicao_id: card.instituicao_id,
      name: institution.nome_curto || institution.nome || card.nome || "Instituição",
      color: institution.cor_primaria || "#334155",
      total: 0,
      lines: [],
      cards: []
    };

    const totalLimit = Number(card.limite_total || 0);
    const available = Number(card.limite_disponivel || 0);
    const committed = Math.max(0, totalLimit - available);

    if (!nearlyZero(committed)) {
      item.cards.push({
        id: card.cartao_id,
        label: card.nome || "Cartão de crédito",
        committed,
        dueDay: card.dia_vencimento || ""
      });
    }

    grouped.set(card.instituicao_id, item);
  }

  return [...grouped.values()]
    .filter(item => !nearlyZero(item.total) || item.cards.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function renderInstitutionCard(item, escapeHTML) {
  const breakdown = item.lines.length
    ? `<div class="institution-breakdown">${item.lines.map(line => `
        <div class="institution-line">
          <span>${escapeHTML(line.label)}</span>
          <strong>${money(line.value)}</strong>
        </div>`).join("")}</div>`
    : "";

  const cards = item.cards.length
    ? `<div class="institution-credit">${item.cards.map(card => `
        <div class="institution-credit-row">
          <span>${escapeHTML(card.label)}</span>
          <strong>${money(card.committed)} comprometido</strong>
        </div>
        ${card.dueDay ? `<div class="institution-credit-meta">Vencimento dia ${escapeHTML(String(card.dueDay))}</div>` : ""}`
      ).join("")}</div>`
    : "";

  return `<article class="account-card institution-card" style="background:${escapeHTML(item.color)}">
    <div class="account-title">
      <span class="bank-mark">${escapeHTML(item.name.slice(0,1))}</span>
      ${escapeHTML(item.name)}
    </div>
    <div class="account-balance">${money(item.total)}</div>
    ${breakdown}
    ${cards}
  </article>`;
}
