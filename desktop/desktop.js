import { setApiToken, getApiToken, setDeviceType } from "../core/config.js";
import { getAll } from "../core/db.js";
import { syncNow, getSyncStatus, downloadAll } from "../core/sync.js";
import { calculateDashboard, recentTransactions } from "../core/finance.js";
import { createAccount, createTransaction, randomPhrase } from "../core/orion.js";
import { money, dateBR, escapeHTML, numberFromInput, todayISO } from "../core/utils.js";

setDeviceType("desktop");
const $ = id => document.getElementById(id);
let movementType = "saida";

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.add("hidden"), 2600);
}

async function reward(context) {
  const phrase = await randomPhrase(context);
  if (!phrase) return;
  $("rewardText").textContent = phrase.texto;
  $("reward").classList.remove("hidden");
  setTimeout(() => $("reward").classList.add("hidden"), 2200);
}

function renderMovementList(items) {
  if (!items.length) return `<div class="empty">Nenhuma movimentação registrada.</div>`;
  return items.map(t => `<div class="movement">
    <div><strong>${escapeHTML(t.descricao)}</strong><br><small>${escapeHTML(t.forma_pagamento || "")}</small></div>
    <small>${dateBR(t.data)}</small>
    <span class="value ${t.tipo === "entrada" ? "amount-positive" : "amount-negative"}">
      ${t.tipo === "entrada" ? "+" : "-"} ${money(t.valor)}
    </span>
  </div>`).join("");
}

async function fillSelectors() {
  const [institutions, accounts, categories] = await Promise.all([
    getAll("instituicoes"), getAll("contas"), getAll("categorias")
  ]);

  $("accountInstitution").innerHTML = `<option value="">Selecione</option>` +
    institutions.filter(i => i.ativo !== false).map(i =>
      `<option value="${escapeHTML(i.instituicao_id)}">${escapeHTML(i.nome_curto || i.nome)}</option>`
    ).join("");

  $("movementAccount").innerHTML = `<option value="">Selecione</option>` +
    accounts.filter(a => a.status !== "inativo").map(a =>
      `<option value="${escapeHTML(a.conta_id)}">${escapeHTML(a.nome)}</option>`
    ).join("");

  const cats = categories.filter(c => c.ativa !== false &&
    (c.tipo_permitido === movementType || c.tipo_permitido === "entrada_saida"));

  $("movementCategory").innerHTML = `<option value="">Selecione</option>` +
    cats.sort((a,b)=>Number(a.ordem||0)-Number(b.ordem||0)).map(c =>
      `<option value="${escapeHTML(c.categoria_id)}">${escapeHTML(c.nome)}</option>`
    ).join("");
}

async function render() {
  const [dashboard, recent, institutions] = await Promise.all([
    calculateDashboard(), recentTransactions(8), getAll("instituicoes")
  ]);
  const imap = new Map(institutions.map(i => [i.instituicao_id, i]));

  $("saldoTotal").textContent = money(dashboard.saldoTotal);
  $("entradasMes").textContent = money(dashboard.entradasMes);
  $("saidasMes").textContent = money(dashboard.saidasMes);
  $("resultadoMes").textContent = money(dashboard.resultadoMes);

  $("accountsGrid").innerHTML = dashboard.contas.length
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
    : `<div class="empty">Cadastre sua primeira conta.</div>`;

  $("recentList").innerHTML = renderMovementList(recent);
  const all = await getAll("transacoes");
  all.sort((a,b)=>`${b.data}|${b.criado_em}`.localeCompare(`${a.data}|${a.criado_em}`));
  $("allMovements").innerHTML = renderMovementList(all);
  await fillSelectors();
}

async function checkSync() {
  if (!getApiToken()) {
    $("tokenDialog").showModal();
    return;
  }
  if (!navigator.onLine) return;
  try {
    const status = await getSyncStatus();
    $("syncBanner").classList.toggle("hidden", !status.needsSync);
  } catch (e) { toast(e.message); }
}

async function sync() {
  if (!getApiToken()) {
    $("tokenDialog").showModal();
    return;
  }
  if (!navigator.onLine) return toast("Sem internet. Dados locais preservados.");
  try {
    await syncNow();
    $("syncBanner").classList.add("hidden");
    await render();
    toast("Sincronização concluída.");
  } catch (e) { toast(e.message); }
}

function openMovement() {
  $("movementDate").value = todayISO();
  fillSelectors().then(() => $("movementDialog").showModal());
}

$("quickAddBtn").addEventListener("click", openMovement);
$("movementAddInline").addEventListener("click", openMovement);
$("addAccountBtn").addEventListener("click", async () => {
  await fillSelectors(); $("accountDialog").showModal();
});
$("syncBtn").addEventListener("click", sync);
$("syncBannerBtn").addEventListener("click", sync);
$("settingsBtn").addEventListener("click", () => {
  $("tokenInput").value = getApiToken();
  $("tokenDialog").showModal();
});

document.querySelectorAll("[data-close]").forEach(btn =>
  btn.addEventListener("click", () => $(btn.dataset.close).close())
);

document.querySelectorAll(".side-btn[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".desktop-view").forEach(v => v.classList.add("hidden"));
    document.querySelectorAll(".side-btn[data-view]").forEach(b => b.classList.remove("active"));
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

$("tokenForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    setApiToken($("tokenInput").value);
    $("tokenDialog").close();
    await downloadAll();
    await render();
    toast("Orion conectado.");
  } catch (err) { toast(err.message); }
});

$("accountForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await createAccount({
      instituicao_id: $("accountInstitution").value,
      nome: $("accountName").value,
      tipo: $("accountType").value,
      saldo_inicial: numberFromInput($("accountBalance").value)
    });
    e.target.reset();
    $("accountDialog").close();
    await render();
    await reward("registro");
  } catch (err) { toast(err.message); }
});

$("movementForm").addEventListener("submit", async e => {
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
    $("movementDialog").close();
    await render();
    await reward(movementType === "entrada" ? "entrada" : "saida");
  } catch (err) { toast(err.message); }
});

window.addEventListener("online", checkSync);
window.addEventListener("offline", () => toast("Offline. Orion continua funcionando localmente."));

await render();
await checkSync();
