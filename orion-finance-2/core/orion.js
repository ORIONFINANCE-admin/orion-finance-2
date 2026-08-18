import { put, queueChange, getAll, getOne } from "./db.js";
import { makeId, nowISO, todayISO } from "./utils.js";
import { awardXP } from "./game.js";

export async function createAccount(input) {
  const record = {
    conta_id: makeId("conta"),
    instituicao_id: String(input.instituicao_id || ""),
    nome: String(input.nome || "").trim(),
    tipo: String(input.tipo || "corrente"),
    saldo_inicial: Number(input.saldo_inicial || 0),
    saldo_atual: Number(input.saldo_inicial || 0),
    status: "ativo",
    dashboard_visibilidade: "auto",
    criado_em: nowISO(),
    atualizado_em: nowISO()
  };

  if (!record.instituicao_id) throw new Error("Selecione a instituição.");
  if (!record.nome) throw new Error("Informe um nome para a conta.");

  await put("contas", record);
  await queueChange("CONTAS", record);
  return record;
}

export async function createTransaction(input) {
  const tipo = String(input.tipo || "saida");
  if (!["entrada", "saida"].includes(tipo)) {
    throw new Error("Nesta versão, use entrada ou saída.");
  }

  const value = Number(input.valor || 0);
  if (!(value > 0)) throw new Error("Informe um valor maior que zero.");

  const record = {
    transacao_id: makeId("trx"),
    data: input.data || todayISO(),
    descricao: String(input.descricao || "").trim(),
    valor: value,
    tipo,
    categoria_id: String(input.categoria_id || ""),
    subcategoria_id: String(input.subcategoria_id || ""),
    conta_id: String(input.conta_id || ""),
    forma_pagamento: String(input.forma_pagamento || "pix"),
    cartao_id: String(input.cartao_id || ""),
    evento_id: String(input.evento_id || ""),
    observacao: String(input.observacao || "").trim(),
    criado_em: nowISO(),
    atualizado_em: nowISO()
  };

  if (!record.descricao) throw new Error("Informe uma descrição.");
  if (!record.categoria_id) throw new Error("Selecione a categoria.");
  if (!record.conta_id) throw new Error("Selecione a conta.");

  await put("transacoes", record);
  await queueChange("TRANSACOES", record);
  await awardXP("registro", `trx:${record.transacao_id}`, 10, "Movimentação registrada.");
  return record;
}

export async function getInstitutions() {
  return getAll("instituicoes");
}

export async function getAccounts() {
  return getAll("contas");
}

export async function getCategories() {
  return getAll("categorias");
}

export async function getPhrases(context = "") {
  const phrases = await getAll("frases");
  return phrases.filter(p =>
    p.ativa !== false &&
    (!context || p.contexto === context)
  );
}

export async function randomPhrase(context = "") {
  let items = await getPhrases(context);
  if (!items.length && context) items = await getPhrases("");
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}


export async function createDebt(input) {
  const original = Number(input.valor_original || 0);
  if (!(original > 0)) throw new Error("Informe o valor da dívida.");
  const now = nowISO();
  const record = {
    divida_id: makeId("div"),
    descricao: String(input.descricao || "").trim(),
    credor: String(input.credor || "").trim(),
    tipo: String(input.tipo || "informal"),
    valor_original: original,
    valor_atual: original,
    forma_pagamento: String(input.forma_pagamento || "livre"),
    valor_pagamento_planejado: Number(input.valor_pagamento_planejado || 0) || "",
    total_parcelas: Number(input.total_parcelas || 0) || "",
    parcela_atual: 0,
    vencimento: String(input.vencimento || ""),
    proximo_vencimento: "",
    status: "ativa",
    observacoes: String(input.observacoes || "").trim(),
    criado_em: now,
    atualizado_em: now
  };
  if (!record.descricao) throw new Error("Informe a descrição da dívida.");
  if (!record.credor) throw new Error("Informe o credor.");
  await put("dividas", record);
  await queueChange("DIVIDAS", record);
  return record;
}

