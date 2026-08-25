const APP_VERSION = '0.1';
const DB_NAME = 'orion_finance_v01';
const DB_VERSION = 1;
const STORES = ['meta','profiles','accounts','transactions','goals','allocations'];

const $ = (id) => document.getElementById(id);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const nowISO = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().slice(0,10);
const monthKey = (date=todayISO()) => String(date).slice(0,7);
const uid = (prefix='id') => `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
const money = (n) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n||0));
const dateBR = (iso) => iso ? new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:new Date(iso).getFullYear()===new Date().getFullYear()?undefined:'numeric'}).format(new Date(`${iso}T12:00:00`)) : '—';
const escapeHTML = (s='') => String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':'&quot;'}[c]));

const CATEGORIES = {
  saida:['Alimentação','Moradia','Transporte','Saúde','Educação','Lazer','Assinaturas','Compras','Família','Taxas','Outros'],
  entrada:['Salário','Adiantamento','Freelance','Comissão','Venda','Pagamento recebido','Reembolso','Estorno','Restituição','Benefício','Presente','Prêmio','Aluguel recebido','Outros'],
  rendimento:['Rendimento','Juros','Dividendos','Cashback','Bonificação','Outros']
};
const PURPOSES = ['Uso geral','Essencial','Reserva','Aporte','Educação e futuro','Evento','Investimento','Repasse','Organização de saldo','Outro'];

const PHRASES = {
  entrada:[
    'Entrada registrada. Agora esse dinheiro já tem contexto.','Receber é só uma parte. Saber o que fazer depois muda o jogo.','Mais recurso disponível, mais clareza para decidir.','Dinheiro que entra também merece direção.','Boa entrada. O próximo passo é dar intenção a ela.','Registrar o que chega deixa o mês mais legível.','Você acabou de transformar um recebimento em informação útil.','Mais uma entrada compreendida, não apenas lembrada.','Organização começa quando o dinheiro deixa de ser abstrato.','Receita visível é decisão mais consciente.','Cada entrada bem registrada reduz a névoa do mês.','O valor entrou. Agora ele pode trabalhar com propósito.','Clareza financeira também começa pelo que chega.','Mais um movimento que agora faz parte do mapa.','Entrada anotada. Sem depender da memória.','O dinheiro chegou e o Orion já sabe onde colocá-lo no mapa.'
  ],
  saida:[
    'Registrado. Gastar com consciência é diferente de gastar no automático.','Saída registrada. Clareza sem culpa.','O objetivo não é evitar todo gasto, é entender cada escolha.','Mais uma decisão real incluída no mapa.','Registrar uma saída é manter o dinheiro no campo da consciência.','Tudo certo. Esse valor já não precisa ficar na memória.','Gasto entendido pesa menos do que gasto esquecido.','A organização acontece inclusive nas pequenas saídas.','Você não precisa controlar tudo. Precisa enxergar o que está acontecendo.','Registrado. Informação agora, decisão melhor depois.','Mais uma saída com nome, data e contexto.','Clareza primeiro. Ajuste depois, se for necessário.','O mês fica mais honesto a cada registro.','Sem julgamento. Só informação para decidir melhor.','Saída anotada. Seu saldo agora conta a história certa.','Registrar também é uma forma de participar da própria vida financeira.'
  ],
  transferencia:[
    'Transferência registrada sem transformar movimento em gasto.','Dinheiro mudou de lugar, não de patrimônio.','Organização de saldo concluída.','Origem e destino agora estão conectados corretamente.','Movimento interno registrado sem distorcer o mês.','Seu dinheiro só mudou de endereço.','Transferência feita. Resultado mensal preservado.','Mais organização, sem criar receita ou despesa artificial.','Contas atualizadas. Patrimônio total permanece o mesmo.','Movimento entre contas compreendido pelo Orion.','A transferência entrou no mapa do jeito certo.','Saldo realocado sem ruído nos indicadores.','Boa. O dinheiro mudou de conta e o histórico manteve o contexto.','Transferência registrada com uma única intenção.','Sem duplicidade. Sem receita falsa. Sem gasto falso.','Movimentação interna concluída.'
  ],
  rendimento:[
    'Rendimento registrado. O tempo também trabalhou.','Pequenos rendimentos ganham força quando têm continuidade.','Mais um pouco de dinheiro gerado pelo próprio patrimônio.','O crescimento pode ser silencioso e ainda assim importante.','Rendimento anotado. Patrimônio e tempo trabalhando juntos.','Mais uma camada de crescimento registrada.','O valor é pequeno ou grande; o hábito de acompanhar continua valioso.','Rendimento visível torna a evolução mais concreta.','O patrimônio respondeu. O Orion registrou.','Mais uma evidência de dinheiro trabalhando por você.','Crescimento registrado sem confundir com renda de trabalho.','O tempo participou deste resultado.','Rendimento identificado. Agora ele também faz parte da história.','Mais um ganho que não dependeu de uma nova hora trabalhada.','Patrimônio em movimento, registro em dia.','Rendimento registrado. Continuidade costuma fazer o restante.'
  ],
  aporte:[
    'Aporte feito. O futuro recebeu um pouco do presente.','Pequenos aportes também têm tempo para crescer.','Mais um valor com destino definido.','Guardar deixa de ser intenção quando vira movimento.','Aporte registrado. Consistência vale mais que espetáculo.','Você acabou de transformar dinheiro disponível em patrimônio com propósito.','Mais um passo concreto para um objetivo que importa.','O futuro não chegou ainda, mas já recebeu este aporte.','Valor alocado. Intenção preservada.','Mais um pedaço do patrimônio ganhou nome e finalidade.','Aporte concluído. O tempo pode assumir parte do trabalho daqui para frente.','Guardar é uma decisão pequena que pode durar muitos anos.','Mais um aporte, menos dependência da memória e da vontade futura.','Patrimônio construído um movimento de cada vez.','Aporte registrado. Sem promessa, com ação.','O objetivo cresceu porque você agiu hoje.'
  ],
  reserva:[
    'Reserva reforçada. Tranquilidade também pode ser construída.','Mais segurança criada antes de ela ser necessária.','Guardar para imprevistos é comprar margem de decisão.','Reserva atualizada. Menos urgência para o futuro.','Você está construindo espaço para escolher com calma.','Mais uma parte do patrimônio protegida.','Segurança financeira costuma parecer silenciosa até o dia em que importa.','Reserva reforçada. O inesperado perde um pouco de poder.','Dinheiro protegido é liberdade em estado de espera.','Mais um passo na direção de uma margem real.','A reserva cresceu sem precisar de barulho.','Proteção registrada. Consistência acumulada.','Mais um valor que não precisa ter pressa.','Reserva é patrimônio com função clara.','Aporte de segurança concluído.','O futuro ganhou um pouco mais de espaço para respirar.'
  ],
  objetivo:[
    'Objetivo criado. Agora existe um destino claro para esse dinheiro.','Planejar fica mais simples quando a meta ganha nome e número.','Meta definida. O próximo passo pode ser pequeno e ainda assim valer.','Um objetivo claro reduz decisões improvisadas.','Planejamento registrado. Agora o progresso pode ser acompanhado.','Você não precisa chegar hoje. Precisa saber para onde está indo.','Objetivo criado. O caminho ficou mensurável.','Mais uma intenção transformada em estrutura.','Meta salva. Consistência pode assumir o restante.','O objetivo existe no Orion antes de existir por completo no saldo.','Planejar é decidir antes que a urgência decida por você.','Meta registrada. Agora cada aporte terá contexto.','Objetivo definido com espaço para a realidade.','O plano ganhou um ponto de chegada.','Mais clareza para guardar sem depender só da vontade.','Objetivo criado. Daqui em diante, cada avanço fica visível.'
  ],
  edit:[
    'Registro corrigido. O mapa ficou mais fiel.','Ajuste salvo. Informação boa é informação correta.','Correção concluída sem criar um novo movimento.','Registro atualizado. Clareza preservada.','Ajustado. O histórico agora conta a versão certa.','Correção feita. Melhor um dado revisado do que uma memória imprecisa.','Movimento atualizado no próprio lugar.','Registro corrigido sem duplicidade.'
  ],
  neutral:[
    'Registrado.','Movimento salvo.','Tudo certo por aqui.','Atualizado.','Pronto.','Incluído no seu mapa financeiro.','Registro concluído.','Salvo no Orion.'
  ]
};

let db;
let appState = {
  view:'home', movementType:'saida', movementRange:'today', movementAccount:'', movementCategory:'',
  activeProfileId:'profile_joao', valuesHidden:false, lastPhraseKeys:[]
};

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const d=req.result;
      for(const name of STORES){ if(!d.objectStoreNames.contains(name)) d.createObjectStore(name,{keyPath:'id'}); }
    };
    req.onsuccess=()=>{db=req.result;resolve(db)};
    req.onerror=()=>reject(req.error);
  });
}
function txStore(store,mode='readonly'){return db.transaction(store,mode).objectStore(store)}
function getAll(store){return new Promise((resolve,reject)=>{const r=txStore(store).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
function getOne(store,id){return new Promise((resolve,reject)=>{const r=txStore(store).get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
function put(store,obj){return new Promise((resolve,reject)=>{const r=txStore(store,'readwrite').put(obj);r.onsuccess=()=>resolve(obj);r.onerror=()=>reject(r.error)})}
function remove(store,id){return new Promise((resolve,reject)=>{const r=txStore(store,'readwrite').delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
function clearStore(store){return new Promise((resolve,reject)=>{const r=txStore(store,'readwrite').clear();r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}

async function metaGet(key,fallback=null){const x=await getOne('meta',key);return x?x.value:fallback}
async function metaSet(key,value){return put('meta',{id:key,value,updated_at:nowISO()})}
async function markDirty(){await metaSet('dirty',true);await metaSet('local_updated_at',nowISO())}

async function purgeLegacyOrion(){
  await new Promise(resolve=>{try{const req=indexedDB.deleteDatabase('orion_finance_2');req.onsuccess=req.onerror=req.onblocked=()=>resolve()}catch{resolve()}});
  try{if('caches' in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('orion-mobile-')).map(k=>caches.delete(k)))}}catch{}
}

async function bootstrap(){
  await purgeLegacyOrion();
  await openDB();
  const profiles=await getAll('profiles');
  if(!profiles.length){
    await put('profiles',{id:'profile_joao',name:'João',type:'pessoal',subtitle:'Principal',principal:true,created_at:nowISO(),updated_at:nowISO()});
    await metaSet('active_profile_id','profile_joao');
    await metaSet('sync_revision',0);
    await metaSet('dirty',false);
  }
  appState.activeProfileId=await metaGet('active_profile_id','profile_joao');
  appState.valuesHidden=await metaGet('values_hidden',false);
  appState.lastPhraseKeys=await metaGet('last_phrase_keys',[]);
  $('movementDate').value=todayISO(); $('transferDate').value=todayISO();
  bindEvents();
  await renderAll();
  updateConnectivity();
  if(navigator.onLine) autoSync('boot');
}

function bindEvents(){
  $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.nav)));
  $('brandHomeBtn').addEventListener('click',()=>navigate('home'));
  $('fab').addEventListener('click',()=>openMovement());
  $('addAccountBtn').addEventListener('click',()=>openAccount());
  $('toggleBalanceBtn').addEventListener('click',toggleValues);
  $('profileSwitchBtn').addEventListener('click',openProfiles);
  $('manageProfilesBtn').addEventListener('click',openProfiles);
  $('newProfileBtn').addEventListener('click',()=>{closeDialog('profilesDialog');openDialog('profileFormDialog')});
  $('addGoalBtn').addEventListener('click',openGoal);
  $('syncStateBtn').addEventListener('click',openSync);
  $('syncSettingsBtn').addEventListener('click',openSync);
  $('syncNowBtn').addEventListener('click',()=>syncNow(true));
  $('exportBtn').addEventListener('click',exportBackup);
  $('importInput').addEventListener('change',importBackup);
  $('aboutBtn').addEventListener('click',()=>openDialog('aboutDialog'));
  $('resetBtn').addEventListener('click',resetLocal);
  $('healthChip').addEventListener('click',()=>showToast(`${$('healthScore').textContent} · ${$('healthLabel').textContent}. Um indicador simples baseado no ritmo de entradas e saídas deste mês.`));
  $$('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeDialog(btn.dataset.close)));
  $$('.type-tabs [data-type]').forEach(btn=>btn.addEventListener('click',()=>setMovementType(btn.dataset.type)));
  $('movementValue').addEventListener('input',currencyInputHandler);
  $('accountInitial').addEventListener('input',currencyInputHandler);
  $('goalTarget').addEventListener('input',currencyInputHandler);
  $('goalMonthly').addEventListener('input',currencyInputHandler);
  $('contributionValue').addEventListener('input',currencyInputHandler);
  ['movementValue','accountInitial','goalTarget','goalMonthly','contributionValue'].forEach(id=>$(id).addEventListener('focus',e=>e.target.select()));
  $('movementAccount').addEventListener('change',applyCajuDefault);
  $('movementForm').addEventListener('submit',saveMovement);
  $('deleteMovementBtn').addEventListener('click',deleteMovement);
  $('accountForm').addEventListener('submit',saveAccount);
  $('goalForm').addEventListener('submit',saveGoal);
  $('contributionForm').addEventListener('submit',saveContribution);
  $('profileForm').addEventListener('submit',saveProfile);
  $('syncForm').addEventListener('submit',saveSyncSettings);
  $('accountProfileFrom').addEventListener('change',renderAccountProfile);
  $('accountProfileTo').addEventListener('change',renderAccountProfile);
  $$('.filter-pill[data-range]').forEach(btn=>btn.addEventListener('click',()=>{appState.movementRange=btn.dataset.range;$$('.filter-pill[data-range]').forEach(x=>x.classList.toggle('active',x===btn));renderMovements()}));
  $('movementAccountFilterBtn').addEventListener('click',cycleAccountFilter);
  $('movementCategoryFilterBtn').addEventListener('click',cycleCategoryFilter);
  window.addEventListener('online',()=>{updateConnectivity();autoSync('online')});
  window.addEventListener('offline',updateConnectivity);
}

function navigate(view){
  appState.view=view;
  const map={home:'homeView',movements:'movementsView',planning:'planningView',more:'moreView'};
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===map[view]));
  $$('.bottom-nav [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));
  $('screenTitle').textContent=$(map[view]).dataset.title||'Orion Finance';
  if(view==='movements')renderMovements(); if(view==='planning')renderPlanning(); if(view==='more')renderMore();
}
function openDialog(id){const d=$(id);if(d&&!d.open)d.showModal()}
function closeDialog(id){const d=$(id);if(d?.open)d.close()}
function showToast(text){const t=$('toast');t.textContent=text;t.classList.remove('hidden');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.add('hidden'),2400)}

function digitsToNumber(value){const digits=String(value||'').replace(/\D/g,'');return Number(digits||0)/100}
function numberToInput(n){return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0))}
function currencyInputHandler(e){e.target.value=numberToInput(digitsToNumber(e.target.value))}
function readMoneyInput(id){return digitsToNumber($(id).value)}
function setMoneyInput(id,n=0){$(id).value=numberToInput(n)}

async function currentProfile(){return (await getOne('profiles',appState.activeProfileId)) || (await getOne('profiles','profile_joao'))}
async function allAllocations(){return getAll('allocations')}
async function accountBalances(){
  const [accounts,txs]=await Promise.all([getAll('accounts'),getAll('transactions')]);
  const map=new Map(accounts.filter(a=>a.active!==false).map(a=>[a.id,Number(a.initial_balance||0)]));
  for(const t of txs){
    if(t.type==='entrada'||t.type==='rendimento') map.set(t.account_id,(map.get(t.account_id)||0)+Number(t.amount||0));
    else if(t.type==='saida') map.set(t.account_id,(map.get(t.account_id)||0)-Number(t.amount||0));
    else if(t.type==='transferencia'){
      map.set(t.from_account_id,(map.get(t.from_account_id)||0)-Number(t.amount||0));
      map.set(t.to_account_id,(map.get(t.to_account_id)||0)+Number(t.amount||0));
    }
  }
  return map;
}
async function managedAllocationByAccount(){
  const [profiles,allocs]=await Promise.all([getAll('profiles'),getAll('allocations')]);
  const managed=new Set(profiles.filter(p=>!p.principal).map(p=>p.id));
  const map=new Map();
  for(const a of allocs){if(managed.has(a.profile_id))map.set(a.account_id,(map.get(a.account_id)||0)+Number(a.amount||0));}
  return map;
}
async function profileSnapshot(profileId=appState.activeProfileId){
  const [profile,balances,allocs,txs,managedMap,accounts]=await Promise.all([getOne('profiles',profileId),accountBalances(),getAll('allocations'),getAll('transactions'),managedAllocationByAccount(),getAll('accounts')]);
  const isPrincipal=profile?.principal!==false;
  const physical=[...balances.values()].reduce((s,v)=>s+v,0);
  const managedTotal=[...managedMap.values()].reduce((s,v)=>s+v,0);
  const ownAlloc=allocs.filter(a=>a.profile_id===profileId).reduce((s,a)=>s+Number(a.amount||0),0);
  const total=isPrincipal?physical-managedTotal:ownAlloc;
  const mk=monthKey();
  const ownTx=isPrincipal?txs:txs.filter(t=>t.profile_id===profileId);
  const month=ownTx.filter(t=>monthKey(t.date)===mk);
  const income=month.filter(t=>t.type==='entrada'||t.type==='rendimento').reduce((s,t)=>s+Number(t.amount||0),0);
  const expense=month.filter(t=>t.type==='saida').reduce((s,t)=>s+Number(t.amount||0),0);
  const ownGoals=(await getAll('goals')).filter(g=>g.profile_id===profileId);
  const protectedAmount=isPrincipal?allocs.filter(a=>a.profile_id===profileId).reduce((s,a)=>s+Number(a.amount||0),0):ownAlloc;
  const free=isPrincipal?Math.max(0,total-protectedAmount):Math.max(0,total);
  return {profile,isPrincipal,total,income,expense,result:income-expense,free,balances,managedMap,accounts,ownGoals,allocs};
}

async function renderAll(){await updateProfileHeader();await renderHome();await renderMovements();await renderPlanning();await renderMore();}
async function updateProfileHeader(){const p=await currentProfile();if(!p)return;$('profileName').textContent=p.name;$('profileAvatar').textContent=String(p.name||'P').trim().charAt(0).toUpperCase();}
function displayMoney(v){return appState.valuesHidden?'R$ •••••':money(v)}
async function renderHome(){
  const s=await profileSnapshot();
  $('totalBalance').textContent=displayMoney(s.total);$('monthIncome').textContent=displayMoney(s.income);$('monthExpense').textContent=displayMoney(s.expense);$('monthResult').textContent=displayMoney(s.result);$('freeMoney').textContent=displayMoney(s.free);
  $('monthResult').className=s.result>=0?'positive':'negative';
  renderHealth(s);await renderAccounts(s);await renderRecent();
}
function renderHealth(s){
  let score=100,label='Em dia';
  if(s.income>0){const ratio=s.expense/s.income;score=Math.round(clamp(100-ratio*55,10,96));label=score>=75?'Em dia':score>=50?'Atenção':'Ajustar';}
  else if(s.expense>0){score=25;label='Ajustar';}
  else {$('healthScore').textContent='—';$('healthLabel').textContent='Começando';$('healthDot').style.background='var(--green)';return;}
  $('healthScore').textContent=`${score}%`;$('healthLabel').textContent=label;$('healthDot').style.background=score>=70?'var(--green)':score>=45?'var(--gold)':'var(--red)';
}
async function renderAccounts(snapshot=null){
  const s=snapshot||await profileSnapshot(); const p=s.profile; const accounts=s.accounts.filter(a=>a.active!==false);
  const rows=[];
  if(p?.principal!==false){
    for(const a of accounts){const physical=s.balances.get(a.id)||0;const allocated=s.managedMap.get(a.id)||0;const shown=physical-allocated;rows.push(accountRow(a,shown,allocated));}
  } else {
    const byAccount=new Map();for(const al of s.allocs.filter(x=>x.profile_id===p.id))byAccount.set(al.account_id,(byAccount.get(al.account_id)||0)+Number(al.amount||0));
    for(const [id,val] of byAccount){const a=accounts.find(x=>x.id===id);if(a)rows.push(accountRow(a,val,0,true));}
  }
  $('accountsList').innerHTML=rows.length?rows.join(''):`<div class="empty-state"><strong>Nenhuma conta ainda.</strong>Cadastre o saldo que você tem hoje e comece daqui.</div>`;
  $$('[data-account-id]',$('accountsList')).forEach(btn=>btn.addEventListener('click',()=>openAccountProfile(btn.dataset.accountId)));
}
function accountRow(a,balance,allocated=0,managed=false){
  const meta=managed?`Alocado neste perfil`:allocated>0?`${money(allocated)} alocado`:a.type_label||typeLabel(a.type);
  return `<button class="account-row" data-account-id="${escapeHTML(a.id)}"><span class="account-mark" style="background:${escapeHTML(a.color||'#2f80ed')}">${escapeHTML(String(a.name||'C').charAt(0).toUpperCase())}</span><span class="account-copy"><strong>${escapeHTML(a.name)}</strong><small>${escapeHTML(meta)}</small></span><b>${escapeHTML(displayMoney(balance))}</b><span class="chev">›</span></button>`;
}
function typeLabel(type){return ({corrente:'Conta corrente',digital:'Conta digital',beneficio:'Benefício',carteira:'Carteira',outro:'Conta'}[type]||'Conta')}

async function renderRecent(){
  const txs=(await getAll('transactions')).sort((a,b)=>`${b.date}|${b.created_at}`.localeCompare(`${a.date}|${a.created_at}`));
  const profile=await currentProfile(); const list=profile?.principal===false?txs.filter(t=>t.profile_id===profile.id):txs;
  $('recentTransactions').innerHTML=list.length?list.slice(0,4).map(transactionRow).join(''):`<div class="empty-state"><strong>Seu novo ciclo começa aqui.</strong>O primeiro lançamento aparecerá neste espaço.</div>`;
  bindTransactionButtons($('recentTransactions'));
}
function transactionRow(t){
  const sign=(t.type==='entrada'||t.type==='rendimento')?'+':t.type==='saida'?'-':'';const cls=(t.type==='entrada'||t.type==='rendimento')?'positive':t.type==='saida'?'negative':'';
  const icon=t.type==='entrada'?'↑':t.type==='saida'?'↓':t.type==='rendimento'?'↗':'⇄';
  return `<button class="transaction-row" data-transaction-id="${escapeHTML(t.id)}"><span class="txn-icon ${escapeHTML(t.type)}">${icon}</span><span class="transaction-copy"><strong>${escapeHTML(t.description||typeName(t.type))}</strong><small>${dateBR(t.date)} · ${escapeHTML(t.category||t.purpose||'')}</small></span><span class="transaction-amount"><b class="${cls}">${sign} ${escapeHTML(displayMoney(t.amount))}</b><small>${escapeHTML(paymentLabel(t.payment))}</small></span></button>`;
}
function bindTransactionButtons(root){$$('[data-transaction-id]',root).forEach(btn=>btn.addEventListener('click',()=>editMovement(btn.dataset.transactionId)))}
function typeName(t){return ({saida:'Saída',entrada:'Entrada',transferencia:'Transferência',rendimento:'Rendimento'}[t]||'Movimento')}
function paymentLabel(p){return ({pix:'Pix',debito:'Débito',credito:'Crédito',dinheiro:'Dinheiro',outro:'Outro'}[p]||'')}

async function renderMovements(){
  __accountsCache=await getAll('accounts');
  let txs=(await getAll('transactions')).sort((a,b)=>`${b.date}|${b.created_at}`.localeCompare(`${a.date}|${a.created_at}`)); const p=await currentProfile(); if(p?.principal===false) txs=txs.filter(t=>t.profile_id===p.id);
  if(appState.movementRange==='today')txs=txs.filter(t=>t.date===todayISO()); else txs=txs.filter(t=>monthKey(t.date)===monthKey());
  if(appState.movementAccount)txs=txs.filter(t=>t.account_id===appState.movementAccount||t.from_account_id===appState.movementAccount||t.to_account_id===appState.movementAccount);
  if(appState.movementCategory)txs=txs.filter(t=>t.category===appState.movementCategory);
  const total=txs.reduce((s,t)=>s+(t.type==='entrada'||t.type==='rendimento'?Number(t.amount):t.type==='saida'?-Number(t.amount):0),0);$('statementTotal').textContent=money(total);
  if(!txs.length){$('movementList').innerHTML=`<div class="empty-state"><strong>Nenhum movimento neste período.</strong>Use o + para registrar o primeiro.</div>`;return;}
  const grouped=new Map();for(const t of txs){if(!grouped.has(t.date))grouped.set(t.date,[]);grouped.get(t.date).push(t)}
  $('movementList').innerHTML=[...grouped.entries()].map(([date,items])=>`<section class="day-group"><div class="day-header"><b>${date===todayISO()?'Hoje':dateBR(date)}</b><span>${money(items.reduce((s,t)=>s+(t.type==='entrada'||t.type==='rendimento'?Number(t.amount):t.type==='saida'?-Number(t.amount):0),0))}</span></div>${items.map(t=>statementRow(t)).join('')}</section>`).join('');
  bindTransactionButtons($('movementList'));
}
function statementRow(t){const sign=(t.type==='entrada'||t.type==='rendimento')?'+':t.type==='saida'?'-':'';const cls=(t.type==='entrada'||t.type==='rendimento')?'positive':t.type==='saida'?'negative':'';const icon=t.type==='entrada'?'↑':t.type==='saida'?'↓':t.type==='rendimento'?'↗':'⇄';return `<button class="statement-row" data-transaction-id="${escapeHTML(t.id)}"><span class="txn-icon ${escapeHTML(t.type)}">${icon}</span><span class="transaction-copy"><strong>${escapeHTML(t.description||typeName(t.type))}</strong><small>${escapeHTML(t.category||t.purpose||'')} · ${escapeHTML(accountNameCache(t))}</small></span><span class="transaction-amount"><b class="${cls}">${sign} ${escapeHTML(displayMoney(t.amount))}</b><small>${escapeHTML(paymentLabel(t.payment))}</small></span></button>`}
let __accountsCache=[];function accountNameCache(t){if(t.type==='transferencia'){const a=__accountsCache.find(x=>x.id===t.from_account_id),b=__accountsCache.find(x=>x.id===t.to_account_id);return `${a?.name||'Conta'} → ${b?.name||'Conta'}`}return __accountsCache.find(x=>x.id===t.account_id)?.name||'Conta'}

async function renderPlanning(){
  const [goals,profiles,allocs,s]=await Promise.all([getAll('goals'),getAll('profiles'),getAll('allocations'),profileSnapshot()]);
  const activeProfile=profiles.find(p=>p.id===appState.activeProfileId);
  const relevant=activeProfile?.principal?goals:goals.filter(g=>g.profile_id===appState.activeProfileId);
  $('goalsList').innerHTML=relevant.length?relevant.map(g=>goalCard(g,profiles,allocs)).join(''):`<div class="empty-state list-card"><strong>Nenhum objetivo criado.</strong>Crie sua reserva ou um cofrinho e comece com o valor que fizer sentido hoje.</div>`;
  $$('[data-contribute-goal]',$('goalsList')).forEach(btn=>btn.addEventListener('click',()=>openContribution(btn.dataset.contributeGoal)));
  const mk=monthKey();const monthAllocs=allocs.filter(a=>monthKey(a.date)===mk&&a.source_profile_id===appState.activeProfileId).reduce((sum,a)=>sum+Number(a.amount||0),0);
  const monthTx=(await getAll('transactions')).filter(t=>monthKey(t.date)===mk&&t.type==='saida');const essential=monthTx.filter(t=>t.purpose==='Essencial').reduce((s,t)=>s+Number(t.amount||0),0);
  $('plannedContributions').textContent=displayMoney(monthAllocs);$('essentialSpend').textContent=displayMoney(essential);$('saveableMoney').textContent=displayMoney(Math.max(0,s.free));
}
function goalCard(g,profiles,allocs){const value=allocs.filter(a=>a.goal_id===g.id).reduce((s,a)=>s+Number(a.amount||0),0);const pct=g.target>0?clamp(Math.round(value/g.target*100),0,100):0;const p=profiles.find(x=>x.id===g.profile_id);return `<article class="goal-card"><div class="goal-top"><span class="goal-mark">${g.profile_id==='profile_joao'?'◇':'✦'}</span><span><strong>${escapeHTML(g.name)}</strong><small>${escapeHTML(g.description||p?.subtitle||'Objetivo')}</small></span><button class="goal-action" data-contribute-goal="${escapeHTML(g.id)}">Aportar</button></div><div class="goal-amount"><span><b>${escapeHTML(displayMoney(value))}</b><br>de ${escapeHTML(displayMoney(g.target))}</span><strong>${pct}%</strong></div><div class="progress-track"><span style="width:${pct}%"></span></div><div class="goal-meta"><span>Sugerido/mês <b>${escapeHTML(displayMoney(g.monthly||0))}</b></span><span>Perfil <b>${escapeHTML(p?.name||'João')}</b></span></div></article>`}

async function renderMore(){const url=await metaGet('sync_url','');$('syncSettingsSubtitle').textContent=url?'Automático ao abrir e ao reconectar':'Somente neste aparelho'}

async function toggleValues(){appState.valuesHidden=!appState.valuesHidden;await metaSet('values_hidden',appState.valuesHidden);await renderHome();if(appState.view==='planning')renderPlanning();if(appState.view==='movements')renderMovements()}

async function populateMovementSelects(){
  const accounts=(await getAll('accounts')).filter(a=>a.active!==false);__accountsCache=accounts;
  const options=accounts.map(a=>`<option value="${escapeHTML(a.id)}">${escapeHTML(a.name)}</option>`).join('');
  ['movementAccount','transferFrom','transferTo'].forEach(id=>{$(id).innerHTML=`<option value="">Selecionar</option>${options}`});
  const purposes=PURPOSES.map(x=>`<option>${escapeHTML(x)}</option>`).join('');$('movementPurpose').innerHTML=purposes;$('transferPurpose').innerHTML=purposes;
  populateCategory();
}
function populateCategory(){const type=appState.movementType==='rendimento'?'rendimento':appState.movementType==='entrada'?'entrada':'saida';$('movementCategory').innerHTML=CATEGORIES[type].map(x=>`<option>${escapeHTML(x)}</option>`).join('')}
async function openMovement(type='saida'){
  $('editingTransactionId').value='';$('movementDialogTitle').textContent='Novo movimento';$('deleteMovementBtn').classList.add('hidden');$('movementDescription').value='';$('movementNote').value='';setMoneyInput('movementValue',0);$('movementDate').value=todayISO();$('transferDate').value=todayISO();await populateMovementSelects();setMovementType(type);openDialog('movementDialog');setTimeout(()=>$('movementValue').focus(),120)
}
function setMovementType(type){appState.movementType=type;$$('.type-tabs [data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===type));$('standardMovementFields').classList.toggle('hidden',type==='transferencia');$('transferFields').classList.toggle('hidden',type!=='transferencia');populateCategory();$('movementPayment').closest('.field').classList.toggle('hidden',type==='rendimento')}
async function applyCajuDefault(){const a=await getOne('accounts',$('movementAccount').value);const hay=`${a?.name||''} ${a?.institution||''}`.toLowerCase();if(hay.includes('caju')){$('movementPayment').value='credito';$('movementPayment').title='Crédito usando saldo Caju, sem fatura.'}else $('movementPayment').title=''}

async function saveMovement(e){
  e.preventDefault();const amount=readMoneyInput('movementValue');if(amount<=0)return showToast('Informe um valor.');const editingId=$('editingTransactionId').value;const profile=await currentProfile();
  if(appState.movementType==='transferencia'){
    const from=$('transferFrom').value,to=$('transferTo').value;if(!from||!to||from===to)return showToast('Escolha contas diferentes.');
    const obj={id:editingId||uid('txn'),type:'transferencia',amount,from_account_id:from,to_account_id:to,purpose:$('transferPurpose').value,date:$('transferDate').value||todayISO(),description:'Transferência',note:$('movementNote').value.trim(),profile_id:profile.id,created_at:editingId?(await getOne('transactions',editingId))?.created_at||nowISO():nowISO(),updated_at:nowISO()};await put('transactions',obj);await markDirty();closeDialog('movementDialog');showSmartPhrase(editingId?'edit':'transferencia');await renderAll();return;
  }
  const account=$('movementAccount').value;if(!account)return showToast('Selecione a conta.');
  const existing=editingId?await getOne('transactions',editingId):null;
  const obj={id:editingId||uid('txn'),type:appState.movementType,amount,account_id:account,description:$('movementDescription').value.trim()||typeName(appState.movementType),category:$('movementCategory').value,payment:appState.movementType==='rendimento'?'':$('movementPayment').value,purpose:$('movementPurpose').value,date:$('movementDate').value||todayISO(),note:$('movementNote').value.trim(),profile_id:profile.id,created_at:existing?.created_at||nowISO(),updated_at:nowISO()};
  await put('transactions',obj);await markDirty();closeDialog('movementDialog');showSmartPhrase(editingId?'edit':obj.purpose==='Reserva'?'reserva':obj.type);await renderAll();
}
async function editMovement(id){const t=await getOne('transactions',id);if(!t)return;await populateMovementSelects();$('editingTransactionId').value=t.id;$('movementDialogTitle').textContent='Editar movimento';$('deleteMovementBtn').classList.remove('hidden');setMoneyInput('movementValue',t.amount);$('movementNote').value=t.note||'';setMovementType(t.type);if(t.type==='transferencia'){$('transferFrom').value=t.from_account_id||'';$('transferTo').value=t.to_account_id||'';$('transferPurpose').value=t.purpose||PURPOSES[0];$('transferDate').value=t.date||todayISO()}else{$('movementDescription').value=t.description||'';$('movementCategory').value=t.category||CATEGORIES.saida[0];$('movementAccount').value=t.account_id||'';$('movementPayment').value=t.payment||'pix';$('movementDate').value=t.date||todayISO();$('movementPurpose').value=t.purpose||PURPOSES[0];await applyCajuDefault()}openDialog('movementDialog')}
async function deleteMovement(){const id=$('editingTransactionId').value;if(!id)return;if(!confirm('Excluir este movimento?'))return;await remove('transactions',id);await markDirty();closeDialog('movementDialog');showToast('Movimento excluído.');await renderAll()}

async function openAccount(id=''){const a=id?await getOne('accounts',id):null;$('editingAccountId').value=a?.id||'';$('accountDialogTitle').textContent=a?'Editar conta':'Nova conta';$('accountName').value=a?.name||'';$('accountInstitution').value=a?.institution||'';$('accountType').value=a?.type||'digital';setMoneyInput('accountInitial',a?.initial_balance||0);$('accountColor').value=a?.color||'#2f80ed';openDialog('accountDialog')}
async function saveAccount(e){e.preventDefault();const id=$('editingAccountId').value||uid('acc');const old=await getOne('accounts',id);const obj={id,name:$('accountName').value.trim(),institution:$('accountInstitution').value.trim(),type:$('accountType').value,initial_balance:readMoneyInput('accountInitial'),color:$('accountColor').value,active:true,created_at:old?.created_at||nowISO(),updated_at:nowISO()};if(!obj.name)return;await put('accounts',obj);await markDirty();closeDialog('accountDialog');showToast('Conta salva.');await renderAll()}

let activeAccountProfileId='';
async function openAccountProfile(id){activeAccountProfileId=id;const txs=await getAll('transactions');const account=await getOne('accounts',id);if(!account)return;const dates=txs.filter(t=>t.account_id===id||t.from_account_id===id||t.to_account_id===id).map(t=>t.date).sort();$('accountProfileFrom').value=dates[0]||todayISO();$('accountProfileTo').value=todayISO();await renderAccountProfile();openDialog('accountProfileDialog')}
async function renderAccountProfile(){if(!activeAccountProfileId)return;const [account,balances,txs,allocs]=await Promise.all([getOne('accounts',activeAccountProfileId),accountBalances(),getAll('transactions'),getAll('allocations')]);if(!account)return;const from=$('accountProfileFrom').value,to=$('accountProfileTo').value;const list=txs.filter(t=>(t.account_id===account.id||t.from_account_id===account.id||t.to_account_id===account.id)&&(!from||t.date>=from)&&(!to||t.date<=to)).sort((a,b)=>`${b.date}|${b.created_at}`.localeCompare(`${a.date}|${a.created_at}`));const income=list.filter(t=>t.type==='entrada'||t.type==='rendimento'||(t.type==='transferencia'&&t.to_account_id===account.id)).reduce((s,t)=>s+Number(t.amount||0),0);const expense=list.filter(t=>t.type==='saida'||(t.type==='transferencia'&&t.from_account_id===account.id)).reduce((s,t)=>s+Number(t.amount||0),0);const allocated=allocs.filter(a=>a.account_id===account.id).reduce((s,a)=>s+Number(a.amount||0),0);$('accountProfileTitle').textContent=account.name;$('accountProfileName').textContent=account.name;$('accountProfileMeta').textContent=`${typeLabel(account.type)}${allocated?` · ${money(allocated)} alocado`:''}`;$('accountProfileBalance').textContent=displayMoney(balances.get(account.id)||0);$('accountProfileMark').textContent=account.name.charAt(0).toUpperCase();$('accountProfileMark').style.background=account.color||'var(--blue)';$('accountProfileMetrics').innerHTML=`<div><small>Entradas</small><b class="positive">${displayMoney(income)}</b></div><div><small>Saídas</small><b class="negative">${displayMoney(expense)}</b></div><div><small>Resultado</small><b>${displayMoney(income-expense)}</b></div><div><small>Movimentos</small><b>${list.length}</b></div>`;$('accountProfileMovements').innerHTML=list.length?list.map(statementRow).join(''):`<div class="empty-state"><strong>Sem movimentos.</strong>Nenhum registro neste período.</div>`;bindTransactionButtons($('accountProfileMovements'))}

async function openGoal(){const [profiles,accounts]=await Promise.all([getAll('profiles'),getAll('accounts')]);$('goalProfile').innerHTML=profiles.map(p=>`<option value="${p.id}" ${p.id===appState.activeProfileId?'selected':''}>${escapeHTML(p.name)}</option>`).join('');$('goalAccount').innerHTML=accounts.filter(a=>a.active!==false).map(a=>`<option value="${a.id}">${escapeHTML(a.name)}</option>`).join('');$('goalName').value='';$('goalDescription').value='';setMoneyInput('goalTarget',0);setMoneyInput('goalMonthly',0);openDialog('goalDialog')}
async function saveGoal(e){e.preventDefault();const account=$('goalAccount').value;if(!account)return showToast('Cadastre uma conta primeiro.');const obj={id:uid('goal'),name:$('goalName').value.trim(),description:$('goalDescription').value.trim(),profile_id:$('goalProfile').value,account_id:account,target:readMoneyInput('goalTarget'),monthly:readMoneyInput('goalMonthly'),created_at:nowISO(),updated_at:nowISO()};if(!obj.name)return;await put('goals',obj);await markDirty();closeDialog('goalDialog');showSmartPhrase('objetivo');await renderAll()}
async function openContribution(goalId){const [goal,profiles]=await Promise.all([getOne('goals',goalId),getAll('profiles')]);if(!goal)return;const p=profiles.find(x=>x.id===goal.profile_id);$('contributionGoalId').value=goal.id;$('contributionTitle').textContent=`Aportar em ${goal.name}`;$('contributionProfile').textContent=p?.name||'Perfil';$('contributionGoal').textContent=goal.name;setMoneyInput('contributionValue',0);openDialog('contributionDialog');setTimeout(()=>$('contributionValue').focus(),120)}
async function saveContribution(e){e.preventDefault();const goal=await getOne('goals',$('contributionGoalId').value);if(!goal)return;const amount=readMoneyInput('contributionValue');if(amount<=0)return showToast('Informe um valor.');const [balances,existingAllocs,current,allProfiles]=await Promise.all([accountBalances(),getAll('allocations'),currentProfile(),getAll('profiles')]);const alreadyAllocated=existingAllocs.filter(a=>a.account_id===goal.account_id).reduce((s,a)=>s+Number(a.amount||0),0);const unallocated=Math.max(0,Number(balances.get(goal.account_id)||0)-alreadyAllocated);if(amount>unallocated+0.0001)return showToast(`Disponível para alocar: ${money(unallocated)}`);const source=current?.principal?current:(allProfiles.find(p=>p.principal)||current);await put('allocations',{id:uid('alloc'),goal_id:goal.id,profile_id:goal.profile_id,source_profile_id:source.id,account_id:goal.account_id,amount,date:todayISO(),created_at:nowISO(),updated_at:nowISO()});await markDirty();closeDialog('contributionDialog');showSmartPhrase(goal.name.toLowerCase().includes('reserva')?'reserva':'aporte');await renderAll()}

async function openProfiles(){const profiles=await getAll('profiles');$('profilesList').innerHTML=profiles.map(p=>`<button class="profile-row ${p.id===appState.activeProfileId?'active':''}" data-profile-id="${p.id}"><span>${escapeHTML(p.name.charAt(0).toUpperCase())}</span><span><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.subtitle||p.type)}</small></span><b>${p.id===appState.activeProfileId?'✓':'›'}</b></button>`).join('');$$('[data-profile-id]',$('profilesList')).forEach(btn=>btn.addEventListener('click',async()=>{appState.activeProfileId=btn.dataset.profileId;await metaSet('active_profile_id',appState.activeProfileId);closeDialog('profilesDialog');await renderAll();showToast('Perfil alterado.')}));openDialog('profilesDialog')}
async function saveProfile(e){e.preventDefault();const name=$('newProfileName').value.trim();if(!name)return;const obj={id:uid('profile'),name,type:$('newProfileType').value,subtitle:$('newProfileSubtitle').value.trim(),principal:false,created_at:nowISO(),updated_at:nowISO()};await put('profiles',obj);await markDirty();closeDialog('profileFormDialog');appState.activeProfileId=obj.id;await metaSet('active_profile_id',obj.id);showToast('Perfil criado.');await renderAll()}

async function cycleAccountFilter(){const accounts=(await getAll('accounts')).filter(a=>a.active!==false);const ids=['',...accounts.map(a=>a.id)];const idx=ids.indexOf(appState.movementAccount);appState.movementAccount=ids[(idx+1)%ids.length];const a=accounts.find(x=>x.id===appState.movementAccount);$('movementAccountFilterBtn').innerHTML=`${a?escapeHTML(a.name):'Conta'} <span>⌄</span>`;renderMovements()}
async function cycleCategoryFilter(){const cats=['',...new Set([...CATEGORIES.saida,...CATEGORIES.entrada,...CATEGORIES.rendimento])];const idx=cats.indexOf(appState.movementCategory);appState.movementCategory=cats[(idx+1)%cats.length];$('movementCategoryFilterBtn').innerHTML=`${appState.movementCategory?escapeHTML(appState.movementCategory):'Categoria'} <span>⌄</span>`;renderMovements()}

function showSmartPhrase(context){const bank=PHRASES[context]||PHRASES.neutral;const keyBase=context;let candidates=bank.map((text,i)=>({text,key:`${keyBase}_${i}`})).filter(x=>!appState.lastPhraseKeys.includes(x.key));if(!candidates.length)candidates=bank.map((text,i)=>({text,key:`${keyBase}_${i}`}));const chosen=candidates[Math.floor(Math.random()*candidates.length)];if(Math.random()<.28 && !['aporte','reserva','rendimento'].includes(context)){showToast('✓ Registrado');return}appState.lastPhraseKeys=[chosen.key,...appState.lastPhraseKeys].slice(0,30);metaSet('last_phrase_keys',appState.lastPhraseKeys);showToast(chosen.text)}

function updateConnectivity(){const online=navigator.onLine;$('offlineBanner').classList.toggle('hidden',online);$('syncStateBtn').classList.toggle('offline',!online);$('syncStateBtn').classList.toggle('online',online);$('syncStateText').textContent=online?'Online':'Offline'}
async function openSync(){const url=await metaGet('sync_url',''),token=await metaGet('sync_token','');$('syncUrl').value=url;$('syncToken').value=token;openDialog('syncDialog')}
async function saveSyncSettings(e){e.preventDefault();await metaSet('sync_url',$('syncUrl').value.trim());await metaSet('sync_token',$('syncToken').value.trim());closeDialog('syncDialog');await renderMore();showToast('Sincronização configurada.');if(navigator.onLine)syncNow(true)}
async function snapshot(){const out={version:APP_VERSION,updated_at:await metaGet('local_updated_at',nowISO()),revision:await metaGet('sync_revision',0),data:{}};for(const s of ['profiles','accounts','transactions','goals','allocations'])out.data[s]=await getAll(s);return out}
async function restoreSnapshot(snap,{mark=false}={}){for(const s of ['profiles','accounts','transactions','goals','allocations']){await clearStore(s);for(const x of (snap.data?.[s]||[]))await put(s,x)}if(snap.revision!==undefined)await metaSet('sync_revision',snap.revision);if(mark){await markDirty()}else await metaSet('dirty',false);const profiles=await getAll('profiles');if(!profiles.find(p=>p.id===appState.activeProfileId)){appState.activeProfileId=profiles[0]?.id||'profile_joao';await metaSet('active_profile_id',appState.activeProfileId)}await renderAll()}
async function autoSync(){const url=await metaGet('sync_url','');if(url&&navigator.onLine)syncNow(false)}
async function syncNow(manual=false){const url=await metaGet('sync_url',''),token=await metaGet('sync_token','');if(!url){if(manual)showToast('Configure o Google Sheets primeiro.');return}if(!navigator.onLine){if(manual)showToast('Sem internet. Seus dados continuam salvos localmente.');return}$('syncStateBtn').classList.add('syncing');$('syncStateText').textContent='Sync';try{const local=await snapshot();const dirty=await metaGet('dirty',false);const res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'sync',token,revision:local.revision,dirty,snapshot:local})});if(!res.ok)throw new Error(`HTTP ${res.status}`);const json=await res.json();if(!json.ok)throw new Error(json.error||'Falha na sincronização');if(json.mode==='pull'&&json.snapshot)await restoreSnapshot(json.snapshot);else{await metaSet('sync_revision',json.revision??local.revision);await metaSet('dirty',false)}await metaSet('last_sync',nowISO());$('syncStateText').textContent='Atualizado';if(manual)showToast('Sincronizado.')}catch(err){console.warn('Orion sync',err);$('syncStateText').textContent='Local';if(manual)showToast('Não foi possível sincronizar agora.')}finally{$('syncStateBtn').classList.remove('syncing');setTimeout(updateConnectivity,1600)}}

async function exportBackup(){const data=await snapshot();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`orion-backup-${todayISO()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast('Backup exportado.')}
async function importBackup(e){const file=e.target.files?.[0];if(!file)return;try{const text=await file.text();const data=JSON.parse(text);if(!data.data)throw new Error('Arquivo inválido');if(!confirm('Substituir os dados locais pelo backup selecionado?'))return;await restoreSnapshot(data,{mark:true});showToast('Backup restaurado.')}catch{showToast('Backup inválido.')}finally{e.target.value=''}}
async function resetLocal(){if(!confirm('Recomeçar do zero? Todos os dados deste Orion neste aparelho serão apagados.'))return;const code=prompt('Digite ZERAR para confirmar.');if(code!=='ZERAR')return;for(const s of STORES)await clearStore(s);await put('profiles',{id:'profile_joao',name:'João',type:'pessoal',subtitle:'Principal',principal:true,created_at:nowISO(),updated_at:nowISO()});await metaSet('active_profile_id','profile_joao');await metaSet('sync_revision',0);await metaSet('dirty',true);await metaSet('local_updated_at',nowISO());appState.activeProfileId='profile_joao';closeDialog('aboutDialog');await renderAll();showToast('Orion reiniciado do zero.')}

bootstrap().catch(err=>{console.error(err);document.body.innerHTML=`<main style="padding:40px;color:white;font-family:-apple-system"><h1>Orion</h1><p>Não foi possível iniciar o banco local.</p><pre style="white-space:pre-wrap;color:#ff8d7b">${escapeHTML(err?.message||err)}</pre></main>`});
