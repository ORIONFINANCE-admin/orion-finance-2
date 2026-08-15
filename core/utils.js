export function money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

export function dateBR(value) {
  if (!value) return "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function nowISO() {
  return new Date().toISOString();
}

export function makeId(prefix) {
  const uuid = crypto.randomUUID().replaceAll("-", "");
  return `${prefix}_${uuid}`;
}

export function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function numberFromInput(value) {
  if (typeof value === "number") return value;
  const text = String(value || "").trim().replace(/\s/g, "");
  if (!text) return 0;

  // 1.234,56 -> 1234.56 | 1234,56 -> 1234.56 | 1234.56 -> 1234.56
  if (text.includes(",") && text.includes(".")) {
    return Number(text.replace(/\./g, "").replace(",", "."));
  }
  if (text.includes(",")) return Number(text.replace(",", "."));
  return Number(text);
}

export function debounce(fn, wait = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
