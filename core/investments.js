export function extractIndicators(payload) {
  const d = payload?.dados || {}, f = d.financialData || {}, k = d.defaultKeyStatistics || {};
  return {
    ticker:d.symbol || payload?.ticker || "", nome:d.longName || d.shortName || "",
    preco:n(d.regularMarketPrice), variacao:n(d.regularMarketChangePercent),
    pl:first(d.priceEarnings,k.trailingPE,k.forwardPE), pvp:first(k.priceToBook),
    evEbitda:first(k.enterpriseToEbitda), roe:pct(first(f.returnOnEquity)),
    margem:pct(first(f.profitMargins)), crescimentoReceita:pct(first(f.revenueGrowth)),
    crescimentoLucro:pct(first(f.earningsGrowth)), dividaPL:ratioPct(first(f.debtToEquity)),
    fonte:payload?.fonte || "brapi.dev", detalhado:Boolean(payload?.detalhado)
  };
}
export function scoreInvestment(i) {
  const rules=[
    rule("P/L",i.pl,v=>v>0&&v<=15,"0 < P/L ≤ 15",num),
    rule("P/VP",i.pvp,v=>v>0&&v<=2,"0 < P/VP ≤ 2",num),
    rule("EV/EBITDA",i.evEbitda,v=>v>0&&v<=10,"0 < EV/EBITDA ≤ 10",num),
    rule("ROE",i.roe,v=>v>=15,"ROE ≥ 15%",per),
    rule("Margem líquida",i.margem,v=>v>=10,"Margem ≥ 10%",per),
    rule("Cresc. receita",i.crescimentoReceita,v=>v>0,"Crescimento > 0%",per),
    rule("Cresc. lucro",i.crescimentoLucro,v=>v>0,"Crescimento > 0%",per),
    rule("Dívida/PL",i.dividaPL,v=>v>=0&&v<=100,"Dívida/PL ≤ 100%",per)
  ];
  const avail=rules.filter(r=>r.available), passed=avail.filter(r=>r.pass).length;
  const score=avail.length?Math.round(passed/avail.length*100):null;
  if(score===null)return{rules,score,signal:"Sem dados suficientes",tone:"neutral"};
  if(score>=75)return{rules,score,signal:"Favorável nos critérios",tone:"positive"};
  if(score>=50)return{rules,score,signal:"Misto",tone:"warning"};
  return{rules,score,signal:"Atenção nos critérios",tone:"negative"};
}
function rule(name,value,test,criterion,fmt){const available=Number.isFinite(value);return{name,value,criterion,available,pass:available?!!test(value):null,formatted:available?fmt(value):"N/D"}}
function n(v){const x=Number(v);return Number.isFinite(x)?x:null}
function first(...vs){for(const v of vs){const x=Number(v);if(Number.isFinite(x))return x}return null}
function pct(v){return Number.isFinite(v)?(Math.abs(v)<=2?v*100:v):null}
function ratioPct(v){return Number.isFinite(v)?(Math.abs(v)<=5?v*100:v):null}
function num(v){return new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(v)}
function per(v){return `${num(v)}%`}
