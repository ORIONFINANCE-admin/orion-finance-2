import { getAll, getOne, put, queueChange } from "./db.js";
import { makeId, nowISO } from "./utils.js";

const moneyNumber=v=>Math.max(0,Number(v||0));
const clean=v=>String(v??"").trim();
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));

export async function getEvents(){
  return (await getAll("eventos")).slice().sort((a,b)=>String(a.data||"9999-12-31").localeCompare(String(b.data||"9999-12-31")));
}
export async function getEvent(eventId){ return getOne("eventos",eventId); }
export async function getEventReservations(eventId=""){
  const all=await getAll("evento_reservas");
  return all.filter(r=>!eventId||r.evento_id===eventId).sort((a,b)=>String(b.criado_em||"").localeCompare(String(a.criado_em||"")));
}
export function eventReserveTarget(event){
  const estimated=moneyNumber(event?.custo_estimado);
  const margin=clamp(event?.margem_percentual,0,100);
  return Number((estimated*(1+margin/100)).toFixed(2));
}
export async function eventReservedAmount(eventId){
  const rows=await getEventReservations(eventId);
  return Number(rows.reduce((sum,r)=>sum+(r.tipo==="liberacao"?-1:1)*moneyNumber(r.valor),0).toFixed(2));
}
export async function eventFinancialState(event){
  const target=eventReserveTarget(event), reserved=await eventReservedAmount(event.evento_id);
  const remaining=Math.max(0,Number((target-reserved).toFixed(2)));
  const percent=target>0?Math.min(100,Math.round((reserved/target)*100)):100;
  return {target,reserved,remaining,percent,status: event.status==="realizado"?"realizado":event.status==="cancelado"?"cancelado":percent>=100?"garantido":reserved>0?"em_preparacao":"planejado"};
}
export async function saveEvent(input){
  const existing=input?.evento_id?await getEvent(input.evento_id):null;
  const now=nowISO();
  const record={
    evento_id:existing?.evento_id||makeId("evt"),
    nome:clean(input?.nome)||"Evento",
    data:clean(input?.data), horario:clean(input?.horario), local:clean(input?.local),
    prioridade:["baixa","media","alta","essencial"].includes(input?.prioridade)?input.prioridade:"media",
    custo_estimado:moneyNumber(input?.custo_estimado),
    margem_percentual:clamp(input?.margem_percentual,0,100),
    status:existing?.status||"planejado",
    gasto_real:moneyNumber(existing?.gasto_real),
    observacao:clean(input?.observacao), calendario_externo_id:clean(existing?.calendario_externo_id),
    criado_em:existing?.criado_em||now, atualizado_em:now
  };
  if(!record.data) throw new Error("Informe a data do evento.");
  await put("eventos",record); await queueChange("EVENTOS",record); return record;
}
export async function reserveForEvent(eventId,value,note=""){
  const event=await getEvent(eventId); if(!event) throw new Error("Evento não encontrado.");
  const amount=moneyNumber(value); if(amount<=0) throw new Error("Informe um valor maior que zero.");
  const record={reserva_evento_id:makeId("evr"),evento_id:eventId,tipo:"reserva",valor:amount,observacao:clean(note),criado_em:nowISO()};
  await put("evento_reservas",record); await queueChange("EVENTO_RESERVAS",record); return record;
}
export async function releaseEventReserve(eventId,value,note=""){
  const available=await eventReservedAmount(eventId); const amount=Math.min(available,moneyNumber(value)); if(amount<=0)return null;
  const record={reserva_evento_id:makeId("evr"),evento_id:eventId,tipo:"liberacao",valor:amount,observacao:clean(note),criado_em:nowISO()};
  await put("evento_reservas",record); await queueChange("EVENTO_RESERVAS",record); return record;
}
export async function completeEvent(eventId,actualSpent=0){
  const event=await getEvent(eventId); if(!event) throw new Error("Evento não encontrado.");
  const reserved=await eventReservedAmount(eventId); const spent=moneyNumber(actualSpent);
  const updated={...event,status:"realizado",gasto_real:spent,atualizado_em:nowISO()};
  await put("eventos",updated); await queueChange("EVENTOS",updated);
  const leftover=Math.max(0,Number((reserved-spent).toFixed(2)));
  if(leftover>0) await releaseEventReserve(eventId,leftover,"Saldo liberado após conclusão do evento");
  return {event:updated,leftover};
}
export async function cancelEvent(eventId){
  const event=await getEvent(eventId); if(!event)return;
  const reserved=await eventReservedAmount(eventId);
  const updated={...event,status:"cancelado",atualizado_em:nowISO()};
  await put("eventos",updated); await queueChange("EVENTOS",updated);
  if(reserved>0) await releaseEventReserve(eventId,reserved,"Reserva liberada após cancelamento");
  return updated;
}
export async function getEventSummary(){
  const events=(await getEvents()).filter(e=>!["realizado","cancelado"].includes(e.status));
  const states=[]; for(const event of events) states.push({event,...await eventFinancialState(event)});
  const target=states.reduce((s,x)=>s+x.target,0),reserved=states.reduce((s,x)=>s+x.reserved,0),remaining=states.reduce((s,x)=>s+x.remaining,0);
  return {count:states.length,target,reserved,remaining,states};
}
export function daysUntil(raw){ if(!raw)return null; const today=new Date(); today.setHours(0,0,0,0); const d=new Date(`${raw}T12:00:00`); return Math.ceil((d-today)/86400000); }
export function reserveSuggestion(state){
  const days=Math.max(1,daysUntil(state?.event?.data)||1); const remaining=moneyNumber(state?.remaining);
  if(!remaining)return {amount:0,period:"",text:"Evento financeiramente garantido."};
  if(days>=14){ const weeks=Math.max(1,Math.ceil(days/7)); const value=remaining/weeks; return {amount:value,period:"semana",text:`Reserve aproximadamente R$ ${value.toFixed(2).replace('.',',')} por semana.`}; }
  const value=remaining/days; return {amount:value,period:"dia",text:`Reserve aproximadamente R$ ${value.toFixed(2).replace('.',',')} por dia.`};
}
export function createICS(event,includeFinance=false,state=null){
  const esc=s=>String(s||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
  const date=String(event.data||"").replaceAll("-","");
  const time=String(event.horario||"").replace(":","");
  const dt=time?`${date}T${time}00`:`${date}`;
  const desc=[event.observacao||"","Evento cadastrado no Orion Finance"];
  if(includeFinance&&state)desc.push(`Custo estimado: R$ ${state.target.toFixed(2)}`,`Reservado: R$ ${state.reserved.toFixed(2)}`,`Restante: R$ ${state.remaining.toFixed(2)}`);
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Orion Finance//Eventos//PT-BR","BEGIN:VEVENT",`UID:${event.evento_id}@orion.local`,`${time?"DTSTART":"DTSTART;VALUE=DATE"}:${dt}`,`SUMMARY:${esc(event.nome)}`,`LOCATION:${esc(event.local)}`,`DESCRIPTION:${esc(desc.filter(Boolean).join("\n"))}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
}
