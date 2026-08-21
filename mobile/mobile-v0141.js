import { setApiToken, getApiToken, setDeviceType } from "../core/config.js";
import { getRecurringExpenses, saveRecurringExpense, setRecurringStatus, markRecurringRegistered, recurringFrequencyLabel, recurringDueState } from "../core/recurring.js";
import { buildDiagnostics } from "../core/diagnostics.js";
import { getMonthlyCommitments } from "../core/commitments.js";
import { buildInstitutionCards, renderInstitutionCard } from "../core/dashboard-groups.js";
import { getAll, getMeta, clearUserData } from "../core/db.js";
import { syncNow, getSyncStatus, downloadAll, fetchInvestment, resetRemoteData, getSpreadsheetExportURL } from "../core/sync.js";
import { calculateDashboard, recentTransactions } from "../core/finance.js";
import { createAccount, createTransaction, updateTransaction, randomPhrase, createDebt, payDebt, getDebts, addRadarTicker, getRadar, createTransfer, updateAccountDashboardVisibility } from "../core/orion.js";
import { money, dateBR, escapeHTML, numberFromInput, todayISO } from "../core/utils.js";
import { extractIndicators, scoreInvestment } from "../core/investments.js";
import { getEmergencyFund, saveEmergencyFund, emergencyProgress } from "../core/goals.js";
import { getSettings, saveSettings, applySettings, bindSystemTheme } from "../core/settings.js";
import { getGameState } from "../core/game.js";
import { getEvents, getEvent, getEventSummary, eventFinancialState, saveEvent, reserveForEvent, completeEvent, cancelEvent, daysUntil, reserveSuggestion, createICS } from "../core/events.js";
import { ensureCajuStructure, getCajuMonthlySuggestion, registerCajuMonthlyCredit } from "../core/caju.js";
import { buildPremiumSnapshot, simulatePremiumScenario, buildExecutiveReport } from "../core/premium.js";
import { ensureExpandedIncomeCategories } from "../core/categories.js";
import { ensureProfiles, getProfiles, getActiveProfile, getActiveProfileId, setActiveProfileId, createProfile, getProfileSnapshot, allocationByAccount, allocatedToManagedProfilesByAccount, createAllocationMovement } from "../core/profiles.js";
import { smartPhrase } from "../core/phrase-engine.js";

const APP_VERSION="0.14.0";
const BUILD_ID="2026-08-21.0752";
const BRAND_STYLES = new Set(["radar-visionario","monograma-radar","visionario","minimal"]);
function normalizeBrandStyle(value){return BRAND_STYLES.has(value)?value:"radar-visionario";}
function brandMarkSVG(style="radar-visionario"){
 const v=normalizeBrandStyle(style);
 return `<img class="orion-brand-image brand-image-${v}" src="../assets/icon-192.png" alt="" aria-hidden="true">`;
}
function applyBrand(style){const v=normalizeBrandStyle(style);document.documentElement.dataset.brand=v;document.querySelectorAll("[data-brand-mark]").forEach(n=>n.innerHTML=brandMarkSVG(v));document.querySelectorAll("[data-brand-option]").forEach(n=>n.classList.toggle("active",n.dataset.brandOption===v));return v;}
function renderBrandPicker(settings=getSettings()){const current=normalizeBrandStyle(settings?.brandStyle);document.querySelectorAll("[data-brand-option]").forEach(btn=>{const active=btn.dataset.brandOption===current;btn.classList.toggle("active",active);btn.setAttribute("aria-pressed",active?"true":"false");});document.querySelectorAll("[data-brand-preview]").forEach(node=>{node.innerHTML=brandMarkSVG(node.dataset.brandPreview||current);});}



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

let __premiumSnapshot=null;
function pct(value){return `${Number(value||0).toFixed(1).replace(".",",")}%`;}
function applyProfilePlanUI(){const s=getSettings(),name=String(s.profileName||"João").trim()||"João",initial=name.slice(0,1).toUpperCase();document.querySelectorAll("[data-profile-name]").forEach(n=>n.textContent=name);document.querySelectorAll("[data-profile-avatar]").forEach(n=>n.textContent=initial);const chip=$("planChip");if(chip){chip.textContent=s.plan==="premium"?"✦ Premium":"✦ Free";chip.dataset.plan=s.plan;}}
async function openProfileCenter(){if($("settingsDialog")?.open)closeDialog($("settingsDialog"));await renderProfilesManager();openDialog($("profileDialog"));}
async function loadPremiumSnapshot(){const [transactions,categories,dashboard,commitments,eventSummary,reserve,debts]=await Promise.all([getAll("transacoes"),getAll("categorias"),calculateDashboard(),getMonthlyCommitments(),getEventSummary(),getEmergencyFund(),getDebts()]);return __premiumSnapshot=buildPremiumSnapshot({transactions,categories,dashboard,commitments,eventSummary,reserve,debts});}
async function renderPremiumCenter(){const active=getSettings().plan==="premium";$("premiumCurrentPlan").textContent=`Plano atual · ${active?"Premium":"Free"}`;$("premiumLockedPanel").classList.toggle("hidden",active);$("premiumActivePanel").classList.toggle("hidden",!active);if(!active)return null;const s=await loadPremiumSnapshot();$("premiumScore").textContent=`${s.score}/100`;$("premiumPressure").textContent=`Pressão ${String(s.pressure).toLowerCase()}`;$("premiumSpend30").textContent=money(s.spend30);$("premiumTrend").textContent=`${s.trendPct>0?"+":""}${pct(s.trendPct)} vs. 30 dias anteriores`;$("premiumDaily").textContent=money(s.avgDaily);$("premiumTopCategory").textContent=s.topCategoryName;$("premiumTopShare").textContent=`${pct(s.topCategoryShare)} das saídas em 90 dias`;$("premiumFreeMoney").textContent=money(s.freeMoney);$("premiumCommitmentRatio").textContent=pct(s.commitmentRatio);$("premiumReservePct").textContent=pct(s.reservePct);$("premiumEventsPct").textContent=pct(s.eventCoverage);$("premiumDebtOpen").textContent=money(s.debtOpen);return s;}
async function openPremiumCenter(){if($("settingsDialog")?.open)closeDialog($("settingsDialog"));if($("profileDialog")?.open)closeDialog($("profileDialog"));await renderPremiumCenter();openDialog($("premiumDialog"));}
function downloadPremiumReport(){if(!__premiumSnapshot)return showToast("Abra o Premium novamente para atualizar os dados.");const report=buildExecutiveReport(__premiumSnapshot,getSettings().profileName||"João"),blob=new Blob([report],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`Orion_Premium_${todayISO()}.txt`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);showToast("Relatório Premium preparado.");}
applyProfilePlanUI();
const dialogs = {
  token: $("tokenDialog"),
  account: $("accountDialog"),
  movement: $("movementDialog")
};
let movementType = "saida";
let movementMode = "saida";
let currentRecurringId = "";
let editingTransactionId = "";

