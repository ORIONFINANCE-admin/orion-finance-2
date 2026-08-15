export const ORION_CONFIG = Object.freeze({
  apiUrl: "https://script.google.com/macros/s/AKfycbwTcbjj8hpNh0PFLbrKSFyJs9G4DSUlC84qDEM0rrvbqOrQt4wZlNKxjdeIKfB9oPiw/exec",
  schemaVersion: "1.5.1",
  tokenStorageKey: "orion_api_token_v2",
  deviceStorageKey: "orion_device_v2"
});

export function getApiToken() {
  return localStorage.getItem(ORION_CONFIG.tokenStorageKey) || "";
}

export function setApiToken(token) {
  const value = String(token || "").trim();
  if (!value) throw new Error("Token vazio.");
  localStorage.setItem(ORION_CONFIG.tokenStorageKey, value);
}

export function clearApiToken() {
  localStorage.removeItem(ORION_CONFIG.tokenStorageKey);
}

export function getDeviceType(fallback = "desconhecido") {
  return localStorage.getItem(ORION_CONFIG.deviceStorageKey) || fallback;
}

export function setDeviceType(type) {
  localStorage.setItem(ORION_CONFIG.deviceStorageKey, type);
}
