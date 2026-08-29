const APP_VERSION = '0.3';
const DB_NAME = 'orion_finance_v01';
const DB_VERSION = 3;
const STORES = ['meta','profiles','accounts','transactions','goals','allocations','debts','monthly_snapshots'];

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
const DEFAULT_ACCOUNTS = [
  {id:'acc_bradesco',name:'Bradesco',institution:'Bradesco',type:'corrente',type_label:'Conta corrente',initial_balance:0,color:'#d51f42',brand:'bradesco'},
  {id:'acc_inter',name:'Inter',institution:'Inter',type:'digital',type_label:'Conta digital',initial_balance:0,color:'#ff7a00',brand:'inter',credit_card_enabled:true,cdb_mais_limite:504.33},
  {id:'acc_mercado_pago',name:'Mercado Pago',institution:'Mercado Pago',type:'digital',type_label:'Conta digital',initial_balance:0,color:'#11a8dc',brand:'mercado-pago'},
  {id:'acc_caju',name:'Caju',institution:'Caju',type:'beneficio',type_label:'Benefício / saldo',initial_balance:0,color:'#ff5b3d',brand:'caju'}
];

const BRAND_LOGOS = {
  bradesco:'../assets/banks/bradesco.png',
  inter:'../assets/banks/inter.png',
  'mercado-pago':'../assets/banks/mercado-pago.png',
  caju:'../assets/banks/caju.png'
};

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
  view:'home', movementType:'', movementRange:'today', movementAccount:'', movementCategory:'',
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
async function touchLocal(){await metaSet('local_updated_at',nowISO())}

async function purgeLegacyOrion(){
  await new Promise(resolve=>{try{const req=indexedDB.deleteDatabase('orion_finance_2');req.onsuccess=req.onerror=req.onblocked=()=>resolve()}catch{resolve()}});
  try{if('caches' in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('orion-mobile-')).map(k=>caches.delete(k)))}}catch{}
}

async function ensureDefaultAccounts(){
  const existing=await getAll('accounts');
  const normalized=new Set(existing.map(a=>`${String(a.name||'').trim().toLowerCase()}|${String(a.institution||'').trim().toLowerCase()}`));
  let changed=false;
  for(const seed of DEFAULT_ACCOUNTS){
    const key=`${seed.name.toLowerCase()}|${seed.institution.toLowerCase()}`;
    const byId=existing.find(a=>a.id===seed.id);
    if(byId){
      const patch={...seed,...byId,brand:byId.brand||seed.brand,updated_at:byId.updated_at||nowISO()};
      await put('accounts',patch);
      continue;
    }
    if(!normalized.has(key)){
      await put('accounts',{...seed,active:true,created_at:nowISO(),updated_at:nowISO()});
      changed=true;
    }
  }
  if(changed) await touchLocal();
}

function brandKey(account){
  const raw=`${account?.brand||''} ${account?.institution||''} ${account?.name||''}`.toLowerCase();
  if(raw.includes('bradesco')) return 'bradesco';
  if(raw.includes('inter')) return 'inter';
  if(raw.includes('mercado pago')||raw.includes('mercadopago')) return 'mercado-pago';
  if(raw.includes('caju')) return 'caju';
  return '';
}
function accountLogoHTML(account, className='account-logo'){
  const key=brandKey(account);
  if(key && BRAND_LOGOS[key]) return `<img class="${className}" src="${BRAND_LOGOS[key]}" alt="" loading="eager" />`;
  return `<span class="${className} account-logo-fallback" style="--account-color:${escapeHTML(account?.color||'#2f80ed')}">${escapeHTML(String(account?.name||'C').trim().charAt(0).toUpperCase())}</span>`;
}

async function bootstrap(){
  await purgeLegacyOrion();
  await openDB();
  const profiles=await getAll('profiles');
  if(!profiles.length){
    await put('profiles',{id:'profile_joao',name:'João H.',type:'pessoal',subtitle:'Principal',principal:true,created_at:nowISO(),updated_at:nowISO()});
    await metaSet('active_profile_id','profile_joao');
  }
  const allProfiles=await getAll('profiles');
  for(const p of allProfiles){if(p.id!=='profile_joao')await remove('profiles',p.id)}
  const joao=await getOne('profiles','profile_joao');
  if(joao)await put('profiles',{...joao,name:'João H.',principal:true,type:'pessoal',subtitle:'Principal',updated_at:joao.updated_at||nowISO()});
  for(const g of await getAll('goals')){if(g.profile_id!=='profile_joao')await put('goals',{...g,profile_id:'profile_joao',updated_at:nowISO()})}
  for(const a of await getAll('allocations')){if(a.profile_id!=='profile_joao'||a.source_profile_id!=='profile_joao')await put('allocations',{...a,profile_id:'profile_joao',source_profile_id:'profile_joao',updated_at:nowISO()})}
  await ensureDefaultAccounts();
  appState.activeProfileId='profile_joao';
  await metaSet('active_profile_id','profile_joao');
  appState.valuesHidden=await metaGet('values_hidden',false);
  appState.lastPhraseKeys=await metaGet('last_phrase_keys',[]);
  $('movementDate').value=todayISO(); $('transferDate').value=todayISO();
  bindEvents();
  await renderAll();
  $('app').dataset.view=appState.view;
  requestAnimationFrame(assertLayout);
  requestPersistentStorage();
}

function bindEvents(){
  $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.nav)));
  $('brandHomeBtn')?.addEventListener('click',()=>navigate('home'));
  $('fab')?.addEventListener('click',()=>openMovement(''));
  $('manageAccountsBtn')?.addEventListener('click',openAccountsManager);
  $('addAccountBtn')?.addEventListener('click',()=>openAccount());
  $('toggleBalanceBtn')?.addEventListener('click',toggleValues);
  $('profileSwitchBtn')?.addEventListener('click',openSettingsHub);
  $('manageAccountsSettingsBtn')?.addEventListener('click',()=>{closeDialog('settingsHubDialog');openAccountsManager()});
  $('newAccountFromManagerBtn')?.addEventListener('click',()=>{closeDialog('accountsManagerDialog');openAccount()});
  $('addGoalBtn')?.addEventListener('click',openGoal);
  $('addDebtBtn')?.addEventListener('click',()=>openDebt());
  $('debtHasInterest')?.addEventListener('change',toggleDebtRateFields);
  $('debtHasSettlement')?.addEventListener('change',toggleDebtSettlementFields);
  $('debtBaseBalance')?.addEventListener('input',currencyInputHandler);
  $('debtPaymentValue')?.addEventListener('input',currencyInputHandler);
  $('debtSimulationPayment')?.addEventListener('input',currencyInputHandler);
  $('debtForm')?.addEventListener('submit',saveDebt);
  $('deleteDebtBtn')?.addEventListener('click',deleteDebt);
  $('payDebtBtn')?.addEventListener('click',openDebtPayment);
  $('editDebtBtn')?.addEventListener('click',editActiveDebt);
  $('debtPaymentForm')?.addEventListener('submit',saveDebtPayment);
  $('simulateDebtBtn')?.addEventListener('click',simulateActiveDebt);
  $('exportBtn')?.addEventListener('click',exportBackup);
  $('importInput')?.addEventListener('change',importBackup);
  $('auditDataBtn')?.addEventListener('click',auditDataIntegrity);
  $('aboutBtn')?.addEventListener('click',()=>{closeDialog('settingsHubDialog');openDialog('aboutDialog')});
  $('resetBtn')?.addEventListener('click',resetLocal);
  $('healthChip')?.addEventListener('click',()=>showToast(`${$('healthScore').textContent} · ${$('healthLabel').textContent}. Um indicador simples baseado no ritmo de entradas e saídas deste mês.`));
  $$('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeDialog(btn.dataset.close)));
  $$('.type-tabs [data-type]').forEach(btn=>btn.addEventListener('click',()=>setMovementType(btn.dataset.type)));
  $('movementValue')?.addEventListener('input',currencyInputHandler);
  $('accountInitial')?.addEventListener('input',currencyInputHandler);
  $('interCdbGuarantee')?.addEventListener('input',currencyInputHandler);
  $('goalTarget')?.addEventListener('input',currencyInputHandler);
  $('goalMonthly')?.addEventListener('input',currencyInputHandler);
  $('contributionValue')?.addEventListener('input',currencyInputHandler);
  ['movementValue','accountInitial','interCdbGuarantee','goalTarget','goalMonthly','contributionValue','debtBaseBalance','debtSettlementAmount','debtPaymentValue','debtSimulationPayment'].forEach(id=>$(id)?.addEventListener('focus',e=>e.target.select()));
  $('movementAccount')?.addEventListener('change',applyCajuDefault);
  $('accountName')?.addEventListener('input',toggleInterAccountSettings);
  $('accountInstitution')?.addEventListener('input',toggleInterAccountSettings);
  $('payInterInvoiceBtn')?.addEventListener('click',payInterInvoice);
  $('movementForm')?.addEventListener('submit',saveMovement);
  $('deleteMovementBtn')?.addEventListener('click',deleteMovement);
  $('accountForm')?.addEventListener('submit',saveAccount);
  $('goalForm')?.addEventListener('submit',saveGoal);
  $('contributionForm')?.addEventListener('submit',saveContribution);
  $('accountProfileFrom')?.addEventListener('change',renderAccountProfile);
  $('accountProfileTo')?.addEventListener('change',renderAccountProfile);
  $$('.filter-pill[data-range]').forEach(btn=>btn.addEventListener('click',()=>{appState.movementRange=btn.dataset.range;$$('.filter-pill[data-range]').forEach(x=>x.classList.toggle('active',x===btn));renderMovements()}));
  $('movementAccountFilterBtn')?.addEventListener('click',cycleAccountFilter);
  $('movementCategoryFilterBtn')?.addEventListener('click',cycleCategoryFilter);

  $$('.color-swatch').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    setAccountColor(btn.dataset.color,btn.dataset.colorName);
  }));
  $('customColorBtn')?.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    const input=$('accountColor');
    if(input?.showPicker) input.showPicker(); else input?.click();
  });
  $('accountColor')?.addEventListener('input',e=>setAccountColor(e.target.value,'Personalizada',false));

  $$('dialog').forEach(d=>{
    d.addEventListener('close',()=>document.body.classList.remove('modal-open'));
    d.addEventListener('cancel',()=>document.body.classList.remove('modal-open'));
  });

  window.addEventListener('resize',()=>requestAnimationFrame(assertLayout),{passive:true});
}