function centsMaskValue(raw){
  const digits=String(raw??"").replace(/\D/g,"").slice(0,12);
  const cents=Number(digits||0);
  return (cents/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
}
function setCentsInput(input,value=0){
  if(!input)return;
  const cents=Math.round(Math.max(0,Number(value||0))*100);
  input.value=centsMaskValue(String(cents));
}
function bindCentsInput(input){
  if(!input||input.dataset.centsBound)return;
  input.dataset.centsBound="1";
  input.inputMode="numeric";
  input.addEventListener("input",()=>{input.value=centsMaskValue(input.value)});
  input.addEventListener("focus",()=>{if(!input.value)input.value="0,00";setTimeout(()=>{try{input.select()}catch(_){}},0)});
}
function extractPurpose(observation=""){
  const text=String(observation||"");
  const m=text.match(/Finalidade:\s*([^·]+)/i);
  return m?m[1].trim().toLowerCase().replace(/\s+/g,"_"):"";
}
function observationWithoutPurpose(observation=""){
  return String(observation||"").replace(/(?:^|\s*·\s*)Finalidade:\s*[^·]+/i,"").replace(/^\s*·\s*|\s*·\s*$/g,"").trim();
}
async function applyCajuPaymentDefault(accountId){
  const payment=$("movementPayment");
  if(!payment||movementMode==="rendimento"||movementMode==="transferencia")return;
  const [accounts,institutions]=await Promise.all([getAll("contas"),getAll("instituicoes")]);
  const account=accounts.find(a=>String(a.conta_id||"")===String(accountId||""));
  const inst=institutions.find(i=>String(i.instituicao_id||"")===String(account?.instituicao_id||""));
  const hay=`${account?.nome||""} ${inst?.nome||""} ${inst?.nome_curto||""}`.toLowerCase();
  if(hay.includes("caju")){payment.value="credito"; payment.title="Crédito usando saldo Caju, sem geração de fatura";}
  else payment.title="";
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

async function showReward(context) {
  const active=await getActiveProfile().catch(()=>null);
  const text=smartPhrase(context,{force:["aporte","rendimento","divida","reserva"].includes(context),name:active?.nome||""});
  if (!text) { showToast("✓ Registrado"); return; }
  $("rewardText").textContent = text;
  $("reward").classList.remove("hidden");
  setTimeout(() => $("reward").classList.add("hidden"), 2400);
}

async function findDefaultAllocationAccount(){
  const [accounts,institutions]=await Promise.all([getAll("contas"),getAll("instituicoes")]);
  const imap=new Map(institutions.map(i=>[i.instituicao_id,i]));
  const active=accounts.filter(a=>a.status!=="inativo");
  const preferred=active.find(a=>{const inst=imap.get(a.instituicao_id);const hay=`${a.nome||""} ${inst?.nome||""} ${inst?.nome_curto||""}`.toLowerCase();return hay.includes("mercado pago")&&!/reserva|maria|15 anos/.test(String(a.nome||"").toLowerCase());});
  return preferred || active[0] || null;
}
async function updateProfileHeader(){
  const active=await getActiveProfile(); if(!active)return;
  if($("activeProfileName")) $("activeProfileName").textContent=active.nome;
  if($("activeProfileDot")) $("activeProfileDot").textContent=String(active.nome||"P").slice(0,1).toUpperCase();
  document.body.dataset.profileType=active.principal?"principal":"managed";
}
async function renderProfilesManager(){
  await ensureProfiles(getSettings().profileName||"João");
  const [profiles,activeId,physical,managedByAccount]=await Promise.all([getProfiles(),getActiveProfileId(),calculateDashboard(),allocatedToManagedProfilesByAccount()]);
  const managedTotal=[...managedByAccount.values()].reduce((s,v)=>s+Number(v||0),0);
  const principalBalance=Math.max(0,Number(physical.saldoTotal||0)-managedTotal);
  const rows=[];
  for(const profile of profiles){
    const snapshot=await getProfileSnapshot(profile.perfil_id);
    const shownBalance=profile.principal?principalBalance:snapshot.balance;
    rows.push(`<article class="profile-manager-row ${profile.perfil_id===activeId?"active":""}"><button type="button" class="profile-select-main" data-select-profile="${escapeHTML(profile.perfil_id)}"><span>${escapeHTML(String(profile.nome||"P").slice(0,1).toUpperCase())}</span><div><strong>${escapeHTML(profile.nome)}</strong><small>${escapeHTML(profile.subtitulo||profile.tipo||"")}</small></div><b>${money(shownBalance)}</b><i>${profile.perfil_id===activeId?"✓":"›"}</i></button>${profile.principal?"":`<button type="button" class="profile-contribute" data-contribute-profile="${escapeHTML(profile.perfil_id)}">＋ Aportar</button>`}</article>`);
  }
  $("profilesList").innerHTML=rows.join("");
  document.querySelectorAll("[data-select-profile]").forEach(btn=>btn.onclick=async()=>{await setActiveProfileId(btn.dataset.selectProfile);closeDialog($("profileDialog"));await render();showToast("Perfil alterado.");});
  document.querySelectorAll("[data-contribute-profile]").forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.contributeProfile;closeDialog($("profileDialog"));await openContribution(id);});
}
async function renderQuickContributionChips(){
  const profiles=(await getProfiles()).filter(p=>!p.principal); const node=$("quickContributionChips"); if(!node)return;
  if(!profiles.length){node.classList.add("hidden");node.innerHTML="";return;}
  node.innerHTML=profiles.map(p=>`<button type="button" data-quick-contribute="${escapeHTML(p.perfil_id)}">＋ Aporte · ${escapeHTML(p.nome)}</button>`).join(""); node.classList.remove("hidden");
  node.querySelectorAll("[data-quick-contribute]").forEach(btn=>btn.onclick=async()=>{closeDialog($("movementDialog"));await openContribution(btn.dataset.quickContribute);});
}
async function openContribution(profileId){
  const profiles=await getProfiles(); const profile=profiles.find(p=>p.perfil_id===profileId); const account=await findDefaultAllocationAccount();
  if(!profile)return showToast("Perfil não encontrado."); if(!account)return showToast("Cadastre uma conta antes do primeiro aporte.");
  $("contributionProfileId").value=profile.perfil_id; $("contributionProfileId").dataset.accountId=account.conta_id;
  $("contributionTitle").textContent=`Aporte para ${profile.nome}`; $("contributionProfileName").textContent=profile.nome; $("contributionAccountName").textContent=account.nome||"Conta"; $("contributionDateLabel").textContent=dateBR(todayISO()); setCentsInput($("contributionValue"),0); openDialog($("contributionDialog"));
}
function institutionMap(items) {
  return new Map(items.map(i => [i.instituicao_id, i]));
}

let __accountProfileInstitutionId="";
let __accountProfileInstitutionName="";
function accountProfileDateRange(items){
  const dates=items.map(t=>String(t.data||"").slice(0,10)).filter(Boolean).sort();
  return {start:dates[0]||"",end:todayISO()};
}
async function renderAccountProfile(){
  if(!__accountProfileInstitutionId)return;
  const [accounts,transactions,institutions,cards]=await Promise.all([getAll("contas"),getAll("transacoes"),getAll("instituicoes"),getAll("cartoes_credito")]);
  const directAccountId=__accountProfileInstitutionId.startsWith("account:")?__accountProfileInstitutionId.slice(8):"";
  const institution=institutions.find(i=>String(i.instituicao_id||"")===__accountProfileInstitutionId)||{};
  const institutionAccounts=accounts.filter(a=>directAccountId?String(a.conta_id||"")===directAccountId:String(a.instituicao_id||"")===__accountProfileInstitutionId);
  const ids=new Set(institutionAccounts.map(a=>String(a.conta_id||"")));
  const all=transactions.filter(t=>ids.has(String(t.conta_id||""))).sort((a,b)=>`${b.data}|${b.criado_em}`.localeCompare(`${a.data}|${a.criado_em}`));
  const grouped=buildInstitutionCards({accounts:institutionAccounts,institutions,cards:cards.filter(c=>String(c.instituicao_id||"")===__accountProfileInstitutionId)});
  const summary=grouped[0]||{total:institutionAccounts.reduce((s,a)=>s+Number(a.saldo_calculado||0),0)};
  const start=$("accountProfileStart")?.value||"",end=$("accountProfileEnd")?.value||"";
  const filtered=all.filter(t=>(!start||String(t.data||"")>=start)&&(!end||String(t.data||"")<=end));
  const entries=filtered.filter(t=>t.tipo==="entrada").reduce((s,t)=>s+Number(t.valor||0),0);
  const exits=filtered.filter(t=>t.tipo==="saida").reduce((s,t)=>s+Number(t.valor||0),0);
  $("accountProfileTitle").textContent=__accountProfileInstitutionName||institution.nome_curto||institution.nome||"Conta";
  $("accountProfileName").textContent=__accountProfileInstitutionName||institution.nome_curto||institution.nome||"Conta";
  $("accountProfileType").textContent=(institutionAccounts.map(a=>a.nome||a.tipo).filter(Boolean).filter(n=>!/reserva|maria estela|15 anos/i.test(String(n))).slice(0,2).join(" · ")||"Conta financeira");
  $("accountProfileMark").textContent=String(__accountProfileInstitutionName||"O").slice(0,1).toUpperCase();
  $("accountProfileMark").style.background=institution.cor_primaria||"var(--orion-brand-accent)";
  $("accountProfileBalance").textContent=money(summary.total||0);
  $("accountProfileMetrics").innerHTML=`<div><small>Entradas</small><strong class="amount-positive">${money(entries)}</strong></div><div><small>Saídas</small><strong class="amount-negative">${money(exits)}</strong></div><div><small>Resultado</small><strong>${money(entries-exits)}</strong></div><div><small>Movimentos</small><strong>${filtered.length}</strong></div>`;
  $("accountProfileMovements").innerHTML=filtered.length?filtered.slice(0,20).map(t=>`<button type="button" class="account-profile-movement" data-edit-transaction="${escapeHTML(t.transacao_id)}"><span class="movement-dot ${t.tipo}">${t.tipo==="entrada"?"↑":"↓"}</span><div><strong>${escapeHTML(t.descricao||"Movimento")}</strong><small>${dateBR(t.data)} · ${escapeHTML(movementMethodLabel(t.forma_pagamento))}</small></div><b class="${t.tipo==="entrada"?"amount-positive":"amount-negative"}">${t.tipo==="entrada"?"+":"-"} ${money(t.valor)}</b><i>›</i></button>`).join(""):`<div class="empty">Nenhuma movimentação neste período.</div>`;
}
async function openAccountProfile(institutionId,institutionName){
  __accountProfileInstitutionId=String(institutionId||""); __accountProfileInstitutionName=String(institutionName||"");
  const accounts=await getAll("contas"),transactions=await getAll("transacoes"); const directAccountId=__accountProfileInstitutionId.startsWith("account:")?__accountProfileInstitutionId.slice(8):""; const ids=new Set(accounts.filter(a=>directAccountId?String(a.conta_id||"")===directAccountId:String(a.instituicao_id||"")===__accountProfileInstitutionId).map(a=>String(a.conta_id||"")));
  const range=accountProfileDateRange(transactions.filter(t=>ids.has(String(t.conta_id||""))));
  if($("accountProfileStart"))$("accountProfileStart").value=range.start; if($("accountProfileEnd"))$("accountProfileEnd").value=range.end;
  await renderAccountProfile(); openDialog($("accountProfileDialog"));
}

