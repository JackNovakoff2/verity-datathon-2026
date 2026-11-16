// Graphique SVG fait main : valeur de 100 à la date de décision, jusqu'à aujourd'hui.
import { h, clear, fmtDate, fmtMonthYear, fmtNum } from "./util.js?v=10";

const NS = "http://www.w3.org/2000/svg";
const s = (tag, attrs, ...kids) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  for (const k of kids) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};

export const SERIES_STYLE = {
  portefeuille: { label: "Portefeuille", color: "#126fb2", w: 3 },
  reference: { label: "Mélange classique", color: "#56636b", w: 2.25, dash: "7 5" },
  demande: { label: "Demande", color: "#c40023", w: 2.5 },
  contre_proposition: { label: "Contre-proposition", color: "#2a7157", w: 2.5, dash: "2 4" },
};

function niceStep(range) {
  const raw = range / 5, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

export function drawChart(host, series, keys, opt) {
  clear(host);
  if (!series || !series.dates || series.dates.length < 2) {
    host.append(h("p", { class: "muted" }, "Pas assez de recul pour tracer une trajectoire : la date de décision est trop proche d'aujourd'hui. Choisissez une date plus ancienne à l'étape 2."));
    return;
  }
  const W = Math.max(300, Math.round(host.clientWidth || 800));
  const narrow = W < 560;
  const H = narrow ? 300 : 380;
  const m = { l: 46, r: narrow ? 12 : 12, t: 34, b: 34 };
  const t = series.dates.map((d) => Date.parse(d + "T00:00:00Z"));
  const t0 = t[0], t1 = t[t.length - 1];
  let lo = Infinity, hi = -Infinity;
  for (const k of keys) for (const v of series[k]) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  lo = Math.min(lo, 100); hi = Math.max(hi, 100);
  const LOG = !!opt.log;
  let step = 0, yt = [];
  if (LOG) {
    const cand = [10, 20, 30, 50, 70, 100, 150, 200, 300, 500, 700, 1000, 1500, 2000, 3000, 5000, 10000];
    const lo2 = cand.filter((c) => c <= lo).pop() || cand[0], hi2 = cand.find((c) => c >= hi) || cand[cand.length - 1];
    yt = cand.filter((c) => c >= lo2 && c <= hi2); lo = lo2; hi = hi2;
  } else {
    step = niceStep(hi - lo);
    lo = Math.floor((lo - step * 0.2) / step) * step; hi = Math.ceil((hi + step * 0.2) / step) * step;
    for (let v = lo; v <= hi + 1e-9; v += step) yt.push(v);
  }
  const X = (v) => m.l + ((v - t0) / (t1 - t0)) * (W - m.l - m.r);
  const sc = (v) => (LOG ? Math.log(v) : v);
  const Y = (v) => H - m.b - ((sc(v) - sc(lo)) / (sc(hi) - sc(lo))) * (H - m.t - m.b);

  const names = keys.map((k) => SERIES_STYLE[k].label).join(", ");
  const endTxt = keys.map((k) => `${SERIES_STYLE[k].label} ${fmtNum(series[k][series[k].length - 1], 0)}`).join(" ; ");
  const uid = "c" + Math.random().toString(36).slice(2, 7);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-labelledby": `${uid}t ${uid}d`, width: W, height: H });
  svg.append(s("title", { id: uid + "t" }, opt.title));
  svg.append(s("desc", { id: uid + "d" },
    `Courbes de valeur, base 100 au ${fmtDate(series.dates[0])}, jusqu'au ${fmtDate(series.dates[series.dates.length - 1])} : ${names}. Valeurs finales : ${endTxt}. Une ligne verticale marque la date de décision.`));

  // grille + axe Y
  for (const v of yt) {
    const y = Y(v);
    svg.append(s("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: "#dbe6ec", "stroke-width": 1 }));
    svg.append(s("text", { x: m.l - 8, y: y + 4.5, "text-anchor": "end", "font-size": 13, fill: "#4d6676" }, fmtNum(v, 0)));
  }
  // axe X : janv. de chaque année (ou trimestres si court)
  const spanY = (t1 - t0) / 3.15e10;
  const d0 = new Date(t0), ticks = [];
  const stepM = spanY > 2.2 ? 12 : spanY > 1 ? 6 : 3;
  let y = d0.getUTCFullYear(), mo = Math.floor(d0.getUTCMonth() / stepM) * stepM + stepM;
  if (mo >= 12) { mo -= 12; y += 1; }
  for (let i = 0; i < 40; i++) {
    const tt = Date.UTC(y, mo, 1);
    if (tt > t1) break;
    if (tt - t0 > (t1 - t0) * 0.06 && t1 - tt > (t1 - t0) * 0.04) ticks.push(tt);
    mo += stepM; if (mo >= 12) { mo -= 12; y += 1; }
  }
  for (const tt of ticks) {
    if (X(t1) - X(tt) < 95) continue;
    const iso = new Date(tt).toISOString().slice(0, 10);
    svg.append(s("line", { x1: X(tt), x2: X(tt), y1: H - m.b, y2: H - m.b + 5, stroke: "#8da0ab" }));
    svg.append(s("text", { x: X(tt), y: H - m.b + 20, "text-anchor": "middle", "font-size": 13, fill: "#4d6676" }, fmtMonthYear(iso)));
  }
  svg.append(s("text", { x: W - m.r, y: H - m.b + 20, "text-anchor": "end", "font-size": 13, fill: "#4d6676" }, fmtDate(series.dates[series.dates.length - 1])));
  // base 100
  svg.append(s("line", { x1: m.l, x2: W - m.r, y1: Y(100), y2: Y(100), stroke: "#8da0ab", "stroke-width": 1.2, "stroke-dasharray": "2 3" }));
  // ligne de décision
  svg.append(s("line", { x1: m.l, x2: m.l, y1: m.t - 8, y2: H - m.b, stroke: "#26343c", "stroke-width": 2 }));
  svg.append(s("text", { x: m.l + 6, y: m.t - 14, "font-size": 13, "font-weight": 500, fill: "#26343c" }, `Date de décision : ${fmtDate(series.dates[0])} (valeur 100)`));
  // courbes (la référence d'abord, le portefeuille au-dessus)
  const order = [...keys].sort((a, b) => (a === "reference" ? -1 : b === "reference" ? 1 : 0));
  for (const k of order) {
    const st = SERIES_STYLE[k];
    const d = series[k].map((v, i) => `${i ? "L" : "M"}${X(t[i]).toFixed(1)},${Y(v).toFixed(1)}`).join("");
    svg.append(s("path", { d, fill: "none", stroke: st.color, "stroke-width": st.w, "stroke-linejoin": "round", "stroke-linecap": "round", ...(st.dash ? { "stroke-dasharray": st.dash } : {}) }));
    const ly = Y(series[k][series[k].length - 1]);
    svg.append(s("circle", { cx: X(t1), cy: ly, r: 4, fill: st.color }));
  }
  host.append(svg);
  host.append(h("ul", { class: "legend", "aria-label": "Légende" }, keys.map((k) => {
    const st = SERIES_STYLE[k];
    const label = k === "reference" && opt.refName ? opt.refName.charAt(0).toUpperCase() + opt.refName.slice(1) : st.label;
    const i = h("i", { class: st.dash ? "dash" : "" }); i.style.borderTopColor = st.color;
    return h("li", {}, i, label);
  })));
  host.append(h("p", { class: "hint", style: "margin:8px 0 0" }, (LOG ? "Échelle logarithmique : chaque graduation multiplie la valeur, ce qui garde lisibles les courbes les plus faibles. " : "") + "Valeur de 100 au départ. Chaque courbe suppose le portefeuille conservé tel quel, sans frais ni impôt. Les rendements passés ne prédisent pas l'avenir."));
}