function assertLayout(){
  const root=document.documentElement;
  const overflow=Math.max(0,root.scrollWidth-root.clientWidth);
  if(overflow>1){
    console.error('[Orion QA] overflow horizontal detectado:',overflow,'px');
    document.body.classList.add('layout-overflow-guard');
  } else document.body.classList.remove('layout-overflow-guard');
}

function navigate(view){
  appState.view=view;
  $('app').dataset.view=view;
  const map={home:'homeView',movements:'movementsView',planning:'planningView',more:'moreView'};
  const target=$(map[view]);
  if(!target){view='home';appState.view='home'}
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===map[view]));
  $$('.bottom-nav [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));
  const current=$(map[view]);
  if($('screenTitle')&&current)$('screenTitle').textContent=current.dataset.title||'Orion Finance';
  if(view==='movements')renderMovements();
  if(view==='planning')renderPlanning();
  if(view==='more'&&$('moreView'))renderMore();
  requestAnimationFrame(assertLayout);
}
function openDialog(id){const d=$(id);if(d&&!d.open){document.body.classList.add('modal-open');d.showModal()}}
function closeDialog(id){const d=$(id);if(d?.open)d.close();document.body.classList.remove('modal-open')}
function showToast(text){const t=$('toast');t.textContent=text;t.classList.remove('hidden');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.add('hidden'),2400)}

function digitsToNumber(value){const digits=String(value||'').replace(/\D/g,'');return Number(digits||0)/100}
function numberToInput(n){return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0))}
function currencyInputHandler(e){e.target.value=numberToInput(digitsToNumber(e.target.value))}
function readMoneyInput(id){return digitsToNumber($(id).value)}
function setMoneyInput(id,n=0){$(id).value=numberToInput(n)}

async function currentProfile(){return (await getOne('profiles','profile_joao'))}
async function allAllocations(){return getAll('allocations')}
async function accountBalances(){
  const [accounts,txs]=await Promise.all([getAll('accounts'),getAll('transactions')]);
  const byId=new Map(accounts.map(a=>[a.id,a]));
  const map=new Map(accounts.filter(a=>a.active!==false).map(a=>[a.id,Number(a.initial_balance||0)]));
  for(const t of txs){
    if(t.type==='entrada'||t.type==='rendimento') map.set(t.account_id,(map.get(t.account_id)||0)+Number(t.amount||0));
    else if(t.type==='saida'){
      const account=byId.get(t.account_id);
      const isCardPurchase=account?.credit_card_enabled===true && t.payment==='credito' && !t.is_invoice_payment;
      if(!isCardPurchase) map.set(t.account_id,(map.get(t.account_id)||0)-Number(t.amount||0));
    }
    else if(t.type==='transferencia'){
      map.set(t.from_account_id,(map.get(t.from_account_id)||0)-Number(t.amount||0));
      map.set(t.to_account_id,(map.get(t.to_account_id)||0)+Number(t.amount||0));
    }
  }
  return map;
}
async function openInvoiceAmount(accountId){
  const txs=await getAll('transactions');
  return txs.filter(t=>t.account_id===accountId&&t.type==='saida'&&t.payment==='credito'&&!t.is_invoice_payment&&!t.credit_settled).reduce((sum,t)=>sum+Number(t.amount||0),0);
}
async function managedAllocationByAccount(){
  const [profiles,allocs]=await Promise.all([getAll('profiles'),getAll('allocations')]);
  const managed=new Set(profiles.filter(p=>!p.principal).map(p=>p.id));
  const map=new Map();
  for(const a of allocs){if(managed.has(a.profile_id))map.set(a.account_id,(map.get(a.account_id)||0)+Number(a.amount||0));}
  return map;
}
async function profileSnapshot(){
  const [profile,balances,allocs,txs,accounts]=await Promise.all([currentProfile(),accountBalances(),getAll('allocations'),getAll('transactions'),getAll('accounts')]);
  const total=[...balances.values()].reduce((sum,v)=>sum+v,0);
  const mk=monthKey();
  const month=txs.filter(t=>monthKey(t.date)===mk);
  const income=month.filter(t=>t.type==='entrada'||t.type==='rendimento').reduce((sum,t)=>sum+Number(t.amount||0),0);
  const expense=month.filter(t=>t.type==='saida'&&!t.is_invoice_payment&&!t.is_debt_payment).reduce((sum,t)=>sum+Number(t.amount||0),0);
  const debtPayments=month.filter(t=>t.type==='saida'&&t.is_debt_payment).reduce((sum,t)=>sum+Number(t.amount||0),0);
  const protectedAmount=allocs.reduce((sum,a)=>sum+Number(a.amount||0),0);
  const free=Math.max(0,total-protectedAmount);
  const ownGoals=await getAll('goals');
  return {profile,isPrincipal:true,total,income,expense,debtPayments,result:income-expense,free,balances,managedMap:new Map(),accounts,ownGoals,allocs};
}

async function renderAll(){await updateProfileHeader();await renderHome();await renderMovements();await renderPlanning();if($('moreView'))await renderMore();}
async function updateProfileHeader(){
  if($('profileName'))$('profileName').textContent='João H.';
  if($('profileAvatar'))$('profileAvatar').textContent='J';
}
function displayMoney(v){return appState.valuesHidden?'R$ •••••':money(v)}
async function renderHome(){
  const s=await profileSnapshot();
  $('totalBalance').textContent=displayMoney(s.total);$('monthIncome').textContent=displayMoney(s.income);$('monthExpense').textContent=displayMoney(s.expense);$('monthResult').textContent=displayMoney(s.result);$('freeMoney').textContent=displayMoney(s.free);
  $('monthResult').className=s.result>=0?'positive':'negative';
  renderHealth(s);await renderAccounts(s);await renderRecent();await renderHomePriority(s);
}
function renderHealth(s){
  let score=100,label='Em dia';
  if(s.income>0){const ratio=s.expense/s.income;score=Math.round(clamp(100-ratio*55,10,96));label=score>=75?'Em dia':score>=50?'Atenção':'Ajustar';}
  else if(s.expense>0){score=25;label='Ajustar';}
  else {$('healthScore').textContent='—';$('healthLabel').textContent='Começando';$('healthDot').style.background='var(--green)';return;}
  $('healthScore').textContent=`${score}%`;$('healthLabel').textContent=label;$('healthDot').style.background=score>=70?'var(--green)':score>=45?'var(--gold)':'var(--red)';
}
async function renderAccounts(snapshot=null){
  const s=snapshot||await profileSnapshot(); const accounts=s.accounts.filter(a=>a.active!==false);
  const rows=[];
  for(const a of accounts){
    const shown=s.balances.get(a.id)||0;
    const invoice=a.credit_card_enabled?await openInvoiceAmount(a.id):0;
    const guarantee=Number(a.cdb_mais_limite||0);
    if(Math.abs(shown)<0.005 && guarantee<0.005 && invoice<0.005) continue;
    rows.push(accountRow(a,shown,0,false,{invoice,guarantee}));
  }
  $('accountsList').innerHTML=rows.slice(0,4).join('');
  $('accountsSection')?.classList.toggle('accounts-empty',rows.length===0);
  $$('[data-account-id]',$('accountsList')).forEach(btn=>btn.addEventListener('click',()=>openAccountProfile(btn.dataset.accountId)));
}
function accountRow(a,balance,allocated=0,managed=false,credit={}){
  const key=brandKey(a);
  let meta=allocated>0?`${money(allocated)} alocado`:a.type_label||typeLabel(a.type);
  if(key==='inter'&&Number(credit.guarantee||0)>0) meta=`CDB Mais Limite · ${money(credit.guarantee)} em garantia${Number(credit.invoice||0)>0?` · Fatura ${money(credit.invoice)}`:''}`;
  return `<button class="account-row account-card ${key?`brand-${key}`:''}" data-account-id="${escapeHTML(a.id)}" style="--account-color:${escapeHTML(a.color||'#2f80ed')}">${accountLogoHTML(a)}<span class="account-copy"><strong>${escapeHTML(a.name)}</strong><small>${escapeHTML(meta)}</small></span><b>${escapeHTML(displayMoney(balance))}</b><span class="chev">›</span></button>`;
}