let __statementInstitutionId = "";
function closeInstitutionStatement(){
  const overlay=$("institutionStatementOverlay");
  if(!overlay) return;
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden","true");
  __statementInstitutionId="";
}
async function openInstitutionStatement(institutionId,institutionName){
  const [accounts,transactions,institutions,cards]=await Promise.all([
    getAll("contas"), getAll("transacoes"), getAll("instituicoes"), getAll("cartoes_credito")
  ]);
  const institutionAccounts=accounts.filter(a=>String(a.instituicao_id||"")===String(institutionId||""));
  const accountIds=new Set(institutionAccounts.map(a=>String(a.conta_id||"")));
  const filtered=transactions.filter(t=>accountIds.has(String(t.conta_id||"")))
    .sort((a,b)=>`${b.data||""}|${b.criado_em||""}`.localeCompare(`${a.data||""}|${a.criado_em||""}`));
  const grouped=buildInstitutionCards({accounts:institutionAccounts,institutions,cards:cards.filter(c=>String(c.instituicao_id||"")===String(institutionId||""))});
  const summaryCard=grouped[0];
  const entries=filtered.filter(t=>t.tipo==="entrada").reduce((s,t)=>s+Number(t.valor||0),0);
  const exits=filtered.filter(t=>t.tipo==="saida").reduce((s,t)=>s+Number(t.valor||0),0);
  __statementInstitutionId=String(institutionId||"");
  $("institutionStatementTitle").textContent=institutionName||summaryCard?.name||"Instituição";
  $("institutionStatementSubtitle").textContent=`${filtered.length} movimenta${filtered.length===1?"ção":"ções"} encontradas`;
  $("institutionStatementSummary").innerHTML=`
    <div><small>Saldo atual</small><strong>${money(summaryCard?.total||0)}</strong></div>
    <div><small>Entradas</small><strong class="amount-positive">${money(entries)}</strong></div>
    <div><small>Saídas</small><strong class="amount-negative">${money(exits)}</strong></div>
    <div><small>Registros</small><strong>${filtered.length}</strong></div>`;
  $("institutionStatementMovements").innerHTML=filtered.length?renderMovements(filtered):`<div class="empty">Nenhuma movimentação vinculada a esta instituição.</div>`;
  const overlay=$("institutionStatementOverlay");
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden","false");
}
function bindInstitutionCards(){
  document.querySelectorAll(".institution-card-clickable[data-institution-id]").forEach(card=>{
    const open=()=>openAccountProfile(card.dataset.institutionId,card.dataset.institutionName);
    card.onclick=open;
    card.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}};
  });
}
function bindInstitutionStatementDismiss(){
  $("institutionStatementClose")?.addEventListener("click",closeInstitutionStatement);
  $("institutionStatementOverlay")?.addEventListener("click",e=>{if(e.target===e.currentTarget)closeInstitutionStatement();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&__statementInstitutionId)closeInstitutionStatement();});
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
  const [transactions,categories,commitments,reserve,eventSummary]=await Promise.all([
    getAll("transacoes"),
    getAll("categorias"),
    getMonthlyCommitments(),
    getEmergencyFund(),
    getEventSummary()
  ]);
  const expenseTx=transactions.filter(t=>t?.tipo==="saida" && isCurrentMonthDate(t.data));
  const income=Math.max(0,Number(dashboard?.entradasMes||0));
  const expense=Math.max(0,Number(dashboard?.saidasMes||0));
  const usage=income>0?(expense/income)*100:(expense>0?100:0);
  const commitmentRatio=income>0?(Number(commitments.total||0)/income)*100:0;
  const reservePercent=Number(emergencyProgress(reserve).percent||0);
  const freeMoney=Number(dashboard?.saldoTotal||0)-Number(commitments.total||0)-Number(eventSummary.reserved||0)-Number(reserve?.valor_atual||0);
  if($("freeMoneyValue")) $("freeMoneyValue").textContent=money(freeMoney);
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
    const best=tips[0];
    tipNode.innerHTML=best
      ? `<span class="health-tip-dot">✦</span><div><strong>${escapeHTML(best.title)}</strong><span>${escapeHTML(best.text)}</span></div>`
      : `<span class="health-tip-dot">✦</span><div><strong>Sem dados suficientes</strong><span>Lance movimentações para liberar uma recomendação.</span></div>`;
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
function openMoreDrawer(){
  $("moreDrawer")?.classList.add("open"); $("moreDrawer")?.setAttribute("aria-hidden","false"); $("moreDrawerBackdrop")?.classList.remove("hidden");
}
function closeMoreDrawer(){
  $("moreDrawer")?.classList.remove("open"); $("moreDrawer")?.setAttribute("aria-hidden","true"); $("moreDrawerBackdrop")?.classList.add("hidden");
}

