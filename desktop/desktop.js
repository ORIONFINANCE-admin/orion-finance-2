import { setApiToken, getApiToken, setDeviceType } from "../core/config.js";
import { getRecurringExpenses, saveRecurringExpense, setRecurringStatus, markRecurringRegistered, recurringFrequencyLabel, recurringDueState } from "../core/recurring.js";
import { buildDiagnostics } from "../core/diagnostics.js";
import { getMonthlyCommitments } from "../core/commitments.js";
import { buildInstitutionCards, renderInstitutionCard } from "../core/dashboard-groups.js";
import { getAll, getMeta, clearUserData } from "../core/db.js";
import { syncNow, getSyncStatus, downloadAll, fetchInvestment, resetRemoteData, getSpreadsheetExportURL } from "../core/sync.js";
import { calculateDashboard, recentTransactions } from "../core/finance.js";
import { createAccount, createTransaction, randomPhrase, createDebt, payDebt, getDebts, addRadarTicker, getRadar, createTransfer, updateAccountDashboardVisibility } from "../core/orion.js";
import { money, dateBR, escapeHTML, numberFromInput, todayISO } from "../core/utils.js";
import { extractIndicators, scoreInvestment } from "../core/investments.js";
import { getEmergencyFund, saveEmergencyFund, emergencyProgress } from "../core/goals.js";
import { getSettings, saveSettings, applySettings, bindSystemTheme } from "../core/settings.js";
import { getGameState } from "../core/game.js";
import { getEventSummary, getEvent, eventFinancialState, saveEvent, reserveForEvent, completeEvent, cancelEvent, daysUntil, reserveSuggestion, createICS } from "../core/events.js";
import { ensureCajuStructure, getCajuMonthlySuggestion, registerCajuMonthlyCredit } from "../core/caju.js";
import { buildPremiumSnapshot, simulatePremiumScenario, buildExecutiveReport } from "../core/premium.js";
import { ensureExpandedIncomeCategories } from "../core/categories.js";

const APP_VERSION="0.13.0";
const BUILD_ID="2026-08-18.1246";
const BRAND_STYLES = new Set(["radar-visionario","monograma-radar","visionario","minimal"]);
function normalizeBrandStyle(value){return BRAND_STYLES.has(value)?value:"radar-visionario";}
function brandMarkSVG(style="radar-visionario"){
 const v=normalizeBrandStyle(style);
 return `<img class="orion-brand-image brand-image-${v}" src="../assets/icon-192.png" alt="" aria-hidden="true">`;
}
function applyBrand(style){const v=normalizeBrandStyle(style);document.documentElement.dataset.brand=v;document.querySelectorAll("[data-brand-mark]").forEach(n=>n.innerHTML=brandMarkSVG(v));document.querySelectorAll("[data-brand-option]").forEach(n=>n.classList.toggle("active",n.dataset.brandOption===v));return v;}
function renderBrandPicker(settings=getSettings()){const current=normalizeBrandStyle(settings?.brandStyle);document.querySelectorAll("[data-brand-option]").forEach(btn=>{const active=btn.dataset.brandOption===current;btn.classList.toggle("active",active);btn.setAttribute("aria-pressed",active?"true":"false");});document.querySelectorAll("[data-brand-preview]").forEach(node=>{node.innerHTML=brandMarkSVG(node.dataset.brandPreview||current);});}


function applyLocalProfile(name){const n=String(name||"João").trim()||"João";document.querySelectorAll(".sidebar-profile-card strong,.local-profile-row strong").forEach(el=>el.textContent=n);document.querySelectorAll(".profile-avatar").forEach(el=>el.textContent=n.slice(0,1).toUpperCase());const h=$("desktopViewTitle");if(h&&document.querySelector(".side-btn.active")?.dataset.view==="dashboardView")h.textContent=`Olá, ${n}`;}
setDeviceType("desktop");
const initialSettings=applySettings();
applyBrand(initialSettings.brandStyle);
bindSystemTheme();
const $ = id => document.getElementById(id);
applyLocalProfile(initialSettings.profileName);

