const DB_NAME = "orion_finance_2";
const DB_VERSION = 5;

export const STORE_MAP = Object.freeze({
  INSTITUICOES: { store: "instituicoes", key: "instituicao_id" },
  CONTAS: { store: "contas", key: "conta_id" },
  CARTOES_CREDITO: { store: "cartoes_credito", key: "cartao_id" },
  CATEGORIAS: { store: "categorias", key: "categoria_id" },
  SUBCATEGORIAS: { store: "subcategorias", key: "subcategoria_id" },
  TRANSACOES: { store: "transacoes", key: "transacao_id" },
  DIVIDAS: { store: "dividas", key: "divida_id" },
  PAGAMENTOS_DIVIDAS: { store: "pagamentos_dividas", key: "pagamento_id" },
  ORCAMENTOS: { store: "orcamentos", key: "orcamento_id" },
  FECHAMENTOS: { store: "fechamentos", key: "fechamento_id" },
  FRASES: { store: "frases", key: "frase_id" },
  RADAR_INVESTIMENTOS: { store: "radar_investimentos", key: "radar_id" },
  METAS_FINANCEIRAS: { store: "metas_financeiras", key: "meta_id" },
  EVENTOS_XP: { store: "eventos_xp", key: "evento_id" },
  TRANSFERENCIAS: { store: "transferencias", key: "transferencia_id" },
  DESPESAS_RECORRENTES: { store: "despesas_recorrentes", key: "recorrente_id" }
});

let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      Object.values(STORE_MAP).forEach(({ store, key }) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: key });
        }
      });

      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "chave" });
      }

      if (!db.objectStoreNames.contains("pendencias")) {
        db.createObjectStore("pendencias", { keyPath: "chave" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Falha ao abrir o banco local."));
  });

  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Erro no banco local."));
  });
}

export async function getAll(store) {
  const db = await openDB();
  const tx = db.transaction(store, "readonly");
  return requestToPromise(tx.objectStore(store).getAll());
}

export async function getOne(store, key) {
  const db = await openDB();
  const tx = db.transaction(store, "readonly");
  return requestToPromise(tx.objectStore(store).get(key));
}

export async function put(store, value) {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  await requestToPromise(tx.objectStore(store).put(value));
  return value;
}

export async function remove(store, key) {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  await requestToPromise(tx.objectStore(store).delete(key));
}

export async function clear(store) {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  await requestToPromise(tx.objectStore(store).clear());
}

export async function replaceAll(store, values) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const objectStore = tx.objectStore(store);
    objectStore.clear();
    for (const value of values || []) objectStore.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error(`Falha ao atualizar ${store}.`));
    tx.onabort = () => reject(tx.error || new Error(`Atualização cancelada em ${store}.`));
  });
}

export async function setMeta(chave, valor) {
  return put("meta", { chave, valor });
}

export async function getMeta(chave, fallback = "") {
  const item = await getOne("meta", chave);
  return item?.valor ?? fallback;
}

export async function queueChange(sheetName, record) {
  const map = STORE_MAP[sheetName];
  if (!map) throw new Error(`Tabela inválida: ${sheetName}`);
  const id = record?.[map.key];
  if (!id) throw new Error(`Registro sem ${map.key}.`);

  await put("pendencias", {
    chave: `${sheetName}:${id}`,
    tabela: sheetName,
    registro: structuredClone(record)
  });
}

export async function getPendingGrouped() {
  const pending = await getAll("pendencias");
  const grouped = {};
  for (const item of pending) {
    (grouped[item.tabela] ||= []).push(item.registro);
  }
  return grouped;
}

export async function getPendingList() {
  return getAll("pendencias");
}

export async function clearPending() {
  return clear("pendencias");
}

export async function importRemoteData(data) {
  const entries = Object.entries(STORE_MAP);
  for (const [sheetName, map] of entries) {
    await replaceAll(map.store, Array.isArray(data?.[sheetName]) ? data[sheetName] : []);
  }
}

export async function reapplyPending(pendingItems) {
  for (const item of pendingItems) {
    const map = STORE_MAP[item.tabela];
    if (!map) continue;
    await put(map.store, item.registro);
  }
}


export async function clearUserData() {
  const db = await openDB();
  const stores = [...new Set(Object.values(STORE_MAP).map(({ store }) => store))];

  await new Promise((resolve, reject) => {
    const tx = db.transaction([...stores, "pendencias"], "readwrite");

    for (const storeName of stores) {
      tx.objectStore(storeName).clear();
    }
    tx.objectStore("pendencias").clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Não foi possível limpar os dados locais."));
    tx.onabort = () => reject(tx.error || new Error("A limpeza local foi cancelada."));
  });
}