const VIEW_TITLES={homeView:"Como está seu dinheiro?",movementsView:"Movimentações",debtsView:"Dívidas",investmentsView:"Investimentos",eventsView:"Eventos",evolutionView:"Evolução",settingsView:"Configurações"};
function activateView(viewId){
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  $("moreNavBtn")?.classList.remove("active");
  document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===viewId));
  $(viewId)?.classList.remove('hidden');
  const title=$("viewTitle"); if(title) title.textContent=VIEW_TITLES[viewId]||"Orion Finance";
  document.body.dataset.activeView=viewId;
  if(viewId!=="investmentsView") closeInvestmentSetup?.();
  window.scrollTo({top:0,left:0,behavior:'auto'});
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
  await ensureExpandedIncomeCategories();
  const [dashboard, recent, institutions, cards] = await Promise.all([
    calculateDashboard(),
    recentTransactions(8),
    getAll("instituicoes"),
    getAll("cartoes_credito")
  ]);

  await ensureProfiles(getSettings().profileName||"João");
  const activeProfile=await getActiveProfile();
  const imap = institutionMap(institutions);
  let displayDashboard={...dashboard,contas:dashboard.contas.map(a=>({...a}))};
  if(activeProfile && !activeProfile.principal){
    const snap=await getProfileSnapshot(activeProfile.perfil_id), byAccount=await allocationByAccount(activeProfile.perfil_id);
    displayDashboard.contas=displayDashboard.contas.map(a=>({...a,saldo_calculado:byAccount.get(a.conta_id)||0}));
    displayDashboard.saldoTotal=snap.balance; displayDashboard.patrimonioTotal=snap.balance; displayDashboard.entradasMes=snap.aportesMes; displayDashboard.saidasMes=snap.retiradasMes; displayDashboard.resultadoMes=snap.resultadoMes;
  }else{
    const managed=await allocatedToManagedProfilesByAccount();
    displayDashboard.contas=displayDashboard.contas.map(a=>({...a,saldo_calculado:Number(a.saldo_calculado||0)-(managed.get(a.conta_id)||0)}));
    displayDashboard.saldoTotal=displayDashboard.contas.filter(a=>a.tipo!=="investimento_garantia").reduce((sum,a)=>sum+Number(a.saldo_calculado||0),0);
    displayDashboard.patrimonioTotal=displayDashboard.contas.reduce((sum,a)=>sum+Number(a.saldo_calculado||0),0);
  }
  await updateProfileHeader();

  $("saldoTotal").textContent = money(displayDashboard.saldoTotal);
  ["saldoTotal","entradasMes","saidasMes","resultadoMes","debtsTotal","reserveAmount"].forEach(id=>$(id)?.setAttribute("data-money",""));
  $("entradasMes").textContent = money(displayDashboard.entradasMes);
  $("saidasMes").textContent = money(displayDashboard.saidasMes);
  {
    const resultadoMesNode = $("resultadoMes");
    if (resultadoMesNode) resultadoMesNode.textContent = money(displayDashboard.resultadoMes);
  }

  let institutionCards = [];
  try {
    institutionCards = buildInstitutionCards({ accounts: displayDashboard.contas, institutions, cards });
    $("accountsList").innerHTML = institutionCards.length
      ? institutionCards.map(item => renderInstitutionCard(item, escapeHTML)).join("")
      : `<div class="empty">Nenhuma instituição com saldo ou compromisso ativo.</div>`;
  } catch (error) {
    console.error("Falha ao agrupar instituições", error);
    $("accountsList").innerHTML = displayDashboard.contas
      .filter(a => Math.abs(Number(a.saldo_calculado || 0)) >= 0.005)
      .map(a => `<article class="account-card"><div class="account-title">${escapeHTML(String(a.nome || "Conta"))}</div><div class="account-balance">${money(a.saldo_calculado)}</div></article>`)
      .join("") || `<div class="empty">Nenhuma conta com saldo ativo.</div>`;
  }

  document.querySelectorAll("[data-transfer-from]").forEach(b=>b.onclick=e=>{e.stopPropagation();openTransfer(b.dataset.transferFrom)});
  bindInstitutionCards();
  $("recentList").innerHTML = renderMovements(recent);
  const all = await getAll("transacoes");
  all.sort((a,b) => `${b.data}|${b.criado_em}`.localeCompare(`${a.data}|${a.criado_em}`));
  $("allMovements").innerHTML = renderMovements(all);

  await fillSelectors();
  await renderQuickContributionChips();
  try { await renderDebts(); } catch (e) { console.error("Falha ao renderizar dívidas", e); }
  try { await renderRadar(); } catch (e) { console.error("Falha ao renderizar radar de investimentos", e); }
  try { await renderEmergencyFund(); } catch (e) { console.error("Falha ao renderizar reserva", e); }
  try { await setupCaju(); } catch (e) { console.error("Falha ao preparar Caju", e); }
  try { await renderRecurring(); } catch (e) { console.error("Falha ao renderizar recorrentes", e); $("recurringList").innerHTML = `<div class="empty">Não foi possível carregar as recorrentes.</div>`; }
  try { await renderCommitments(); } catch (e) { console.error("Falha ao renderizar compromissos", e); $("commitmentsSummary").innerHTML = `<div class="empty">Compromissos indisponíveis.</div>`; }
  try { await renderSyncMeta(); } catch (e) { console.error("Falha ao renderizar status de sincronização", e); }
  try { await renderHomeInsights(displayDashboard); const p=await getActiveProfile(); if($("compactHealthScore")){if(p&&!p.principal){const snap=await getProfileSnapshot(p.perfil_id);$("compactHealthScore").textContent="●";$("compactHealthLabel").textContent="Construção";if($("freeMoneyValue"))$("freeMoneyValue").textContent=money(snap.balance);}else{$("compactHealthScore").textContent=$("financialHealthPercent")?.textContent||"—";$("compactHealthLabel").textContent=$("financialHealthLabel")?.textContent||"Em análise";}} } catch (e) { console.error("Falha ao renderizar saúde financeira", e); }
  try { await renderEvents(); } catch (e) { console.error("Falha ao renderizar Eventos", e); }
  try { await renderGame(); } catch (e) { console.error("Falha ao renderizar Evolução", e); }
}