function typeLabel(type){return ({corrente:'Conta corrente',digital:'Conta digital',beneficio:'Benefício',carteira:'Carteira',outro:'Conta'}[type]||'Conta')}

async function renderRecent(){
  const txs=(await getAll('transactions')).sort((a,b)=>`${b.date}|${b.created_at}`.localeCompare(`${a.date}|${a.created_at}`));
  const list=txs;
  $('recentTransactions').innerHTML=list.length?list.slice(0,3).map(transactionRow).join(''):`<div class="empty-state"><strong>Seu novo ciclo começa aqui.</strong>O primeiro lançamento aparecerá neste espaço.</div>`;
  bindTransactionButtons($('recentTransactions'));
}
function transactionRow(t){
  const invoicePay=Boolean(t.is_invoice_payment);
  const sign=invoicePay?'':(t.type==='entrada'||t.type==='rendimento')?'+':t.type==='saida'?'-':'';
  const cls=invoicePay?'neutral':(t.type==='entrada'||t.type==='rendimento')?'positive':t.type==='saida'?'negative':'';
  const icon=invoicePay?'✓':t.type==='entrada'?'↑':t.type==='saida'?'↓':t.type==='rendimento'?'↗':'⇄';
  return `<button class="transaction-row" data-transaction-id="${escapeHTML(t.id)}"><span class="txn-icon ${invoicePay?'invoice-payment':escapeHTML(t.type)}">${icon}</span><span class="transaction-copy"><strong>${escapeHTML(t.description||typeName(t.type))}</strong><small>${dateBR(t.date)} · ${escapeHTML(invoicePay?'Liquidação de fatura':t.category||t.purpose||'')}</small></span><span class="transaction-amount"><b class="${cls}">${sign} ${escapeHTML(displayMoney(t.amount))}</b><small>${escapeHTML(paymentLabel(t.payment,t))}</small></span></button>`;
}
function bindTransactionButtons(root){$$('[data-transaction-id]',root).forEach(btn=>btn.addEventListener('click',()=>editMovement(btn.dataset.transactionId)))}
function typeName(t){return ({saida:'Saída',entrada:'Entrada',transferencia:'Transferência',rendimento:'Rendimento'}[t]||'Movimento')}
function paymentLabel(p,t=null){if(p==='credito')return t?.credit_purchase?'Crédito · fatura':'Crédito';return ({pix:'Pix',debito:'Débito',dinheiro:'Dinheiro',outro:'Outro'}[p]||'')}

async function renderMovements(){
  __accountsCache=await getAll('accounts');
  let txs=(await getAll('transactions')).sort((a,b)=>`${b.date}|${b.created_at}`.localeCompare(`${a.date}|${a.created_at}`));
  if(appState.movementRange==='today')txs=txs.filter(t=>t.date===todayISO()); else txs=txs.filter(t=>monthKey(t.date)===monthKey());
  if(appState.movementAccount)txs=txs.filter(t=>t.account_id===appState.movementAccount||t.from_account_id===appState.movementAccount||t.to_account_id===appState.movementAccount);
  if(appState.movementCategory)txs=txs.filter(t=>t.category===appState.movementCategory);
  const total=txs.reduce((s,t)=>s+(t.type==='entrada'||t.type==='rendimento'?Number(t.amount):(t.type==='saida'&&!t.is_invoice_payment)?-Number(t.amount):0),0);$('statementTotal').textContent=money(total);
  if(!txs.length){$('movementList').innerHTML=`<div class="empty-state"><strong>Nenhum movimento neste período.</strong>Use o + para registrar o primeiro.</div>`;return;}
  const grouped=new Map();for(const t of txs){if(!grouped.has(t.date))grouped.set(t.date,[]);grouped.get(t.date).push(t)}
  $('movementList').innerHTML=[...grouped.entries()].map(([date,items])=>`<section class="day-group"><div class="day-header"><b>${date===todayISO()?'Hoje':dateBR(date)}</b><span>${money(items.reduce((s,t)=>s+(t.type==='entrada'||t.type==='rendimento'?Number(t.amount):(t.type==='saida'&&!t.is_invoice_payment)?-Number(t.amount):0),0))}</span></div>${items.map(t=>statementRow(t)).join('')}</section>`).join('');
  bindTransactionButtons($('movementList'));
}
function statementRow(t){
  const invoicePay=Boolean(t.is_invoice_payment);
  const sign=invoicePay?'':(t.type==='entrada'||t.type==='rendimento')?'+':t.type==='saida'?'-':'';
  const cls=invoicePay?'neutral':(t.type==='entrada'||t.type==='rendimento')?'positive':t.type==='saida'?'negative':'';
  const icon=invoicePay?'✓':t.type==='entrada'?'↑':t.type==='saida'?'↓':t.type==='rendimento'?'↗':'⇄';
  const meta=invoicePay?`Liquidação de fatura · ${accountNameCache(t)}`:`${t.category||t.purpose||''} · ${accountNameCache(t)}`;
  return `<button class="statement-row" data-transaction-id="${escapeHTML(t.id)}"><span class="txn-icon ${invoicePay?'invoice-payment':escapeHTML(t.type)}">${icon}</span><span class="transaction-copy"><strong>${escapeHTML(t.description||typeName(t.type))}</strong><small>${escapeHTML(meta)}</small></span><span class="transaction-amount"><b class="${cls}">${sign} ${escapeHTML(displayMoney(t.amount))}</b><small>${escapeHTML(paymentLabel(t.payment,t))}</small></span></button>`;
}
let __accountsCache=[];function accountNameCache(t){if(t.type==='transferencia'){const a=__accountsCache.find(x=>x.id===t.from_account_id),b=__accountsCache.find(x=>x.id===t.to_account_id);return `${a?.name||'Conta'} → ${b?.name||'Conta'}`}return __accountsCache.find(x=>x.id===t.account_id)?.name||'Conta'}

async function renderPlanning(){
  const [goals,allocs,s]=await Promise.all([getAll('goals'),getAll('allocations'),profileSnapshot()]);
  $('goalsList').innerHTML=goals.length?goals.map(g=>goalCard(g,allocs)).join(''):`<div class="empty-state list-card"><strong>Nenhum objetivo criado.</strong>Crie sua reserva ou um cofrinho e comece com o valor que fizer sentido hoje.</div>`;
  $$('[data-contribute-goal]',$('goalsList')).forEach(btn=>btn.addEventListener('click',()=>openContribution(btn.dataset.contributeGoal)));
  const mk=monthKey();const monthAllocs=allocs.filter(a=>monthKey(a.date)===mk).reduce((sum,a)=>sum+Number(a.amount||0),0);
  const monthTx=(await getAll('transactions')).filter(t=>monthKey(t.date)===mk&&t.type==='saida'&&!t.is_invoice_payment);const essential=monthTx.filter(t=>t.purpose==='Essencial').reduce((s,t)=>s+Number(t.amount||0),0);
  $('plannedContributions').textContent=displayMoney(monthAllocs);$('essentialSpend').textContent=displayMoney(essential);$('saveableMoney').textContent=displayMoney(Math.max(0,s.free));
  await renderDebts();
  await renderFinancialPath(s,goals,allocs,essential);
  await renderPatrimonyAndMonthClose(s,goals,allocs,essential);
}
function goalCard(g,allocs){const value=allocs.filter(a=>a.goal_id===g.id).reduce((s,a)=>s+Number(a.amount||0),0);const pct=g.target>0?clamp(Math.round(value/g.target*100),0,100):0;return `<article class="goal-card"><div class="goal-top"><span class="goal-mark">◇</span><span><strong>${escapeHTML(g.name)}</strong><small>${escapeHTML(g.description||'Objetivo')}</small></span><button class="goal-action" data-contribute-goal="${escapeHTML(g.id)}">Aportar</button></div><div class="goal-amount"><span><b>${escapeHTML(displayMoney(value))}</b><br>de ${escapeHTML(displayMoney(g.target))}</span><strong>${pct}%</strong></div><div class="progress-track"><span style="width:${pct}%"></span></div><div class="goal-meta"><span>Sugerido/mês <b>${escapeHTML(displayMoney(g.monthly||0))}</b></span><span>Destino <b>Meu planejamento</b></span></div></article>`}

