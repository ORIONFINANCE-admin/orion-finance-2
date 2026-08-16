import { STORE_MAP, getAll, getMeta } from "./db.js";

export const APP_VERSION = "0.9.4";
export const SCHEMA_VERSION = "1.7.0";

export async function buildDiagnostics() {
  const result = {};
  for (const [, map] of Object.entries(STORE_MAP)) {
    try { result[map.store] = (await getAll(map.store)).length; }
    catch (_) { result[map.store] = "erro"; }
  }
  let pending = 0;
  try { pending = (await getAll("pendencias")).length; } catch (_) {}
  return {
    app: APP_VERSION,
    schema: SCHEMA_VERSION,
    pending,
    lastSync: await getMeta("ultima_sincronizacao_local", ""),
    counts: result,
    online: navigator.onLine
  };
}
