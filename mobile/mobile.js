import { setApiToken, getApiToken, setDeviceType } from "../core/config.js?v=094";
import { getRecurringExpenses, saveRecurringExpense, setRecurringStatus, markRecurringRegistered, recurringFrequencyLabel, recurringDueState } from "../core/recurring.js?v=094";
import { buildDiagnostics } from "../core/diagnostics.js?v=094";
import { getMonthlyCommitments } from "../core/commitments.js?v=094";
import { buildInstitutionCards, renderInstitutionCard } from "../core/dashboard-groups.js?v=094";
import { getAll, getMeta, clearUserData } from "../core/db.js?v=094";
import { syncNow, getSyncStatus, downloadAll, fetchInvestment, resetRemoteData, getSpreadsheetExportURL } from "../core/sync.js?v=094";
import { calculateDashboard, recentTransactions } from "../core/finance.js?v=094";
import { createAccount, createTransaction, randomPhrase, createDebt, payDebt, getDebts, addRadarTicker, getRadar, createTransfer, updateAccountDashboardVisibility } from "../core/orion.js?v=094";
import { money, dateBR, escapeHTML, numberFromInput, todayISO } from "../core/utils.js?v=094";
import { extractIndicators, scoreInvestment } from "../core/investments.js?v=094";
import { getEmergencyFund, saveEmergencyFund, emergencyProgress } from "../core/goals.js?v=094";
import { getSettings, saveSettings, applySettings, bindSystemTheme } from "../core/settings.js?v=094";
import { getGameState } from "../core/game.js?v=094";
import { ensureCajuStructure, getCajuMonthlySuggestion, registerCajuMonthlyCredit } from "../core/caju.js?v=094";
import { applyBrand, brandMarkSVG } from "../core/brand.js?v=094";
import { APP_VERSION, BUILD_ID } from "../core/version.js?v=094";


