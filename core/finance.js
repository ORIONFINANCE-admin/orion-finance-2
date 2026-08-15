import { getAll } from "./db.js";

export async function calculateDashboard() {
  const [accounts, transactions, transfers] = await Promise.all([
    getAll("contas"),
    getAll("transacoes"),
    getAll("transferencias")
  ]);

  const activeAccounts = accounts.filter(a => a.status !== "inativo");
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let entradasMes = 0;
  let saidasMes = 0;

  const balanceByAccount = new Map(
    activeAccounts.map(a => [a.conta_id, Number(a.saldo_inicial || 0)])
  );

  for (const t of transactions) {
    if (!t?.data || !t?.conta_id) continue;
    const value = Number(t.valor || 0);
    const d = new Date(`${String(t.data).slice(0, 10)}T12:00:00`);
    const isCurrentMonth = !Number.isNaN(d.getTime()) &&
      d.getMonth() === month && d.getFullYear() === year;

    // Crédito bancário não reduz a conta na compra; benefício Caju reduz o saldo próprio.
    const account = activeAccounts.find(a => a.conta_id === t.conta_id);
    const benefitCredit = t.forma_pagamento === "credito" && account?.tipo === "beneficio";
    const affectsAccount = t.forma_pagamento !== "credito" || benefitCredit;

    if (affectsAccount && balanceByAccount.has(t.conta_id)) {
      const current = balanceByAccount.get(t.conta_id);
      balanceByAccount.set(
        t.conta_id,
        t.tipo === "entrada" ? current + value : current - value
      );
    }

    if (isCurrentMonth) {
      if (t.tipo === "entrada") entradasMes += value;
      if (t.tipo === "saida") saidasMes += value;
    }
  }

  for (const tr of transfers) {
    const value=Number(tr.valor||0);
    if(balanceByAccount.has(tr.origem_conta_id)) balanceByAccount.set(tr.origem_conta_id,balanceByAccount.get(tr.origem_conta_id)-value);
    if(balanceByAccount.has(tr.destino_conta_id)) balanceByAccount.set(tr.destino_conta_id,balanceByAccount.get(tr.destino_conta_id)+value);
  }

  const contas = activeAccounts.map(account => ({
    ...account,
    saldo_calculado: balanceByAccount.get(account.conta_id) ?? Number(account.saldo_inicial || 0)
  }));

  const saldoTotal = contas.reduce((sum, a) => sum + Number(a.saldo_calculado || 0), 0);

  return {
    saldoTotal,
    entradasMes,
    saidasMes,
    resultadoMes: entradasMes - saidasMes,
    contas
  };
}

export async function recentTransactions(limit = 8) {
  const transactions = await getAll("transacoes");
  return transactions
    .slice()
    .sort((a, b) => {
      const da = `${a.data || ""}|${a.criado_em || ""}`;
      const db = `${b.data || ""}|${b.criado_em || ""}`;
      return db.localeCompare(da);
    })
    .slice(0, limit);
}
