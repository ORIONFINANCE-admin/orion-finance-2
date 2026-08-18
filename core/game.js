import { getAll, put, queueChange } from "./db.js";
import { makeId, nowISO } from "./utils.js";
const LEVELS=[
{level:1,xp:0,title:"Observador"},{level:2,xp:100,title:"Organizador"},{level:3,xp:250,title:"Estruturador"},{level:4,xp:450,title:"Guardião"},{level:5,xp:700,title:"Explorador"},{level:6,xp:1000,title:"Construtor"},{level:7,xp:1400,title:"Estrategista"},{level:8,xp:1900,title:"Navegador"},{level:9,xp:2500,title:"Arquiteto"},{level:10,xp:3200,title:"Orion"}];
export async function awardXP(type,reference,xp,description){
 const events=await getAll("eventos_xp"); const ref=String(reference||`${type}:${new Date().toISOString().slice(0,10)}`); if(events.some(e=>e.referencia===ref))return null;
 const record={evento_id:makeId("xp"),tipo:String(type||"progresso"),referencia:ref,xp:Math.max(0,Number(xp||0)),descricao:String(description||"").trim(),criado_em:nowISO()};
 await put("eventos_xp",record); await queueChange("EVENTOS_XP",record); return record;
}
export async function getGameState({transactions=[],debts=[],reserve=null,recurring=[],eventsFinancial=[]}={}){
 const events=await getAll("eventos_xp"); return calculateGameState({transactions,debts,reserve,recurring,eventsFinancial,events});
}
function nthDate(transactions,n){return transactions.slice().sort((a,b)=>String(a.data||"").localeCompare(String(b.data||"")))[n-1]?.data||""}
function distinctDayDate(transactions,n){const days=[...new Set(transactions.map(t=>String(t.data||"").slice(0,10)).filter(Boolean))].sort();return days[n-1]||""}
export function calculateGameState({transactions=[],debts=[],reserve=null,recurring=[],eventsFinancial=[],events=[]}={}){
 const movementXP=transactions.length*10; const bonusXP=events.filter(e=>e.tipo!=="registro").reduce((s,e)=>s+Number(e.xp||0),0); const xp=movementXP+bonusXP;
 const current=[...LEVELS].reverse().find(l=>xp>=l.xp)||LEVELS[0],next=LEVELS.find(l=>l.level===current.level+1)||null;
 const progress=next?Math.max(0,Math.min(100,(xp-current.xp)/(next.xp-current.xp)*100)):100;
 const rt=Number(reserve?.valor_alvo||0),rc=Number(reserve?.valor_atual||0),rp=rt>0?Math.min(100,rc/rt*100):0;
 const distinctDays=new Set(transactions.map(t=>String(t.data||"").slice(0,10)).filter(Boolean)).size,paid=debts.filter(d=>d.status==="quitada"),paidDebts=paid.length;
 const positiveMonths=(()=>{const by={};for(const t of transactions){const m=String(t.data||"").slice(0,7);if(!m)continue;(by[m]||={e:0,s:0});if(t.tipo==="entrada")by[m].e+=Number(t.valor||0);else if(t.tipo==="saida")by[m].s+=Number(t.valor||0)}return Object.entries(by).filter(([,v])=>v.e>v.s).map(([k])=>k)})();
 const hasYield=transactions.some(t=>String(t.forma_pagamento||"").includes("rendimento")||/rendimento|juros/i.test(String(t.descricao||"")));
 const guaranteedEvent=eventsFinancial.find(e=>Number(e.percent||0)>=100);
 const achievements=[
  badge("🏁","Primeiro Registro","A jornada saiu da cabeça e entrou no mapa.",transactions.length>=1,"bronze",nthDate(transactions,1),1,transactions.length),
  badge("🧭","Mapa Ganho","10 movimentações registradas.",transactions.length>=10,"bronze",nthDate(transactions,10),10,transactions.length),
  badge("🗺️","Cartógrafo","50 movimentações registradas.",transactions.length>=50,"prata",nthDate(transactions,50),50,transactions.length),
  badge("🌌","Mapa Profundo","150 movimentações reconhecidas.",transactions.length>=150,"ouro",nthDate(transactions,150),150,transactions.length),
  badge("🔥","Constância","Registros em 7 dias diferentes.",distinctDays>=7,"bronze",distinctDayDate(transactions,7),7,distinctDays),
  badge("🛰️","Órbita Estável","Registros em 30 dias diferentes.",distinctDays>=30,"prata",distinctDayDate(transactions,30),30,distinctDays),
  badge("🧱","Fundação","25% da reserva construída.",rp>=25,"bronze","",25,Math.round(rp)),
  badge("🛡️","Meio Caminho","50% da reserva construída.",rp>=50,"prata","",50,Math.round(rp)),
  badge("🌕","Reserva Completa","100% da reserva construída.",rp>=100,"ouro","",100,Math.round(rp)),
  badge("✂️","Menos Uma","Primeira dívida quitada.",paidDebts>=1,"prata",paid[0]?.atualizado_em||"",1,paidDebts),
  badge("♻️","Rotina Mapeada","Primeira despesa recorrente ativa.",recurring.some(r=>r.status!=="inativa"),"bronze",recurring.find(r=>r.status!=="inativa")?.criado_em||"",1,recurring.filter(r=>r.status!=="inativa").length),
  badge("✨","Dinheiro Trabalhando","Primeiro rendimento registrado.",hasYield,"bronze",transactions.find(t=>String(t.forma_pagamento||"").includes("rendimento")||/rendimento|juros/i.test(String(t.descricao||"")))?.data||"",1,hasYield?1:0),
  badge("☀️","Mês Positivo","Primeiro mês com entradas maiores que saídas.",positiveMonths.length>=1,"prata",positiveMonths[0]?`${positiveMonths[0]}-28`:"",1,positiveMonths.length),
  badge("🎯","Decisão Protegida","Primeiro evento financeiramente garantido.",!!guaranteedEvent,"ouro",guaranteedEvent?.event?.atualizado_em||"",100,guaranteedEvent?.percent||0)
 ];
 const medals=[medal("Registros",transactions.length,[10,50,150]),medal("Constância",distinctDays,[7,30,90]),medal("Dívidas quitadas",paidDebts,[1,3,6]),medal("Meses positivos",positiveMonths.length,[1,3,6]),medal("Eventos garantidos",eventsFinancial.filter(e=>e.percent>=100).length,[1,3,6])];
 return{xp,movementXP,bonusXP,current,next,progress,achievements,medals,events:events.slice().sort((a,b)=>String(b.criado_em).localeCompare(String(a.criado_em))).slice(0,12)};
}
function badge(icon,name,description,unlocked,tier,unlocked_at="",target=1,value=0){return{icon,name,description,unlocked,tier,unlocked_at,target,value}}
function medal(name,value,tiers){let tier="bloqueada",next=tiers[0];if(value>=tiers[2]){tier="ouro";next=null}else if(value>=tiers[1]){tier="prata";next=tiers[2]}else if(value>=tiers[0]){tier="bronze";next=tiers[1]}return{name,value,tier,next,tiers}}
