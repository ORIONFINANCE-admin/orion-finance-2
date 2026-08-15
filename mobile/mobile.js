import { setApiToken, getApiToken, setDeviceType } from "../core/config.js";
import { getAll } from "../core/db.js";
import { syncNow, getSyncStatus, downloadAll } from "../core/sync.js";
import { calculateDashboard, recentTransactions } from "../core/finance.js";
import { createAccount, createTransaction, randomPhrase } from "../core/orion.js";
import { money, dateBR, escapeHTML, numberFromInput, todayISO } from "../core/utils.js";

setDeviceType("mobile");

const $ = (id) => document.getElementById(id);
const dialogs = {
  token: $("tokenDialog"),
  account: $("accountDialog"),
  movement: $("movementDialog")
};
let movementType = "saida";

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

async function showReward(context) {
  const phrase = await randomPhrase(context);
  if (!phrase) return;
  $("rewardText").textContent = phrase.texto;
  $("reward").classList.remove("hidden");
  setTimeout(() => $("reward").classList.add("hidden"), 1700);
}

function institutionMap(items) {
  return new Map(items.map(i => [i.instituicao_id, i]));
}

async function render() {
  const [dashboard, recent, institutions] = await Promise.all([
    calculateDashboard(),
    recentTransactions(8),
    getAll("instituicoes")
  ]);

  const imap = institutionMap(institutions);

  $("saldoTotal").textContent = money(dashboard.saldoTotal);
  $("entradasMes").textContent = money(dashboard.entradasMes);
  $("saidasMes").textContent = money(dashboard.saidasMes);

  $("accountsList").innerHTML = dashboard.contas.length
    ? dashboard.contas.map(a => {
        const i = imap.get(a.instituicao_id) || {};
        const color = i.cor_primaria || "#334155";
        const name = i.nome_curto || a.nome || "Conta";
        return `<article class="account-card" style="background:${escapeHTML(color)}">
          <div class="account-title"><span class="bank-mark">${escapeHTML(name.slice(0,1))}</span>${escapeHTML(name)}</div>
          <div class="account-balance">${money(a.saldo_calculado)}</div>
          <div class="account-meta">${escapeHTML(a.nome)} · ${escapeHTML(a.tipo || "")}</div>
        </article>`;
      }).join("")
    : `<div class="empty">Cadastre sua primeira conta para começar.</div>`;

  $("recentList").innerHTML = renderMovements(recent);
  const all = await getAll("transacoes");
  all.sort((a,b) => `${b.data}|${b.criado_em}`.localeCompare(`${a.data}|${a.criado_em}`));
  $("allMovements").innerHTML = renderMovements(all);

  await fillSelectors();
}

function renderMovements(items) {
  if (!items.length) return `<div class="empty">Nenhuma movimentação registrada.</div>`;
  return items.map(t => `<article class="movement">
    <strong>${escapeHTML(t.descricao)}</strong>
    <small>${dateBR(t.data)} · ${escapeHTML(t.forma_pagamento || "")}</small>
    <span class="value ${t.tipo === "entrada" ? "amount-positive" : "amount-negative"}">
      ${t.tipo === "entrada" ? "+" : "-"} ${money(t.valor)}
    </span>
  </article>`).join("");
}

async function fillSelectors() {
  const [institutions, accounts, categories] = await Promise.all([
    getAll("instituicoes"), getAll("contas"), getAll("categorias")
  ]);

  $("accountInstitution").innerHTML =
    `<option value="">Selecione</option>` +
    institutions.filter(i => i.ativo !== false).map(i =>
      `<option value="${escapeHTML(i.instituicao_id)}">${escapeHTML(i.nome_curto || i.nome)}</option>`
    ).join("");

  $("movementAccount").innerHTML =
    `<option value="">Selecione</option>` +
    accounts.filter(a => a.status !== "inativo").map(a =>
      `<option value="${escapeHTML(a.conta_id)}">${escapeHTML(a.nome)}</option>`
    ).join("");

  const filteredCategories = categories.filter(c => {
    if (c.ativa === false) return false;
    const allowed = String(c.tipo_permitido || "");
    return allowed === movementType || allowed === "entrada_saida";
  });

  $("movementCategory").innerHTML =
    `<option value="">Selecione</option>` +
    filteredCategories.sort((a,b) => Number(a.ordem||0)-Number(b.ordem||0)).map(c =>
      `<option value="${escapeHTML(c.categoria_id)}">${escapeHTML(c.nome)}</option>`
    ).join("");
}