let __premiumSnapshot=null;
function pct(value){return `${Number(value||0).toFixed(1).replace(".",",")}%`;}
function applyPlanUI(){const s=getSettings(),premium=s.plan==="premium";document.querySelectorAll(".desktop-plan-chip").forEach(el=>{el.textContent=premium?"✦ Premium":"✦ Free";el.dataset.plan=s.plan;});document.querySelectorAll(".sidebar-plan-card strong").forEach(el=>el.textContent=premium?"Modo Premium":"Modo Free");document.querySelectorAll(".sidebar-plan-card small").forEach(el=>el.textContent=premium?"Leitura avançada ativa neste computador.":"Comparativos, cenários e relatório avançado.");document.querySelectorAll(".premium-teaser h2").forEach(el=>el.textContent=premium?"Premium ativo":"Leitura avançada");document.querySelectorAll(".premium-teaser p").forEach(el=>el.textContent=premium?"Comparativos, cenários e relatório executivo estão liberados neste computador.":"Comparativos, cenários e relatório executivo sem bloquear o essencial do Orion.");}
async function openProfileCenter(){if($("settingsDialog")?.open)$("settingsDialog").close();const s=getSettings(),name=s.profileName||"João";$("profileCenterName").textContent=name;$("profileCenterAvatar").textContent=name.slice(0,1).toUpperCase();$("profileCenterPlan").textContent=s.plan==="premium"?"Premium":"Free";$("profileNameInput").value=name;try{const st=await getSyncStatus();$("profileCenterSync").textContent=!st?.connected?"Não conectada":st?.online===false?"Offline":"Conectada";}catch{$("profileCenterSync").textContent="Manual";}$("profileDialog").showModal();}
async function loadPremiumSnapshot(){const [transactions,categories,dashboard,commitments,eventSummary,reserve,debts]=await Promise.all([getAll("transacoes"),getAll("categorias"),calculateDashboard(),getMonthlyCommitments(),getEventSummary(),getEmergencyFund(),getDebts()]);return __premiumSnapshot=buildPremiumSnapshot({transactions,categories,dashboard,commitments,eventSummary,reserve,debts});}
async function renderPremiumCenter(){const active=getSettings().plan==="premium";$("premiumCurrentPlan").textContent=`Plano atual · ${active?"Premium":"Free"}`;$("premiumLockedPanel").classList.toggle("hidden",active);$("premiumActivePanel").classList.toggle("hidden",!active);if(!active)return null;const s=await loadPremiumSnapshot();$("premiumScore").textContent=`${s.score}/100`;$("premiumPressure").textContent=`Pressão ${String(s.pressure).toLowerCase()}`;$("premiumSpend30").textContent=money(s.spend30);$("premiumTrend").textContent=`${s.trendPct>0?"+":""}${pct(s.trendPct)} vs. 30 dias anteriores`;$("premiumDaily").textContent=money(s.avgDaily);$("premiumTopCategory").textContent=s.topCategoryName;$("premiumTopShare").textContent=`${pct(s.topCategoryShare)} das saídas em 90 dias`;$("premiumFreeMoney").textContent=money(s.freeMoney);$("premiumCommitmentRatio").textContent=pct(s.commitmentRatio);$("premiumReservePct").textContent=pct(s.reservePct);$("premiumEventsPct").textContent=pct(s.eventCoverage);$("premiumDebtOpen").textContent=money(s.debtOpen);return s;}
async function openPremiumCenter(){if($("settingsDialog")?.open)$("settingsDialog").close();if($("profileDialog")?.open)$("profileDialog").close();await renderPremiumCenter();$("premiumDialog").showModal();}
function downloadPremiumReport(){if(!__premiumSnapshot)return toast("Abra o Premium novamente para atualizar os dados.");const report=buildExecutiveReport(__premiumSnapshot,getSettings().profileName||"João"),blob=new Blob([report],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`Orion_Premium_${todayISO()}.txt`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);toast("Relatório Premium preparado.");}
applyPlanUI();

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
function bindDialogScrollLock(){
  document.querySelectorAll("dialog").forEach(dialog=>{
    dialog.addEventListener("close",()=>{
      const anyOpen=[...document.querySelectorAll("dialog")].some(d=>d.open);
      if(!anyOpen) unlockPageScroll();
    });
    dialog.addEventListener("cancel",()=>{
      setTimeout(()=>{
        const anyOpen=[...document.querySelectorAll("dialog")].some(d=>d.open);
        if(!anyOpen) unlockPageScroll();
      },0);
    });
  });

  const originalShowModal = HTMLDialogElement.prototype.showModal;
  if(!HTMLDialogElement.prototype.__orionPatched){
    HTMLDialogElement.prototype.showModal = function(){
      lockPageScroll();
      return originalShowModal.call(this);
    };
    HTMLDialogElement.prototype.__orionPatched = true;
  }
}
bindDialogScrollLock();

let movementType = "saida";
let movementMode = "saida";
let currentRecurringId = "";

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

function movementMethodLabel(value){
  const v=String(value||"");
  if(v==="rendimento_juros") return "Rendimento / Juros";
  const labels={pix:"Pix",debito:"Débito",credito:"Crédito",dinheiro:"Dinheiro",boleto:"Boleto",outro:"Outro"};
  return labels[v]||v;
}
function renderMovementList(items) {
  if (!items.length) return `<div class="empty">Nenhuma movimentação registrada.</div>`;
  return items.map(t => `<div class="movement">
    <div><strong>${escapeHTML(t.descricao)}</strong><br><small>${escapeHTML(movementMethodLabel(t.forma_pagamento))}</small></div>
    <small>${dateBR(t.data)}</small>
    <span class="value ${t.tipo === "entrada" ? "amount-positive" : "amount-negative"}">
      ${t.tipo === "entrada" ? "+" : "-"} ${money(t.valor)}
    </span>
  </div>`).join("");
}


