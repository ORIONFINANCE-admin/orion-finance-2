import { setApiToken, getApiToken, setDeviceType } from "../core/config.js";
import { getAll, clearUserData } from "../core/db.js";
import { syncNow, getSyncStatus, downloadAll, fetchInvestment, resetRemoteData, getSpreadsheetExportURL } from "../core/sync.js";
import { calculateDashboard, recentTransactions } from "../core/finance.js";
import { createAccount, createTransaction, randomPhrase, createDebt, payDebt, getDebts, addRadarTicker, getRadar, createTransfer } from "../core/orion.js";
import { money, dateBR, escapeHTML, numberFromInput, todayISO, debounce } from "../core/utils.js";
import { extractIndicators, scoreInvestment } from "../core/investments.js";
import { getEmergencyFund, saveEmergencyFund, emergencyProgress } from "../core/goals.js";
import { getSettings, saveSettings, applySettings, bindSystemTheme } from "../core/settings.js";
import { getGameState } from "../core/game.js";
import { suggestTransaction, enforceAccountRules } from "../core/smart-entry.js";
import { ensureCajuStructure, getCajuMonthlySuggestion, registerCajuMonthlyCredit } from "../core/caju.js";

setDeviceType("mobile");
applySettings();
bindSystemTheme();

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
  ["saldoTotal","entradasMes","saidasMes","resultadoMes","debtsTotal","reserveAmount"].forEach(id=>$(id)?.setAttribute("data-money",""));
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
  await renderGame();
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

$("settingsBtn").addEventListener("click", openSettings);
$("syncBannerBtn").addEventListener("click", performSync);
$("syncTopBtn").addEventListener("click", performSync);
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

    // iOS/PWA: remove o foco antes de fechar para devolver a interface
    // ao estado normal após a entrada do token.
    $("tokenInput").blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    dialogs.token.close();

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
  const ticker=String(raw||$("tickerInput").value||"").trim().toUpperCase();if(!ticker)return showToast("Informe um ticker.");
  $("tickerInput").value=ticker;$("investmentResult").innerHTML=`<div class="empty">Consultando dados reais...</div>`;
  try{
    const payload=await fetchInvestment(ticker),i=extractIndicators(payload),sc=scoreInvestment(i);
    const delta=i.variacao===null?"":`<span class="${i.variacao>=0?"amount-positive":"amount-negative"}">${i.variacao>=0?"+":""}${i.variacao.toFixed(2)}%</span>`;
    $("investmentResult").innerHTML=`<article class="investment-card"><div class="investment-title"><div><h3>${escapeHTML(i.ticker)}</h3><div class="investment-sub">${escapeHTML(i.nome)}</div></div>${delta}</div><div class="investment-quote">${i.preco===null?"N/D":money(i.preco)}</div><div class="signal ${sc.tone}">${escapeHTML(sc.signal)}${sc.score===null?"":` · ${sc.score}%`}</div><div class="criteria">${sc.rules.map(r=>`<div class="criterion"><div><strong>${escapeHTML(r.name)}</strong><br><small>${escapeHTML(r.criterion)}</small></div><span class="dot ${!r.available?"na":r.pass?"ok":"no"}">${r.available?"●":"N/D"} ${escapeHTML(r.formatted)}</span></div>`).join("")}</div><p class="disclaimer">Fonte: ${escapeHTML(i.fonte)} · ${payload.detalhado?"dados ampliados":"cotação básica"}. Critérios visíveis e genéricos.</p><button class="save-radar-btn" id="saveRadar">+ Adicionar ao radar</button></article>`;
    $("saveRadar").onclick=async()=>{await addRadarTicker(ticker);await renderRadar();showToast(`${ticker} adicionado ao radar.`)};
  }catch(e){$("investmentResult").innerHTML=`<div class="empty">${escapeHTML(e.message)}</div>`}
}
$("addDebtBtn").onclick=()=>$("debtDialog").showModal();
$("tickerSearchBtn").onclick=()=>analyzeTicker();
$("tickerInput").addEventListener("keydown",e=>{if(e.key==="Enter")analyzeTicker()});
$("debtForm").addEventListener("submit",async e=>{e.preventDefault();try{await createDebt({descricao:$("debtDescription").value,credor:$("debtCreditor").value,tipo:$("debtType").value,valor_original:numberFromInput($("debtOriginal").value),forma_pagamento:$("debtPaymentMode").value,valor_pagamento_planejado:numberFromInput($("debtPlanned").value),vencimento:$("debtDue").value,observacoes:$("debtNote").value});e.target.reset();$("debtDialog").close();await renderDebts();await showReward("divida")}catch(err){showToast(err.message)}});
$("debtPaymentForm").addEventListener("submit",async e=>{e.preventDefault();try{await payDebt({divida_id:$("paymentDebtId").value,valor:numberFromInput($("paymentValue").value),conta_id:$("paymentAccount").value,forma_pagamento:$("paymentMethod").value,data:$("paymentDate").value,observacao:$("paymentNote").value});e.target.reset();$("debtPaymentDialog").close();await render();await showReward("divida")}catch(err){showToast(err.message)}});



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
async function openTransfer(preferredFrom=""){await fillTransferSelectors(preferredFrom);$("transferDate").value=todayISO();$("transferDialog").showModal()}
async function applySmartSuggestion(){if(movementType!=="saida")return $("smartSuggestion").classList.add("hidden");const description=$("movementDescription").value;if(description.trim().length<3)return $("smartSuggestion").classList.add("hidden");const suggestion=await suggestTransaction(description,movementType);if(suggestion.categoria_id)$("movementCategory").value=suggestion.categoria_id;if(suggestion.conta_id)$("movementAccount").value=suggestion.conta_id;if(suggestion.forma_pagamento)$("movementPayment").value=suggestion.forma_pagamento;const rule=await enforceAccountRules($("movementAccount").value,$("movementPayment").value);if(rule.forma_pagamento)$("movementPayment").value=rule.forma_pagamento;const categoryLabel=$("movementCategory").selectedOptions[0]?.textContent||"Categoria",accountLabel=$("movementAccount").selectedOptions[0]?.textContent||"Conta",paymentLabel=$("movementPayment").selectedOptions[0]?.textContent||"Pagamento";if(suggestion.categoria_id||suggestion.conta_id||suggestion.forma_pagamento||rule.lockedReason){$("smartSuggestion").innerHTML=`<strong>Sugestão Orion:</strong> ${escapeHTML(categoryLabel)} · ${escapeHTML(accountLabel)} · ${escapeHTML(paymentLabel)}${rule.lockedReason?`<br>${escapeHTML(rule.lockedReason)}`:""}`;$("smartSuggestion").classList.remove("hidden")}else $("smartSuggestion").classList.add("hidden")}
async function renderGame(){const[transactions,debts,reserve]=await Promise.all([getAll("transacoes"),getDebts(),getEmergencyFund()]),game=await getGameState({transactions,debts,reserve});$("levelEmblem").textContent=game.current.level;$("levelTitle").textContent=`Nível ${game.current.level} · ${game.current.title}`;$("levelXP").textContent=`${game.xp} XP`;$("xpBar").style.width=`${game.progress}%`;$("xpNext").textContent=game.next?`${Math.max(0,game.next.xp-game.xp)} XP para ${game.next.title}`:"Nível máximo atual";$("achievementGrid").innerHTML=game.achievements.map(a=>`<article class="achievement ${a.unlocked?"":"locked"}"><span class="tier ${a.tier}">${a.unlocked?a.tier:"bloqueado"}</span><span class="achievement-icon">${a.unlocked?a.icon:"🔒"}</span><strong>${escapeHTML(a.name)}</strong><p>${escapeHTML(a.description)}</p></article>`).join("");$("medalGrid").innerHTML=game.medals.map(m=>`<article class="medal-card" data-tier="${m.tier}"><div class="medal-gem">${m.tier==="bloqueada"?"?":m.tier==="bronze"?"B":m.tier==="prata"?"P":"O"}</div><strong>${escapeHTML(m.name)}</strong><p>${m.value} atual${m.next?` · próximo em ${m.next}`:" · máximo atual"}</p></article>`).join("");$("xpHistory").innerHTML=game.events.length?game.events.map(e=>`<article class="xp-event"><span>✦</span><div><strong>${escapeHTML(e.descricao||e.tipo)}</strong><small>${dateBR(e.criado_em)}</small></div><b>+${Number(e.xp||0)} XP</b></article>`).join(""):`<div class="empty">Seu primeiro XP ainda está esperando uma ação real.</div>`}
function openSettings(){const settings=getSettings();$("themeSelect").value=settings.theme;$("animationsToggle").checked=settings.animations;$("hideValuesToggle").checked=settings.hideValues;$("settingsDialog").showModal()}


