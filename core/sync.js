import { ORION_CONFIG, getApiToken, getDeviceType } from "./config.js";
import {
  getMeta,
  setMeta,
  getPendingGrouped,
  getPendingList,
  clearPending,
  importRemoteData,
  reapplyPending
} from "./db.js";

async function fetchJSON(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Falha de rede (${response.status}).`);
    }

    const data = await response.json();
    if (!data?.ok && !data?.conflito) {
      throw new Error(data?.erro || "A API do Orion retornou um erro.");
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("A sincronização demorou demais. Tente novamente.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function requireToken() {
  const token = getApiToken();
  if (!token) throw new Error("Informe o token do Orion nas configurações.");
  return token;
}

export async function health() {
  return fetchJSON(`${ORION_CONFIG.apiUrl}?acao=health`);
}

export async function getRemoteVersion() {
  const token = requireToken();
  const url = `${ORION_CONFIG.apiUrl}?acao=versao&token=${encodeURIComponent(token)}`;
  return fetchJSON(url);
}

export async function downloadAll() {
  const token = requireToken();
  const url = `${ORION_CONFIG.apiUrl}?acao=baixar&token=${encodeURIComponent(token)}`;
  const data = await fetchJSON(url);

  await importRemoteData(data.dados || {});
  await setMeta("banco_atualizado_em", data.banco_atualizado_em || "");
  await setMeta("ultima_sincronizacao_local", new Date().toISOString());

  return data;
}

async function postSync(payload) {
  return fetchJSON(ORION_CONFIG.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
}

export async function syncNow() {
  const token = requireToken();
  const pendingItems = await getPendingList();
  const alteracoes = await getPendingGrouped();
  const baseAtualizadaEm = await getMeta("banco_atualizado_em", "");

  let result = await postSync({
    acao: "sincronizar",
    token,
    dispositivo: getDeviceType("desconhecido"),
    base_atualizada_em: baseAtualizadaEm,
    alteracoes
  });

  if (result.conflito) {
    // Rebase simples: baixa remoto, reaplica alterações locais e tenta novamente uma vez.
    await importRemoteData(result.dados || {});
    await setMeta("banco_atualizado_em", result.banco_atualizado_em || "");
    await reapplyPending(pendingItems);

    result = await postSync({
      acao: "sincronizar",
      token,
      dispositivo: getDeviceType("desconhecido"),
      base_atualizada_em: result.banco_atualizado_em || "",
      alteracoes
    });
  }

  if (!result.ok) {
    throw new Error(result.erro || "Não foi possível concluir a sincronização.");
  }

  await importRemoteData(result.dados || {});
  await clearPending();
  await setMeta("banco_atualizado_em", result.banco_atualizado_em || "");
  await setMeta("ultima_sincronizacao_local", result.sincronizado_em || new Date().toISOString());

  return result;
}

export async function getSyncStatus() {
  if (!getApiToken()) {
    return { connected: false, needsSync: false, reason: "token" };
  }

  if (!navigator.onLine) {
    return { connected: true, online: false, needsSync: false };
  }

  const localVersion = await getMeta("banco_atualizado_em", "");
  const remote = await getRemoteVersion();

  return {
    connected: true,
    online: true,
    needsSync: Boolean(remote.banco_atualizado_em && remote.banco_atualizado_em !== localVersion),
    localVersion,
    remoteVersion: remote.banco_atualizado_em || "",
    remote
  };
}


export async function fetchInvestment(ticker) {
  const token = requireToken();
  const clean = String(ticker || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (!clean) throw new Error("Informe um ticker.");
  const url = `${ORION_CONFIG.apiUrl}?acao=investimento&token=${encodeURIComponent(token)}&ticker=${encodeURIComponent(clean)}`;
  const data = await fetchJSON(url);
  if (data.precisa_brapi) throw new Error(data.erro || "É necessária uma chave da brapi.");
  return data;
}


export async function resetRemoteData() {
  const token = requireToken();
  const response = await fetch(ORION_CONFIG.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ acao: "zerar_dados", token })
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.erro || "Não foi possível zerar os dados online.");
  return data;
}