async function financialDebtSnapshot(){
  const debts=(await getAll('debts')).filter(d=>d.active!==false);
  let contractual=0,settlement=0,potentialSavings=0;const open=[];
  for(const d of debts){
    const balance=await debtBalanceAt(d);if(balance<=0.005)continue;
    const offer=Number(d.settlement_amount||0);const payable=offer>0?Math.min(offer,balance):balance;
    contractual+=balance;settlement+=payable;potentialSavings+=Math.max(0,balance-payable);open.push({...d,current_balance:balance,payable});
  }
  return {contractual,settlement,potentialSavings,open};
}
async function renderFinancialPath(snapshot,goals,allocs,essentialSpend=0){
  if(!$('financialPathCard'))return;
  const pos=await financialPosition(snapshot,goals,allocs,essentialSpend);
  $('netWorthValue').textContent=displayMoney(pos.netWorth);$('reserveValue').textContent=displayMoney(pos.value);$('settlementDebtValue').textContent=displayMoney(pos.settlement);
  const next=await priorityRecommendation(snapshot,goals,allocs,essentialSpend);$('financialNextAction').textContent=next.title;$('financialNextActionDetail').textContent=next.detail;
}

async function renderMore(){await renderBackupStatus()}
async function openSettingsHub(){await renderMore();openDialog('settingsHubDialog')}

async function openAccountsManager(){
  const [accounts,balances]=await Promise.all([getAll('accounts'),accountBalances()]);
  const ordered=[...accounts].filter(a=>a.active!==false).sort((a,b)=>{
    const ia=DEFAULT_ACCOUNTS.findIndex(x=>x.id===a.id),ib=DEFAULT_ACCOUNTS.findIndex(x=>x.id===b.id);
    if(ia>=0&&ib>=0)return ia-ib;if(ia>=0)return -1;if(ib>=0)return 1;return a.name.localeCompare(b.name,'pt-BR');
  });
  $('accountsManagerList').innerHTML=ordered.map(a=>`<button type="button" class="account-manager-row" data-edit-account="${escapeHTML(a.id)}">${accountLogoHTML(a,'manager-account-logo')}<span><strong>${escapeHTML(a.name)}</strong><small>${escapeHTML(typeLabel(a.type))} · saldo atual</small></span><b>${escapeHTML(displayMoney(balances.get(a.id)||0))}</b><i>Editar</i></button>`).join('');
  $$('[data-edit-account]',$('accountsManagerList')).forEach(btn=>btn.addEventListener('click',()=>{closeDialog('accountsManagerDialog');openAccount(btn.dataset.editAccount)}));
  openDialog('accountsManagerDialog');
}

async function toggleValues(){appState.valuesHidden=!appState.valuesHidden;await metaSet('values_hidden',appState.valuesHidden);await renderHome();if(appState.view==='planning')renderPlanning();if(appState.view==='movements')renderMovements()}

async function populateMovementSelects(){
  const accounts=(await getAll('accounts')).filter(a=>a.active!==false);__accountsCache=accounts;
  const options=accounts.map(a=>`<option value="${escapeHTML(a.id)}">${escapeHTML(a.name)}</option>`).join('');
  ['movementAccount','transferFrom','transferTo'].forEach(id=>{$(id).innerHTML=`<option value="">Selecionar</option>${options}`});
  const purposes=PURPOSES.map(x=>`<option>${escapeHTML(x)}</option>`).join('');$('movementPurpose').innerHTML=purposes;$('transferPurpose').innerHTML=purposes;
  populateCategory();
}
function populateCategory(){const type=appState.movementType==='rendimento'?'rendimento':appState.movementType==='entrada'?'entrada':'saida';$('movementCategory').innerHTML=CATEGORIES[type].map(x=>`<option>${escapeHTML(x)}</option>`).join('')}
async function openMovement(type=''){
  $('editingTransactionId').value='';
  $('movementDialogTitle').textContent='Novo movimento';
  $('movementPrompt')?.classList.remove('hidden');
  $('deleteMovementBtn').classList.add('hidden');
  $('movementDescription').value='';$('movementNote').value='';
  setMoneyInput('movementValue',0);$('movementDate').value=todayISO();$('transferDate').value=todayISO();
  await populateMovementSelects();
  setMovementType(type||'');
  openDialog('movementDialog');
}
function setMovementType(type){
  appState.movementType=type||'';
  $$('.type-tabs [data-type]').forEach(b=>b.classList.toggle('active',!!type&&b.dataset.type===type));
  const neutral=!type;
  $('standardMovementFields').classList.toggle('hidden',neutral||type==='transferencia');
  $('transferFields').classList.toggle('hidden',neutral||type!=='transferencia');
  $('movementPrompt')?.classList.toggle('selected',!neutral);
  if(!neutral){
    populateCategory();
    $('movementPayment').closest('.field').classList.toggle('hidden',type==='rendimento');
  }
}
async function applyCajuDefault(){const a=await getOne('accounts',$('movementAccount').value);const hay=`${a?.name||''} ${a?.institution||''}`.toLowerCase();if(hay.includes('caju')){$('movementPayment').value='credito';$('movementPayment').title='Crédito usando saldo Caju, sem fatura.'}else $('movementPayment').title=''}

async function saveMovement(e){
  e.preventDefault();if(!appState.movementType)return showToast('Escolha o tipo de movimento.');const amount=readMoneyInput('movementValue');if(amount<=0)return showToast('Informe um valor.');const editingId=$('editingTransactionId').value;const profile=await currentProfile();
  if(appState.movementType==='transferencia'){
    const from=$('transferFrom').value,to=$('transferTo').value;if(!from||!to||from===to)return showToast('Escolha contas diferentes.');
    const obj={id:editingId||uid('txn'),type:'transferencia',amount,from_account_id:from,to_account_id:to,purpose:$('transferPurpose').value,date:$('transferDate').value||todayISO(),description:'Transferência',note:$('movementNote').value.trim(),profile_id:profile.id,created_at:editingId?(await getOne('transactions',editingId))?.created_at||nowISO():nowISO(),updated_at:nowISO()};await put('transactions',obj);await touchLocal();closeDialog('movementDialog');showSmartPhrase(editingId?'edit':'transferencia');await renderAll();return;
  }
  const account=$('movementAccount').value;if(!account)return showToast('Selecione a conta.');
  const existing=editingId?await getOne('transactions',editingId):null;
  const accountObj=await getOne('accounts',account);const selectedPayment=appState.movementType==='rendimento'?'':$('movementPayment').value;const isCreditPurchase=appState.movementType==='saida'&&selectedPayment==='credito'&&accountObj?.credit_card_enabled===true;
  const obj={id:editingId||uid('txn'),type:appState.movementType,amount,account_id:account,description:$('movementDescription').value.trim()||typeName(appState.movementType),category:$('movementCategory').value,payment:selectedPayment,purpose:$('movementPurpose').value,date:$('movementDate').value||todayISO(),note:$('movementNote').value.trim(),profile_id:profile.id,credit_purchase:isCreditPurchase,credit_settled:isCreditPurchase?(existing?.credit_settled||false):false,created_at:existing?.created_at||nowISO(),updated_at:nowISO()};
  await put('transactions',obj);await touchLocal();closeDialog('movementDialog');showSmartPhrase(editingId?'edit':obj.purpose==='Reserva'?'reserva':obj.type);await renderAll();
}
async function editMovement(id){const t=await getOne('transactions',id);if(!t)return;if(t.is_invoice_payment)return showToast('Liquidação de fatura é controlada pelo cartão Inter.');if(t.is_debt_payment&&t.debt_id){await openDebtDetail(t.debt_id);return}await populateMovementSelects();$('editingTransactionId').value=t.id;$('movementDialogTitle').textContent='Editar movimento';$('movementPrompt')?.classList.add('hidden');$('deleteMovementBtn').classList.remove('hidden');setMoneyInput('movementValue',t.amount);$('movementNote').value=t.note||'';setMovementType(t.type);if(t.type==='transferencia'){$('transferFrom').value=t.from_account_id||'';$('transferTo').value=t.to_account_id||'';$('transferPurpose').value=t.purpose||PURPOSES[0];$('transferDate').value=t.date||todayISO()}else{$('movementDescription').value=t.description||'';$('movementCategory').value=t.category||CATEGORIES.saida[0];$('movementAccount').value=t.account_id||'';$('movementPayment').value=t.payment||'pix';$('movementDate').value=t.date||todayISO();$('movementPurpose').value=t.purpose||PURPOSES[0];await applyCajuDefault()}openDialog('movementDialog')}
async function deleteMovement(){const id=$('editingTransactionId').value;if(!id)return;if(!confirm('Excluir este movimento?'))return;await remove('transactions',id);await touchLocal();closeDialog('movementDialog');showToast('Movimento excluído.');await renderAll()}