let __orionScrollY = 0;
function lockPageScroll(){
  if(document.body.classList.contains("modal-open")) return;
  __orionScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
  document.body.style.top = `-${__orionScrollY}px`;
}
function unlockPageScroll(){
  if(!document.body.classList.contains("modal-open")) return;
  const y = __orionScrollY;
  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
  document.body.style.top = "";
  window.scrollTo(0,y);
}
function openDialog(dialog){
  if(!dialog) return false;
  try{
    lockPageScroll();
    if(typeof dialog.showModal === "function"){
      if(!dialog.open) dialog.showModal();
    }else{
      dialog.setAttribute("open", "");
      dialog.classList.add("dialog-fallback-open");
    }
    return true;
  }catch(error){
    console.error("Falha ao abrir diálogo", error);
    dialog.setAttribute("open", "");
    dialog.classList.add("dialog-fallback-open");
    return true;
  }
}
function closeDialog(dialog){
  if(!dialog) return;
  try{
    if(typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }catch(_){
    dialog.removeAttribute("open");
  }
  dialog.classList.remove("dialog-fallback-open");
  const anyOpen=[...document.querySelectorAll("dialog")].some(d=>d.open || d.hasAttribute("open"));
  if(!anyOpen) unlockPageScroll();
}
function bindDialogScrollLock(){
  document.querySelectorAll("dialog").forEach(dialog=>{
    dialog.addEventListener("close",()=>{
      dialog.classList.remove("dialog-fallback-open");
      const anyOpen=[...document.querySelectorAll("dialog")].some(d=>d.open || d.hasAttribute("open"));
      if(!anyOpen) unlockPageScroll();
    });
    dialog.addEventListener("cancel",()=>{
      setTimeout(()=>{
        const anyOpen=[...document.querySelectorAll("dialog")].some(d=>d.open || d.hasAttribute("open"));
        if(!anyOpen) unlockPageScroll();
      },0);
    });
  });
}
bindDialogScrollLock();

setDeviceType("mobile");
const initialSettings=applySettings();
applyBrand(initialSettings.brandStyle);
bindSystemTheme();

const $ = (id) => document.getElementById(id);
const dialogs = {
  token: $("tokenDialog"),
  account: $("accountDialog"),
  movement: $("movementDialog")
};
let movementType = "saida";
let currentRecurringId = "";

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


function formatSyncTime(value){
  if(!value)return "Ainda não sincronizado";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "Última sincronização registrada";
  return `Sincronizado ${d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})} às ${d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`;
}
async function renderSyncMeta(){
  const last=await getMeta("ultima_sincronizacao_local","");
  const pending=(await getAll("pendencias")).length;
  const text=pending?`${formatSyncTime(last)} · ${pending} alteração${pending===1?"":"ões"} pendente${pending===1?"":"s"}`:formatSyncTime(last);
  $("lastSyncHome").textContent=text;
}
async function renderCommitments(){
  const c=await getMonthlyCommitments();
  $("commitmentsTotal").textContent=money(c.total);
  $("commitmentsSummary").innerHTML=`
    <div class="commitment-item"><span>Recorrentes · ${c.recurringCount}</span><strong>${money(c.recurringTotal)}</strong></div>
    <div class="commitment-item"><span>Cartões · ${c.cardCount}</span><strong>${money(c.cardTotal)}</strong></div>
    <div class="commitment-item"><span>Dívidas · ${c.debtCount}</span><strong>${money(c.debtTotal)}</strong></div>`;
}

function clamp(value,min,max){ return Math.min(max,Math.max(min,Number(value||0))); }
function isCurrentMonthDate(raw){
  const d=new Date(`${String(raw||"").slice(0,10)}T12:00:00`), now=new Date();
  return !Number.isNaN(d.getTime()) && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
}

function pctLabel(value){ return `${Math.max(0,Math.round(Number(value)||0))}%`; }
function setHTMLList(id, items, className, fallback){
  const node=$(id);
  if(!node) return;
  if(!items?.length){ node.innerHTML = fallback || ""; return; }
  node.innerHTML = items.map(item=>`<div class="${className}"><strong>${escapeHTML(item.title||"")}</strong>${escapeHTML(item.text||"")}</div>`).join("");
}
async function renderHomeInsights(dashboard){
  const [transactions,categories,commitments,reserve]=await Promise.all([
    getAll("transacoes"),
    getAll("categorias"),
    getMonthlyCommitments(),
    getEmergencyFund()
  ]);
  const expenseTx=transactions.filter(t=>t?.tipo==="saida" && isCurrentMonthDate(t.data));
  const income=Math.max(0,Number(dashboard?.entradasMes||0));
  const expense=Math.max(0,Number(dashboard?.saidasMes||0));
  const usage=income>0?(expense/income)*100:(expense>0?100:0);
  const commitmentRatio=income>0?(Number(commitments.total||0)/income)*100:0;
  const reservePercent=Number(emergencyProgress(reserve).percent||0);
  let score=88;
  if(income===0 && expense>0){
    score=32;
  }else if(income===0 && expense===0){
    score=0;
  }else{
    score-=Math.max(0,usage-58)*0.78;
    score-=Math.max(0,commitmentRatio-42)*0.34;
    if(Number(dashboard?.resultadoMes||0)<0 && income>0){
      score+=Math.max(-28,(Number(dashboard.resultadoMes||0)/income)*34);
    }
    if(Number(dashboard?.saldoTotal||0)<=0) score-=10;
    score+=Math.min(8,reservePercent*0.08);
  }
  score=clamp(Math.round(score),0,96);
  const label=score>=78?"Boa":score>=58?"Atenção":score>0?"Ajustar":"Em análise";
  const hint=score>=78?"Seu mês está sob controle.":score>=58?"Seu mês pede pequenos ajustes.":score>0?"Seu mês pede correção imediata.":"Assim que houver movimentações, o Orion mostrará a leitura do mês.";
  const bar=$("financialHealthBar");
  if(bar) bar.style.width=`${score}%`;
  const ring=$("financialHealthRing");
  if(ring) ring.style.setProperty("--health-angle",`${Math.round(score*3.6)}deg`);
  if($("financialHealthLabel")) $("financialHealthLabel").textContent=label;
  if($("financialHealthPercent")) $("financialHealthPercent").textContent=`${score}%`;
  if($("financialHealthHint")) $("financialHealthHint").textContent=hint;
  if($("financialHealthPulse")) $("financialHealthPulse").textContent=score>=78?"✦":score>=58?"∿":score>0?"!":"✦";
  if($("financialUsageShare")) $("financialUsageShare").textContent=pctLabel(usage);
  if($("financialCommitmentShare")) $("financialCommitmentShare").textContent=pctLabel(commitmentRatio);
  if($("financialReserveShare")) $("financialReserveShare").textContent=pctLabel(reservePercent);

  const categoryMap=new Map(categories.map(c=>[c.categoria_id,String(c.nome||"Categoria")]));
  const spendByCategory=new Map();
  const spendByDay=new Map();
  for(const tx of expenseTx){
    const value=Math.max(0,Number(tx.valor||0));
    const catKey=tx.categoria_id||"sem-categoria";
    spendByCategory.set(catKey,(spendByCategory.get(catKey)||0)+value);
    const day=String(tx.data||"").slice(8,10)||"--";
    spendByDay.set(day,(spendByDay.get(day)||0)+value);
  }
  const totalSpend=expenseTx.reduce((sum,t)=>sum+Math.max(0,Number(t.valor||0)),0);
  const topCategory=[...spendByCategory.entries()].sort((a,b)=>b[1]-a[1])[0];
  const topDay=[...spendByDay.entries()].sort((a,b)=>b[1]-a[1])[0];

  const tips=[];
  if(income===0 && expense===0){
    tips.push({title:"Comece pelo mapa",text:"registre ao menos uma entrada e uma saída para liberar a leitura do Orion."});
    tips.push({title:"Defina prioridades",text:"cadastre recorrentes e reserva para o app reconhecer sua rotina."});
  } else {
    if(usage>85) tips.push({title:"Reduza o giro do mês",text:`suas saídas estão em ${pctLabel(usage)} da renda; tente aproximar de 70%.`});
    else if(usage>65) tips.push({title:"Ajuste fino",text:`suas saídas estão em ${pctLabel(usage)} da renda; pequenos cortes já melhoram o índice.`});
    else tips.push({title:"Boa relação entrada/saída",text:`você está usando ${pctLabel(usage)} da renda no mês.`});

    if(commitmentRatio>45) tips.push({title:"Alivie compromissos",text:`${pctLabel(commitmentRatio)} da sua renda já está comprometida; renegocie ou redistribua.`});
    else tips.push({title:"Compromissos sob radar",text:`os compromissos ocupam ${pctLabel(commitmentRatio)} da renda atual.`});

    if(reservePercent<35) tips.push({title:"Fortaleça a reserva",text:`sua reserva está em ${pctLabel(reservePercent)} da meta; priorize aportes recorrentes.`});
    else if(reservePercent<100) tips.push({title:"Você já criou base",text:`a reserva avançou para ${pctLabel(reservePercent)} da meta. Continue consistente.`});
    else tips.push({title:"Reserva concluída",text:"sua proteção está completa; agora você ganha liberdade para decidir melhor."});

    if(Number(dashboard?.resultadoMes||0)<0 && income>0){
      tips.push({title:"Resultado do mês",text:`o mês está negativo em ${money(Math.abs(Number(dashboard.resultadoMes||0)))}; segure gastos variáveis primeiro.`});
    }
  }
  const tipNode=$("financialHealthTips");
  if(tipNode){
    const isList = tipNode.tagName === "UL";
    if(isList){
      tipNode.innerHTML=(tips.slice(0,3).map(item=>`<li><strong>${escapeHTML(item.title)}</strong> ${escapeHTML(item.text)}</li>`).join("")) || `<li><strong>Sem dados suficientes.</strong> Lance movimentações para receber recomendações.</li>`;
    }else{
      tipNode.innerHTML=(tips.slice(0,3).map(item=>`<div class="health-tip"><strong>${escapeHTML(item.title)}</strong>${escapeHTML(item.text)}</div>`).join("")) || `<div class="health-tip"><strong>Sem dados suficientes.</strong>Lance movimentações para receber recomendações.</div>`;
    }
  }

  let radarTitle="Observando o seu padrão";
  let radarText="O Orion destacará concentrações de gastos, ritmo do mês e oportunidades de ajuste.";
  const clues=[];
  if(topCategory && totalSpend>0){
    const share=Math.round((topCategory[1]/totalSpend)*100);
    const categoryName=categoryMap.get(topCategory[0])||"uma categoria";
    radarTitle="Radar Orion";
    radarText=share>=35
      ? `${share}% das suas saídas do mês estão em ${categoryName}.`
      : `Seu maior foco de saída no mês está em ${categoryName} (${share}%).`;
    clues.push({title:"Concentração principal",text:`${categoryName} absorve ${share}% do seu gasto variável.`});
    if(topDay){
      radarText += ` Pico percebido no dia ${topDay[0]}.`;
      clues.push({title:"Dia de pico",text:`o maior volume de saídas apareceu no dia ${topDay[0]}.`});
    }
  }else if(income>0 && expense===0){
    radarTitle="Mês leve";
    radarText="Ainda não há saídas neste mês. Ótimo momento para definir prioridades antes de gastar.";
    clues.push({title:"Janela estratégica",text:"sem saídas registradas: ideal para planejar teto por categoria."});
  }else if(income===0 && expense===0){
    radarTitle="Comece pelo primeiro registro";
    radarText="Assim que você lançar movimentações, o Orion vai montar seu radar comportamental.";
    clues.push({title:"Radar em preparação",text:"o Orion precisa de movimentações para detectar padrões reais."});
  }
  if(income>0) clues.push({title:"Compromissos x renda",text:`${pctLabel(commitmentRatio)} da renda já está comprometida neste mês.`});
  if($("radarInsightTitle")) $("radarInsightTitle").textContent=radarTitle;
  if($("radarInsightText")) $("radarInsightText").textContent=radarText;
  const cluesNode=$("radarClues");
  if(cluesNode){
    cluesNode.innerHTML=(clues.slice(0,3).map(item=>`<div class="radar-clue"><strong>${escapeHTML(item.title)}</strong>${escapeHTML(item.text)}</div>`).join("")) || `<div class="radar-clue"><strong>Sem indícios ainda</strong>Registre algumas movimentações para o Radar começar a perceber o seu ritmo.</div>`;
  }
}
function activateView(viewId){
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===viewId));
  $(viewId)?.classList.remove('hidden');
  window.scrollTo({top:0,left:0,behavior:'smooth'});
}
async function renderAccountVisibility(){
  const accounts=(await getAll("contas")).filter(a=>a.status!=="inativo");
  $("accountVisibilityList").innerHTML=accounts.length?accounts.map(a=>`
    <label class="visibility-row">
      <span><strong>${escapeHTML(a.nome||"Conta")}</strong><small>${escapeHTML(a.tipo||"")}</small></span>
      <select data-account-visibility="${escapeHTML(a.conta_id)}" aria-label="Visibilidade de ${escapeHTML(a.nome||"conta")}">
        <option value="auto" ${(a.dashboard_visibilidade||"auto")==="auto"?"selected":""}>Automático</option>
        <option value="mostrar" ${a.dashboard_visibilidade==="mostrar"?"selected":""}>Sempre mostrar</option>
        <option value="ocultar" ${a.dashboard_visibilidade==="ocultar"?"selected":""}>Ocultar</option>
      </select>
    </label>`).join(""):`<div class="empty">Nenhuma conta ativa.</div>`;
  document.querySelectorAll("[data-account-visibility]").forEach(sel=>sel.onchange=async()=>{
    await updateAccountDashboardVisibility(sel.dataset.accountVisibility,sel.value);
    await render();
  });
}