let __accountProfileInstitutionId="";
let __accountProfileInstitutionName="";
function accountProfileDateRange(items){
  const dates=items.map(t=>String(t.data||"").slice(0,10)).filter(Boolean).sort();
  return {start:dates[0]||"",end:dates.at(-1)||""};
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
  $("accountProfileType").textContent=institutionAccounts.map(a=>a.nome||a.tipo).filter(Boolean).slice(0,2).join(" · ")||"Conta financeira";
  $("accountProfileMark").textContent=String(__accountProfileInstitutionName||"O").slice(0,1).toUpperCase();
  $("accountProfileMark").style.background=institution.cor_primaria||"var(--orion-brand-accent)";
  $("accountProfileBalance").textContent=money(summary.total||0);
  $("accountProfileMetrics").innerHTML=`<div><small>Entradas</small><strong class="amount-positive">${money(entries)}</strong></div><div><small>Saídas</small><strong class="amount-negative">${money(exits)}</strong></div><div><small>Resultado</small><strong>${money(entries-exits)}</strong></div><div><small>Movimentos</small><strong>${filtered.length}</strong></div>`;
  $("accountProfileMovements").innerHTML=filtered.length?filtered.slice(0,20).map(t=>`<article><span class="movement-dot ${t.tipo}">${t.tipo==="entrada"?"↑":"↓"}</span><div><strong>${escapeHTML(t.descricao||"Movimento")}</strong><small>${dateBR(t.data)} · ${escapeHTML(movementMethodLabel(t.forma_pagamento))}</small></div><b class="${t.tipo==="entrada"?"amount-positive":"amount-negative"}">${t.tipo==="entrada"?"+":"-"} ${money(t.valor)}</b></article>`).join(""):`<div class="empty">Nenhuma movimentação neste período.</div>`;
}
async function openAccountProfile(institutionId,institutionName){
  __accountProfileInstitutionId=String(institutionId||""); __accountProfileInstitutionName=String(institutionName||"");
  const accounts=await getAll("contas"),transactions=await getAll("transacoes"); const directAccountId=__accountProfileInstitutionId.startsWith("account:")?__accountProfileInstitutionId.slice(8):""; const ids=new Set(accounts.filter(a=>directAccountId?String(a.conta_id||"")===directAccountId:String(a.instituicao_id||"")===__accountProfileInstitutionId).map(a=>String(a.conta_id||"")));
  const range=accountProfileDateRange(transactions.filter(t=>ids.has(String(t.conta_id||""))));
  if($("accountProfileStart"))$("accountProfileStart").value=range.start; if($("accountProfileEnd"))$("accountProfileEnd").value=range.end;
  await renderAccountProfile(); $("accountProfileDialog").showModal();
}

let __statementInstitutionId = "";
let __statementInstitutionName = "";
let __statementStartDate = "";
let __statementEndDate = "";
let __statementSuppressOpenUntil = 0;