function setAccountColor(color,name='Personalizada',updateInput=true){
  const input=$('accountColor');if(updateInput&&input)input.value=color;
  if($('selectedColorName'))$('selectedColorName').textContent=name;
  $$('.color-swatch').forEach(btn=>btn.classList.toggle('selected',btn.dataset.color?.toLowerCase()===String(color).toLowerCase()));
}
function isInterAccount(a={}){return brandKey(a)==='inter'}
function toggleInterAccountSettings(){const show=isInterAccount({name:$('accountName')?.value,institution:$('accountInstitution')?.value,brand:''});$('interAccountSettings')?.classList.toggle('hidden',!show)}
async function openAccount(id=''){
  const a=id?await getOne('accounts',id):null;
  $('editingAccountId').value=a?.id||'';
  $('accountDialogTitle').textContent=a?'Editar conta':'Nova conta';
  $('accountName').value=a?.name||'';
  $('accountInstitution').value=a?.institution||'';
  $('accountType').value=a?.type||'digital';
  setMoneyInput('accountInitial',a?.initial_balance||0);
  setMoneyInput('interCdbGuarantee',a?.cdb_mais_limite ?? (isInterAccount(a||{})?504.33:0));
  toggleInterAccountSettings();
  const color=a?.color||'#2f80ed';
  setAccountColor(color, $$('.color-swatch').find(b=>b.dataset.color?.toLowerCase()===color.toLowerCase())?.dataset.colorName||'Personalizada');
  openDialog('accountDialog');
}
async function saveAccount(e){e.preventDefault();const id=$('editingAccountId').value||uid('acc');const old=await getOne('accounts',id);const detectedBrand=old?.brand||brandKey({name:$('accountName').value,institution:$('accountInstitution').value});const isInter=detectedBrand==='inter';const obj={id,name:$('accountName').value.trim(),institution:$('accountInstitution').value.trim(),type:$('accountType').value,initial_balance:readMoneyInput('accountInitial'),color:$('accountColor').value,brand:detectedBrand,credit_card_enabled:isInter?true:Boolean(old?.credit_card_enabled),cdb_mais_limite:isInter?readMoneyInput('interCdbGuarantee'):Number(old?.cdb_mais_limite||0),active:true,created_at:old?.created_at||nowISO(),updated_at:nowISO()};if(!obj.name)return;await put('accounts',obj);await touchLocal();closeDialog('accountDialog');showToast('Conta salva.');await renderAll()}

let activeAccountProfileId='';
async function openAccountProfile(id){activeAccountProfileId=id;const txs=await getAll('transactions');const account=await getOne('accounts',id);if(!account)return;const dates=txs.filter(t=>t.account_id===id||t.from_account_id===id||t.to_account_id===id).map(t=>t.date).sort();$('accountProfileFrom').value=dates[0]||todayISO();$('accountProfileTo').value=todayISO();await renderAccountProfile();openDialog('accountProfileDialog')}
async function renderAccountProfile(){
  if(!activeAccountProfileId)return;
  const [account,balances,txs,allocs]=await Promise.all([getOne('accounts',activeAccountProfileId),accountBalances(),getAll('transactions'),getAll('allocations')]);
  if(!account)return;
  const from=$('accountProfileFrom').value,to=$('accountProfileTo').value;
  const list=txs.filter(t=>(t.account_id===account.id||t.from_account_id===account.id||t.to_account_id===account.id)&&(!from||t.date>=from)&&(!to||t.date<=to)).sort((a,b)=>`${b.date}|${b.created_at}`.localeCompare(`${a.date}|${a.created_at}`));
  const income=list.filter(t=>t.type==='entrada'||t.type==='rendimento'||(t.type==='transferencia'&&t.to_account_id===account.id)).reduce((s,t)=>s+Number(t.amount||0),0);
  const expense=list.filter(t=>(t.type==='saida'&&!t.is_invoice_payment)||(t.type==='transferencia'&&t.from_account_id===account.id)).reduce((s,t)=>s+Number(t.amount||0),0);
  const allocated=allocs.filter(a=>a.account_id===account.id).reduce((s,a)=>s+Number(a.amount||0),0);
  $('accountProfileTitle').textContent=account.name;$('accountProfileName').textContent=account.name;$('accountProfileMeta').textContent=`${typeLabel(account.type)}${allocated?` · ${money(allocated)} alocado`:''}`;$('accountProfileBalance').textContent=displayMoney(balances.get(account.id)||0);$('accountProfileMark').innerHTML=accountLogoHTML(account,'account-profile-logo');$('accountProfileMark').style.background='transparent';
  $('accountProfileMetrics').innerHTML=`<div><small>Entradas</small><b class="positive">${displayMoney(income)}</b></div><div><small>Despesas</small><b class="negative">${displayMoney(expense)}</b></div><div><small>Resultado</small><b>${displayMoney(income-expense)}</b></div><div><small>Movimentos</small><b>${list.length}</b></div>`;
  const inter=isInterAccount(account);
  $('interCreditPanel')?.classList.toggle('hidden',!inter);
  if(inter){
    const invoice=await openInvoiceAmount(account.id);
    $('interGuaranteeValue').textContent=displayMoney(Number(account.cdb_mais_limite||0));
    $('interInvoiceValue').textContent=displayMoney(invoice);
    $('payInterInvoiceBtn')?.classList.toggle('hidden',invoice<=0.005);
  }
  $('accountProfileMovements').innerHTML=list.length?list.map(statementRow).join(''):`<div class="empty-state"><strong>Sem movimentos.</strong>Nenhum registro neste período.</div>`;bindTransactionButtons($('accountProfileMovements'));
}
async function payInterInvoice(){
  const account=await getOne('accounts',activeAccountProfileId);if(!account||!isInterAccount(account))return;
  const txs=await getAll('transactions');const open=txs.filter(t=>t.account_id===account.id&&t.type==='saida'&&t.payment==='credito'&&!t.is_invoice_payment&&!t.credit_settled);
  const amount=open.reduce((s,t)=>s+Number(t.amount||0),0);if(amount<=0.005)return showToast('Não há fatura em aberto.');
  const balances=await accountBalances();const available=Number(balances.get(account.id)||0);
  if(available+0.0001<amount)return showToast(`Saldo em conta insuficiente. Fatura: ${money(amount)}`);
  if(!confirm(`Pagar a fatura do Inter no valor de ${money(amount)} usando o saldo da conta corrente?`))return;
  const paymentId=uid('txn');
  await put('transactions',{id:paymentId,type:'saida',amount,account_id:account.id,description:'Pagamento fatura Inter',category:'Fatura do cartão',payment:'debito',purpose:'Pagamento de fatura',date:todayISO(),note:'Liquidação da fatura do cartão Inter.',profile_id:appState.activeProfileId,is_invoice_payment:true,created_at:nowISO(),updated_at:nowISO()});
  for(const t of open) await put('transactions',{...t,credit_settled:true,settled_at:nowISO(),invoice_payment_id:paymentId,updated_at:nowISO()});
  await touchLocal();showToast('Fatura paga sem duplicar a despesa.');await renderAll();await renderAccountProfile();
}

async function openGoal(){const accounts=await getAll('accounts');$('goalAccount').innerHTML=accounts.filter(a=>a.active!==false).map(a=>`<option value="${a.id}">${escapeHTML(a.name)}</option>`).join('');$('goalName').value='';$('goalDescription').value='';setMoneyInput('goalTarget',0);setMoneyInput('goalMonthly',0);openDialog('goalDialog')}
async function saveGoal(e){e.preventDefault();const account=$('goalAccount').value;if(!account)return showToast('Cadastre uma conta primeiro.');const obj={id:uid('goal'),name:$('goalName').value.trim(),description:$('goalDescription').value.trim(),profile_id:'profile_joao',account_id:account,target:readMoneyInput('goalTarget'),monthly:readMoneyInput('goalMonthly'),created_at:nowISO(),updated_at:nowISO()};if(!obj.name)return;await put('goals',obj);await touchLocal();closeDialog('goalDialog');showSmartPhrase('objetivo');await renderAll()}
async function openContribution(goalId){const goal=await getOne('goals',goalId);if(!goal)return;$('contributionGoalId').value=goal.id;$('contributionTitle').textContent=`Aportar em ${goal.name}`;$('contributionGoal').textContent=goal.name;setMoneyInput('contributionValue',0);openDialog('contributionDialog');setTimeout(()=>$('contributionValue').focus(),120)}
async function saveContribution(e){e.preventDefault();const goal=await getOne('goals',$('contributionGoalId').value);if(!goal)return;const amount=readMoneyInput('contributionValue');if(amount<=0)return showToast('Informe um valor.');const [balances,existingAllocs]=await Promise.all([accountBalances(),getAll('allocations')]);const alreadyAllocated=existingAllocs.filter(a=>a.account_id===goal.account_id).reduce((sum,a)=>sum+Number(a.amount||0),0);const unallocated=Math.max(0,Number(balances.get(goal.account_id)||0)-alreadyAllocated);if(amount>unallocated+0.0001)return showToast(`Disponível para alocar: ${money(unallocated)}`);await put('allocations',{id:uid('alloc'),goal_id:goal.id,profile_id:'profile_joao',source_profile_id:'profile_joao',account_id:goal.account_id,amount,date:todayISO(),created_at:nowISO(),updated_at:nowISO()});await touchLocal();closeDialog('contributionDialog');showSmartPhrase(goal.name.toLowerCase().includes('reserva')?'reserva':'aporte');await renderAll()}