async function render() {
  const [dashboard, recent, institutions, cards] = await Promise.all([
    calculateDashboard(),
    recentTransactions(8),
    getAll("instituicoes"),
    getAll("cartoes_credito")
  ]);

  const imap = institutionMap(institutions);

  $("saldoTotal").textContent = money(dashboard.saldoTotal);
  ["saldoTotal","entradasMes","saidasMes","resultadoMes","debtsTotal","reserveAmount"].forEach(id=>$(id)?.setAttribute("data-money",""));
  $("entradasMes").textContent = money(dashboard.entradasMes);
  $("saidasMes").textContent = money(dashboard.saidasMes);
  $("resultadoMes")?.textContent = money(dashboard.resultadoMes);

  let institutionCards = [];
  try {
    institutionCards = buildInstitutionCards({ accounts: dashboard.contas, institutions, cards });
    $("accountsList").innerHTML = institutionCards.length
      ? institutionCards.map(item => renderInstitutionCard(item, escapeHTML)).join("")
      : `<div class="empty">Nenhuma instituição com saldo ou compromisso ativo.</div>`;
  } catch (error) {
    console.error("Falha ao agrupar instituições", error);
    $("accountsList").innerHTML = dashboard.contas
      .filter(a => Math.abs(Number(a.saldo_calculado || 0)) >= 0.005)
      .map(a => `<article class="account-card"><div class="account-title">${escapeHTML(String(a.nome || "Conta"))}</div><div class="account-balance">${money(a.saldo_calculado)}</div></article>`)
      .join("") || `<div class="empty">Nenhuma conta com saldo ativo.</div>`;
  }

  document.querySelectorAll("[data-transfer-from]").forEach(b=>b.onclick=()=>openTransfer(b.dataset.transferFrom));
  $("recentList").innerHTML = renderMovements(recent);
  const all = await getAll("transacoes");
  all.sort((a,b) => `${b.data}|${b.criado_em}`.localeCompare(`${a.data}|${a.criado_em}`));
  $("allMovements").innerHTML = renderMovements(all);

  await fillSelectors();
  await renderDebts();
  await renderRadar();
  await renderEmergencyFund();
  await setupCaju();
  try { await renderRecurring(); } catch (e) { console.error("Falha ao renderizar recorrentes", e); $("recurringList").innerHTML = `<div class="empty">Não foi possível carregar as recorrentes.</div>`; }
  try { await renderCommitments(); } catch (e) { console.error("Falha ao renderizar compromissos", e); $("commitmentsSummary").innerHTML = `<div class="empty">Compromissos indisponíveis.</div>`; }
  try { await renderSyncMeta(); } catch (e) { console.error("Falha ao renderizar status de sincronização", e); }
  try { await renderHomeInsights(dashboard); } catch (e) { console.error("Falha ao renderizar inteligência da home", e); }
  try { await renderGame(); } catch (e) { console.error("Falha ao renderizar Evolução", e); }
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
    openDialog(dialogs.token);
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
    showToast(e.message || "Não foi possível concluir. Seus dados locais continuam salvos.");
  }
}


