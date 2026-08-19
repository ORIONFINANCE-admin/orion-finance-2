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
  accounts = Array.isArray(accounts) ? accounts : [];
  institutions = Array.isArray(institutions) ? institutions : [];
  cards = Array.isArray(cards) ? cards : [];
  const institutionMap = new Map(institutions.filter(Boolean).map(i => [i.instituicao_id, i]));
  const grouped = new Map();

  for (const account of accounts) {
    if (!account) continue;
    if (account.dashboard_visibilidade === "ocultar") continue;
    const institutionKey = account.instituicao_id || `account:${account.conta_id || account.nome || "sem-id"}`;
    const balance = Number(account.saldo_calculado || 0);
    const institution = institutionMap.get(account.instituicao_id) || {};
    const item = grouped.get(institutionKey) || {
      instituicao_id: institutionKey,
      name: institution.nome_curto || institution.nome || account.nome || "Instituição",
      color: institution.cor_primaria || "#334155",
      total: 0,
      lines: [],
      cards: [],
      forceShow: false
    };

    item.total += balance;
    if (account.dashboard_visibilidade === "mostrar") item.forceShow = true;

    if (!nearlyZero(balance)) {
      item.lines.push({
        id: account.conta_id,
        label: accountLabel(account),
        value: balance,
        type: account.tipo || ""
      });
    }

    grouped.set(institutionKey, item);
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
      cards: [],
      forceShow: false
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
    .filter(item => item.forceShow || !nearlyZero(item.total) || item.cards.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function renderInstitutionCard(item, escapeHTML) {
  const safeName = String(item?.name || "Instituição");
  const primaryLine = item.lines?.[0] || null;
  const extraCount = Math.max(0, Number(item.lines?.length || 0) - 1);
  const creditTotal = (item.cards || []).reduce((sum, card) => sum + Number(card.committed || 0), 0);
  const subtitle = primaryLine?.label || (item.cards?.length ? "Crédito" : "Conta");
  const meta = [
    extraCount ? `+${extraCount} saldo${extraCount === 1 ? "" : "s"}` : "",
    creditTotal > 0 ? `${money(creditTotal)} no crédito` : ""
  ].filter(Boolean).join(" · ");

  return `<article class="account-card institution-card institution-card-clickable" data-institution-id="${escapeHTML(String(item.instituicao_id||""))}" data-institution-name="${escapeHTML(safeName)}" tabindex="0" role="button" aria-label="Abrir perfil de ${escapeHTML(safeName)}" style="--institution-color:${escapeHTML(item.color || "#334155")}">
    <span class="institution-logo" aria-hidden="true">${escapeHTML(safeName.slice(0,1).toUpperCase())}</span>
    <div class="institution-card-copy"><strong>${escapeHTML(safeName)}</strong><small>${escapeHTML(subtitle)}${meta ? ` · ${escapeHTML(meta)}` : ""}</small></div>
    <div class="institution-card-value"><strong>${money(item.total)}</strong><span>›</span></div>
  </article>`;
}
