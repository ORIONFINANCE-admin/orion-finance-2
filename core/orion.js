import { put, queueChange, getAll, getOne } from "./db.js";
import { makeId, nowISO, todayISO } from "./utils.js";

export async function createAccount(input) {
  const record = {
    conta_id: makeId("conta"),
    instituicao_id: String(input.instituicao_id || ""),
    nome: String(input.nome || "").trim(),
    tipo: String(input.tipo || "corrente"),
    saldo_inicial: Number(input.saldo_inicial || 0),
    saldo_atual: Number(input.saldo_inicial || 0),
    status: "ativo",
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
    observacao: String(input.observacao || "").trim(),
    criado_em: nowISO(),
    atualizado_em: nowISO()
  };

  if (!record.descricao) throw new Error("Informe uma descrição.");
  if (!record.categoria_id) throw new Error("Selecione a categoria.");
  if (!record.conta_id) throw new Error("Selecione a conta.");

  await put("transacoes", record);
  await queueChange("TRANSACOES", record);
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
