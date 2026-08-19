function asDate(value){
  const raw=String(value||"").slice(0,10);
  if(!raw) return null;
  const d=new Date(`${raw}T12:00:00`);
  return Number.isNaN(d.getTime())?null:d;
}
function sum(items,pick){return items.reduce((a,i)=>a+Number(pick(i)||0),0);}
function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
export function buildPremiumSnapshot({transactions=[],categories=[],dashboard={},commitments={},eventSummary={},reserve=null,debts=[],now=new Date()}={}){
  const today=new Date(now);today.setHours(12,0,0,0);
  const d30=new Date(today);d30.setDate(d30.getDate()-29);
  const d60=new Date(today);d60.setDate(d60.getDate()-59);
  const d90=new Date(today);d90.setDate(d90.getDate()-89);
  const valid=transactions.filter(t=>asDate(t.data));
  const between=(d,a,b)=>d>=a&&d<=b;
  const last30=valid.filter(t=>between(asDate(t.data),d30,today));
  const prevEnd=new Date(d30);prevEnd.setDate(prevEnd.getDate()-1);
  const prev30=valid.filter(t=>between(asDate(t.data),d60,prevEnd));
  const last90=valid.filter(t=>between(asDate(t.data),d90,today));
  const spend30=sum(last30.filter(t=>t.tipo==="saida"),t=>t.valor);
  const spendPrev30=sum(prev30.filter(t=>t.tipo==="saida"),t=>t.valor);
  const income30=sum(last30.filter(t=>t.tipo==="entrada"),t=>t.valor);
  const spend90=sum(last90.filter(t=>t.tipo==="saida"),t=>t.valor);
  const trendPct=spendPrev30>0?((spend30-spendPrev30)/spendPrev30)*100:(spend30>0?100:0);
  const avgDaily=spend30/30;
  const names=new Map(categories.map(c=>[String(c.categoria_id||""),String(c.nome||"Sem categoria")]));
  const totals=new Map();last90.filter(t=>t.tipo==="saida").forEach(t=>{const k=String(t.categoria_id||"");totals.set(k,(totals.get(k)||0)+Number(t.valor||0));});
  let topId="",topValue=0;for(const [k,v] of totals.entries())if(v>topValue){topId=k;topValue=v;}
  const topCategoryName=topId?(names.get(topId)||"Sem categoria"):"Sem dados";
  const topCategoryShare=spend90>0?(topValue/spend90)*100:0;
  const commitmentTotal=Math.max(0,Number(commitments.total||0));
  const eventReserved=Math.max(0,Number(eventSummary.reserved||0));
  const eventRemaining=Math.max(0,Number(eventSummary.remaining||0));
  const eventTarget=Math.max(0,Number(eventSummary.target||0));
  const eventCoverage=eventTarget>0?clamp(((eventTarget-eventRemaining)/eventTarget)*100,0,100):100;
  const reserveCurrent=Math.max(0,Number(reserve?.valor_atual||0));
  const reserveTarget=Math.max(0,Number(reserve?.valor_alvo||0));
  const reservePct=reserveTarget>0?clamp((reserveCurrent/reserveTarget)*100,0,100):0;
  const debtOpen=sum(debts.filter(d=>d.status!=="quitada"),d=>d.valor_atual||d.valor_original);
  const refIncome=Math.max(income30,Number(dashboard.entradasMes||0),1);
  const commitmentRatio=(commitmentTotal/refIncome)*100;
  const freeMoney=Number(dashboard.saldoTotal||0)-commitmentTotal-eventReserved-reserveCurrent;
  const score=Math.round(clamp(35*(reservePct/100)+25*(1-clamp(commitmentRatio/100,0,1))+20*(trendPct<=0?1:clamp(1-trendPct/100,0,1))+10*(eventCoverage/100)+10*(freeMoney>=0?1:0),0,100));
  let pressure="Baixa";if(commitmentRatio>=70||freeMoney<0)pressure="Alta";else if(commitmentRatio>=45||trendPct>15)pressure="Moderada";
  return {spend30,spendPrev30,income30,spend90,trendPct,avgDaily,topCategoryName,topCategoryShare,commitmentTotal,commitmentRatio,eventReserved,eventRemaining,eventTarget,eventCoverage,reserveCurrent,reserveTarget,reservePct,debtOpen,freeMoney,score,pressure};
}
export function simulatePremiumScenario(snapshot,amount=0){const value=Math.max(0,Number(amount||0));const projectedFree=Number(snapshot?.freeMoney||0)-value;const base=Math.max(Math.abs(Number(snapshot?.freeMoney||0)),1);const impactPct=(value/base)*100;let status="Confortável";if(projectedFree<0)status="Compromete o dinheiro livre";else if(impactPct>=50)status="Impacto alto";else if(impactPct>=25)status="Impacto moderado";return{amount:value,projectedFree,impactPct,status};}
export function buildExecutiveReport(snapshot={},profileName="Perfil local"){const pct=v=>`${Number(v||0).toFixed(1).replace(".",",")}%`;const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});return ["ORION FINANCE — RELATÓRIO PREMIUM",`Perfil: ${profileName}`,`Gerado em: ${new Date().toLocaleString("pt-BR")}`,"",`Índice avançado: ${snapshot.score||0}/100`,`Pressão financeira: ${snapshot.pressure||"Sem leitura"}`,`Gastos últimos 30 dias: ${money(snapshot.spend30)}`,`Variação vs. 30 dias anteriores: ${pct(snapshot.trendPct)}`,`Média diária: ${money(snapshot.avgDaily)}`,`Maior concentração em 90 dias: ${snapshot.topCategoryName||"Sem dados"} (${pct(snapshot.topCategoryShare)})`,`Compromissos do mês: ${money(snapshot.commitmentTotal)} (${pct(snapshot.commitmentRatio)} da renda de referência)`,`Reserva: ${pct(snapshot.reservePct)}`,`Cobertura de eventos: ${pct(snapshot.eventCoverage)}`,`Dívidas em aberto: ${money(snapshot.debtOpen)}`,`Dinheiro livre estimado: ${money(snapshot.freeMoney)}`,"","Relatório gerado localmente pelo Orion. Não constitui recomendação financeira."].join("\n");}