function normalizeStatementRange(start,end){
  if(start && end && start > end) return [end,start];
  return [start||"", end||""];
}
function filterTransactionsByRange(items,start,end){
  const [from,to]=normalizeStatementRange(start,end);
  return items.filter(t=>{
    const date=String(t.data||"").slice(0,10);
    if(from && date < from) return false;
    if(to && date > to) return false;
    return true;
  });
}
function syncStatementFilterInputs(){
  const start=$("institutionStatementStart"), end=$("institutionStatementEnd");
  if(start) start.value=__statementStartDate;
  if(end) end.value=__statementEndDate;
}
function closeInstitutionStatement(event){
  if(event){ event.preventDefault?.(); event.stopPropagation?.(); }
  const overlay=$("institutionStatementOverlay");
  if(!overlay) return;
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden","true");
  __statementInstitutionId="";
  __statementInstitutionName="";
  __statementSuppressOpenUntil = Date.now() + 260;
}
async function renderInstitutionStatement(){
  if(!__statementInstitutionId) return;
  const [accounts,transactions,institutions,cards]=await Promise.all([getAll("contas"),getAll("transacoes"),getAll("instituicoes"),getAll("cartoes_credito")]);
  const institutionAccounts=accounts.filter(a=>String(a.instituicao_id||"")===String(__statementInstitutionId||""));
  const accountIds=new Set(institutionAccounts.map(a=>String(a.conta_id||"")));
  const baseTransactions=transactions.filter(t=>accountIds.has(String(t.conta_id||"")));
  const filtered=filterTransactionsByRange(baseTransactions,__statementStartDate,__statementEndDate).sort((a,b)=>`${b.data||""}|${b.criado_em||""}`.localeCompare(`${a.data||""}|${a.criado_em||""}`));
  const grouped=buildInstitutionCards({accounts:institutionAccounts,institutions,cards:cards.filter(c=>String(c.instituicao_id||"")===String(__statementInstitutionId||""))});
  const summaryCard=grouped[0],entries=filtered.filter(t=>t.tipo==="entrada").reduce((s,t)=>s+Number(t.valor||0),0),exits=filtered.filter(t=>t.tipo==="saida").reduce((s,t)=>s+Number(t.valor||0),0);
  const periodText = __statementStartDate || __statementEndDate ? ` · ${__statementStartDate?dateBR(__statementStartDate):"início"} até ${__statementEndDate?dateBR(__statementEndDate):"hoje"}` : "";
  $("institutionStatementTitle").textContent=__statementInstitutionName||summaryCard?.name||"Instituição";
  $("institutionStatementSubtitle").textContent=`${filtered.length} movimenta${filtered.length===1?"ção":"ções"} encontradas${periodText}`;
  $("institutionStatementSummary").innerHTML=`<div><small>Saldo atual</small><strong>${money(summaryCard?.total||0)}</strong></div><div><small>Entradas</small><strong class="amount-positive">${money(entries)}</strong></div><div><small>Saídas</small><strong class="amount-negative">${money(exits)}</strong></div><div><small>Registros</small><strong>${filtered.length}</strong></div>`;
  $("institutionStatementMovements").innerHTML=filtered.length?renderMovementList(filtered):`<div class="empty">Nenhuma movimentação encontrada para este período.</div>`;
  syncStatementFilterInputs();
}
async function openInstitutionStatement(institutionId,institutionName,preserveFilters=false){
  if(Date.now() < __statementSuppressOpenUntil) return;
  __statementInstitutionId=String(institutionId||"");
  __statementInstitutionName=institutionName||"Instituição";
  if(!preserveFilters){ __statementStartDate=""; __statementEndDate=""; }
  await renderInstitutionStatement();
  const overlay=$("institutionStatementOverlay");
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden","false");
}
function applyInstitutionStatementRange(){
  const start=$("institutionStatementStart")?.value||"";
  const end=$("institutionStatementEnd")?.value||"";
  [__statementStartDate,__statementEndDate]=normalizeStatementRange(start,end);
  renderInstitutionStatement();
}
function clearInstitutionStatementRange(){
  __statementStartDate="";
  __statementEndDate="";
  syncStatementFilterInputs();
  renderInstitutionStatement();
}
function bindInstitutionCards(){document.querySelectorAll(".institution-card-clickable[data-institution-id]").forEach(card=>{const open=()=>openInstitutionStatement(card.dataset.institutionId,card.dataset.institutionName,false);card.onclick=open;card.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}};});}
function bindInstitutionStatementDismiss(){
  $("institutionStatementClose")?.addEventListener("pointerdown",e=>closeInstitutionStatement(e),true);$("institutionStatementClose")?.addEventListener("click",e=>closeInstitutionStatement(e),true);
  $("institutionStatementApply")?.addEventListener("click",applyInstitutionStatementRange);
  $("institutionStatementClear")?.addEventListener("click",clearInstitutionStatementRange);
  $("institutionStatementStart")?.addEventListener("keydown",e=>{if(e.key==="Enter") applyInstitutionStatementRange();});
  $("institutionStatementEnd")?.addEventListener("keydown",e=>{if(e.key==="Enter") applyInstitutionStatementRange();});
  $("institutionStatementOverlay")?.addEventListener("pointerdown",e=>{ if(e.target===e.currentTarget) closeInstitutionStatement(e); },true);
  $("institutionStatementOverlay")?.querySelector(".institution-statement-card")?.addEventListener("click",e=>e.stopPropagation());
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&__statementInstitutionId)closeInstitutionStatement(e);});
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

  const eventsForMovement=(await getEventSummary()).states.filter(s=>!["realizado","cancelado"].includes(s.event.status));
  if($("movementEvent")) $("movementEvent").innerHTML=`<option value="">Nenhum</option>`+eventsForMovement.map(s=>`<option value="${escapeHTML(s.event.evento_id)}">${escapeHTML(s.event.nome)}</option>`).join("");

  const cats = categories.filter(c => c.ativa !== false &&
    (c.tipo_permitido === movementType || c.tipo_permitido === "entrada_saida"));

  $("movementCategory").innerHTML = `<option value="">Selecione</option>` +
    cats.sort((a,b)=>Number(a.ordem||0)-Number(b.ordem||0)).map(c =>
      `<option value="${escapeHTML(c.categoria_id)}">${escapeHTML(c.nome)}</option>`
    ).join("");
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
    const isList = tipNode.tagName === "UL";
    if(isList){
      const visibleTips=tips.slice(0,2);
      tipNode.innerHTML=(visibleTips.map(item=>`<li><strong>${escapeHTML(item.title)}</strong> ${escapeHTML(item.text)}</li>`).join("")) || `<li><strong>Sem dados suficientes.</strong> Lance movimentações para receber recomendações.</li>`;
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
    const visibleClues=clues.slice(0,2);
    cluesNode.innerHTML=(visibleClues.map(item=>`<div class="radar-clue"><strong>${escapeHTML(item.title)}</strong>${escapeHTML(item.text)}</div>`).join("")) || `<div class="radar-clue"><strong>Sem indícios ainda</strong>Registre algumas movimentações para o Radar começar a perceber o seu ritmo.</div>`;
  }
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
    calculateDashboard(), recentTransactions(8), getAll("instituicoes"), getAll("cartoes_credito")
  ]);
  const imap = new Map(institutions.map(i => [i.instituicao_id, i]));

  $("saldoTotal").textContent = money(dashboard.saldoTotal);
  ["saldoTotal","entradasMes","saidasMes","resultadoMes","debtsTotal","reserveAmount"].forEach(id=>$(id)?.setAttribute("data-money",""));
  $("entradasMes").textContent = money(dashboard.entradasMes);
  $("saidasMes").textContent = money(dashboard.saidasMes);
  $("resultadoMes").textContent = money(dashboard.resultadoMes);

  let institutionCards = [];
  try {
    institutionCards = buildInstitutionCards({ accounts: dashboard.contas, institutions, cards });
    $("accountsGrid").innerHTML = institutionCards.length
      ? institutionCards.map(item => renderInstitutionCard(item, escapeHTML)).join("")
      : `<div class="empty">Nenhuma instituição com saldo ou compromisso ativo.</div>`;
  } catch (error) {
    console.error("Falha ao agrupar instituições", error);
    $("accountsGrid").innerHTML = dashboard.contas
      .filter(a => Math.abs(Number(a.saldo_calculado || 0)) >= 0.005)
      .map(a => `<article class="account-card"><div class="account-title">${escapeHTML(String(a.nome || "Conta"))}</div><div class="account-balance">${money(a.saldo_calculado)}</div></article>`)
      .join("") || `<div class="empty">Nenhuma conta com saldo ativo.</div>`;
  }

  bindInstitutionCards();
  $("recentList").innerHTML = renderMovementList(recent);
  const all = await getAll("transacoes");
  all.sort((a,b)=>`${b.data}|${b.criado_em}`.localeCompare(`${a.data}|${a.criado_em}`));
  $("allMovements").innerHTML = renderMovementList(all);
  document.querySelectorAll("[data-transfer-from]").forEach(b=>b.onclick=e=>{e.stopPropagation();openTransfer(b.dataset.transferFrom)});
  await fillSelectors();
  try { await renderDebts(); } catch (e) { console.error("Falha ao renderizar dívidas", e); }
  try { await renderRadar(); } catch (e) { console.error("Falha ao renderizar radar de investimentos", e); }
  try { await renderEmergencyFund(); } catch (e) { console.error("Falha ao renderizar reserva", e); }
  try { await setupCaju(); } catch (e) { console.error("Falha ao preparar Caju", e); }
  try { await renderRecurring(); } catch (e) { console.error("Falha ao renderizar recorrentes", e); $("recurringList").innerHTML = `<div class="empty">Não foi possível carregar as recorrentes.</div>`; }
  try { await renderCommitments(); } catch (e) { console.error("Falha ao renderizar compromissos", e); $("commitmentsSummary").innerHTML = `<div class="empty">Compromissos indisponíveis.</div>`; }
  try { await renderSyncMeta(); } catch (e) { console.error("Falha ao renderizar status de sincronização", e); }
  try { await renderHomeInsights(dashboard); } catch (e) { console.error("Falha ao renderizar inteligência da home", e); }
  try { await renderEvents(); } catch (e) { console.error("Falha ao renderizar Eventos", e); }
  try { await renderGame(); } catch (e) { console.error("Falha ao renderizar Evolução", e); }
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
  } catch (e) { toast(e.message || "Não foi possível concluir. Seus dados locais continuam salvos."); }
}