function openSyncLoading(message = "Atualizando sua base com segurança…") {
  const dialog = $("syncLoadingDialog");
  $("syncLoadingText").textContent = message;
  if (!dialog.open) openDialog(dialog);
}
function updateSyncLoading(message) {
  $("syncLoadingText").textContent = message;
}
function closeSyncLoading() {
  const dialog = $("syncLoadingDialog");
  if (dialog.open || dialog.hasAttribute("open")) closeDialog(dialog);
}

async function performSync() {
  openSyncLoading("Conectando ao Orion…");
  try {
    updateSyncLoading("Comparando sua base local com a nuvem…");

  if (!getApiToken()) {
    openDialog(dialogs.token);
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

  } finally {
    closeSyncLoading();
  }
}

$("settingsBtn").addEventListener("click", openSettings);
$("syncBannerBtn").addEventListener("click", performSync);
$("syncTopBtn").addEventListener("click", performSync);
$("quickAddBtn").addEventListener("click", async () => {
  $("movementDate").value = todayISO();
  await fillSelectors();
  openDialog(dialogs.movement);
});
$("addAccountBtn").addEventListener("click", async () => {
  await fillSelectors();
  openDialog(dialogs.account);
});
$("openMovementsFromHome")?.addEventListener("click",()=>activateView("movementsView"));
$("openMovementsFromRadar")?.addEventListener("click",()=>activateView("movementsView"));
$("openAccountsFromHome")?.addEventListener("click",()=>document.getElementById("accountsList")?.scrollIntoView({behavior:"smooth",block:"start"}));

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => closeDialog(document.getElementById(btn.dataset.close)));
});

document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
  btn.addEventListener("click", () => activateView(btn.dataset.view));
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

    // iOS/PWA: remove o foco antes de fechar para devolver a interface
    // ao estado normal após a entrada do token.
    $("tokenInput").blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    closeDialog(dialogs.token);

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

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
    closeDialog(dialogs.account);
    await render();
    await showReward("registro");
  } catch (err) {
    showToast(err.message);
  }
});

