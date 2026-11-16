// Utilitaires : DOM, formats français, rendu des jetons {{id}} / {{d:AAAA-MM-JJ}}.

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return el;
}

export const $ = (s, r = document) => r.querySelector(s);
export const clear = (el) => { el.replaceChildren(); return el; };

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MOIS[m - 1]} ${y}`;
}
export function fmtMonthYear(iso) {
  const [y, m] = iso.split("-").map(Number);
  return `${MOIS[m - 1]} ${y}`;
}
const nf = (d) => new Intl.NumberFormat("fr-CA", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtNum = (v, d = 0) => nf(d).format(v).replace(/ | /g, " ");
export const fmtPct = (v, d = 1) => fmtNum(v * 100, d) + " %";

export const POCKETS = { stocks: "Actions", etf_eq: "FNB d'actions", bonds: "Obligations", gold: "Or", crypto: "Crypto" };
export const POCKET_ORDER = ["stocks", "etf_eq", "bonds", "gold", "crypto"];
export const ASSET_GROUPS = { equity: "Actions", etf_equity: "FNB d'actions", etf_bond: "FNB d'obligations", etf_commodity: "Or", crypto: "Crypto" };

// Texte à jetons -> fragment DOM. Les nombres viennent de facts[id].display, jamais de `rendered`.
export function renderTokens(text, facts, onFact) {
  const frag = document.createDocumentFragment();
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.append(text.slice(last, m.index));
    const id = m[1].trim();
    if (id.startsWith("d:")) {
      frag.append(h("time", { class: "date-tok", datetime: id.slice(2), text: fmtDate(id.slice(2)) }));
    } else if (facts[id]) {
      const f = facts[id];
      frag.append(h("button", {
        type: "button", class: "badge" + (f.verified ? "" : " unverified"), "data-fact": id,
        "aria-label": `${f.display} — voir le reçu : ${f.label}`, title: "Voir le reçu de ce chiffre",
        onclick: (e) => onFact(id, e.currentTarget),
      }, f.display));
    } else {
      frag.append(h("span", { class: "badge unverified", text: "?" }));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}

export async function api(path, body, signal) {
  const opt = body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal };
  let r;
  try { r = await fetch(path, opt); } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new Error("Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.");
  }
  let j = null;
  try { j = await r.json(); } catch { /* ignore */ }
  if (!r.ok) throw new Error((j && j.error) || `Erreur du serveur (${r.status}). Réessayez dans un instant.`);
  return j;
}