function parseDecimalBR(value){
  let raw=String(value??'').trim().replace(/\s/g,'');
  if(raw.includes(',')) raw=raw.replace(/\./g,'').replace(',','.');
  const n=Number(raw);return Number.isFinite(n)?n:0;
}
function formatRateBR(n){return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:4})}
function daysBetween(a,b){const x=new Date(`${a}T12:00:00`),y=new Date(`${b}T12:00:00`);return Math.max(0,(y-x)/86400000)}
function debtMonthlyRate(debt){const monthly=Number(debt.monthly_rate||0);if(monthly>0)return monthly/100;const annual=Number(debt.annual_rate||0);return annual>0?Math.pow(1+annual/100,1/12)-1:0}
function accrueDebt(amount,debt,fromDate,toDate){const r=debtMonthlyRate(debt);if(r<=0||!fromDate||!toDate)return amount;const days=daysBetween(fromDate,toDate);return amount*Math.pow(1+r,days/30.4375)}
async function debtPayments(debtId){return (await getAll('transactions')).filter(t=>t.is_debt_payment&&t.debt_id===debtId).sort((a,b)=>`${a.date}|${a.created_at}`.localeCompare(`${b.date}|${b.created_at}`))}
async function debtBalanceAt(debt,asOf=todayISO()){
  let balance=Number(debt.base_balance||0),cursor=debt.base_date||todayISO();
  const payments=await debtPayments(debt.id);
  for(const p of payments){if(p.date>asOf)continue;const when=p.date<cursor?cursor:p.date;balance=accrueDebt(balance,debt,cursor,when);balance=Math.max(0,balance-Number(p.amount||0));cursor=when}
  balance=accrueDebt(balance,debt,cursor,asOf);return Math.max(0,balance);
}
async function renderDebts(){
  const debts=(await getAll('debts')).filter(d=>d.active!==false);
  const rows=[];let total=0;
  for(const debt of debts){const current=await debtBalanceAt(debt);if(current<=0.005)continue;total+=current;rows.push(debtCard(debt,current))}
  rows.sort((a,b)=>b.balance-a.balance);
  $('debtsSummary').textContent=rows.length?`${rows.length} ${rows.length===1?'dívida':'dívidas'} · ${displayMoney(total)} em aberto`:'Nenhuma dívida em aberto';
  $('debtsList').innerHTML=rows.length?rows.map(x=>x.html).join(''):`<div class="empty-state list-card"><strong>Nenhuma dívida em aberto.</strong>Cadastre apenas o que você realmente precisa acompanhar.</div>`;
  $$('[data-debt-id]',$('debtsList')).forEach(btn=>btn.addEventListener('click',()=>openDebtDetail(btn.dataset.debtId)));
}
function debtCard(debt,current){
  const rate=debtMonthlyRate(debt);const original=Number(debt.base_balance||0);const pct=original>0?clamp(Math.round((1-current/original)*100),0,100):0;
  const rateText=rate>0?`${formatRateBR(Number(debt.monthly_rate||rate*100))}% a.m.`:'Sem juros';const payoff=debtPayoffAmount(debt,current);const savings=Math.max(0,current-payoff);
  const offerMeta=savings>0?`Quitação ${money(payoff)} · economiza ${money(savings)}`:`${debt.creditor|| (debt.kind==='informal'?'Dívida informal':'Dívida formal')} · ${rateText}`;
  const html=`<button class="debt-card ${rate>0?'with-interest':'no-interest'} ${savings>0?'has-offer':''}" data-debt-id="${escapeHTML(debt.id)}"><span class="debt-icon">${savings>0?'%':rate>0?'↗':'—'}</span><span class="debt-copy"><strong>${escapeHTML(debt.name)}</strong><small>${escapeHTML(offerMeta)}</small><span class="debt-mini-progress"><i style="width:${pct}%"></i></span></span><span class="debt-value"><b>${escapeHTML(displayMoney(payoff))}</b><small>${savings>0?'para quitar':`${pct}% reduzido`}</small></span><span class="chev">›</span></button>`;
  return {balance:payoff,html};
}
function toggleDebtSettlementFields(){const on=$('debtHasSettlement')?.value==='yes';$$('.debt-settlement-field').forEach(x=>x.classList.toggle('hidden',!on))}
function debtPayoffAmount(debt,current){const offer=Number(debt.settlement_amount||0);return offer>0?Math.min(offer,current):current}
function toggleDebtRateFields(){const on=$('debtHasInterest')?.value==='yes';$$('.debt-rate-field').forEach(x=>x.classList.toggle('hidden',!on));$('debt-interest-help')?.classList.toggle('hidden',!on)}
function openDebt(id=''){
  const load=async()=>{const d=id?await getOne('debts',id):null;$('editingDebtId').value=d?.id||'';$('debtDialogTitle').textContent=d?'Editar dívida':'Nova dívida';$('debtName').value=d?.name||'';$('debtCreditor').value=d?.creditor||'';$('debtKind').value=d?.kind||'formal';$('debtBaseDate').value=d?.base_date||todayISO();setMoneyInput('debtBaseBalance',d?.base_balance||0);const settlement=Number(d?.settlement_amount||0)>0;$('debtHasSettlement').value=settlement?'yes':'no';setMoneyInput('debtSettlementAmount',d?.settlement_amount||0);$('debtOfferExpiry').value=d?.offer_expiry||'';$('debtPriority').value=d?.priority||'medium';const has=Number(d?.monthly_rate||0)>0||Number(d?.annual_rate||0)>0;$('debtHasInterest').value=has?'yes':'no';$('debtMonthlyRate').value=has?formatRateBR(d?.monthly_rate||0):'';$('debtAnnualRate').value=has?formatRateBR(d?.annual_rate||0):'';$('debtNote').value=d?.note||'';$('deleteDebtBtn').classList.toggle('hidden',!d);toggleDebtSettlementFields();toggleDebtRateFields();openDialog('debtDialog')};load();
}
async function saveDebt(e){e.preventDefault();const id=$('editingDebtId').value||uid('debt');const old=await getOne('debts',id);const has=$('debtHasInterest').value==='yes',hasSettlement=$('debtHasSettlement').value==='yes';const obj={id,name:$('debtName').value.trim(),creditor:$('debtCreditor').value.trim(),kind:$('debtKind').value,base_date:$('debtBaseDate').value||todayISO(),base_balance:readMoneyInput('debtBaseBalance'),settlement_amount:hasSettlement?readMoneyInput('debtSettlementAmount'):0,offer_expiry:hasSettlement?$('debtOfferExpiry').value:'',priority:$('debtPriority').value||'medium',monthly_rate:has?parseDecimalBR($('debtMonthlyRate').value):0,annual_rate:has?parseDecimalBR($('debtAnnualRate').value):0,note:$('debtNote').value.trim(),active:true,created_at:old?.created_at||nowISO(),updated_at:nowISO()};if(!obj.name)return showToast('Dê um nome à dívida.');if(obj.base_balance<=0)return showToast('Informe o saldo da dívida.');if(hasSettlement&&(obj.settlement_amount<=0||obj.settlement_amount>obj.base_balance))return showToast('Informe um valor de quitação válido.');if(has&&obj.monthly_rate<=0&&obj.annual_rate<=0)return showToast('Informe ao menos uma taxa de juros.');await put('debts',obj);await touchLocal();closeDialog('debtDialog');showToast(old?'Dívida atualizada.':'Dívida adicionada ao planejamento.');await renderAll()}
async function deleteDebt(){const id=$('editingDebtId').value;if(!id)return;const payments=await debtPayments(id);if(payments.length&&!confirm('Esta dívida possui pagamentos vinculados. Excluir a dívida manterá os lançamentos financeiros. Continuar?'))return;if(!payments.length&&!confirm('Excluir esta dívida?'))return;await remove('debts',id);await touchLocal();closeDialog('debtDialog');closeDialog('debtDetailDialog');showToast('Dívida removida.');await renderAll()}
let activeDebtId='';
async function openDebtDetail(id){activeDebtId=id;await renderDebtDetail();openDialog('debtDetailDialog')}
async function renderDebtDetail(){__accountsCache=await getAll('accounts');const debt=await getOne('debts',activeDebtId);if(!debt)return;const payments=await debtPayments(debt.id);const current=await debtBalanceAt(debt);const paid=payments.reduce((s,p)=>s+Number(p.amount||0),0);const original=Number(debt.base_balance||0);const pct=original>0?clamp(Math.round((1-current/original)*100),0,100):0;const rate=debtMonthlyRate(debt);$('debtDetailKind').textContent=debt.kind==='informal'?'DÍVIDA INFORMAL':'DÍVIDA FORMAL';$('debtDetailName').textContent=debt.name;$('debtDetailBalance').textContent=displayMoney(current);$('debtDetailRate').textContent=rate>0?`${formatRateBR(Number(debt.monthly_rate||rate*100))}% ao mês${Number(debt.annual_rate||0)>0?` · ${formatRateBR(debt.annual_rate)}% ao ano`:''}`:'Sem juros';$('debtDetailOriginal').textContent=displayMoney(original);$('debtDetailPaid').textContent=displayMoney(paid);$('debtDetailBaseDate').textContent=dateBR(debt.base_date);$('debtDetailCreditor').textContent=debt.creditor||'Não informado';const payoff=debtPayoffAmount(debt,current),savings=Math.max(0,current-payoff);$('debtDetailSettlement').textContent=Number(debt.settlement_amount||0)>0?displayMoney(payoff):'Sem oferta';$('debtDetailSavings').textContent=savings>0?displayMoney(savings):'—';$('debtDetailSettlementBox').classList.toggle('hidden',Number(debt.settlement_amount||0)<=0);$('debtDetailSavingsBox').classList.toggle('hidden',savings<=0);$('debtDetailProgressText').textContent=`${pct}%`;$('debtDetailProgressBar').style.width=`${pct}%`;$('debtProjection').classList.toggle('hidden',rate<=0);if(rate>0){const next=accrueDebt(current,debt,todayISO(),new Date(Date.now()+30.4375*86400000).toISOString().slice(0,10));$('debtNextMonth').textContent=displayMoney(next)}$('payDebtBtn').disabled=current<=0.005;$('debtPaymentsList').innerHTML=payments.length?[...payments].reverse().map(p=>`<button type="button" class="debt-payment-row" data-delete-debt-payment="${escapeHTML(p.id)}"><span><strong>${escapeHTML(dateBR(p.date))}</strong><small>${escapeHTML(accountNameCache(p))} · toque para corrigir</small></span><b>${escapeHTML(displayMoney(p.amount))}</b></button>`).join(''):`<div class="empty-state compact-empty">Nenhum pagamento registrado.</div>`;$$('[data-delete-debt-payment]',$('debtPaymentsList')).forEach(btn=>btn.addEventListener('click',()=>deleteDebtPayment(btn.dataset.deleteDebtPayment)));setMoneyInput('debtSimulationPayment',0);$('debtSimulationResult').textContent='Informe um pagamento mensal para simular.'}
function editActiveDebt(){if(!activeDebtId)return;closeDialog('debtDetailDialog');openDebt(activeDebtId)}
async function openDebtPayment(){const debt=await getOne('debts',activeDebtId);if(!debt)return;const accounts=(await getAll('accounts')).filter(a=>a.active!==false);$('debtPaymentDebtId').value=debt.id;$('debtPaymentTitle').textContent=`Pagar ${debt.name}`;$('debtPaymentAccount').innerHTML=accounts.map(a=>`<option value="${escapeHTML(a.id)}">${escapeHTML(a.name)}</option>`).join('');setMoneyInput('debtPaymentValue',0);$('debtPaymentDate').value=todayISO();closeDialog('debtDetailDialog');openDialog('debtPaymentDialog');setTimeout(()=>$('debtPaymentValue').focus(),120)}
async function saveDebtPayment(e){e.preventDefault();const debt=await getOne('debts',$('debtPaymentDebtId').value);if(!debt)return;const amount=readMoneyInput('debtPaymentValue'),date=$('debtPaymentDate').value||todayISO(),accountId=$('debtPaymentAccount').value;if(amount<=0)return showToast('Informe um valor.');const due=await debtBalanceAt(debt,date);if(amount>due+0.01)return showToast(`Saldo estimado nessa data: ${money(due)}`);const tx={id:uid('txn'),type:'saida',amount,account_id:accountId,description:`Pagamento · ${debt.name}`,category:'Pagamento de dívida',payment:'pix',purpose:'Pagamento de dívida',date,note:`Pagamento vinculado à dívida ${debt.name}.`,profile_id:'profile_joao',is_debt_payment:true,debt_id:debt.id,created_at:nowISO(),updated_at:nowISO()};await put('transactions',tx);await touchLocal();closeDialog('debtPaymentDialog');showToast('Pagamento registrado e dívida recalculada.');await renderAll();await openDebtDetail(debt.id)}
async function deleteDebtPayment(id){const tx=await getOne('transactions',id);if(!tx?.is_debt_payment)return;if(!confirm(`Excluir o pagamento de ${money(tx.amount)}? O saldo da dívida será recalculado.`))return;await remove('transactions',id);await touchLocal();showToast('Pagamento removido e dívida recalculada.');await renderAll();await renderDebtDetail()}
async function simulateActiveDebt(){const debt=await getOne('debts',activeDebtId);if(!debt)return;const payment=readMoneyInput('debtSimulationPayment');if(payment<=0)return $('debtSimulationResult').textContent='Informe um pagamento mensal maior que zero.';let balance=await debtBalanceAt(debt),months=0;const rate=debtMonthlyRate(debt);if(rate>0&&payment<=balance*rate){$('debtSimulationResult').textContent='Esse pagamento não cobre nem os juros estimados do primeiro mês.';return}while(balance>0.005&&months<600){balance=balance*(1+rate)-payment;months++}if(months>=600){$('debtSimulationResult').textContent='Prazo superior a 50 anos com esse pagamento.';return}const total=payment*months;$('debtSimulationResult').textContent=`Estimativa: ${months} ${months===1?'mês':'meses'} para quitar · até ${money(total)} em pagamentos.`}

