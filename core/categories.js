import { getAll, put, queueChange } from "./db.js";

const INCOME_CATEGORIES = Object.freeze([
  ["orion_income_salario","Salário",10],["orion_income_adiantamento","Adiantamento",20],["orion_income_freelance","Freelance / serviço",30],
  ["orion_income_comissao","Comissão",40],["orion_income_venda","Venda",50],["orion_income_reembolso","Reembolso",60],
  ["orion_income_presente","Presente / ajuda",70],["orion_income_beneficio","Benefício",80],["orion_income_premio","Prêmio",90],
  ["orion_income_estorno","Estorno / restituição",100],["orion_income_aluguel","Aluguel recebido",110],["orion_income_heranca","Herança",120],
  ["orion_income_achado","Valor encontrado",130],["orion_income_outros","Outras entradas",999]
]);

function normalizeName(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
}

export async function ensureExpandedIncomeCategories(){
  const existing=await getAll("categorias");
  const ids=new Set(existing.map(c=>String(c.categoria_id||"")));
  const names=new Set(existing.filter(c=>{const t=String(c.tipo_permitido||"");return t==="entrada"||t==="entrada_saida";}).map(c=>normalizeName(c.nome)));
  let added=0;
  for(const [categoria_id,nome,ordem] of INCOME_CATEGORIES){
    if(ids.has(categoria_id)||names.has(normalizeName(nome))) continue;
    const record={categoria_id,nome,tipo_permitido:"entrada",icone:"+",ordem,ativa:true};
    await put("categorias",record);
    await queueChange("CATEGORIAS",record);
    added++;
  }
  return added;
}

export function incomeCategoryCatalog(){
  return INCOME_CATEGORIES.map(([categoria_id,nome,ordem])=>({categoria_id,nome,ordem}));
}