$("movementDescription").addEventListener("input",debounce(applySmartSuggestion,220));$("movementAccount").addEventListener("change",applySmartSuggestion);
$("cajuConfirmBtn").addEventListener("click",async()=>{try{await registerCajuMonthlyCredit();$("cajuBanner").classList.add("hidden");await render();showToast("R$ 400 da Caju registrados.")}catch(e){showToast(e.message)}});
$("transferForm").addEventListener("submit",async e=>{e.preventDefault();try{await createTransfer({origem_conta_id:$("transferFrom").value,destino_conta_id:$("transferTo").value,valor:numberFromInput($("transferValue").value),data:$("transferDate").value,observacao:$("transferNote").value});e.target.reset();$("transferDialog").close();await render();showToast("Transferência registrada sem contar como renda ou gasto.")}catch(err){showToast(err.message)}});
document.querySelectorAll("[data-settings]").forEach(btn=>btn.addEventListener("click",()=>{const page=btn.dataset.settings;if(page==="api"){$("settingsDialog").close();$("tokenInput").value=getApiToken();$("tokenDialog").showModal();return}$("settingsDialog").close();document.getElementById(page+"Dialog")?.showModal()}));
$("themeSelect").addEventListener("change",()=>saveSettings({theme:$("themeSelect").value}));$("animationsToggle").addEventListener("change",()=>saveSettings({animations:$("animationsToggle").checked}));$("hideValuesToggle").addEventListener("change",()=>saveSettings({hideValues:$("hideValuesToggle").checked}));$("syncSettingsBtn").addEventListener("click",performSync);


$("resetOrionBtn").addEventListener("click", () => {
  $("dataDialog").close();
  $("resetDialog").showModal();
});

$("confirmResetBtn").addEventListener("click", async () => {
  $("confirmResetBtn").disabled = true;
  try {
    await resetRemoteData();
    await clearUserData();

    // Recarrega somente a base estrutural preservada na planilha.
    await downloadAll();
    $("resetDialog").close();
    await render();
    showToast("Orion zerado. Estrutura preservada.");
  } catch (err) {
    showToast(err.message || "Não foi possível zerar o Orion.");
  } finally {
    $("confirmResetBtn").disabled = false;
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
    showToast("Exportação preparada.");
  } catch (err) {
    showToast(err.message || "Não foi possível exportar a planilha.");
  } finally {
    $("confirmExportBtn").disabled = false;
  }
});


window.addEventListener("online", checkStartupSync);
window.addEventListener("offline", () => showToast("Você está offline."));

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

await render();
await checkStartupSync();