function openSyncLoading(message = "Atualizando sua base com segurança…") {
  const dialog = $("syncLoadingDialog");
  $("syncLoadingText").textContent = message;
  if (!dialog.open) dialog.showModal();
}
function updateSyncLoading(message) {
  $("syncLoadingText").textContent = message;
}
function closeSyncLoading() {
  const dialog = $("syncLoadingDialog");
  if (dialog.open) dialog.close();
}

async function sync() {
  openSyncLoading("Conectando ao Orion…");
  try {
    updateSyncLoading("Comparando sua base local com a nuvem…");

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

  } finally {
    closeSyncLoading();
  }
}

function openMovement() {
  movementMode="saida"; movementType="saida";
  document.querySelectorAll(".segment").forEach(b=>b.classList.toggle("active",b.dataset.type==="saida"));
  if($("movementPayment")){ $("movementPayment").disabled=false; $("movementPayment").value="debito"; }
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
$("settingsBtn").addEventListener("click", () => { $("settingsDialog").showModal(); });

document.querySelectorAll("[data-close]").forEach(btn =>
  btn.addEventListener("click", () => $(btn.dataset.close).close())
);

$("addEventBtn")?.addEventListener("click",()=>{resetDesktopEventForm();$("eventDialog").showModal();});$("desktopOpenEvents")?.addEventListener("click",()=>{document.querySelector('.side-btn[data-view="eventsView"]')?.click();});$("eventForm")?.addEventListener("submit",async e=>{e.preventDefault();await saveEvent({evento_id:$("eventId").value,nome:$("eventName").value,data:$("eventDate").value,horario:$("eventTime").value,local:$("eventLocation").value,prioridade:$("eventPriority").value,custo_estimado:numberFromInput($("eventCost").value),margem_percentual:numberFromInput($("eventMargin").value),observacao:$("eventNote").value});$("eventDialog").close();await render();});
document.querySelectorAll(".side-btn[data-view]").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".desktop-view").forEach(v => v.classList.add("hidden"));
    document.querySelectorAll(".side-btn[data-view]").forEach(b => b.classList.remove("active"));
    $(btn.dataset.view).classList.remove("hidden");
    btn.classList.add("active");
    const titles={dashboardView:`Olá, ${getSettings().profileName||"João"}`,movementsView:"Movimentações",recurringView:"Recorrentes",debtsView:"Dívidas",eventsView:"Eventos",investmentsView:"Investimentos",evolutionView:"Evolução"};if($("desktopViewTitle"))$("desktopViewTitle").textContent=titles[btn.dataset.view]||"Orion Finance";
    if(btn.dataset.view==="investmentsView") await ensureInvestmentSetup();
  });
});