async function checkStartupSync() {
  if (!getApiToken()) {
    dialogs.token.showModal();
    return;
  }

  if (!navigator.onLine) {
    showToast("Offline. Usando os dados locais.");
    return;
  }

  try {
    const status = await getSyncStatus();
    if (status.needsSync) {
      $("syncBannerText").textContent = "Há dados mais recentes no Orion.";
      $("syncBanner").classList.remove("hidden");
    }
  } catch (e) {
    showToast(e.message);
  }
}

async function performSync() {
  if (!getApiToken()) {
    dialogs.token.showModal();
    return;
  }
  if (!navigator.onLine) {
    showToast("Sem internet. Seus dados continuam salvos localmente.");
    return;
  }

  $("syncBannerBtn").disabled = true;
  try {
    await syncNow();
    $("syncBanner").classList.add("hidden");
    await render();
    showToast("Sincronização concluída.");
  } catch (e) {
    showToast(e.message);
  } finally {
    $("syncBannerBtn").disabled = false;
  }
}

$("settingsBtn").addEventListener("click", () => {
  $("tokenInput").value = getApiToken();
  dialogs.token.showModal();
});
$("syncBannerBtn").addEventListener("click", performSync);
$("syncNavBtn").addEventListener("click", performSync);
$("quickAddBtn").addEventListener("click", async () => {
  $("movementDate").value = todayISO();
  await fillSelectors();
  dialogs.movement.showModal();
});
$("addAccountBtn").addEventListener("click", async () => {
  await fillSelectors();
  dialogs.account.showModal();
});

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => document.getElementById(btn.dataset.close).close());
});

document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.querySelectorAll(".nav-btn[data-view]").forEach(b => b.classList.remove("active"));
    $(btn.dataset.view).classList.remove("hidden");
    btn.classList.add("active");
  });
});

document.querySelectorAll(".segment").forEach(btn => {
  btn.addEventListener("click", async () => {
    movementType = btn.dataset.type;
    document.querySelectorAll(".segment").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    await fillSelectors();
  });
});

$("tokenForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    setApiToken($("tokenInput").value);
    dialogs.token.close();
    showToast("Chave salva neste dispositivo.");
    try {
      await downloadAll();
      await render();
      showToast("Orion conectado.");
    } catch (err) {
      showToast(err.message);
    }
  } catch (err) {
    showToast(err.message);
  }
});

$("accountForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await createAccount({
      instituicao_id: $("accountInstitution").value,
      nome: $("accountName").value,
      tipo: $("accountType").value,
      saldo_inicial: numberFromInput($("accountBalance").value)
    });
    e.target.reset();
    dialogs.account.close();
    await render();
    await showReward("registro");
  } catch (err) {
    showToast(err.message);
  }
});

$("movementForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await createTransaction({
      tipo: movementType,
      valor: numberFromInput($("movementValue").value),
      descricao: $("movementDescription").value,
      categoria_id: $("movementCategory").value,
      conta_id: $("movementAccount").value,
      forma_pagamento: $("movementPayment").value,
      data: $("movementDate").value,
      observacao: $("movementNote").value
    });
    e.target.reset();
    $("movementDate").value = todayISO();
    dialogs.movement.close();
    await render();
    await showReward(movementType === "entrada" ? "entrada" : "saida");
  } catch (err) {
    showToast(err.message);
  }
});

window.addEventListener("online", checkStartupSync);
window.addEventListener("offline", () => showToast("Você está offline."));

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

await render();
await checkStartupSync();
