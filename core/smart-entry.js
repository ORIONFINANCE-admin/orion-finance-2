import { getAll } from "./db.js";
const RULES=[
{words:["mercado","supermercado","atacadao","atacadão"],category:"Alimentação",subcategory:"Mercado"},
{words:["ifood","restaurante","lanche","pizza"],category:"Alimentação"},{words:["uber","99","indriver"],category:"Transporte"},
{words:["gasolina","combustivel","combustível","posto"],category:"Transporte"},{words:["farmacia","farmácia","drogaria"],category:"Saúde"},
{words:["netflix","spotify","youtube premium","prime video"],category:"Assinaturas"},{words:["aluguel","condominio","condomínio"],category:"Moradia"}];
export async function suggestTransaction(description,type="saida"){
 const text=norm(description); if(!text)return{}; const [tx,cats,subs]=await Promise.all([getAll("transacoes"),getAll("categorias"),getAll("subcategorias")]);
 const exact=tx.filter(t=>t.tipo===type&&norm(t.descricao)===text).sort((a,b)=>String(b.criado_em).localeCompare(String(a.criado_em))); if(exact.length)return{...best(exact),source:"history"};
 const rule=RULES.find(r=>r.words.some(w=>text.includes(norm(w)))); if(!rule)return{}; const cat=cats.find(c=>norm(c.nome)===norm(rule.category)); const sub=rule.subcategory?subs.find(sc=>norm(sc.nome)===norm(rule.subcategory)&&(!cat||sc.categoria_id===cat.categoria_id)):null;
 const similar=tx.filter(t=>t.tipo===type&&rule.words.some(w=>norm(t.descricao).includes(norm(w)))); const learned=similar.length?best(similar):{};
 return{categoria_id:cat?.categoria_id||learned.categoria_id||"",subcategoria_id:sub?.subcategoria_id||learned.subcategoria_id||"",conta_id:learned.conta_id||"",forma_pagamento:learned.forma_pagamento||"",source:"keyword"};
}
export async function enforceAccountRules(accountId,currentPayment=""){
 const [accounts,inst]=await Promise.all([getAll("contas"),getAll("instituicoes")]); const a=accounts.find(x=>x.conta_id===accountId); if(!a)return{forma_pagamento:currentPayment}; const i=inst.find(x=>x.instituicao_id===a.instituicao_id);
 const isCaju=norm(i?.nome||i?.nome_curto).includes("caju"),isBenefit=a.tipo==="beneficio"||norm(a.nome).includes("alimentacao");
 if(isCaju&&isBenefit)return{forma_pagamento:"credito",lockedReason:"Caju Alimentação passa como crédito, reduz o saldo do benefício e não gera fatura."}; return{forma_pagamento:currentPayment};
}
function best(items){const counts=new Map();for(const t of items){const k=[t.categoria_id||"",t.subcategoria_id||"",t.conta_id||"",t.forma_pagamento||""].join("|");counts.set(k,(counts.get(k)||0)+1)}const k=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"";const[categoria_id,subcategoria_id,conta_id,forma_pagamento]=k.split("|");return{categoria_id,subcategoria_id,conta_id,forma_pagamento}}
function norm(v){return String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