document.querySelectorAll(".segment").forEach(btn => {
  btn.addEventListener("click", async () => {
    movementMode = btn.dataset.type || "saida";
    movementType = movementMode === "rendimento" ? "entrada" : movementMode;
    document.querySelectorAll(".segment").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    await fillSelectors();
    const payment=$("movementPayment");
    if(payment){
      if(movementMode === "rendimento"){ payment.value="rendimento_juros"; payment.disabled=true; }
      else { payment.disabled=false; if(payment.value==="rendimento_juros") payment.value=movementMode==="entrada"?"pix":"debito"; }
    }
    if(movementMode === "rendimento" && $("movementDescription") && !$("movementDescription").value) $("movementDescription").placeholder="Ex.: Rendimento Reserva Mercado Pago";
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
    const movementValue = numberFromInput($("movementValue").value);
    await createTransaction({
      tipo: movementType,
      valor: movementValue,
      descricao: $("movementDescription").value,
      categoria_id: $("movementCategory").value,
      conta_id: $("movementAccount").value,
      forma_pagamento: movementMode === "rendimento" ? "rendimento_juros" : $("movementPayment").value,
      data: $("movementDate").value,
      evento_id: $("movementEvent")?.value||"",
      observacao: $("movementNote").value
    });
    if(currentRecurringId){await markRecurringRegistered(currentRecurringId,movementValue,$("movementDate").value);currentRecurringId="";}
    e.target.reset();
    movementMode="saida"; movementType="saida";
    document.querySelectorAll(".segment").forEach(b=>b.classList.toggle("active",b.dataset.type==="saida"));
    if($("movementPayment")){ $("movementPayment").disabled=false; $("movementPayment").value="debito"; }
    $("movementDate").value = todayISO();
    $("movementDialog").close();
    await render();
    await reward(movementType === "entrada" ? "entrada" : "saida");
  } catch (err) { toast(err.message); }
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
  if(!force && settings.investmentSetupComplete && Number(settings.grossSalary||0)>0){
    $("investmentsView")?.classList.remove("investment-setup-locked");
    return false;
  }
  $("investmentsView")?.classList.add("investment-setup-locked");
  if($("grossSalaryInput")) $("grossSalaryInput").value=Number(settings.grossSalary||0)>0?Number(settings.grossSalary).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}):"";
  if($("reserveMonthsInput")) $("reserveMonthsInput").value=reserveMonthsValue();
  if($("applyReserveSuggestion")) $("applyReserveSuggestion").checked=force?false:!(goal&&Number(goal.valor_alvo||0)>0);
  updateInvestmentSuggestion();
  const dialog=$("investmentSetupDialog");
  if(dialog){
    if(typeof openDialog==="function") openDialog(dialog); else if(!dialog.open) dialog.showModal();
  }
  return true;
}
async function ensureInvestmentSetup(){
  try{return await openInvestmentSetup({force:false});}
  catch(error){console.error("Falha no onboarding de investimentos",error); return false;}
}
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



async function setupCaju(){await ensureCajuStructure();const suggestion=await getCajuMonthlySuggestion();$("cajuBanner").classList.toggle("hidden",!suggestion)}
async function fillTransferSelectors(preferredFrom=""){const accounts=(await getAll("contas")).filter(a=>a.status!=="inativo"),opts=accounts.map(a=>`<option value="${escapeHTML(a.conta_id)}">${escapeHTML(a.nome)}</option>`).join("");$("transferFrom").innerHTML=`<option value="">Selecione</option>${opts}`;$("transferTo").innerHTML=`<option value="">Selecione</option>${opts}`;if(preferredFrom)$("transferFrom").value=preferredFrom}
async function openTransfer(preferredFrom=""){await fillTransferSelectors(preferredFrom);$("transferDate").value=todayISO();$("transferDialog").showModal()}

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
  $("recurringDialog").showModal();
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
  $("movementDialog").showModal();
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