$("movementForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const movementValue = numberFromInput($("movementValue").value);
    await createTransaction({
      tipo: movementType,
      valor: movementValue,
      descricao: $("movementDescription").value,
      categoria_id: $("movementCategory").value,
      conta_id: $("movementAccount").value,
      forma_pagamento: $("movementPayment").value,
      data: $("movementDate").value,
      observacao: $("movementNote").value
    });
    if(currentRecurringId){await markRecurringRegistered(currentRecurringId,movementValue,$("movementDate").value);currentRecurringId="";}
    e.target.reset();
    $("movementDate").value = todayISO();
    closeDialog(dialogs.movement);
    await render();
    await showReward(movementType === "entrada" ? "entrada" : "saida");
  } catch (err) {
    showToast(err.message);
  }
});


async function renderDebts(){
  const debts=await getDebts(), active=debts.filter(d=>d.status!=="quitada");
  $("debtsTotal").textContent=money(active.reduce((s,d)=>s+Number(d.valor_atual||0),0));
  $("debtsList").innerHTML=debts.length?debts.map(d=>{
    const o=Number(d.valor_original||0),c=Number(d.valor_atual||0),pct=o?Math.min(100,(o-c)/o*100):0;
    return `<article class="debt-card"><div class="debt-card-head"><div><h3>${escapeHTML(d.descricao)}</h3><p>${escapeHTML(d.credor)} · ${escapeHTML(d.tipo||"")}</p></div><span class="debt-value">${money(c)}</span></div><div class="debt-progress"><span style="width:${pct}%"></span></div><p>${d.vencimento?`Vence ${dateBR(d.vencimento)}`:"Sem vencimento definido"}${Number(d.valor_pagamento_planejado||0)>0?` · Planejado ${money(d.valor_pagamento_planejado)}`:""}</p>${d.status==="quitada"?`<p class="amount-positive"><strong>Quitada ✓</strong></p>`:`<button class="pay-debt-btn" data-pay="${d.divida_id}" data-suggest="${d.valor_pagamento_planejado||""}">Registrar pagamento</button>`}</article>`;
  }).join(""):`<div class="empty">Nenhuma dívida cadastrada.</div>`;
  document.querySelectorAll("[data-pay]").forEach(b=>b.onclick=async()=>{$("paymentDebtId").value=b.dataset.pay;$("paymentValue").value=b.dataset.suggest||"";$("paymentDate").value=todayISO();await fillPaymentAccounts();openDialog($("debtPaymentDialog"))});
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
  const ticker=String(raw||$("tickerInput").value||"").trim().toUpperCase();if(!ticker)return showToast("Informe um ticker.");
  $("tickerInput").value=ticker;$("investmentResult").innerHTML=`<div class="empty">Consultando dados reais...</div>`;
  try{
    const payload=await fetchInvestment(ticker),i=extractIndicators(payload),sc=scoreInvestment(i);
    const delta=i.variacao===null?"":`<span class="${i.variacao>=0?"amount-positive":"amount-negative"}">${i.variacao>=0?"+":""}${i.variacao.toFixed(2)}%</span>`;
    $("investmentResult").innerHTML=`<article class="investment-card"><div class="investment-title"><div><h3>${escapeHTML(i.ticker)}</h3><div class="investment-sub">${escapeHTML(i.nome)}</div></div>${delta}</div><div class="investment-quote">${i.preco===null?"N/D":money(i.preco)}</div><div class="signal ${sc.tone}">${escapeHTML(sc.signal)}${sc.score===null?"":` · ${sc.score}%`}</div><div class="criteria">${sc.rules.map(r=>`<div class="criterion"><div><strong>${escapeHTML(r.name)}</strong><br><small>${escapeHTML(r.criterion)}</small></div><span class="dot ${!r.available?"na":r.pass?"ok":"no"}">${r.available?"●":"N/D"} ${escapeHTML(r.formatted)}</span></div>`).join("")}</div><p class="disclaimer">Fonte: ${escapeHTML(i.fonte)} · ${payload.detalhado?"dados ampliados":"cotação básica"}. Critérios visíveis e genéricos.</p><button class="save-radar-btn" id="saveRadar">+ Adicionar ao radar</button></article>`;
    $("saveRadar").onclick=async()=>{await addRadarTicker(ticker);await renderRadar();showToast(`${ticker} adicionado ao radar.`)};
  }catch(e){$("investmentResult").innerHTML=`<div class="empty">${escapeHTML(e.message)}</div>`}
}
$("addDebtBtn").onclick=()=>openDialog($("debtDialog"));
$("tickerSearchBtn").onclick=()=>analyzeTicker();
$("tickerInput").addEventListener("keydown",e=>{if(e.key==="Enter")analyzeTicker()});
$("debtForm").addEventListener("submit",async e=>{e.preventDefault();try{await createDebt({descricao:$("debtDescription").value,credor:$("debtCreditor").value,tipo:$("debtType").value,valor_original:numberFromInput($("debtOriginal").value),forma_pagamento:$("debtPaymentMode").value,valor_pagamento_planejado:numberFromInput($("debtPlanned").value),vencimento:$("debtDue").value,observacoes:$("debtNote").value});e.target.reset();closeDialog($("debtDialog"));await renderDebts();await showReward("divida")}catch(err){showToast(err.message)}});
$("debtPaymentForm").addEventListener("submit",async e=>{e.preventDefault();try{await payDebt({divida_id:$("paymentDebtId").value,valor:numberFromInput($("paymentValue").value),conta_id:$("paymentAccount").value,forma_pagamento:$("paymentMethod").value,data:$("paymentDate").value,observacao:$("paymentNote").value});e.target.reset();closeDialog($("debtPaymentDialog"));await render();await showReward("divida")}catch(err){showToast(err.message)}});



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
  openDialog($("reserveDialog"));
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
    closeDialog($("reserveDialog"));
    await renderEmergencyFund();

    if(before.level<2 && after.level>=2){
      showToast("Familiarização com investimentos liberada.");
      await showReward("progresso");
    }else if(before.level<3 && after.level>=3){
      showToast("Reserva concluída. Módulo completo liberado.");
      await showReward("progresso");
    }else{
      showToast("Reserva atualizada.");
    }
  }catch(err){showToast(err.message)}
});



