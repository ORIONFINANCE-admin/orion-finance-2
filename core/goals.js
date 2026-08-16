
import { getAll, put, queueChange } from "./db.js";
import { makeId, nowISO } from "./utils.js";
import { awardXP } from "./game.js";

export async function getGoals() {
  return getAll("metas_financeiras");
}

export async function getEmergencyFund() {
  const goals = await getGoals();
  return goals.find(g => g.tipo === "reserva_emergencia" && g.status !== "arquivada") || null;
}

export async function saveEmergencyFund(input) {
  const current = await getEmergencyFund();
  const target = Number(input.valor_alvo || 0);
  const currentValue = Number(input.valor_atual || 0);

  if (!(target > 0)) throw new Error("Informe um valor-alvo maior que zero.");
  if (currentValue < 0) throw new Error("O valor atual não pode ser negativo.");

  const now = nowISO();
  const record = {
    meta_id: current?.meta_id || makeId("meta"),
    tipo: "reserva_emergencia",
    nome: String(input.nome || "Reserva de emergência").trim(),
    valor_alvo: target,
    valor_atual: currentValue,
    status: currentValue >= target ? "concluida" : "ativa",
    criado_em: current?.criado_em || now,
    atualizado_em: now
  };

  await put("metas_financeiras", record);
  await queueChange("METAS_FINANCEIRAS", record);
  const pct = target > 0 ? currentValue / target * 100 : 0;
  if (pct >= 25) await awardXP("reserva", "reserva:25", 75, "25% da reserva construída.");
  if (pct >= 50) await awardXP("reserva", "reserva:50", 100, "50% da reserva construída.");
  if (pct >= 100) await awardXP("reserva", "reserva:100", 250, "Reserva de emergência concluída.");
  return record;
}

export function emergencyProgress(goal) {
  if (!goal) return {
    exists: false,
    percent: 0,
    level: 0,
    title: "Comece pela reserva de emergência",
    canExplore: false,
    canFullAccess: false
  };

  const target = Number(goal.valor_alvo || 0);
  const current = Number(goal.valor_atual || 0);
  const percent = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0;

  if (percent >= 100) return {
    exists: true, percent, level: 3,
    title: "Reserva concluída",
    canExplore: true,
    canFullAccess: true
  };

  if (percent >= 50) return {
    exists: true, percent, level: 2,
    title: "Familiarização liberada",
    canExplore: true,
    canFullAccess: false
  };

  return {
    exists: true, percent, level: 1,
    title: "Construindo sua base",
    canExplore: false,
    canFullAccess: false
  };
}