async function cycleAccountFilter(){const accounts=(await getAll('accounts')).filter(a=>a.active!==false);const ids=['',...accounts.map(a=>a.id)];const idx=ids.indexOf(appState.movementAccount);appState.movementAccount=ids[(idx+1)%ids.length];const a=accounts.find(x=>x.id===appState.movementAccount);$('movementAccountFilterBtn').innerHTML=`${a?escapeHTML(a.name):'Conta'} <span>⌄</span>`;renderMovements()}
async function cycleCategoryFilter(){const cats=['',...new Set([...CATEGORIES.saida,...CATEGORIES.entrada,...CATEGORIES.rendimento])];const idx=cats.indexOf(appState.movementCategory);appState.movementCategory=cats[(idx+1)%cats.length];$('movementCategoryFilterBtn').innerHTML=`${appState.movementCategory?escapeHTML(appState.movementCategory):'Categoria'} <span>⌄</span>`;renderMovements()}


function previousMonthKey(mk=monthKey()){
  const [y,m]=mk.split('-').map(Number);const d=new Date(y,m-2,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
async function reserveSnapshot(goals=null,allocs=null){
  goals=goals||await getAll('goals');allocs=allocs||await getAll('allocations');
  const ids=new Set(goals.filter(g=>/reserva|emerg[eê]ncia|seguran[cç]a/i.test(`${g.name||''} ${g.description||''}`)).map(g=>g.id));
  const value=allocs.filter(a=>ids.has(a.goal_id)).reduce((sum,a)=>sum+Number(a.amount||0),0);
  const target=goals.filter(g=>ids.has(g.id)).reduce((sum,g)=>sum+Number(g.target||0),0);
  return {value,target};
}
async function financialPosition(snapshot=null,goals=null,allocs=null,essential=0){
  snapshot=snapshot||await profileSnapshot();const ds=await financialDebtSnapshot();const rs=await reserveSnapshot(goals,allocs);
  const guarantees=(snapshot.accounts||[]).reduce((sum,a)=>sum+Number(a.cdb_mais_limite||0),0);
  const assets=Number(snapshot.total||0)+guarantees;const liabilities=ds.contractual;const netWorth=assets-liabilities;
  const coverage=essential>0?rs.value/essential:0;
  return {...ds,...rs,assets,liabilities,netWorth,coverage};
}
async function priorityRecommendation(snapshot=null,goals=null,allocs=null,essential=0){
  snapshot=snapshot||await profileSnapshot();goals=goals||await getAll('goals');allocs=allocs||await getAll('allocations');
  const pos=await financialPosition(snapshot,goals,allocs,essential);
  const minReserve=pos.target>0?Math.min(pos.target,Math.max(500,essential||0)):Math.max(500,essential||0);
  const offers=pos.open.filter(d=>Number(d.settlement_amount||0)>0).sort((a,b)=>({high:0,medium:1,low:2}[a.priority]??1)-({high:0,medium:1,low:2}[b.priority]??1)||(a.payable-b.payable));
  if(pos.value+0.005<minReserve)return {title:'Reforçar a reserva mínima',detail:`Faltam ${money(Math.max(0,minReserve-pos.value))} para a camada mínima de segurança.`};
  if(offers.length){const d=offers[0],saved=Math.max(0,d.current_balance-d.payable);return {title:`Quitar ${d.name}`,detail:`Oferta de ${money(d.payable)}${saved>0?` reduz ${money(saved)} adicionais da obrigação`:''}.`};}
  if(pos.open.length){const d=[...pos.open].sort((a,b)=>debtMonthlyRate(b)-debtMonthlyRate(a))[0];return {title:`Reduzir ${d.name}`,detail:debtMonthlyRate(d)>0?'Prioridade pela incidência de juros.':'Próxima obrigação aberta no saneamento financeiro.'};}
  if(pos.target>0&&pos.value+0.005<pos.target)return {title:'Completar a reserva de emergência',detail:`Progresso: ${money(pos.value)} de ${money(pos.target)}.`};
  return {title:'Avançar para construção patrimonial',detail:'Reserva e obrigações permitem direcionar novos aportes para patrimônio de longo prazo.'};
}
async function renderHomePriority(snapshot){
  if(!$('homePriorityTitle'))return;const txs=await getAll('transactions');const mk=monthKey();const essential=txs.filter(t=>monthKey(t.date)===mk&&t.type==='saida'&&!t.is_invoice_payment&&!t.is_debt_payment&&t.purpose==='Essencial').reduce((s,t)=>s+Number(t.amount||0),0);const r=await priorityRecommendation(snapshot,null,null,essential);$('homePriorityTitle').textContent=r.title;$('homePriorityDetail').textContent=r.detail;
}
async function renderPatrimonyAndMonthClose(snapshot,goals,allocs,essential){
  const pos=await financialPosition(snapshot,goals,allocs,essential);$('assetsValue').textContent=displayMoney(pos.assets);$('liabilitiesValue').textContent=displayMoney(pos.liabilities);$('planningNetWorthValue').textContent=displayMoney(pos.netWorth);$('planningNetWorthValue').className=pos.netWorth>=0?'positive':'negative';$('reserveCoverage').textContent=essential>0?`${pos.coverage.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} ${pos.coverage===1?'mês':'meses'}`:'—';
  const txs=await getAll('transactions'),mk=monthKey();const month=txs.filter(t=>monthKey(t.date)===mk);const income=month.filter(t=>t.type==='entrada'||t.type==='rendimento').reduce((s,t)=>s+Number(t.amount||0),0);const operating=month.filter(t=>t.type==='saida'&&!t.is_invoice_payment&&!t.is_debt_payment).reduce((s,t)=>s+Number(t.amount||0),0);const debt=month.filter(t=>t.is_debt_payment).reduce((s,t)=>s+Number(t.amount||0),0);const savings=Math.max(0,income-operating-debt);const rate=income>0?savings/income*100:0;
  $('closeIncome').textContent=displayMoney(income);$('closeOperatingExpense').textContent=displayMoney(operating);$('closeDebtPayments').textContent=displayMoney(debt);$('closeSavingsRate').textContent=`${Math.round(rate)}%`;
  const snap={id:`month_${mk}`,month:mk,income,operating_expense:operating,debt_payments:debt,savings_rate:rate,net_worth:pos.netWorth,assets:pos.assets,liabilities:pos.liabilities,reserve:pos.value,updated_at:nowISO()};await put('monthly_snapshots',snap);
  const prev=await getOne('monthly_snapshots',`month_${previousMonthKey(mk)}`);if(prev){const delta=pos.netWorth-Number(prev.net_worth||0);$('monthComparison').textContent=`Patrimônio líquido ${delta>=0?'avançou':'recuou'} ${money(Math.abs(delta))} em relação ao último fechamento registrado.`;}else $('monthComparison').textContent='Este mês será a base para as próximas comparações patrimoniais.';
}
async function renderBackupStatus(){
  const el=$('backupStatus');if(!el)return;const last=await metaGet('last_backup_at',null);el.classList.remove('backup-due','backup-ok');if(!last){el.textContent='Nenhum backup registrado · recomendado agora';el.classList.add('backup-due');return}const days=Math.floor((Date.now()-new Date(last).getTime())/86400000);el.textContent=days<=0?'Último backup: hoje':`Último backup: há ${days} ${days===1?'dia':'dias'}`;el.classList.add(days>=7?'backup-due':'backup-ok');
}
async function auditDataIntegrity(){
  const [accounts,txs,debts,goals,allocs]=await Promise.all([getAll('accounts'),getAll('transactions'),getAll('debts'),getAll('goals'),getAll('allocations')]);const accountIds=new Set(accounts.map(x=>x.id)),debtIds=new Set(debts.map(x=>x.id)),goalIds=new Set(goals.map(x=>x.id));const problems=[];
  for(const t of txs){if(!t.id||!Number.isFinite(Number(t.amount))||Number(t.amount)<0)problems.push(`Movimentação inválida: ${t.description||t.id||'sem id'}`);if(t.type==='transferencia'){if(!accountIds.has(t.from_account_id)||!accountIds.has(t.to_account_id))problems.push(`Transferência com conta ausente: ${t.description||t.id}`);if(t.from_account_id===t.to_account_id)problems.push(`Transferência para a mesma conta: ${t.description||t.id}`);}else if(t.account_id&&!accountIds.has(t.account_id))problems.push(`Movimentação com conta ausente: ${t.description||t.id}`);if(t.is_debt_payment&&!debtIds.has(t.debt_id))problems.push(`Pagamento ligado a dívida ausente: ${t.description||t.id}`);}
  for(const a of allocs)if(!goalIds.has(a.goal_id))problems.push(`Aporte ligado a objetivo ausente: ${a.id}`);
  if(problems.length){console.warn('Orion integrity audit',problems);alert(`O Orion encontrou ${problems.length} ponto(s) para revisão. Nenhum dado foi alterado.\n\n${problems.slice(0,8).join('\n')}${problems.length>8?'\n…':''}`);}else showToast('Integridade verificada: nenhum problema encontrado.');
}

function showSmartPhrase(context){const bank=PHRASES[context]||PHRASES.neutral;const keyBase=context;let candidates=bank.map((text,i)=>({text,key:`${keyBase}_${i}`})).filter(x=>!appState.lastPhraseKeys.includes(x.key));if(!candidates.length)candidates=bank.map((text,i)=>({text,key:`${keyBase}_${i}`}));const chosen=candidates[Math.floor(Math.random()*candidates.length)];if(Math.random()<.28 && !['aporte','reserva','rendimento'].includes(context)){showToast('✓ Registrado');return}appState.lastPhraseKeys=[chosen.key,...appState.lastPhraseKeys].slice(0,30);metaSet('last_phrase_keys',appState.lastPhraseKeys);showToast(chosen.text)}

async function requestPersistentStorage(){
  try{if(navigator.storage?.persist)await navigator.storage.persist()}catch{}
}
async function snapshot(){
  const out={version:APP_VERSION,exported_at:nowISO(),data:{}};
  for(const store of ['profiles','accounts','transactions','goals','allocations','debts','monthly_snapshots'])out.data[store]=await getAll(store);
  return out;
}
async function restoreSnapshot(snap){
  for(const store of ['profiles','accounts','transactions','goals','allocations','debts','monthly_snapshots']){
    await clearStore(store);
    for(const item of (snap.data?.[store]||[]))await put(store,item);
  }
  let joao=await getOne('profiles','profile_joao');
  if(!joao){
    joao={id:'profile_joao',name:'João H.',type:'pessoal',subtitle:'Principal',principal:true,created_at:nowISO(),updated_at:nowISO()};
    await put('profiles',joao);
  }else if(joao.name!=='João H.'){
    await put('profiles',{...joao,name:'João H.',principal:true,updated_at:nowISO()});
  }
  for(const p of await getAll('profiles'))if(p.id!=='profile_joao')await remove('profiles',p.id);
  appState.activeProfileId='profile_joao';
  await metaSet('active_profile_id','profile_joao');
  await touchLocal();
  await renderAll();
}

function downloadJSON(data,filename){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function exportBackup(){const data=await snapshot();downloadJSON(data,`orion-backup-${todayISO()}.json`);await metaSet('last_backup_at',nowISO());await renderBackupStatus();showToast('Backup local exportado.')}
function validateBackup(data){if(!data||typeof data!=='object'||!data.data||typeof data.data!=='object')throw new Error('Estrutura de backup inválida.');const required=['profiles','accounts','transactions','goals','allocations','debts'];for(const key of required)if(!Array.isArray(data.data[key]))throw new Error(`Coleção ausente: ${key}`);for(const t of data.data.transactions){if(!t?.id||!['entrada','saida','transferencia','rendimento'].includes(t.type)||!Number.isFinite(Number(t.amount))||Number(t.amount)<0)throw new Error('Há movimentações inválidas no backup.')}return true}
async function importBackup(e){const file=e.target.files?.[0];if(!file)return;try{const text=await file.text();const data=JSON.parse(text);validateBackup(data);if(!confirm('O arquivo foi validado. Substituir os dados locais por este backup? O Orion baixará antes uma cópia de segurança do estado atual.'))return;downloadJSON(await snapshot(),`orion-pre-restauracao-${todayISO()}.json`);await restoreSnapshot(data);await metaSet('last_backup_at',nowISO());showToast('Backup restaurado com cópia de segurança prévia.')}catch(err){console.error(err);showToast(err?.message||'Backup inválido.')}finally{e.target.value=''}}
async function resetLocal(){if(!confirm('Recomeçar do zero? Todos os dados deste Orion neste aparelho serão apagados.'))return;const code=prompt('Digite ZERAR para confirmar.');if(code!=='ZERAR')return;for(const s of STORES)await clearStore(s);await put('profiles',{id:'profile_joao',name:'João H.',type:'pessoal',subtitle:'Principal',principal:true,created_at:nowISO(),updated_at:nowISO()});await ensureDefaultAccounts();await metaSet('active_profile_id','profile_joao');await metaSet('local_updated_at',nowISO());appState.activeProfileId='profile_joao';closeDialog('aboutDialog');await renderAll();showToast('Orion reiniciado do zero.')}

bootstrap().catch(err=>{console.error(err);document.body.innerHTML=`<main style="padding:40px;color:white;font-family:-apple-system"><h1>Orion</h1><p>Não foi possível iniciar o banco local.</p><pre style="white-space:pre-wrap;color:#ff8d7b">${escapeHTML(err?.message||err)}</pre></main>`});
