const BANK={
entrada:[
'Boa entrada. O próximo passo é decidir o que esse dinheiro precisa fazer por você.','Receber é só metade do movimento; dar direção completa a decisão.','Dinheiro que chega com intenção costuma permanecer útil por mais tempo.','Entrada registrada. Agora ela faz parte do mapa, não só do saldo.','Clareza sobre o que entra melhora todas as escolhas que vêm depois.','Mais recurso disponível, mais liberdade para decidir com calma.','O valor entrou. A organização transforma entrada em possibilidade.','Registrar o que chega é reconhecer de onde sua construção está vindo.'
],
saida:[
'Gastar com consciência é diferente de simplesmente ver o saldo diminuir.','Registrado. Clareza ganha de memória.','Uma saída compreendida pesa menos que uma saída esquecida.','Seu dinheiro saiu, mas a informação ficou. Isso também tem valor.','Controle útil não é vigiar cada centavo; é entender o movimento.','Decisão registrada. Agora ela pode ser comparada com o que realmente importa.','O extrato conta o que aconteceu; você decide o que isso significa.','Conhecer o destino do dinheiro é parte de escolher melhor o próximo destino.'
],
transferencia:[
'O dinheiro mudou de lugar, não de patrimônio.','Organização também é movimento financeiro.','Transferência registrada sem confundir deslocamento com gasto.','Mudar o dinheiro de conta não muda o que ele representa.','Saldo reorganizado. A leitura continua limpa.','Um movimento interno bem registrado evita duas histórias para o mesmo dinheiro.'
],
rendimento:[
'O dinheiro trabalhou um pouco também.','Rendimento pequeno ainda é capital aprendendo a crescer.','Tempo e constância começam a aparecer nos números.','Crescimento registrado. Paciência também compõe patrimônio.','O rendimento entrou silenciosamente, como costuma acontecer com bons hábitos.','Mais um sinal de que guardar e esperar também são decisões.'
],
aporte:[
'Um aporte de cada vez transforma intenção em patrimônio.','O futuro costuma começar com valores menores do que imaginamos.','Este dinheiro ganhou um horizonte mais longo.','Mais um passo construído antes que ele fosse necessário.','Aporte registrado. O tempo agora participa dessa decisão.','Guardar para alguém também é ensinar, mesmo antes das primeiras conversas sobre dinheiro.','Patrimônio não precisa começar grande. Precisa começar.','Hoje é um valor. Com tempo, vira história financeira.'
],
reserva:[
'Reserva não é dinheiro parado. É liberdade guardada.','Proteção financeira também é uma forma de tranquilidade.','Mais uma parte do saldo ganhou uma função clara.','Reserva construída antes da urgência vale mais do que improviso depois.','O dinheiro protegido continua sendo seu, só deixou de estar disponível para qualquer coisa.','Separar antes de precisar é uma decisão silenciosamente poderosa.'
],
divida:[
'Cada redução devolve um pouco de espaço ao futuro.','Dívida acompanhada deixa de ser um número escondido.','Mais uma parte do compromisso ficou para trás.','Registrar o pagamento torna o progresso visível.','O saldo devedor caiu. Isso é espaço financeiro voltando para você.','Consistência costuma quitar antes da ansiedade.'
],
progresso:[
'O mapa ficou mais nítido.','Pequenas decisões registradas produzem grandes diferenças acumuladas.','Você está construindo informação suficiente para decidir melhor.','Constância não precisa fazer barulho para funcionar.','Organização boa é aquela que começa a parecer natural.','Quanto menos o dinheiro surpreende, mais espaço sobra para escolher.'
]
};
const OPENERS=['Registrado.','Feito.','Tudo certo.','Movimento salvo.','Anotado no Orion.'];
const RECENT_KEY='orion_phrase_recent_v14';
function hash(s){let h=0;for(const c of String(s))h=((h<<5)-h+c.charCodeAt(0))|0;return Math.abs(h).toString(36)}
function recent(){try{return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]')}catch{return []}}
function saveRecent(list){try{localStorage.setItem(RECENT_KEY,JSON.stringify(list.slice(-30)))}catch{}}
export function smartPhrase(context='progresso',{force=false,name=''}={}){
  if(!force && !['aporte','rendimento','divida','reserva'].includes(context) && Math.random()<0.36) return null;
  const pool=BANK[context]||BANK.progresso, used=recent();
  let candidates=pool.filter(t=>!used.includes(hash(t))); if(!candidates.length)candidates=pool;
  const text=candidates[Math.floor(Math.random()*candidates.length)]; const id=hash(text); saveRecent([...used,id]);
  const prefix=Math.random()<0.24?OPENERS[Math.floor(Math.random()*OPENERS.length)]+' ':'';
  const personalized=name&&Math.random()<0.14?`${name}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`:text;
  return prefix+personalized;
}