let __desktopEventStates=[];
async function renderEvents(){
 const summary=await getEventSummary(); __desktopEventStates=summary.states;
 $("eventsReservedTotal")&&($("eventsReservedTotal").textContent=money(summary.reserved));$("eventsRemainingTotal")&&($("eventsRemainingTotal").textContent=money(summary.remaining));$("eventsCount")&&($("eventsCount").textContent=String(summary.count));
 const list=$("eventsList"); if(list) list.innerHTML=summary.states.length?summary.states.map(s=>`<article class="desktop-event-card" data-event-id="${escapeHTML(s.event.evento_id)}"><div><small>${dateBR(s.event.data)} · ${escapeHTML(s.event.prioridade||"média")}</small><strong>${escapeHTML(s.event.nome)}</strong><p>${escapeHTML(reserveSuggestion(s).text)}</p></div><div class="desktop-event-progress"><span style="width:${s.percent}%"></span></div><div class="desktop-event-values"><span>${money(s.reserved)} reservado</span><b>${money(s.remaining)} falta</b></div></article>`).join(""):`<div class="empty">Nenhum evento financeiro cadastrado.</div>`;
 document.querySelectorAll(".desktop-event-card[data-event-id]").forEach(c=>c.onclick=()=>openDesktopEventDetail(c.dataset.eventId));
 const home=$("desktopEventsHome"),slot=$("desktopEventsHomeSummary"); if(home&&slot){if(summary.count){home.classList.remove("hidden");const s=summary.states[0];slot.innerHTML=`<button class="desktop-event-home-row" data-event-id="${escapeHTML(s.event.evento_id)}"><div><strong>${escapeHTML(s.event.nome)}</strong><small>${dateBR(s.event.data)} · ${s.percent}% garantido</small></div><div><b>${money(s.remaining)}</b><small>ainda necessário</small></div></button>`;slot.firstElementChild.onclick=()=>openDesktopEventDetail(s.event.evento_id)}else home.classList.add("hidden")}
}
function resetDesktopEventForm(){$("eventForm")?.reset();$("eventId").value="";$("eventPriority").value="media";$("eventMargin").value="0";}
async function openDesktopEventDetail(id){const state=__desktopEventStates.find(s=>s.event.evento_id===id);const event=state?.event||await getEvent(id);if(!event)return;const full=state||{event,...await eventFinancialState(event)};$("eventDetailContent").innerHTML=`<small class="eyebrow">EVENTO FINANCEIRO</small><h2>${escapeHTML(event.nome)}</h2><p>${dateBR(event.data)}${event.local?` · ${escapeHTML(event.local)}`:""}</p><div class="desktop-event-summary"><div><small>Meta</small><strong>${money(full.target)}</strong></div><div><small>Reservado</small><strong>${money(full.reserved)}</strong></div><div><small>Restante</small><strong>${money(full.remaining)}</strong></div></div><p class="event-detail-copy">${escapeHTML(reserveSuggestion(full).text)}</p><div class="event-detail-actions"><button data-action="reserve">Reservar valor</button><button data-action="ics">Agenda (.ics)</button><button data-action="complete">Realizado</button><button data-action="cancel" class="danger-action">Cancelar</button></div>`;$("eventDetailDialog").showModal();$("eventDetailContent").querySelectorAll("[data-action]").forEach(btn=>btn.onclick=async()=>{const a=btn.dataset.action;if(a==="reserve"){const v=numberFromInput(prompt("Valor a reservar:"));if(v>0){await reserveForEvent(id,v);$("eventDetailDialog").close();await render();}}if(a==="ics"){const blob=new Blob([createICS(event,false,full)],{type:"text/calendar"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`${event.nome}.ics`;link.click();URL.revokeObjectURL(url)}if(a==="complete"){const v=numberFromInput(prompt("Gasto real:",String(full.target).replace('.',',')));await completeEvent(id,v);$("eventDetailDialog").close();await render();}if(a==="cancel"&&confirm("Cancelar evento?")){await cancelEvent(id);$("eventDetailDialog").close();await render();}})}
async function renderGame(){const[transactions,debts,reserve,recurring,eventSummary]=await Promise.all([getAll("transacoes"),getDebts(),getEmergencyFund(),getRecurringExpenses(),getEventSummary()]),game=await getGameState({transactions,debts,reserve,recurring,eventsFinancial:eventSummary.states});$("levelEmblem").textContent=game.current.level;$("levelTitle").textContent=`Nível ${game.current.level} · ${game.current.title}`;$("levelXP").textContent=`${game.xp} XP`;$("xpBar").style.width=`${game.progress}%`;$("xpNext").textContent=game.next?`${Math.max(0,game.next.xp-game.xp)} XP para ${game.next.title}`:"Nível máximo atual";$("achievementGrid").innerHTML=game.achievements.map(a=>`<article class="achievement ${a.unlocked?"":"locked"}"><span class="tier ${a.tier}">${a.unlocked?a.tier:"bloqueado"}</span><span class="achievement-icon">${a.unlocked?a.icon:"🔒"}</span><strong>${escapeHTML(a.name)}</strong><p>${escapeHTML(a.description)}</p><small>${a.unlocked_at?dateBR(String(a.unlocked_at).slice(0,10)):a.unlocked?"Histórico reconhecido":`Progresso ${Math.min(a.value,a.target)}/${a.target}`}</small></article>`).join("");$("medalGrid").innerHTML=game.medals.map(m=>`<article class="medal-card" data-tier="${m.tier}"><div class="medal-gem"></div><strong>${escapeHTML(m.name)}</strong><p>${m.value} atual${m.next?` · próximo em ${m.next}`:" · máximo atual"}</p></article>`).join("");$("xpHistory").innerHTML=game.events.length?game.events.map(e=>`<article class="xp-event"><span>✦</span><div><strong>${escapeHTML(e.descricao||e.tipo)}</strong><small>${dateBR(e.criado_em)}</small></div><b>+${Number(e.xp||0)} XP</b></article>`).join(""):`<div class="xp-event"><span>✦</span><div><strong>Histórico reconhecido</strong><small>XP calculado pelas movimentações já conciliadas.</small></div><b>${game.xp} XP</b></div>`;}
$("grossSalaryInput")?.addEventListener("input",updateInvestmentSuggestion);
$("reserveMonthsInput")?.addEventListener("input",updateInvestmentSuggestion);
$("investmentSetupDialog")?.addEventListener("cancel",e=>{ if(!getSettings().investmentSetupComplete) e.preventDefault(); });
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
    const dialog=$("investmentSetupDialog");
    if(dialog?.open){ if(typeof closeDialog==="function") closeDialog(dialog); else dialog.close(); }
    await render();
    toast("Base de segurança atualizada.");
  }catch(error){
    toast(error.message||"Não foi possível salvar sua base.");
  }
});
$("accountVisibilityBtn").addEventListener("click",async()=>{
  try{await renderAccountVisibility();$("accountVisibilityDialog").showModal();}
  catch(e){toast("Não foi possível abrir a visibilidade das contas.");}
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
    $("recurringDialog").close();
    await renderRecurring();
    toast("Despesa recorrente salva.");
  }catch(err){toast(err.message)}
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

$("cajuConfirmBtn").addEventListener("click",async()=>{try{await registerCajuMonthlyCredit();$("cajuBanner").classList.add("hidden");await render();toast("R$ 400 da Caju registrados.")}catch(e){toast(e.message)}});
$("transferForm").addEventListener("submit",async e=>{e.preventDefault();try{await createTransfer({origem_conta_id:$("transferFrom").value,destino_conta_id:$("transferTo").value,valor:numberFromInput($("transferValue").value),data:$("transferDate").value,observacao:$("transferNote").value});e.target.reset();$("transferDialog").close();await render();toast("Transferência registrada sem contar como renda ou gasto.")}catch(err){toast(err.message)}});
$("accountProfileApply")?.addEventListener("click",renderAccountProfile); $("accountProfileClear")?.addEventListener("click",async()=>{$("accountProfileStart").value="";$("accountProfileEnd").value="";await renderAccountProfile();});
document.querySelectorAll("[data-open-profile]").forEach(btn=>btn.addEventListener("click",openProfileCenter));
document.querySelectorAll("[data-open-premium]").forEach(btn=>btn.addEventListener("click",openPremiumCenter));
$("profileSaveBtn")?.addEventListener("click",()=>{const next=saveSettings({profileName:$("profileNameInput").value});applyLocalProfile(next.profileName);$("profileCenterName").textContent=next.profileName;$("profileCenterAvatar").textContent=next.profileName.slice(0,1).toUpperCase();$("profileDialog").close();toast("Perfil local atualizado.");});
$("profileOpenPreferences")?.addEventListener("click",()=>{$("profileDialog").close();const s=getSettings();if($("localProfileName"))$("localProfileName").value=s.profileName||"João";setTimeout(()=>$("preferencesDialog").showModal(),0);});
$("activatePremiumBtn")?.addEventListener("click",async()=>{saveSettings({plan:"premium"});applyPlanUI();await renderPremiumCenter();toast("Premium ativado localmente.");});
$("deactivatePremiumBtn")?.addEventListener("click",async()=>{saveSettings({plan:"free"});applyPlanUI();await renderPremiumCenter();toast("Plano Free restaurado neste computador.");});
$("premiumScenarioBtn")?.addEventListener("click",async()=>{const s=__premiumSnapshot||await loadPremiumSnapshot(),r=simulatePremiumScenario(s,numberFromInput($("premiumScenarioAmount").value));$("premiumScenarioResult").innerHTML=`<strong>${escapeHTML(r.status)}</strong><span>Dinheiro livre projetado: ${money(r.projectedFree)} · impacto ${pct(r.impactPct)}</span>`;});
$("premiumReportBtn")?.addEventListener("click",downloadPremiumReport);
document.querySelectorAll("[data-settings]").forEach(btn=>btn.addEventListener("click",()=>{const page=btn.dataset.settings;const settings=getSettings();if(page==="api"){$("settingsDialog").close();$("tokenInput").value=getApiToken();$("tokenDialog").showModal();return}if(page==="preferences"&&$("localProfileName"))$("localProfileName").value=settings.profileName||"João";$("settingsDialog").close();document.getElementById(page+"Dialog")?.showModal()}));
document.querySelectorAll("[data-brand-option]").forEach(btn=>btn.addEventListener("click",()=>{const style=btn.dataset.brandOption;const theme=style==="visionario"?"light":"dark";const next=saveSettings({brandStyle:style,theme});applyBrand(next.brandStyle);if($("themeSelect"))$("themeSelect").value=next.theme;renderBrandPicker(next);toast("Identidade visual atualizada.");}));
$("themeSelect").addEventListener("change",()=>saveSettings({theme:$("themeSelect").value}));$("animationsToggle").addEventListener("change",()=>saveSettings({animations:$("animationsToggle").checked}));$("hideValuesToggle").addEventListener("change",()=>saveSettings({hideValues:$("hideValuesToggle").checked}));$("localProfileName")?.addEventListener("change",()=>{const s=saveSettings({profileName:$("localProfileName").value});applyLocalProfile(s.profileName);});$("syncSettingsBtn").addEventListener("click",sync);


$("resetOrionBtn").addEventListener("click", () => {
  $("resetStatus").textContent = "";
  $("resetStatus").classList.add("hidden");
  $("confirmResetBtn").disabled = false;
  $("confirmResetBtn").textContent = "Sim, apagar tudo";
  $("dataDialog").close();
  $("resetDialog").showModal();
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
    $("resetDialog").close();
    toast("Orion zerado. Estrutura preservada.");
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
  $("dataDialog").close();
  $("exportDialog").showModal();
});

$("confirmExportBtn").addEventListener("click", async () => {
  $("confirmExportBtn").disabled = true;
  try {
    const data = await getSpreadsheetExportURL();
    $("exportDialog").close();
    window.open(data.url, "_blank", "noopener");
    toast("Exportação preparada.");
  } catch (err) {
    toast(err.message || "Não foi possível exportar a planilha.");
  } finally {
    $("confirmExportBtn").disabled = false;
  }
});


bindInstitutionStatementDismiss();
window.addEventListener("online", checkSync);
window.addEventListener("offline", () => toast("Offline. Orion continua funcionando localmente."));

async function bootstrapDesktop(){
  try{
    await render();
    await checkSync();
  }catch(error){
    console.error("Falha na inicialização desktop",error);
    toast("O Orion encontrou um bloqueio ao iniciar. Seus dados locais permanecem preservados.");
  }
}
await bootstrapDesktop();