export async function payDebt(input) {
  const debt = await getOne("dividas", String(input.divida_id || ""));
  if (!debt) throw new Error("Dívida não encontrada.");
  const value = Number(input.valor || 0);
  if (!(value > 0)) throw new Error("Informe o valor do pagamento.");
  if (value > Number(debt.valor_atual || 0)) throw new Error("Pagamento maior que o saldo devedor.");

  const account = (await getAll("contas")).find(a => a.conta_id === input.conta_id && a.status !== "inativo");
  if (!account) throw new Error("Selecione uma conta válida.");
  const category = (await getAll("categorias")).find(c => ["dívidas","dividas"].includes(String(c.nome||"").toLowerCase()));
  if (!category) throw new Error('Categoria "Dívidas" não encontrada.');

  const now = nowISO();
  const transaction = {
    transacao_id: makeId("trx"), data: input.data || todayISO(),
    descricao: `Pagamento: ${debt.descricao}`, valor: value, tipo: "saida",
    categoria_id: category.categoria_id, subcategoria_id: "", conta_id: account.conta_id,
    forma_pagamento: String(input.forma_pagamento || "pix"), cartao_id: "",
    observacao: String(input.observacao || "").trim(), criado_em: now, atualizado_em: now
  };
  const remaining = Math.max(0, Number(debt.valor_atual || 0) - value);
  const updatedDebt = {
    ...debt, valor_atual: remaining,
    parcela_atual: Number(debt.parcela_atual || 0) + (debt.forma_pagamento === "parcelada" ? 1 : 0),
    status: remaining === 0 ? "quitada" : "ativa", atualizado_em: now
  };
  const payment = {
    pagamento_id: makeId("pagdiv"), divida_id: debt.divida_id,
    transacao_id: transaction.transacao_id, valor: value, data: transaction.data,
    observacao: transaction.observacao, criado_em: now
  };

  await put("transacoes", transaction);
  await put("dividas", updatedDebt);
  await put("pagamentos_dividas", payment);
  await queueChange("TRANSACOES", transaction);
  await queueChange("DIVIDAS", updatedDebt);
  await queueChange("PAGAMENTOS_DIVIDAS", payment);
  await awardXP("divida", `pagdiv:${payment.pagamento_id}`, 30, "Pagamento de dívida registrado.");
  if (updatedDebt.status === "quitada") await awardXP("conquista", `divida_quitada:${updatedDebt.divida_id}`, 120, "Dívida quitada.");
  return { transaction, debt: updatedDebt, payment };
}

export async function getDebts() { return getAll("dividas"); }

export async function addRadarTicker(ticker, observation = "") {
  const clean = String(ticker || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (!clean) throw new Error("Informe um ticker.");
  const existing = (await getAll("radar_investimentos")).find(r => r.ativo !== false && r.ticker === clean);
  if (existing) return existing;
  const now = nowISO();
  const record = { radar_id: makeId("radar"), ticker: clean, observacao: String(observation||"").trim(), ativo: true, criado_em: now, atualizado_em: now };
  await put("radar_investimentos", record);
  await queueChange("RADAR_INVESTIMENTOS", record);
  return record;
}

export async function getRadar() { return getAll("radar_investimentos"); }


export async function createTransfer(input) {
  const value=Number(input.valor||0); if(!(value>0))throw new Error("Informe um valor maior que zero.");
  const origem=String(input.origem_conta_id||""),destino=String(input.destino_conta_id||""); if(!origem||!destino)throw new Error("Selecione origem e destino."); if(origem===destino)throw new Error("Origem e destino precisam ser diferentes.");
  const accounts=await getAll("contas"); if(!accounts.some(a=>a.conta_id===origem&&a.status!=="inativo"))throw new Error("Conta de origem inválida."); if(!accounts.some(a=>a.conta_id===destino&&a.status!=="inativo"))throw new Error("Conta de destino inválida.");
  const now=nowISO(),record={transferencia_id:makeId("trf"),data:input.data||todayISO(),descricao:String(input.descricao||"Transferência entre contas").trim(),valor:value,origem_conta_id:origem,destino_conta_id:destino,observacao:String(input.observacao||"").trim(),criado_em:now,atualizado_em:now};
  await put("transferencias",record);await queueChange("TRANSFERENCIAS",record);return record;
}

export async function updateAccountDashboardVisibility(contaId, visibility="auto") {
  const allowed = ["auto","mostrar","ocultar"];
  if (!allowed.includes(visibility)) throw new Error("Visibilidade inválida.");
  const account = await getOne("contas", String(contaId || ""));
  if (!account) throw new Error("Conta não encontrada.");
  const updated = { ...account, dashboard_visibilidade: visibility, atualizado_em: nowISO() };
  await put("contas", updated);
  await queueChange("CONTAS", updated);
  return updated;
}