async function setupCaju(){await ensureCajuStructure();const suggestion=await getCajuMonthlySuggestion();$("cajuBanner").classList.toggle("hidden",!suggestion)}
async function fillTransferSelectors(preferredFrom=""){const accounts=(await getAll("contas")).filter(a=>a.status!=="inativo"),opts=accounts.map(a=>`<option value="${escapeHTML(a.conta_id)}">${escapeHTML(a.nome)}</option>`).join("");$("transferFrom").innerHTML=`<option value="">Selecione</option>${opts}`;$("transferTo").innerHTML=`<option value="">Selecione</option>${opts}`;if(preferredFrom)$("transferFrom").value=preferredFrom}
async function openTransfer(preferredFrom=""){await fillTransferSelectors(preferredFrom);$("transferDate").value=todayISO();openDialog($("transferDialog"))}

async function fillRecurringSelectors(){
  const [accounts,categories]=await Promise.all([getAll("contas"),getAll("categorias")]);
  $("recurringAccount").innerHTML=`<option value="">Sem conta padrão</option>`+accounts.filter(a=>a.status!=="inativo").map(a=>`<option value="${escapeHTML(a.conta_id)}">${escapeHTML(a.nome)}</option>`).join("");
  $("recurringCategory").innerHTML=`<option value="">Selecione</option>`+categories.filter(c=>c.ativa!==false && ["saida","entrada_saida"].includes(String(c.tipo_permitido||""))).sort((a,b)=>Number(a.ordem||0)-Number(b.ordem||0)).map(c=>`<option value="${escapeHTML(c.categoria_id)}">${escapeHTML(c.nome)}</option>`).join("");
}
async function openRecurring(item=null){
  await fillRecurringSelectors();
  $("recurringForm").reset();
  $("recurringId").value=item?.recorrente_id||"";
  $("recurringDialogTitle").textContent=item?"Editar despesa recorrente":"Nova despesa recorrente";
  if(item){
    $("recurringName").value=item.nome||"";
    $("recurringValue").value=String(Number(item.valor_previsto||0).toFixed(2)).replace(".",",");
    $("recurringCategory").value=item.categoria_id||"";
    $("recurringFrequency").value=item.frequencia||"mensal";
    $("recurringDueDay").value=item.dia_vencimento||"";
    $("recurringAccount").value=item.conta_id||"";
    $("recurringPayment").value=item.forma_pagamento||"pix";
    $("recurringNote").value=item.observacao||"";
  }
  openDialog($("recurringDialog"));
}
async function registerRecurring(item){
  movementType="saida";
  document.querySelectorAll(".segment").forEach(b=>b.classList.toggle("active",b.dataset.type==="saida"));
  await fillSelectors();
  $("movementDate").value=todayISO();
  $("movementValue").value=String(Number(item.valor_previsto||0).toFixed(2)).replace(".",",");
  $("movementDescription").value=item.nome||"";
  $("movementCategory").value=item.categoria_id||"";
  $("movementAccount").value=item.conta_id||"";
  $("movementPayment").value=item.forma_pagamento||"pix";
  $("movementNote").value=`Despesa recorrente: ${item.nome||""}`.trim();
  currentRecurringId=item.recorrente_id;
  openDialog($("movementDialog"));
}
async function renderRecurring(){
  const items=await getRecurringExpenses();
  const active=items.filter(i=>i.status!=="inativo");
  if ($("recurringToggleCount")) {
    $("recurringToggleCount").textContent = `${active.length} ativa${active.length===1?"":"s"}`;
  }
  if ($("recurringToggleHint")) {
    $("recurringToggleHint").textContent = active.length
      ? `Você tem ${active.length} despesa${active.length===1?"":"s"} recorrente${active.length===1?"":"s"} ativa${active.length===1?"":"s"}.`
      : "Nenhuma despesa recorrente ativa no momento.";
  }
  $("recurringList").innerHTML=active.length?active.map(item=>{
    const state=recurringDueState(item);
    const due=item.dia_vencimento?`dia ${item.dia_vencimento}`:"sem dia fixo";
    const last=item.ultima_data?`Último: ${dateBR(item.ultima_data)} · ${money(item.ultimo_valor||0)}`:"Ainda não registrado";
    return `<article class="recurring-card">
      <div class="recurring-card-head"><div><h3>${escapeHTML(item.nome)}</h3><p>${escapeHTML(recurringFrequencyLabel(item.frequencia))} · ${escapeHTML(due)}</p></div><span class="recurring-value">${money(item.valor_previsto)}</span></div>
      <div class="recurring-meta"><span class="recurring-chip ${state}">${state==="pago"?"registrado no mês":state==="atrasado"?"passou da referência":state==="proximo"?"próximo":"ativo"}</span><span class="recurring-chip">${escapeHTML(last)}</span></div>
      <div class="recurring-actions"><button data-rec-register="${escapeHTML(item.recorrente_id)}">Registrar</button><button class="secondary" data-rec-edit="${escapeHTML(item.recorrente_id)}">Editar</button><button class="secondary" data-rec-pause="${escapeHTML(item.recorrente_id)}">Ocultar</button></div>
    </article>`;
  }).join(""):`<div class="empty">Nenhuma despesa recorrente cadastrada.</div>`;
  document.querySelectorAll("[data-rec-register]").forEach(b=>b.onclick=()=>registerRecurring(items.find(i=>i.recorrente_id===b.dataset.recRegister)));
  document.querySelectorAll("[data-rec-edit]").forEach(b=>b.onclick=()=>openRecurring(items.find(i=>i.recorrente_id===b.dataset.recEdit)));
  document.querySelectorAll("[data-rec-pause]").forEach(b=>b.onclick=async()=>{await setRecurringStatus(b.dataset.recPause,"inativo");await renderRecurring();});
}

