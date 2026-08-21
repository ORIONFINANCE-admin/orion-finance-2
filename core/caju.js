
import { getAll, put, queueChange } from "./db.js";
import { nowISO, makeId } from "./utils.js";
import { awardXP } from "./game.js";

/**
 * Retorna a conta Caju existente, se houver.
 * IMPORTANTE:
 * Esta função NÃO cria uma conta automaticamente.
 * Assim, após "Zerar Orion", nenhuma conta vazia reaparece.
 */
export async function ensureCajuStructure() {
  const [institutions, accounts] = await Promise.all([
    getAll("instituicoes"),
    getAll("contas")
  ]);

  const cajuInstitution = institutions.find(i =>
    norm(i.nome).includes("caju") || norm(i.nome_curto).includes("caju")
  );

  if (!cajuInstitution) return { conta: null, instituicao: null };

  const cajuAccounts = accounts.filter(a =>
    a.instituicao_id === cajuInstitution.instituicao_id
  );

  // Prefere uma conta Caju ativa já existente.
  const active = cajuAccounts.filter(a => a.status !== "inativo");
  let conta =
    active.find(a => a.conta_id === "conta_caju_alimentacao") ||
    active.find(a => a.tipo === "beneficio") ||
    active.find(a => norm(a.nome).includes("caju")) ||
    active[0] ||
    null;

  // Se houver estruturas antigas duplicadas, mantém só a preferida ativa.
  if (conta) {
    const now = nowISO();
    const normalized = {
      ...conta,
      nome: "Caju",
      tipo: "beneficio",
      status: "ativo",
      atualizado_em: now
    };

    if (
      normalized.nome !== conta.nome ||
      normalized.tipo !== conta.tipo ||
      normalized.status !== conta.status
    ) {
      await put("contas", normalized);
      await queueChange("CONTAS", normalized);
    }
    conta = normalized;

    for (const account of cajuAccounts) {
      if (account.conta_id === conta.conta_id) continue;
      if (account.status === "inativo") continue;

      const inactive = {
        ...account,
        status: "inativo",
        atualizado_em: now
      };
      await put("contas", inactive);
      await queueChange("CONTAS", inactive);
    }
  }

  return { conta, instituicao: cajuInstitution };
}

/**
 * Cria a conta Caju somente quando ela realmente passa a ser necessária,
 * por exemplo, quando o usuário confirma o crédito mensal.
 */
async function createCajuAccountIfNeeded() {
  const { conta, instituicao } = await ensureCajuStructure();
  if (conta) return conta;
  if (!instituicao) throw new Error("Instituição Caju não encontrada.");

  const now = nowISO();
  const record = {
    conta_id: "conta_caju_alimentacao",
    instituicao_id: instituicao.instituicao_id,
    nome: "Caju",
    tipo: "beneficio",
    saldo_inicial: 0,
    saldo_atual: 0,
    status: "ativo",
    criado_em: now,
    atualizado_em: now
  };

  await put("contas", record);
  await queueChange("CONTAS", record);
  return record;
}

/**
 * Retorna:
 * - mode: "initial" somente no último dia útil do mês;
 * - mode: "reminder" a partir de 5 dias depois, se ainda não confirmado;
 * - null nos demais dias.
 *
 * A existência da sugestão NÃO cria a conta Caju.
 */
export async function getCajuMonthlySuggestion() {
  const { conta, instituicao } = await ensureCajuStructure();
  if (!instituicao) return null;

  const now = new Date();
  const due = lastWeekday(now.getFullYear(), now.getMonth());
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const transactions = await getAll("transacoes");

  // Reconhece o lançamento mensal pela marca da observação,
  // mesmo se a conta tiver sido recriada depois de um reset.
  const exists = transactions.some(t =>
    t.tipo === "entrada" &&
    String(t.observacao || "").includes(`orion:caju_mensal:${monthKey}`)
  );

  if (exists) return null;

  const today = stripTime(now);
  const dueTime = stripTime(due);
  const reminderTime = dueTime + (5 * 24 * 60 * 60 * 1000);

  if (today === dueTime) {
    return {
      mode: "initial",
      value: 400,
      date: localISO(due),
      monthKey,
      account: conta,
      message: "Caju: R$ 400 estão previstos para hoje. Confirma o recebimento?"
    };
  }

  if (today >= reminderTime) {
    return {
      mode: "reminder",
      value: 400,
      date: localISO(due),
      monthKey,
      account: conta,
      message: "A confirmação da Caju ficou pendente. Você recebeu os R$ 400 deste mês?"
    };
  }

  return null;
}

export async function registerCajuMonthlyCredit() {
  const suggestion = await getCajuMonthlySuggestion();
  if (!suggestion) {
    throw new Error("Não há confirmação mensal da Caju pendente neste momento.");
  }

  const account = await createCajuAccountIfNeeded();

  const categories = await getAll("categorias");
  const category =
    categories.find(c => norm(c.nome) === "trabalho") ||
    categories.find(c => String(c.tipo_permitido || "") === "entrada") ||
    categories.find(c => String(c.tipo_permitido || "") === "entrada_saida");

  if (!category) throw new Error("Nenhuma categoria de entrada disponível.");

  const now = nowISO();
  const record = {
    transacao_id: makeId("trx"),
    data: suggestion.date,
    descricao: "Caju mensal",
    valor: 400,
    tipo: "entrada",
    categoria_id: category.categoria_id,
    subcategoria_id: "",
    conta_id: account.conta_id,
    forma_pagamento: "beneficio",
    cartao_id: "",
    observacao: `Crédito recorrente confirmado · orion:caju_mensal:${suggestion.monthKey}`,
    criado_em: now,
    atualizado_em: now
  };

  await put("transacoes", record);
  await queueChange("TRANSACOES", record);
  await awardXP(
    "rotina",
    `caju:${suggestion.monthKey}`,
    10,
    "Crédito mensal da Caju confirmado."
  );

  return record;
}

function lastWeekday(year, month) {
  const d = new Date(year, month + 1, 0, 12);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function norm(v) {
  return String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