function movementMethodLabel(value){
  const v=String(value||"");
  if(v==="rendimento_juros") return "Rendimento / Juros";
  const labels={pix:"Pix",debito:"Débito",credito:"Crédito",dinheiro:"Dinheiro",boleto:"Boleto",outro:"Outro"};
  return labels[v]||v;
}
function renderMovements(items) {
  if (!items.length) return `<div class="empty">Nenhuma movimentação registrada.</div>`;
  return items.map(t => `<article class="movement">
    <strong>${escapeHTML(t.descricao)}</strong>
    <small>${dateBR(t.data)} · ${escapeHTML(movementMethodLabel(t.forma_pagamento))}</small>
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

  const activeAccounts=accounts.filter(a => a.status !== "inativo");
  const accountOptions=activeAccounts.map(a=>`<option value="${escapeHTML(a.conta_id)}">${escapeHTML(a.nome)}</option>`).join("");
  $("movementAccount").innerHTML = `<option value="">Selecione</option>${accountOptions}`;
  if($("movementTransferFrom")) $("movementTransferFrom").innerHTML=`<option value="">Selecione</option>${accountOptions}`;
  if($("movementTransferTo")) $("movementTransferTo").innerHTML=`<option value="">Selecione</option>${accountOptions}`;

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
  if (!getApiToken()) { if($("syncStateText"))$("syncStateText").textContent="Local"; return; }
  if (!navigator.onLine) { if($("syncStateText"))$("syncStateText").textContent="Offline"; document.body.dataset.syncState="offline"; return; }
  if($("syncStateText"))$("syncStateText").textContent="Sincronizando"; document.body.dataset.syncState="syncing";
  try { await syncNow(); if($("syncStateText"))$("syncStateText").textContent="Atualizado"; document.body.dataset.syncState="ok"; await render(); }
  catch(e){ console.warn("Sync automático",e); if($("syncStateText"))$("syncStateText").textContent="Local"; document.body.dataset.syncState="local"; }
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

$("settingsBtn")?.addEventListener("click", openSettings);
$("syncBannerBtn").addEventListener("click", performSync);
$("syncTopBtn").addEventListener("click", performSync);
function updateMovementDialogMode(){
  const isTransfer=movementMode==="transferencia";
  document.querySelectorAll(".normal-movement-field").forEach(el=>el.classList.toggle("hidden",isTransfer));
  $("transferMovementFields")?.classList.toggle("hidden",!isTransfer);
  $("movementPurposeWrap")?.classList.remove("hidden");
  if($("movementSubmitBtn")) $("movementSubmitBtn").textContent=editingTransactionId?"Salvar alterações":(isTransfer?"Salvar transferência":"Registrar");
  if($("movementDescription")){ $("movementDescription").required=!isTransfer; $("movementDescription").placeholder=movementMode==="rendimento"?"Ex.: Rendimento Reserva Mercado Pago":"Ex.: Mercado"; }
  if($("movementCategory")) $("movementCategory").required=!isTransfer;
  if($("movementAccount")) $("movementAccount").required=!isTransfer;
}
$("quickAddBtn").addEventListener("click", async () => {
  $("movementForm").reset(); editingTransactionId=""; currentRecurringId=""; $("movementDialog").classList.remove("editing-movement"); $("movementDialog").querySelector("h2").textContent="Novo movimento"; document.querySelectorAll(".segment").forEach(b=>b.disabled=false); setCentsInput($("movementValue"),0);
  movementMode="saida"; movementType="saida";
  document.querySelectorAll(".segment").forEach(b=>b.classList.toggle("active",b.dataset.type==="saida"));
  if($("movementPayment")){ $("movementPayment").disabled=false; $("movementPayment").value="debito"; }
  $("movementDate").value = todayISO();
  await ensureExpandedIncomeCategories(); await fillSelectors(); updateMovementDialogMode();
  openDialog(dialogs.movement);
});
$("movementAccount")?.addEventListener("change",()=>applyCajuPaymentDefault($("movementAccount").value));
bindCentsInput($("movementValue"));
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

$("addEventBtn")?.addEventListener("click",()=>{resetEventForm();openDialog($("eventDialog"));});
$("openEventsFromHome")?.addEventListener("click",()=>activateView("eventsView"));
$("eventForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await saveEvent({evento_id:$("eventId").value,nome:$("eventName").value,data:$("eventDate").value,horario:$("eventTime").value,local:$("eventLocation").value,prioridade:$("eventPriority").value,custo_estimado:numberFromInput($("eventCost").value),margem_percentual:numberFromInput($("eventMargin").value),observacao:$("eventNote").value});closeDialog($("eventDialog"));showToast("Evento salvo.");await render();}catch(err){showToast(err.message||"Não foi possível salvar o evento.");}});
document.querySelectorAll(".insight-trigger").forEach(btn=>btn.addEventListener("click",()=>openInsight(btn.dataset.insight)));
$("radarClues")?.addEventListener("click",e=>{const clue=e.target.closest(".radar-clue");if(clue)openInsight("radar",clue.querySelector("strong")?.textContent||"Radar Orion");});
$("moreNavBtn")?.addEventListener("click",openMoreDrawer);
$("closeMoreDrawer")?.addEventListener("click",closeMoreDrawer); $("moreDrawerBackdrop")?.addEventListener("click",closeMoreDrawer);
document.querySelectorAll("[data-more-view]").forEach(btn=>btn.addEventListener("click",()=>{closeMoreDrawer();activateView(btn.dataset.moreView);document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.classList.remove('active'));$("moreNavBtn")?.classList.add("active");if(btn.dataset.moreView==="investmentsView")ensureInvestmentSetup();}));
$("moreAccountsBtn")?.addEventListener("click",()=>{closeMoreDrawer();activateView("homeView");setTimeout(()=>document.querySelector(".home-accounts-section")?.scrollIntoView({behavior:"smooth",block:"start"}),80);});
$("moreSettingsBtn")?.addEventListener("click",()=>{closeMoreDrawer();activateView("settingsView");});
async function openTransactionEditor(transactionId){
  const tx=(await getAll("transacoes")).find(t=>String(t.transacao_id||"")===String(transactionId||""));
  if(!tx)return showToast("Movimentação não encontrada.");
  editingTransactionId=tx.transacao_id; currentRecurringId="";
  movementMode=tx.forma_pagamento==="rendimento_juros"?"rendimento":tx.tipo;
  movementType=tx.tipo;
  await ensureExpandedIncomeCategories(); await fillSelectors();
  document.querySelectorAll(".segment").forEach(b=>{const isActive=b.dataset.type===movementMode;b.classList.toggle("active",isActive);b.disabled=b.dataset.type==="transferencia";});
  updateMovementDialogMode();
  $("movementDialog").classList.add("editing-movement");
  $("movementDialog").querySelector("h2").textContent="Editar movimento";
  setCentsInput($("movementValue"),tx.valor);
  $("movementDescription").value=tx.descricao||"";
  $("movementCategory").value=tx.categoria_id||"";
  $("movementAccount").value=tx.conta_id||"";
  $("movementPayment").disabled=movementMode==="rendimento";
  $("movementPayment").value=movementMode==="rendimento"?"rendimento_juros":(tx.forma_pagamento||"pix");
  $("movementDate").value=String(tx.data||todayISO()).slice(0,10);
  $("movementEvent").value=tx.evento_id||"";
  $("movementPurpose").value=extractPurpose(tx.observacao);
  $("movementNote").value=observationWithoutPurpose(tx.observacao);
  $("movementSubmitBtn").textContent="Salvar alterações";
  closeDialog($("accountProfileDialog"));
  openDialog($("movementDialog"));
}
$("accountProfileMovements")?.addEventListener("click",e=>{const row=e.target.closest("[data-edit-transaction]");if(row)openTransactionEditor(row.dataset.editTransaction);});
$("accountProfileStart")?.addEventListener("change",renderAccountProfile); $("accountProfileEnd")?.addEventListener("change",renderAccountProfile); $("accountProfileClear")?.addEventListener("click",async()=>{$("accountProfileStart").value="";$("accountProfileEnd").value=todayISO();await renderAccountProfile();});
$("toggleBalanceVisibility")?.addEventListener("click",()=>{const s=getSettings();const next=saveSettings({hideValues:!s.hideValues});applySettings();showToast(next.hideValues?"Valores ocultos.":"Valores visíveis.");});

document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
  btn.addEventListener("click", async () => {
    activateView(btn.dataset.view);
    const panel=$("investmentSetupPanel");
    if(btn.dataset.view==="investmentsView"){
      await ensureInvestmentSetup();
    }else if(panel){
      panel.classList.add("hidden");
      panel.setAttribute("aria-hidden","true");
    }
  });
});

document.querySelectorAll(".segment").forEach(btn => {
  btn.addEventListener("click", async () => {
    movementMode = btn.dataset.type || "saida";
    movementType = movementMode === "rendimento" ? "entrada" : (movementMode === "transferencia" ? "saida" : movementMode);
    document.querySelectorAll(".segment").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    await ensureExpandedIncomeCategories(); await fillSelectors(); updateMovementDialogMode();
    const payment=$("movementPayment");
    if(payment){
      if(movementMode === "rendimento"){ payment.value="rendimento_juros"; payment.disabled=true; }
      else { payment.disabled=false; if(payment.value==="rendimento_juros") payment.value=movementMode==="entrada"?"pix":"debito"; }
    }
    if(movementMode === "rendimento" && $("movementDescription") && !$("movementDescription").value) $("movementDescription").placeholder="Ex.: Rendimento Reserva Mercado Pago";
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
    const purpose=$("movementPurpose")?.value||"";
    if(movementMode==="transferencia"){
      const from=$("movementTransferFrom").value,to=$("movementTransferTo").value;
      await createTransfer({origem_conta_id:from,destino_conta_id:to,valor:movementValue,data:$("movementDate").value,descricao:"Transferência entre contas",observacao:[purpose?`Finalidade: ${purpose.replaceAll("_"," ")}`:"",$("movementNote").value].filter(Boolean).join(" · ")});
      e.target.reset(); movementMode="saida";movementType="saida"; document.querySelectorAll(".segment").forEach(b=>b.classList.toggle("active",b.dataset.type==="saida")); updateMovementDialogMode(); $("movementDate").value=todayISO(); closeDialog(dialogs.movement); await render(); showToast("Transferência registrada sem virar renda ou gasto."); return;
    }
    const transactionPayload={
      tipo: movementType,
      valor: movementValue,
      descricao: $("movementDescription").value,
      categoria_id: $("movementCategory").value,
      conta_id: $("movementAccount").value,
      forma_pagamento: movementMode === "rendimento" ? "rendimento_juros" : $("movementPayment").value,
      data: $("movementDate").value,
      evento_id: $("movementEvent")?.value||"",
      observacao: [purpose?`Finalidade: ${purpose.replaceAll("_"," ")}`:"",$("movementNote").value].filter(Boolean).join(" · ")
    };
    if(editingTransactionId) await updateTransaction(editingTransactionId,transactionPayload);
    else await createTransaction(transactionPayload);
    if(currentRecurringId){await markRecurringRegistered(currentRecurringId,movementValue,$("movementDate").value);currentRecurringId="";}
    const wasEditing=Boolean(editingTransactionId);
    const savedMovementType=movementType;
    editingTransactionId=""; $("movementDialog").classList.remove("editing-movement"); $("movementDialog").querySelector("h2").textContent="Novo movimento";
    e.target.reset(); setCentsInput($("movementValue"),0);
    movementMode="saida"; movementType="saida";
    document.querySelectorAll(".segment").forEach(b=>b.classList.toggle("active",b.dataset.type==="saida"));
    if($("movementPayment")){ $("movementPayment").disabled=false; $("movementPayment").value="debito"; }
    $("movementDate").value = todayISO();
    closeDialog(dialogs.movement);
    await render();
    if(wasEditing){ showToast("Movimentação atualizada."); if(__accountProfileInstitutionId) setTimeout(()=>openAccountProfile(__accountProfileInstitutionId,__accountProfileInstitutionName),80); } else await showReward(savedMovementType === "entrada" ? "entrada" : "saida");
  } catch (err) {
    showToast(err.message);
  }
});


function grossSalaryValue(){ return Math.max(0,Number(getSettings().grossSalary||0)); }
function reserveMonthsValue(){ const n=Math.round(Number(getSettings().reserveMonths||4)); return Math.min(24,Math.max(1,n||4)); }
function suggestedReserveTarget(gross=0,months=4){ return Math.max(0,Number(gross||0))*Math.min(24,Math.max(1,Math.round(Number(months||4)))); }
function updateInvestmentSuggestion(){
  const gross=numberFromInput($("grossSalaryInput")?.value||0);
  const months=Math.min(24,Math.max(1,Math.round(Number($("reserveMonthsInput")?.value||4))));
  const target=suggestedReserveTarget(gross,months);
  if($("reserveSuggestionValue")) $("reserveSuggestionValue").textContent=money(target);
  if($("reserveSuggestionText")) $("reserveSuggestionText").textContent=`${months} ${months===1?"mês":"meses"} do salário bruto`;
  return {gross,months,target};
}
async function openInvestmentSetup({force=false}={}){
  const settings=getSettings();
  const goal=await getEmergencyFund();
  const view=$("investmentsView");
  const panel=$("investmentSetupPanel");
  if(!force && settings.investmentSetupComplete && Number(settings.grossSalary||0)>0){
    view?.classList.remove("investment-setup-locked");
    panel?.classList.add("hidden");
    panel?.setAttribute("aria-hidden","true");
    return false;
  }
  view?.classList.add("investment-setup-locked");
  if($("grossSalaryInput")) $("grossSalaryInput").value=Number(settings.grossSalary||0)>0?Number(settings.grossSalary).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}):"";
  if($("reserveMonthsInput")) $("reserveMonthsInput").value=reserveMonthsValue();
  if($("applyReserveSuggestion")) $("applyReserveSuggestion").checked=force?false:!(goal&&Number(goal.valor_alvo||0)>0);
  updateInvestmentSuggestion();
  panel?.classList.remove("hidden");
  panel?.setAttribute("aria-hidden","false");
  requestAnimationFrame(()=>$("grossSalaryInput")?.focus({preventScroll:true}));
  return true;
}
function closeInvestmentSetup(){const view=$("investmentsView"),panel=$("investmentSetupPanel");view?.classList.remove("investment-setup-locked");panel?.classList.add("hidden");panel?.setAttribute("aria-hidden","true");}
async function ensureInvestmentSetup(){
  try{return await openInvestmentSetup({force:false});}
  catch(error){console.error("Falha no onboarding de investimentos",error); return false;}
}
async function renderDebts(){
  const debts=await getDebts();
  const active=debts.filter(d=>d.status!=="quitada");
  const totalOpen=active.reduce((s,d)=>s+Number(d.valor_atual||0),0);
  const totalOriginal=debts.reduce((s,d)=>s+Number(d.valor_original||0),0);
  const totalCurrent=debts.reduce((s,d)=>s+Number(d.valor_atual||0),0);
  const paidPct=totalOriginal?Math.max(0,Math.min(100,((totalOriginal-totalCurrent)/totalOriginal)*100)):0;
  const nextDue=active.filter(d=>d.vencimento).sort((a,b)=>String(a.vencimento).localeCompare(String(b.vencimento)))[0];
  $("debtsTotal").textContent=money(totalOpen);
  $("debtsActiveCount") && ($("debtsActiveCount").textContent=String(active.length));
  $("debtsPaidPercent") && ($("debtsPaidPercent").textContent=`${Math.round(paidPct)}%`);
  $("debtsNextDue") && ($("debtsNextDue").textContent=nextDue?dateBR(nextDue.vencimento):"—");
  $("debtsList").innerHTML=debts.length?debts.map(d=>{
    const original=Number(d.valor_original||0), current=Number(d.valor_atual||0), paid=Math.max(0,original-current), pct=original?Math.min(100,(paid/original)*100):0;
    const isPaid=d.status==="quitada";
    const due=d.vencimento?dateBR(d.vencimento):"Sem vencimento";
    const planned=Number(d.valor_pagamento_planejado||0);
    return `<article class="debt-card debt-card-premium ${isPaid?"is-paid":""}">
      <div class="debt-card-top">
        <div class="debt-identity"><span class="debt-icon">${isPaid?"✓":"↘"}</span><div><h3>${escapeHTML(d.descricao)}</h3><p>${escapeHTML(d.credor)} · ${escapeHTML(d.tipo||"não informado")}</p></div></div>
        <div class="debt-value-block"><small>Em aberto</small><strong>${money(current)}</strong></div>
      </div>
      <div class="debt-progress-wrap"><div class="debt-progress"><span style="width:${pct}%"></span></div><div class="debt-progress-label"><span>${Math.round(pct)}% quitado</span><span>${money(paid)} pagos</span></div></div>
      <div class="debt-meta-row">
        <span class="debt-chip"><b>Calendário</b>${escapeHTML(due)}</span>
        ${planned>0?`<span class="debt-chip"><b>Planejado</b>${money(planned)}</span>`:""}
        <span class="debt-chip"><b>Original</b>${money(original)}</span>
      </div>
      ${isPaid
        ? `<div class="debt-paid-banner">✓ Compromisso encerrado</div>`
        : `<div class="debt-card-actions"><button class="pay-debt-btn primary-debt-action" data-pay="${d.divida_id}" data-suggest="${d.valor_pagamento_planejado||""}">Registrar pagamento</button></div>`}
    </article>`;
  }).join(""):`<div class="empty debt-empty"><strong>Nenhuma dívida cadastrada.</strong><span>Quando houver um compromisso, ele aparecerá aqui com progresso e próximos passos.</span></div>`;
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
  setCentsInput($("movementValue"),Number(item.valor_previsto||0));
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


let __eventsState=[];
function eventPriorityLabel(v){return ({baixa:"Baixa",media:"Média",alta:"Alta",essencial:"Essencial"})[v]||"Média";}
async function renderEvents(){
  const summary=await getEventSummary(); __eventsState=summary.states;
  $("eventsReservedTotal") && ($("eventsReservedTotal").textContent=money(summary.reserved));
  $("eventsRemainingTotal") && ($("eventsRemainingTotal").textContent=money(summary.remaining));
  $("eventsCount") && ($("eventsCount").textContent=String(summary.count));
  const list=$("eventsList");
  if(list) list.innerHTML=summary.states.length?summary.states.map(s=>{
    const d=daysUntil(s.event.data),suggest=reserveSuggestion(s),status=s.status==="garantido"?"Garantido":s.status==="em_preparacao"?"Em preparação":"Planejado";
    return `<article class="event-card" data-event-id="${escapeHTML(s.event.evento_id)}"><div class="event-card-top"><div><small>${escapeHTML(eventPriorityLabel(s.event.prioridade))}${d!==null?` · ${d<0?"data passada":d===0?"hoje":`faltam ${d} dias`}`:""}</small><strong>${escapeHTML(s.event.nome)}</strong></div><span class="event-status ${s.status}">${status}</span></div><div class="event-progress"><span style="width:${s.percent}%"></span></div><div class="event-grid"><div><small>Meta</small><b>${money(s.target)}</b></div><div><small>Reservado</small><b>${money(s.reserved)}</b></div><div><small>Falta</small><b>${money(s.remaining)}</b></div></div><p>${escapeHTML(suggest.text)}</p></article>`;
  }).join(""):`<div class="empty">Nenhum evento financeiro cadastrado. Crie um quando uma decisão futura precisar de dinheiro.</div>`;
  document.querySelectorAll(".event-card[data-event-id]").forEach(card=>card.onclick=()=>openEventDetail(card.dataset.eventId));
  const home=$("eventsHomeCard"), homeSummary=$("eventsHomeSummary");
  if(home&&homeSummary){
    if(summary.count){home.classList.remove("hidden");const next=summary.states[0];homeSummary.innerHTML=`<button class="event-home-row" type="button" data-event-id="${escapeHTML(next.event.evento_id)}"><div><strong>${escapeHTML(next.event.nome)}</strong><small>${dateBR(next.event.data)} · ${next.percent}% garantido</small></div><div><b>${money(next.remaining)}</b><small>ainda necessário</small></div><span>›</span></button>`;homeSummary.querySelector("[data-event-id]").onclick=()=>openEventDetail(next.event.evento_id)}else home.classList.add("hidden");
  }
}
function resetEventForm(){$("eventForm")?.reset();$("eventId").value="";$("eventPriority").value="media";$("eventMargin").value="0";}
async function openEventDetail(eventId){
  const state=__eventsState.find(s=>s.event.evento_id===eventId)||(()=>null)();
  const event=state?.event||await getEvent(eventId); if(!event)return;
  const full=state||{event,...await eventFinancialState(event)}; const sug=reserveSuggestion(full), d=daysUntil(event.data);
  $("eventDetailContent").innerHTML=`<div class="detail-hero"><small class="eyebrow">EVENTO FINANCEIRO</small><h2>${escapeHTML(event.nome)}</h2><p>${dateBR(event.data)}${event.horario?` · ${escapeHTML(event.horario)}`:""}${event.local?` · ${escapeHTML(event.local)}`:""}</p></div><div class="detail-metrics"><div><small>Meta</small><strong>${money(full.target)}</strong></div><div><small>Reservado</small><strong>${money(full.reserved)}</strong></div><div><small>Restante</small><strong>${money(full.remaining)}</strong></div></div><div class="event-progress big"><span style="width:${full.percent}%"></span></div><p class="detail-callout">${escapeHTML(sug.text)}${d!==null&&d>=0?` Faltam ${d} dias.`:""}</p><div class="event-detail-actions">${full.status!=="garantido"?`<button type="button" data-event-action="reserve">Reservar valor</button>`:""}<button type="button" class="secondary" data-event-action="calendar">Adicionar à agenda (.ics)</button><button type="button" class="secondary" data-event-action="complete">Marcar realizado</button><button type="button" class="danger-action" data-event-action="cancel">Cancelar evento</button></div>`;
  openDialog($("eventDetailDialog"));
  $("eventDetailContent").querySelectorAll("[data-event-action]").forEach(btn=>btn.onclick=async()=>{
    const action=btn.dataset.eventAction;
    if(action==="reserve"){const raw=prompt("Quanto deseja reservar para este evento?");const v=numberFromInput(raw);if(v>0){await reserveForEvent(eventId,v);showToast("Valor reservado para o evento.");closeDialog($("eventDetailDialog"));await render();}}
    if(action==="calendar"){const ics=createICS(event,false,full),blob=new Blob([ics],{type:"text/calendar;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${String(event.nome||"evento").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    if(action==="complete"){const raw=prompt("Quanto foi gasto de fato?",String(full.target||0).replace('.',','));const v=numberFromInput(raw);if(Number.isFinite(v)){const result=await completeEvent(eventId,v);showToast(result.leftover>0?`Evento realizado. ${money(result.leftover)} liberados.`:"Evento realizado.");closeDialog($("eventDetailDialog"));await render();}}
    if(action==="cancel"&&confirm("Cancelar este evento e liberar a reserva interna?")){await cancelEvent(eventId);closeDialog($("eventDetailDialog"));await render();}
  });
}
function buildInsight(type){
  const lookup={
    uso:["Uso do mês","Mostra quanto das entradas mensais já foi consumido pelas saídas.","Quanto menor a pressão sobre a renda, maior sua margem para decidir sem depender do próximo recebimento."],
    compromissos:["Compromissos","Compara recorrentes, cartões e dívidas já previstos com sua renda do mês.","Se crescer demais, o Orion recomenda revisar primeiro o que é contratual ou recorrente."],
    reserva:["Reserva","Representa o avanço da sua reserva de emergência em relação à meta definida.","A reserva reduz a fragilidade financeira e evita que imprevistos disputem espaço com decisões futuras."],
    recomendacao:["Recomendação da Saúde","É a ação de maior impacto sugerida a partir do seu mês atual.","O Orion informa; a decisão continua sendo sua."],
    radar:["Radar Orion","Transforma movimentações em indícios de comportamento, como concentração de gastos e dias de pico.","Não é julgamento. É uma lente para você perceber padrões antes que se repitam."]
  }; return lookup[type]||lookup.radar;
}
function openInsight(type,title="") {const [name,what,why]=buildInsight(type);$("insightDialogContent").innerHTML=`<div class="detail-hero"><small class="eyebrow">LEITURA ORION</small><h2>${escapeHTML(title||name)}</h2></div><div class="info-panel"><strong>O que significa</strong><p>${escapeHTML(what)}</p></div><div class="info-panel"><strong>Como usar</strong><p>${escapeHTML(why)}</p></div>`;openDialog($("insightDialog"));}
async function renderGame(){
  const [transactions,debts,reserve,recurring,eventSummary]=await Promise.all([getAll("transacoes"),getDebts(),getEmergencyFund(),getRecurringExpenses(),getEventSummary()]);
  const game=await getGameState({transactions,debts,reserve,recurring,eventsFinancial:eventSummary.states});
  $("levelEmblem").textContent=game.current.level;$("levelTitle").textContent=`Nível ${game.current.level} · ${game.current.title}`;$("levelXP").textContent=`${game.xp} XP`;$("xpBar").style.width=`${game.progress}%`;$("xpNext").textContent=game.next?`${Math.max(0,game.next.xp-game.xp)} XP para ${game.next.title}`:"Nível máximo atual";
  $("achievementGrid").innerHTML=game.achievements.map((a,i)=>`<button type="button" class="achievement ${a.unlocked?"":"locked"}" data-achievement-index="${i}"><span class="tier ${a.tier}">${a.unlocked?a.tier:"bloqueado"}</span><span class="achievement-icon">${a.unlocked?a.icon:"🔒"}</span><strong>${escapeHTML(a.name)}</strong><p>${escapeHTML(a.description)}</p></button>`).join("");
  $("medalGrid").innerHTML=game.medals.map((m,i)=>`<button type="button" class="medal-card" data-medal-index="${i}" data-tier="${m.tier}"><div class="medal-gem" role="img" aria-label="Medalha ${m.tier}"></div><strong>${escapeHTML(m.name)}</strong><p>${m.value} atual${m.next?` · próximo em ${m.next}`:" · máximo atual"}</p></button>`).join("");
  document.querySelectorAll("[data-achievement-index]").forEach(btn=>btn.onclick=()=>{const a=game.achievements[Number(btn.dataset.achievementIndex)];$("achievementDialogContent").innerHTML=`<div class="achievement-detail-symbol">${a.unlocked?a.icon:"🔒"}</div><small class="eyebrow">${a.unlocked?"CONQUISTADO":"EM PROGRESSO"}</small><h2>${escapeHTML(a.name)}</h2><p>${escapeHTML(a.description)}</p><div class="info-panel"><strong>Progresso</strong><p>${Math.min(a.value,a.target)} de ${a.target}${a.unlocked?" · mérito alcançado":""}</p></div><div class="info-panel"><strong>Data</strong><p>${a.unlocked_at?dateBR(String(a.unlocked_at).slice(0,10)):a.unlocked?"Reconhecido pelo histórico atual":"Será registrada quando o mérito for alcançado."}</p></div>`;openDialog($("achievementDialog"));});
  document.querySelectorAll("[data-medal-index]").forEach(btn=>btn.onclick=()=>{const m=game.medals[Number(btn.dataset.medalIndex)];$("achievementDialogContent").innerHTML=`<div class="medal-gem detail-medal" data-tier="${m.tier}"></div><small class="eyebrow">MEDALHA EVOLUTIVA</small><h2>${escapeHTML(m.name)}</h2><p>Seu progresso atual é ${m.value}.${m.next?` O próximo patamar chega em ${m.next}.`:" Você alcançou o patamar máximo atual."}</p><div class="info-panel"><strong>Leitura positiva</strong><p>Cada marco representa comportamento repetido, não perfeição. Continue alimentando o mapa.</p></div>`;openDialog($("achievementDialog"));});
  $("xpHistory").innerHTML=game.events.length?game.events.map(e=>`<article class="xp-event"><span>✦</span><div><strong>${escapeHTML(e.descricao||e.tipo)}</strong><small>${dateBR(e.criado_em)}</small></div><b>+${Number(e.xp||0)} XP</b></article>`).join(""):`<div class="xp-event"><span>✦</span><div><strong>Histórico reconhecido</strong><small>XP calculado pelas movimentações já conciliadas.</small></div><b>${game.xp} XP</b></div>`;
}
$("grossSalaryInput")?.addEventListener("input",updateInvestmentSuggestion);
$("reserveMonthsInput")?.addEventListener("input",updateInvestmentSuggestion);
$("investmentSetupForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    const {gross,months,target}=updateInvestmentSuggestion();
    if(!(gross>0)) throw new Error("Informe um salário bruto maior que zero.");
    if(!(months>=1&&months<=24)) throw new Error("Escolha entre 1 e 24 meses de reserva.");
    if(!(target>0) || !Number.isFinite(target)) throw new Error("Não foi possível calcular uma meta válida.");
    saveSettings({grossSalary:gross,reserveMonths:months,investmentSetupComplete:true});
    const goal=await getEmergencyFund();
    if($("applyReserveSuggestion")?.checked){
      await saveEmergencyFund({nome:goal?.nome||"Reserva de emergência",valor_alvo:target,valor_atual:Number(goal?.valor_atual||0)});
    }
    $("investmentsView")?.classList.remove("investment-setup-locked");
    const panel=$("investmentSetupPanel");
    panel?.classList.add("hidden");
    panel?.setAttribute("aria-hidden","true");
    await render();
    showToast("Base de segurança atualizada.");
  }catch(error){
    showToast(error.message||"Não foi possível salvar sua base.");
  }
});
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
    const [transactions,debts,reserve]=await Promise.all([getAll("transacoes"),getDebts(),getEmergencyFund()]);
    const game=await getGameState({transactions,debts,reserve});
    const bonusEvents=(await getAll("eventos_xp")).filter(e=>e.tipo!=="registro");
    const bonusXP=bonusEvents.reduce((s,e)=>s+Number(e.xp||0),0);
    box.textContent=`App ${d.app} · Estrutura ${d.schema}
${d.online?"Online":"Offline"} · Pendências locais: ${d.pending}
Última sincronização: ${d.lastSync||"ainda não registrada"}

Transações: ${c.transacoes}
Transferências: ${c.transferencias}
Contas: ${c.contas}
Recorrentes: ${c.despesas_recorrentes}

XP calculado: ${game.xp}
XP das movimentações: ${transactions.length*10}
XP extra: ${bonusXP}
Eventos extras: ${bonusEvents.length}
Nível: ${game.current.level} · ${game.current.title}`;
    box.classList.remove("hidden");
  }catch(e){box.textContent="Falha no diagnóstico: "+e.message;box.classList.remove("hidden")}
});

$("cajuConfirmBtn").addEventListener("click",async()=>{try{await registerCajuMonthlyCredit();$("cajuBanner").classList.add("hidden");await render();showToast("R$ 400 da Caju registrados.")}catch(e){showToast(e.message)}});
$("transferForm").addEventListener("submit",async e=>{e.preventDefault();try{await createTransfer({origem_conta_id:$("transferFrom").value,destino_conta_id:$("transferTo").value,valor:numberFromInput($("transferValue").value),data:$("transferDate").value,observacao:$("transferNote").value});e.target.reset();closeDialog($("transferDialog"));await render();showToast("Transferência registrada sem contar como renda ou gasto.")}catch(err){showToast(err.message)}});
$("newProfileBtn")?.addEventListener("click",()=>$("newProfileForm")?.classList.toggle("hidden"));
$("saveNewProfileBtn")?.addEventListener("click",async()=>{try{const name=$("newProfileName").value.trim();if(!name)throw new Error("Informe o nome do perfil.");await createProfile({nome:name,tipo:$("newProfileType").value,subtitulo:$("newProfileSubtitle").value||"Construção financeira"});$("newProfileName").value="";$("newProfileSubtitle").value="";$("newProfileForm").classList.add("hidden");await renderProfilesManager();await render();showToast("Perfil criado.");}catch(e){showToast(e.message)}});
$("contributionForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const id=$("contributionProfileId").value,accountId=$("contributionProfileId").dataset.accountId;await createAllocationMovement({perfil_id:id,conta_id:accountId,valor:numberFromInput($("contributionValue").value),data:todayISO(),tipo:"aporte",finalidade:"futuro",descricao:`Aporte · ${$("contributionProfileName").textContent}`});closeDialog($("contributionDialog"));await render();await showReward("aporte");}catch(err){showToast(err.message)}});
bindCentsInput($("contributionValue"));
document.querySelectorAll("[data-open-profile]").forEach(btn=>btn.addEventListener("click",openProfileCenter));
document.querySelectorAll("[data-open-premium]").forEach(btn=>btn.addEventListener("click",openPremiumCenter));
$("profileSaveBtn")?.addEventListener("click",()=>{const next=saveSettings({profileName:$("profileNameInput").value});applyProfilePlanUI();$("profileCenterName").textContent=next.profileName;$("profileCenterAvatar").textContent=next.profileName.slice(0,1).toUpperCase();closeDialog($("profileDialog"));showToast("Perfil local atualizado.");});
$("profileOpenPreferences")?.addEventListener("click",()=>{closeDialog($("profileDialog"));const s=getSettings();if($("localProfileName"))$("localProfileName").value=s.profileName||"João";setTimeout(()=>openDialog($("preferencesDialog")),0);});
$("activatePremiumBtn")?.addEventListener("click",async()=>{saveSettings({plan:"premium"});applyProfilePlanUI();await renderPremiumCenter();showToast("Premium ativado localmente.");});
$("deactivatePremiumBtn")?.addEventListener("click",async()=>{saveSettings({plan:"free"});applyProfilePlanUI();await renderPremiumCenter();showToast("Plano Free restaurado neste dispositivo.");});
$("premiumScenarioBtn")?.addEventListener("click",async()=>{const s=__premiumSnapshot||await loadPremiumSnapshot(),r=simulatePremiumScenario(s,numberFromInput($("premiumScenarioAmount").value));$("premiumScenarioResult").innerHTML=`<strong>${escapeHTML(r.status)}</strong><span>Dinheiro livre projetado: ${money(r.projectedFree)} · impacto ${pct(r.impactPct)}</span>`;});
$("premiumReportBtn")?.addEventListener("click",downloadPremiumReport);
document.querySelectorAll("[data-settings]").forEach(btn=>btn.addEventListener("click",()=>{const page=btn.dataset.settings;if(page==="api"){$("tokenInput").value=getApiToken();openDialog($("tokenDialog"));return}const settings=getSettings();if(page==="appearance"){$("themeSelect").value=settings.theme;$("animationsToggle").checked=settings.animations;renderBrandPicker(settings);}if(page==="preferences"&&$("localProfileName"))$("localProfileName").value=settings.profileName||"João";openDialog(document.getElementById(page+"Dialog"))}));
document.querySelectorAll("[data-brand-option]").forEach(btn=>btn.addEventListener("click",()=>{const style=btn.dataset.brandOption;const theme=style==="visionario"?"light":"dark";const next=saveSettings({brandStyle:style,theme});applyBrand(next.brandStyle);if($("themeSelect"))$("themeSelect").value=next.theme;renderBrandPicker(next);showToast("Identidade visual atualizada.");}));
$("themeSelect").addEventListener("change",()=>saveSettings({theme:$("themeSelect").value}));$("animationsToggle").addEventListener("change",()=>saveSettings({animations:$("animationsToggle").checked}));$("hideValuesToggle").addEventListener("change",()=>saveSettings({hideValues:$("hideValuesToggle").checked}));$("localProfileName")?.addEventListener("change",()=>{saveSettings({profileName:$("localProfileName").value});applyProfilePlanUI();});$("syncSettingsBtn").addEventListener("click",performSync);


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


bindInstitutionStatementDismiss();
window.addEventListener("online", checkStartupSync);
window.addEventListener("offline", () => showToast("Você está offline."));

async function ensureFrontendBuild(){
  try{
    localStorage.setItem("orion_front_build",APP_VERSION);
    if("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
      const registration=await navigator.serviceWorker.register("./service-worker.js?v=0141",{scope:"./"});
      registration.update().catch(()=>{});
    }
  }catch(e){console.warn("Atualização do frontend",BUILD_ID,e);}
}
await ensureFrontendBuild();

let __orionBootDone = false;
async function bootstrap(retry = 0){
  try{
    await ensureProfiles(getSettings().profileName||"João");
    await render();
    __orionBootDone = true;
    void checkStartupSync();
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
