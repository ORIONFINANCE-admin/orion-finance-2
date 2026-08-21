import { getAll, getOne, put, queueChange, getMeta, setMeta } from './db.js';
import { makeId, nowISO, todayISO } from './utils.js';

export const PRIMARY_PROFILE_ID = 'perfil_principal';

function cleanName(value, fallback='Perfil') { return String(value || fallback).trim().slice(0,60) || fallback; }
function num(value){ const n=Number(value||0); return Number.isFinite(n)?n:0; }

export async function ensureProfiles(defaultName='João') {
  let profiles = await getAll('perfis');
  if (!profiles.length) {
    const now=nowISO();
    const primary={perfil_id:PRIMARY_PROFILE_ID,nome:cleanName(defaultName,'João'),tipo:'pessoal',subtitulo:'Pessoal',principal:true,ativo:true,criado_em:now,atualizado_em:now};
    await put('perfis',primary);
    await queueChange('PERFIS',primary);
    profiles=[primary];
  }
  if(!(await getMeta('perfil_ativo_id',''))) await setMeta('perfil_ativo_id', profiles.find(p=>p.principal)?.perfil_id || profiles[0].perfil_id);
  return profiles.filter(p=>p.ativo!==false);
}

export async function getProfiles(){ return (await getAll('perfis')).filter(p=>p.ativo!==false); }
export async function getActiveProfileId(){ return (await getMeta('perfil_ativo_id',PRIMARY_PROFILE_ID)) || PRIMARY_PROFILE_ID; }
export async function setActiveProfileId(id){
  const profile=await getOne('perfis',String(id||''));
  if(!profile||profile.ativo===false) throw new Error('Perfil não encontrado.');
  await setMeta('perfil_ativo_id',profile.perfil_id); return profile;
}
export async function getActiveProfile(){
  const id=await getActiveProfileId();
  return (await getOne('perfis',id)) || (await getProfiles())[0] || null;
}
export async function createProfile(input={}){
  const now=nowISO();
  const record={perfil_id:makeId('perfil'),nome:cleanName(input.nome),tipo:String(input.tipo||'dependente'),subtitulo:cleanName(input.subtitulo,input.tipo==='dependente'?'Construção financeira':'Patrimônio'),principal:false,ativo:true,criado_em:now,atualizado_em:now};
  await put('perfis',record); await queueChange('PERFIS',record); return record;
}
export async function updateProfile(id,input={}){
  const current=await getOne('perfis',String(id||'')); if(!current) throw new Error('Perfil não encontrado.');
  const record={...current,nome:cleanName(input.nome??current.nome),subtitulo:cleanName(input.subtitulo??current.subtitulo,''),atualizado_em:nowISO()};
  await put('perfis',record); await queueChange('PERFIS',record); return record;
}

export async function getAllocationMovements(){ return getAll('movimentos_alocacao'); }
export async function getAllocations(){ return getAll('alocacoes'); }

async function upsertAllocation(profileId, accountId, purpose, delta){
  const key=`aloc_${profileId}_${accountId}_${String(purpose||'futuro').replace(/[^a-z0-9]+/gi,'_')}`;
  const current=await getOne('alocacoes',key);
  const now=nowISO();
  const record={alocacao_id:key,perfil_id:profileId,conta_id:accountId,finalidade:String(purpose||'futuro'),saldo:Math.max(0,num(current?.saldo)+num(delta)),ativo:true,criado_em:current?.criado_em||now,atualizado_em:now};
  await put('alocacoes',record); await queueChange('ALOCACOES',record); return record;
}

export async function createAllocationMovement(input={}){
  const value=num(input.valor); if(!(value>0)) throw new Error('Informe um valor maior que zero.');
  const profile=await getOne('perfis',String(input.perfil_id||'')); if(!profile||profile.principal) throw new Error('Selecione um perfil gerenciado.');
  const account=await getOne('contas',String(input.conta_id||'')); if(!account||account.status==='inativo') throw new Error('Selecione a conta física onde o dinheiro está.');
  const direction=String(input.tipo||'aporte'); const sign=direction==='retirada'?-1:1;
  const now=nowISO();
  const record={movimento_alocacao_id:makeId('alocmov'),perfil_id:profile.perfil_id,conta_id:account.conta_id,data:String(input.data||todayISO()),tipo:direction,valor:value,finalidade:String(input.finalidade||'futuro'),descricao:String(input.descricao||`${direction==='retirada'?'Retirada':'Aporte'} · ${profile.nome}`).trim(),observacao:String(input.observacao||'').trim(),criado_em:now};
  if(sign<0){ const current=(await getAllocations()).filter(a=>a.perfil_id===profile.perfil_id&&a.conta_id===account.conta_id).reduce((s,a)=>s+num(a.saldo),0); if(value>current+0.005) throw new Error('A retirada é maior que o valor alocado neste perfil.'); }
  await put('movimentos_alocacao',record); await queueChange('MOVIMENTOS_ALOCACAO',record);
  await upsertAllocation(profile.perfil_id,account.conta_id,record.finalidade,sign*value);
  return record;
}

export async function getProfileSnapshot(profileId){
  const profiles=await getProfiles(); const profile=profiles.find(p=>p.perfil_id===profileId)||profiles[0]||null;
  const allocations=await getAllocations(); const movements=await getAllocationMovements();
  const own=allocations.filter(a=>a.ativo!==false&&a.perfil_id===profile?.perfil_id);
  const balance=own.reduce((s,a)=>s+num(a.saldo),0);
  const now=new Date();
  const monthMovements=movements.filter(m=>m.perfil_id===profile?.perfil_id&&m.data&&(()=>{const d=new Date(`${String(m.data).slice(0,10)}T12:00:00`);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();})());
  const aportesMes=monthMovements.filter(m=>m.tipo!=='retirada').reduce((s,m)=>s+num(m.valor),0);
  const retiradasMes=monthMovements.filter(m=>m.tipo==='retirada').reduce((s,m)=>s+num(m.valor),0);
  return {profile,balance,aportesMes,retiradasMes,resultadoMes:aportesMes-retiradasMes,allocations:own,movements:movements.filter(m=>m.perfil_id===profile?.perfil_id).sort((a,b)=>`${b.data}|${b.criado_em}`.localeCompare(`${a.data}|${a.criado_em}`))};
}

export async function allocationByAccount(profileId){
  const map=new Map();
  for(const a of (await getAllocations()).filter(a=>a.ativo!==false&&a.perfil_id===profileId)) map.set(a.conta_id,(map.get(a.conta_id)||0)+num(a.saldo));
  return map;
}
export async function allocatedToManagedProfilesByAccount(){
  const profiles=await getProfiles(); const managed=new Set(profiles.filter(p=>!p.principal).map(p=>p.perfil_id)); const map=new Map();
  for(const a of (await getAllocations()).filter(a=>a.ativo!==false&&managed.has(a.perfil_id))) map.set(a.conta_id,(map.get(a.conta_id)||0)+num(a.saldo));
  return map;
}
