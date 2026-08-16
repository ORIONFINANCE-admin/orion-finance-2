import { getAll, put, queueChange } from "./db.js";
import { makeId, nowISO } from "./utils.js";
const LEVELS=[
{level:1,xp:0,title:"Observador"},{level:2,xp:100,title:"Organizador"},{level:3,xp:250,title:"Estruturador"},{level:4,xp:450,title:"Guardião"},{level:5,xp:700,title:"Explorador"},{level:6,xp:1000,title:"Construtor"},{level:7,xp:1400,title:"Estrategista"},{level:8,xp:1900,title:"Navegador"},{level:9,xp:2500,title:"Arquiteto"},{level:10,xp:3200,title:"Orion"}];
export async function awardXP(type,reference,xp,description){
 const events=await getAll("eventos_xp"); const ref=String(reference||`${type}:${new Date().toISOString().slice(0,10)}`); if(events.some(e=>e.referencia===ref))return null;
 const record={evento_id:makeId("xp"),tipo:String(type||"progresso"),referencia:ref,xp:Math.max(0,Number(xp||0)),descricao:String(description||"").trim(),criado_em:nowISO()};
 await put("eventos_xp",record); await queueChange("EVENTOS_XP",record); return record;
}
export async function getGameState({transactions=[],debts=[],reserve=null}={}){
 const events=await getAll("eventos_xp");
 return calculateGameState({transactions,debts,reserve,events});
}
export function calculateGameState({transactions=[],debts=[],reserve=null,events=[]}={}){
 // Toda movimentação vale 10 XP, inclusive o histórico importado. Eventos de tipo
 // "registro" já representam esse mesmo ganho e por isso não são somados novamente.
 const movementXP=transactions.length*10;
 const bonusXP=events.filter(e=>e.tipo!=="registro").reduce((s,e)=>s+Number(e.xp||0),0);
 const xp=movementXP+bonusXP;
 const current=[...LEVELS].reverse().find(l=>xp>=l.xp)||LEVELS[0]; const next=LEVELS.find(l=>l.level===current.level+1)||null;
 const progress=next?Math.max(0,Math.min(100,(xp-current.xp)/(next.xp-current.xp)*100)):100;
 const rt=Number(reserve?.valor_alvo||0),rc=Number(reserve?.valor_atual||0),rp=rt>0?Math.min(100,rc/rt*100):0;
 const distinctDays=new Set(transactions.map(t=>String(t.data||"").slice(0,10)).filter(Boolean)).size; const paidDebts=debts.filter(d=>d.status==="quitada").length;
 const achievements=[
  badge("🏁","Primeiro Registro","A jornada saiu da cabeça e entrou no mapa.",transactions.length>=1,"bronze"),
  badge("🧭","Mapa Ganho","10 movimentações registradas.",transactions.length>=10,"bronze"),
  badge("🗺️","Cartógrafo","50 movimentações registradas.",transactions.length>=50,"prata"),
  badge("🔥","Constância","Registros em 7 dias diferentes.",distinctDays>=7,"bronze"),
  badge("🧱","Fundação","25% da reserva construída.",rp>=25,"bronze"),
  badge("🛡️","Meio Caminho","50% da reserva construída.",rp>=50,"prata"),
  badge("🌕","Reserva Completa","100% da reserva construída.",rp>=100,"ouro"),
  badge("✂️","Menos Uma","Primeira dívida quitada.",paidDebts>=1,"prata")];
 const medals=[medal("Registros",transactions.length,[10,50,150]),medal("Constância",distinctDays,[7,30,90]),medal("Dívidas quitadas",paidDebts,[1,3,6])];
 return{xp,current,next,progress,achievements,medals,events:events.slice().sort((a,b)=>String(b.criado_em).localeCompare(String(a.criado_em))).slice(0,12)};
}
function badge(icon,name,description,unlocked,tier){return{icon,name,description,unlocked,tier}}
function medal(name,value,tiers){let tier="bloqueada",next=tiers[0];if(value>=tiers[2]){tier="ouro";next=null}else if(value>=tiers[1]){tier="prata";next=tiers[2]}else if(value>=tiers[0]){tier="bronze";next=tiers[1]}return{name,value,tier,next}}
