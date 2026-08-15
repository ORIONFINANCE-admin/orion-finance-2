import { setApiToken, getApiToken, setDeviceType } from "../core/config.js";
import { getAll } from "../core/db.js";
import { syncNow, getSyncStatus, downloadAll, fetchInvestment } from "../core/sync.js";
import { calculateDashboard, recentTransactions } from "../core/finance.js";
import { createAccount, createTransaction, randomPhrase, createDebt, payDebt, getDebts, addRadarTicker, getRadar } from "../core/orion.js";
import { money, dateBR, escapeHTML, numberFromInput, todayISO } from "../core/utils.js";
import { extractIndicators, scoreInvestment } from "../core/investments.js";
import { getEmergencyFund, saveEmergencyFund, emergencyProgress } from "../core/goals.js";

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
  await renderDebts();
  await renderRadar();
  await renderEmergencyFund();
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


async function renderDebts(){
  const debts=await getDebts(), active=debts.filter(d=>d.status!=="quitada");
  $("debtsTotal").textContent=money(active.reduce((s,d)=>s+Number(d.valor_atual||0),0));
  $("debtsList").innerHTML=debts.length?debts.map(d=>{
    const o=Number(d.valor_original||0),c=Number(d.valor_atual||0),pct=o?Math.min(100,(o-c)/o*100):0;
    return `<article class="debt-card"><div class="debt-card-head"><div><h3>${escapeHTML(d.descricao)}</h3><p>${escapeHTML(d.credor)} · ${escapeHTML(d.tipo||"")}</p></div><span class="debt-value">${money(c)}</span></div><div class="debt-progress"><span style="width:${pct}%"></span></div><p>${d.vencimento?`Vence ${dateBR(d.vencimento)}`:"Sem vencimento definido"}${Number(d.valor_pagamento_planejado||0)>0?` · Planejado ${money(d.valor_pagamento_planejado)}`:""}</p>${d.status==="quitada"?`<p class="amount-positive"><strong>Quitada ✓</strong></p>`:`<button class="pay-debt-btn" data-pay="${d.divida_id}" data-suggest="${d.valor_pagamento_planejado||""}">Registrar pagamento</button>`}</article>`;
  }).join(""):`<div class="empty">Nenhuma dívida cadastrada.</div>`;
  document.querySelectorAll("[data-pay]").forEach(b=>b.onclick=async()=>{$("paymentDebtId").value=b.dataset.pay;$("paymentValue").value=b.dataset.suggest||"";$("paymentDate").value=todayISO();await fillPaymentAccounts();$("debtPaymentDialog").showModal()});
}
async function fillPaymentAccounts(){
  const items=(await getAll("contas")).filter(a=>a.status!=="inativo");
  $("paymentAccount").innerHTML=`<option value="">Selecione</option>`+items.map(a=>`<option value="${escapeHTML(a.conta_id)}">${escapeHTML(a.nome)}</option>`).join("");
}
async function renderRadar(){
  const items=(await getRadar()).filter(r=>r.ativo!==false);
  $("radarList").innerHTML=items.length?items.map(r=>`<article class="radar-card"><strong>${escapeHTML(r.ticker)}</strong><p>${escapeHTML(r.observacao||"No seu radar")}</p><button class="radar-btn" data-ticker="${r.ticker}">Analisar</button></article>`).join(""):`<div class="empty">Seu radar ainda está vazio.</div>`;
  document.querySelectorAll("[data-ticker]").forEach(b=>b.onclick=()=>analyzeTicker(b.dataset.ticker));
}
async function analyzeTicker(raw){
  const ticker=String(raw||$("tickerInput").value||"").trim().toUpperCase();if(!ticker)return toast("Informe um ticker.");
  $("tickerInput").value=ticker;$("investmentResult").innerHTML=`<div class="empty">Consultando dados reais...</div>`;
  try{
    const payload=await fetchInvestment(ticker),i=extractIndicators(payload),sc=scoreInvestment(i);
    const delta=i.variacao===null?"":`<span class="${i.variacao>=0?"amount-positive":"amount-negative"}">${i.variacao>=0?"+":""}${i.variacao.toFixed(2)}%</span>`;
    $("investmentResult").innerHTML=`<article class="investment-card"><div class="investment-title"><div><h3>${escapeHTML(i.ticker)}</h3><div class="investment-sub">${escapeHTML(i.nome)}</div></div>${delta}</div><div class="investment-quote">${i.preco===null?"N/D":money(i.preco)}</div><div class="signal ${sc.tone}">${escapeHTML(sc.signal)}${sc.score===null?"":` · ${sc.score}%`}</div><div class="criteria">${sc.rules.map(r=>`<div class="criterion"><div><strong>${escapeHTML(r.name)}</strong><br><small>${escapeHTML(r.criterion)}</small></div><span class="dot ${!r.available?"na":r.pass?"ok":"no"}">${r.available?"●":"N/D"} ${escapeHTML(r.formatted)}</span></div>`).join("")}</div><p class="disclaimer">Fonte: ${escapeHTML(i.fonte)} · ${payload.detalhado?"dados ampliados":"cotação básica"}. Critérios visíveis e genéricos.</p><button class="save-radar-btn" id="saveRadar">+ Adicionar ao radar</button></article>`;
    $("saveRadar").onclick=async()=>{await addRadarTicker(ticker);await renderRadar();toast(`${ticker} adicionado ao radar.`)};
  }catch(e){$("investmentResult").innerHTML=`<div class="empty">${escapeHTML(e.message)}</div>`}
}
$("addDebtBtn").onclick=()=>$("debtDialog").showModal();
$("tickerSearchBtn").onclick=()=>analyzeTicker();
$("tickerInput").addEventListener("keydown",e=>{if(e.key==="Enter")analyzeTicker()});
$("debtForm").addEventListener("submit",async e=>{e.preventDefault();try{await createDebt({descricao:$("debtDescription").value,credor:$("debtCreditor").value,tipo:$("debtType").value,valor_original:numberFromInput($("debtOriginal").value),forma_pagamento:$("debtPaymentMode").value,valor_pagamento_planejado:numberFromInput($("debtPlanned").value),vencimento:$("debtDue").value,observacoes:$("debtNote").value});e.target.reset();$("debtDialog").close();await renderDebts();await reward("divida")}catch(err){toast(err.message)}});
$("debtPaymentForm").addEventListener("submit",async e=>{e.preventDefault();try{await payDebt({divida_id:$("paymentDebtId").value,valor:numberFromInput($("paymentValue").value),conta_id:$("paymentAccount").value,forma_pagamento:$("paymentMethod").value,data:$("paymentDate").value,observacao:$("paymentNote").value});e.target.reset();$("debtPaymentDialog").close();await render();await reward("divida")}catch(err){toast(err.message)}});