async function renderGame(){const[transactions,debts,reserve]=await Promise.all([getAll("transacoes"),getDebts(),getEmergencyFund()]),game=await getGameState({transactions,debts,reserve});$("levelEmblem").textContent=game.current.level;$("levelTitle").textContent=`Nível ${game.current.level} · ${game.current.title}`;$("levelXP").textContent=`${game.xp} XP`;$("xpBar").style.width=`${game.progress}%`;$("xpNext").textContent=game.next?`${Math.max(0,game.next.xp-game.xp)} XP para ${game.next.title}`:"Nível máximo atual";$("achievementGrid").innerHTML=game.achievements.map(a=>`<article class="achievement ${a.unlocked?"":"locked"}"><span class="tier ${a.tier}">${a.unlocked?a.tier:"bloqueado"}</span><span class="achievement-icon">${a.unlocked?a.icon:"🔒"}</span><strong>${escapeHTML(a.name)}</strong><p>${escapeHTML(a.description)}</p></article>`).join("");$("medalGrid").innerHTML=game.medals.map(m=>`<article class="medal-card" data-tier="${m.tier}"><div class="medal-gem" role="img" aria-label="Medalha ${m.tier}"></div><strong>${escapeHTML(m.name)}</strong><p>${m.value} atual${m.next?` · próximo em ${m.next}`:" · máximo atual"}</p></article>`).join("");$("xpHistory").innerHTML=game.events.length?game.events.map(e=>`<article class="xp-event"><span>✦</span><div><strong>${escapeHTML(e.descricao||e.tipo)}</strong><small>${dateBR(e.criado_em)}</small></div><b>+${Number(e.xp||0)} XP</b></article>`).join(""):`<div class="xp-event"><span>✦</span><div><strong>Histórico reconhecido</strong><small>XP calculado pelas movimentações já conciliadas.</small></div><b>${game.xp} XP</b></div>`}
function renderBrandPicker(settings=getSettings()){applyBrand(settings.brandStyle);document.querySelectorAll("[data-brand-preview]").forEach(node=>node.innerHTML=brandMarkSVG(node.dataset.brandPreview));}
function openSettings(){const settings=getSettings();$("themeSelect").value=settings.theme;$("animationsToggle").checked=settings.animations;$("hideValuesToggle").checked=settings.hideValues;renderBrandPicker(settings);openDialog($("settingsDialog"));}




$("accountVisibilityBtn").addEventListener("click",async()=>{
  try{await renderAccountVisibility();openDialog($("accountVisibilityDialog"));}
  catch(e){showToast("Não foi possível abrir a visibilidade das contas.");}
});

$("addRecurringBtn").addEventListener("click",()=>openRecurring());
$("recurringForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    await saveRecurringExpense({
      recorrente_id:$("recurringId").value,
      nome:$("recurringName").value,
      valor_previsto:numberFromInput($("recurringValue").value),
      categoria_id:$("recurringCategory").value,
      frequencia:$("recurringFrequency").value,
      dia_vencimento:$("recurringDueDay").value,
      conta_id:$("recurringAccount").value,
      forma_pagamento:$("recurringPayment").value,
      observacao:$("recurringNote").value,
      status:"ativo"
    });
    closeDialog($("recurringDialog"));
    await renderRecurring();
    showToast("Despesa recorrente salva.");
  }catch(err){showToast(err.message)}
});
$("diagnosticsBtn").addEventListener("click",async()=>{
  const box=$("diagnosticsBox");
  try{
    const d=await buildDiagnostics();
    const c=d.counts;
    box.textContent=`App ${d.app} · Estrutura ${d.schema}
${d.online?"Online":"Offline"} · Pendências locais: ${d.pending}
Última sincronização: ${d.lastSync||"ainda não registrada"}

Transações: ${c.transacoes}
Transferências: ${c.transferencias}
Contas: ${c.contas}
Recorrentes: ${c.despesas_recorrentes}
XP: ${c.eventos_xp}`;
    box.classList.remove("hidden");
  }catch(e){box.textContent="Falha no diagnóstico: "+e.message;box.classList.remove("hidden")}
});

$("cajuConfirmBtn").addEventListener("click",async()=>{try{await registerCajuMonthlyCredit();$("cajuBanner").classList.add("hidden");await render();showToast("R$ 400 da Caju registrados.")}catch(e){showToast(e.message)}});
$("transferForm").addEventListener("submit",async e=>{e.preventDefault();try{await createTransfer({origem_conta_id:$("transferFrom").value,destino_conta_id:$("transferTo").value,valor:numberFromInput($("transferValue").value),data:$("transferDate").value,observacao:$("transferNote").value});e.target.reset();closeDialog($("transferDialog"));await render();showToast("Transferência registrada sem contar como renda ou gasto.")}catch(err){showToast(err.message)}});
document.querySelectorAll("[data-settings]").forEach(btn=>btn.addEventListener("click",()=>{const page=btn.dataset.settings;if(page==="api"){closeDialog($("settingsDialog"));$("tokenInput").value=getApiToken();openDialog($("tokenDialog"));return}closeDialog($("settingsDialog"));openDialog(document.getElementById(page+"Dialog"))}));
document.querySelectorAll("[data-brand-option]").forEach(btn=>btn.addEventListener("click",()=>{const next=saveSettings({brandStyle:btn.dataset.brandOption});applyBrand(next.brandStyle);renderBrandPicker(next);showToast("Identidade visual atualizada.");}));
$("themeSelect").addEventListener("change",()=>saveSettings({theme:$("themeSelect").value}));$("animationsToggle").addEventListener("change",()=>saveSettings({animations:$("animationsToggle").checked}));$("hideValuesToggle").addEventListener("change",()=>saveSettings({hideValues:$("hideValuesToggle").checked}));$("syncSettingsBtn").addEventListener("click",performSync);


$("resetOrionBtn").addEventListener("click", () => {
  $("resetStatus").textContent = "";
  $("resetStatus").classList.add("hidden");
  $("confirmResetBtn").disabled = false;
  $("confirmResetBtn").textContent = "Sim, apagar tudo";
  closeDialog($("dataDialog"));
  openDialog($("resetDialog"));
});

$("confirmResetBtn").addEventListener("click", async () => {
  const button = $("confirmResetBtn");
  const status = $("resetStatus");
  button.disabled = true;
  button.textContent = "Apagando…";
  status.textContent = "Apagando a base central e limpando este dispositivo…";
  status.classList.remove("hidden");

  try {
    await resetRemoteData();
    await clearUserData();
    await downloadAll();
    await render();

    status.textContent = "Concluído.";
    closeDialog($("resetDialog"));
    showToast("Orion zerado. Estrutura preservada.");
  } catch (err) {
    status.textContent = err.message || "Não foi possível zerar o Orion.";
    status.classList.remove("error");
    void status.offsetWidth;
    status.classList.add("error");
  } finally {
    button.disabled = false;
    button.textContent = "Sim, apagar tudo";
  }
});



$("exportSheetBtn").addEventListener("click", () => {
  closeDialog($("dataDialog"));
  openDialog($("exportDialog"));
});

$("confirmExportBtn").addEventListener("click", async () => {
  $("confirmExportBtn").disabled = true;
  try {
    const data = await getSpreadsheetExportURL();
    closeDialog($("exportDialog"));
    window.open(data.url, "_blank", "noopener");
    showToast("Exportação preparada.");
  } catch (err) {
    showToast(err.message || "Não foi possível exportar a planilha.");
  } finally {
    $("confirmExportBtn").disabled = false;
  }
});


window.addEventListener("online", checkStartupSync);
window.addEventListener("offline", () => showToast("Você está offline."));

async function refreshFrontendBuild(){try{localStorage.setItem("orion_front_build",APP_VERSION);if("caches" in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith("orion-mobile-")&&k!=="orion-mobile-v9-4").map(k=>caches.delete(k)));}if("serviceWorker" in navigator){const reg=await navigator.serviceWorker.register(`./service-worker.js?v=${APP_VERSION}`,{updateViaCache:"none"});await reg.update().catch(()=>{});if(reg.waiting)reg.waiting.postMessage({type:"SKIP_WAITING"});}}catch(e){console.warn("Atualização do frontend",BUILD_ID,e);}}
await refreshFrontendBuild();

let __orionBootDone = false;
async function bootstrap(retry = 0){
  try{
    await render();
    await checkStartupSync();
    __orionBootDone = true;
  }catch(e){
    console.error("Falha na inicialização mobile", e);
    if(retry < 1){
      setTimeout(()=>bootstrap(retry + 1), 350);
      return;
    }
    showToast("O Orion encontrou um bloqueio ao iniciar. Recarregue a tela se necessário.");
  }
}
window.addEventListener("pageshow", () => {
  const saldoNode = $("saldoTotal");
  if(!__orionBootDone || !saldoNode || !saldoNode.textContent){
    bootstrap(1);
  }
});

await bootstrap();