async function renderEmergencyFund(){
  const goal=await getEmergencyFund();
  const progress=emergencyProgress(goal);
  const target=Number(goal?.valor_alvo||0), current=Number(goal?.valor_atual||0);

  $("reserveAmount").textContent=goal?`${money(current)} / ${money(target)}`:"Defina sua meta";
  $("reservePercent").textContent=`${Math.round(progress.percent)}%`;
  $("reserveStatus").textContent=progress.title;
  $("reserveBar").style.width=`${progress.percent}%`;

  if(!goal){
    $("unlockMessage").innerHTML=`<strong>Primeiro, construa a base.</strong>Defina sua reserva de emergência. O módulo de investimentos será liberado progressivamente conforme você avança.`;
  }else if(progress.percent<50){
    const missing=Math.max(0,target*0.5-current);
    $("unlockMessage").innerHTML=`<strong>Faltam ${money(missing)} para liberar a familiarização.</strong>Até 50%, o foco do Orion é fortalecer sua reserva.`;
  }else if(progress.percent<100){
    $("unlockMessage").innerHTML=`<strong>Familiarização liberada ✓</strong>Você já construiu metade da reserva. FIIs, ações e o Radar estão disponíveis para estudo e acompanhamento.`;
  }else{
    $("unlockMessage").innerHTML=`<strong>Reserva concluída.</strong>Agora o módulo está totalmente liberado. A estrutura veio antes do risco.`;
  }

  $("learningInvestments").classList.toggle("hidden",!progress.canExplore);
}

$("editReserveBtn").addEventListener("click",async()=>{
  const goal=await getEmergencyFund();
  $("reserveTarget").value=goal?.valor_alvo||"";
  $("reserveCurrent").value=goal?.valor_atual||"";
  $("reserveDialog").showModal();
});

$("reserveForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    const before=emergencyProgress(await getEmergencyFund());
    const saved=await saveEmergencyFund({
      valor_alvo:numberFromInput($("reserveTarget").value),
      valor_atual:numberFromInput($("reserveCurrent").value)
    });
    const after=emergencyProgress(saved);
    $("reserveDialog").close();
    await renderEmergencyFund();

    if(before.level<2 && after.level>=2){
      toast("Familiarização com investimentos liberada.");
      await reward("progresso");
    }else if(before.level<3 && after.level>=3){
      toast("Reserva concluída. Módulo completo liberado.");
      await reward("progresso");
    }else{
      toast("Reserva atualizada.");
    }
  }catch(err){toast(err.message)}
});


window.addEventListener("online", checkSync);
window.addEventListener("offline", () => toast("Offline. Orion continua funcionando localmente."));

await render();
await checkSync();
