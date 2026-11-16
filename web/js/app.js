import { h, $, clear, fmtDate, fmtNum, fmtPct, renderTokens, api, POCKETS, POCKET_ORDER, ASSET_GROUPS } from "./util.js?v=10";
import { drawChart } from "./chart.js?v=10";

const DEFAULT_ASOF = "2023-01-01";
const S = {
  personas: [], assets: [], names: {}, mode: null, personaId: null, custom: null, questions: [],
  asOf: DEFAULT_ASOF, dates: [], built: false, step: 1,
  a2: null, a3: null, seq2: 0, seq3: 0, last: null,
};

/* ---------- Dates mensuelles ---------- */
for (let y = 2022, m = 11; `${y}-${String(m).padStart(2, "0")}` <= "2026-06"; m = m === 12 ? (y++, 1) : m + 1) {
  S.dates.push(`${y}-${String(m).padStart(2, "0")}-01`);
}

const who = () => (S.mode === "custom" && S.custom ? { mandate: S.custom } : { persona: S.personaId || "robert" });
const spinner = (txt) => h("span", { class: "status" }, h("span", { class: "spin", "aria-hidden": "true" }), txt);
const setStatus = (el, node, err) => { clear(el); el.className = "status" + (err ? " err" : ""); if (node) el.append(node); };

/* ---------- Étapes ---------- */
function showStep(n) {
  S.step = n;
  for (const i of [1, 2, 3]) $("#step" + i).hidden = i !== n;
  for (const b of document.querySelectorAll(".crumb")) {
    const i = +b.dataset.step;
    b.disabled = i > 1 && !S.built;
    if (i === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
  }
  if (n === 2 && !S.a2) loadStep2();
  if (n === 3) $("#ask-ctx").textContent = `Date de décision : ${fmtDate(S.asOf)} (modifiable à l'étape 2).`;
  if (n >= 2) $("#panel-how").open = false;
  const t = $(`#t${n}`); t.scrollIntoView({ block: "start" });
  window.scrollTo({ top: 0 });
  if (n === 3) redrawCharts();
}
for (const b of document.querySelectorAll(".crumb")) b.addEventListener("click", () => !b.disabled && showStep(+b.dataset.step));
$("#open-how").addEventListener("click", () => { const p = $("#panel-how"); p.open = true; p.scrollIntoView({ behavior: "smooth", block: "start" }); p.querySelector("summary").focus(); });

/* ---------- Étape 1 : mandat ---------- */
function ruleList(ul, rules) {
  clear(ul);
  for (const r of rules) ul.append(h("li", {}, h("span", { class: "ico ok", "aria-hidden": "true" }, "✓"), h("span", {}, h("span", { class: "sr-only" }, "Règle : "), r.text), h("span")));
}

function showMandate(title, sub, rules, questions) {
  $("#mandate-card").hidden = false;
  $("#mandate-title").textContent = title;
  $("#mandate-sub").textContent = sub;
  ruleList($("#mandate-rules"), rules);
  const box = $("#assumptions");
  box.hidden = !(questions && questions.length);
  clear($("#assumptions-list"));
  for (const q of questions || []) $("#assumptions-list").append(h("li", {}, typeof q === "string" ? q : q.text || q.question || JSON.stringify(q)));
}

function selectPersona(id, user = true) {
  const p = S.personas.find((x) => x.id === id);
  if (!p) return;
  S.mode = "persona"; S.personaId = id; S.custom = null; S.questions = [];
  const r = document.querySelector(`input[name=persona][value=${id}]`); if (r) r.checked = true;
  if (user) { S.built = false; S.a2 = null; showStep1Nav(); }
  showMandate(`Mandat de ${p.name}`, `${p.name}, ${p.age} ans, ${p.job}. Horizon de placement : ${p.horizon_years} ans. Ces règles sont codées d'avance pour ce profil fictif.`, p.rules, []);
}
function showStep1Nav() { for (const b of document.querySelectorAll(".crumb")) if (+b.dataset.step > 1) b.disabled = !S.built; }

async function init() {
  try {
    [S.personas, S.assets] = await Promise.all([api("/api/personas"), api("/api/assets")]);
  } catch (e) {
    $("#personas").append(h("div", { class: "err-box" }, "Impossible de charger les profils : " + e.message));
    return;
  }
  for (const a of S.assets) S.names[a.ticker] = a.name;
  const fs = clear($("#personas"));
  fs.append(h("legend", {}, "Choisir un profil fictif"));
  for (const p of S.personas) {
    fs.append(h("label", { class: "persona", "data-testid": "persona-" + p.id },
      h("input", { type: "radio", name: "persona", value: p.id, onchange: () => selectPersona(p.id) }),
      h("span", { class: "box" },
        h("span", { class: "nm" }, p.name, h("span", { class: "tick", "aria-hidden": "true" }, "✓")),
        h("span", { class: "meta" }, `${p.age} ans · ${p.job} · horizon ${p.horizon_years} ans`),
        h("q", {}, p.story),
        h("span", { class: "meta" }, `${p.rules.length} règles dans le mandat`))));
  }
  // menu de titres (étape 3)
  const sel = $("#ask-ticker");
  for (const g of Object.keys(ASSET_GROUPS)) {
    const items = S.assets.filter((a) => a.cls === g);
    if (!items.length) continue;
    sel.append(h("optgroup", { label: ASSET_GROUPS[g] }, items.map((a) => h("option", { value: a.ticker }, `${a.name} (${a.ticker})`))));
  }
  sel.value = "NVDA";
  // curseur de date
  const r = $("#tm-range");
  r.max = S.dates.length - 1; r.value = S.dates.indexOf(S.asOf) >= 0 ? S.dates.indexOf(S.asOf) : 2;
  $("#tm-min").textContent = fmtDate(S.dates[0]); $("#tm-max").textContent = fmtDate(S.dates[S.dates.length - 1]);
  $("#tm-out").textContent = fmtDate(S.asOf);
}

$("#compile").addEventListener("click", async () => {
  const story = $("#story-text").value.trim();
  const st = $("#compile-status"), btn = $("#compile");
  if (story.length < 20) { setStatus(st, h("span", {}, "Décrivez votre situation en une ou deux phrases (au moins 20 caractères)."), true); $("#story-text").focus(); return; }
  btn.disabled = true; btn.setAttribute("aria-busy", "true");
  setStatus(st, spinner("L'agent d'accueil traduit votre récit en règles… (environ 10 secondes)"));
  try {
    const r = await api("/api/compile", { story });
    S.mode = "custom"; S.custom = r.mandate; S.questions = r.questions || []; S.personaId = null; S.built = false; S.a2 = null;
    document.querySelectorAll("input[name=persona]").forEach((i) => (i.checked = false));
    showStep1Nav();
    showMandate("Mandat construit à partir de votre récit", `Horizon de placement retenu : ${r.mandate.horizon_years} ans. Relisez chaque règle avant de continuer.`, r.rules, S.questions);
    setStatus(st, h("span", {}, "Votre mandat est prêt, plus bas."));
    $("#mandate-card").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    setStatus(st, h("span", {}, "L'agent d'accueil n'a pas pu traduire ce récit : " + e.message + " Vous pouvez réessayer ou choisir un profil fictif."), true);
  } finally { btn.disabled = false; btn.removeAttribute("aria-busy"); }
});

$("#build").addEventListener("click", () => {
  if (!S.mode) { selectPersona("robert"); }
  S.built = true; S.a2 = null;
  showStep(2);
});

/* ---------- Étape 2 : portefeuille ---------- */
function mandateName() { return (S.a2 || S.a3 || {}).mandate ? (S.a2 || S.a3).mandate.name : ""; }

let tmTimer;
$("#tm-range").addEventListener("input", (e) => {
  S.asOf = S.dates[+e.target.value];
  $("#tm-out").textContent = fmtDate(S.asOf);
  clearTimeout(tmTimer);
  tmTimer = setTimeout(() => { S.a3 = null; $("#verdict-zone").hidden = true; loadStep2(); }, 300);
});

async function loadStep2() {
  const seq = ++S.seq2;
  const st = $("#s2-status");
  setStatus(st, spinner("Calcul du portefeuille avec les données jusqu'au " + fmtDate(S.asOf) + "…"));
  let a;
  try { a = await api("/api/analyze", { ...who(), as_of: S.asOf }); } catch (e) {
    if (seq === S.seq2) setStatus(st, h("span", {}, "Le calcul a échoué : " + e.message + " Déplacez le curseur ou réessayez."), true);
    return;
  }
  if (seq !== S.seq2) return;
  setStatus(st, null);
  S.a2 = a; S.last = a;
  renderStep2(a);
  narrate(seq, who(), a, null, "2");
}

function renderStep2(a) {
  $("#s2-lead").textContent = `Voici le portefeuille simulé de ${a.mandate.name}, construit pour respecter son mandat avec les seules données connues le ${fmtDate(a.as_of)}. Chaque nombre du récit est un reçu.`;
  $("#tm-out").textContent = fmtDate(a.as_of);
  $("#tm-label").textContent = a.as_of === S.asOf ? "Date de décision" : `Date de décision (dernière séance avant le ${fmtDate(S.asOf)})`;
  renderAlloc($("#alloc"), a.portfolio.weights);
  renderChecks($("#checks"), a.checks);
  renderStory($("#story"), a.sections, a.facts, () => true);
  setNarrState($("#narr-state"), "base", a);
  drawChart($("#chart-main"), a.series, ["portefeuille", "reference"], { title: "Portefeuille simulé contre mélange classique", refName: a.bench.name });
  renderPanels(a);
}

function renderAlloc(host, rows) {
  clear(host);
  const max = Math.max(...rows.map((r) => r.weight));
  const groups = {};
  for (const r of rows) (groups[r.cls] ||= []).push(r);
  const order = Object.keys(groups).sort((a, b) => sum(groups[b]) - sum(groups[a]));
  for (const g of order) {
    host.append(h("div", { class: "pocket" },
      h("div", { class: "pocket-h" }, h("span", {}, `${POCKETS[g] || g}`), h("span", { class: "num" }, fmtPct(sum(groups[g])))),
      groups[g].sort((a, b) => b.weight - a.weight).map((r) => {
        const fill = h("div", { class: "fill" }); fill.style.width = (r.weight / max * 100).toFixed(1) + "%";
        return h("div", { class: "bar-row", title: `${r.name} (${r.ticker}) : ${fmtPct(r.weight, 2)}` },
          h("span", { class: "lbl" }, r.name),
          h("div", { class: "track", "aria-hidden": "true" }, fill),
          h("span", { class: "v num" }, fmtPct(r.weight)));
      })));
  }
}
const sum = (rs) => rs.reduce((t, r) => t + r.weight, 0);

function renderChecks(ul, checks) {
  clear(ul);
  for (const c of checks) {
    ul.append(h("li", { class: c.ok ? "" : "ko-txt" },
      h("span", { class: "ico " + (c.ok ? "ok" : "ko"), "aria-hidden": "true" }, c.ok ? "✓" : "×"),
      h("span", {}, h("span", { class: "sr-only" }, c.ok ? "Respectée : " : "Non respectée : "), c.text),
      h("span", { class: "val num" }, c.display, h("small", {}, "valeur réelle"))));
  }
}

function renderStory(host, sections, facts, keep) {
  clear(host);
  for (const sec of sections.filter((x) => keep(x))) {
    const sents = sec.sentences.filter((x) => x.ok);
    if (!sents.length) continue;
    host.append(h("div", { class: "story-sec" },
      h("h3", {}, sec.title),
      sents.map((x) => h("p", {}, renderTokens(x.text, facts, openReceipt)))));
  }
}

function setNarrState(el, mode, a, msg) {
  clear(el);
  if (mode === "loading") el.append(h("span", { class: "spin", "aria-hidden": "true" }), "Le narrateur (Claude) réécrit le récit avec des phrases plus claires. Chaque nombre reste lié à son reçu, le vérificateur contrôle tout… (de 5 à 20 secondes ; le texte actuel reste lisible)");
  else if (mode === "claude") el.append(h("span", { class: "mode-chip claude" }, "Rédigé par Claude, chaque nombre vérifié"), h("span", { class: "hint" }, "Mode : " + a.narration_mode));
  else if (mode === "error") el.append(h("span", { class: "mode-chip" }, "Texte de base conservé"), h("span", { class: "hint" }, msg));
  else el.append(h("span", { class: "mode-chip" }, "Texte de base, calculé sans modèle de langage"), h("span", { class: "hint" }, "Mode : " + a.narration_mode));
}

async function narrate(seq, body, base, extra, where) {
  const stateEl = where === "2" ? $("#narr-state") : $("#narr-state3");
  const cur = () => (where === "2" ? S.seq2 : S.seq3) === seq;
  setNarrState(stateEl, "loading");
  try {
    const n = await api("/api/narrate", extra ? { ...body, as_of: S.asOf, ...extra } : { ...body, as_of: S.asOf });
    if (!cur()) return;
    if (/Claude/i.test(n.narration_mode)) {
      if (where === "2") { S.a2 = n; renderStoryOnly2(n); } else { S.a3 = n; renderStory3(n, true); }
      setNarrState(stateEl, "claude", n); renderPanels(n);
    } else {
      setNarrState(stateEl, "error", n, "La rédaction par Claude n'a pas abouti cette fois (" + (((n.trace || []).filter((t) => t.agent === "Narrateur" && /Essai|Repli/.test(t.action)).map((t) => t.detail).pop()) || "raison inconnue") + ") ; le texte ci-dessous est le texte de base, tout aussi vérifié.");
      renderPanels(n);
    }
  } catch (e) {
    if (cur()) setNarrState(stateEl, "error", base, "La rédaction par Claude n'est pas disponible pour l'instant ; le texte ci-dessous est le texte de base, tout aussi vérifié.");
  }
}
function renderStoryOnly2(a) { renderStory($("#story"), a.sections, a.facts, () => true); }

$("#back1").addEventListener("click", () => showStep(1));
$("#to3").addEventListener("click", () => showStep(3));

/* ---------- Étape 3 : demande ---------- */
const askOut = () => ($("#ask-out").textContent = $("#ask-weight").value + " %");
$("#ask-weight").addEventListener("input", askOut);

async function submitAsk() {
  const request = { ticker: $("#ask-ticker").value, weight: +$("#ask-weight").value / 100 };
  const seq = ++S.seq3;
  const btn = $("#ask-go"), st = $("#s3-status");
  btn.disabled = true; btn.setAttribute("aria-busy", "true");
  setStatus(st, spinner("Le gouverneur compare votre demande au mandat…"));
  try {
    const a = await api("/api/analyze", { ...who(), as_of: S.asOf, request });
    if (seq !== S.seq3) return;
    S.a3 = a; S.last = a;
    setStatus(st, null);
    renderStep3(a);
    renderPanels(a);
    narrate(seq, who(), a, { request }, "3");
  } catch (e) {
    setStatus(st, h("span", {}, "Le gouverneur n'a pas pu répondre : " + e.message), true);
  } finally { btn.disabled = false; btn.removeAttribute("aria-busy"); }
}
$("#ask-go").addEventListener("click", submitAsk);
$("#ask-robert").addEventListener("click", () => {
  if (S.personaId !== "robert" || S.mode !== "persona") { selectPersona("robert", false); S.a2 = null; }
  $("#ask-ticker").value = "NVDA"; $("#ask-weight").value = 50; askOut();
  submitAsk();
});

/* Comparaison de parcours : chaque nombre est un jeton de fait (donc un reçu) ; aucune mesure de performance n'est revendiquée. */
function renderCompare(a) {
  const g = a.governance, F = a.facts, card = $("#compare-card"), body = clear($("#compare-body"));
  const ok = g.verdict === "refusée" && F["vol:p_trail"] && F["vol:req_trail"] && F.w_ok;
  card.hidden = !ok;
  if (!ok) return;
  const T = (t) => renderTokens(t, F, openReceipt);
  const risk = F["risk:req:" + g.ticker] ? "{{risk:req:" + g.ticker + "}}" : null;
  body.append(
    h("div", { class: "cmp without", "data-testid": "compare-without" },
      h("h3", {}, "Sans l'agent"),
      h("p", {}, T("L'ordre est saisi tel quel. Rien ne le compare à vos propres objectifs : la volatilité du portefeuille passerait de {{vol:p_trail}} à {{vol:req_trail}}" + (risk ? ", avec " + risk + " du risque porté par un seul titre" : "") + ", et personne ne vous le dit.")),
      h("p", { class: "hint" }, "Un assistant générique aurait pu répondre avec aplomb, mais ses chiffres n'auraient aucun reçu : impossible de les vérifier.")),
    h("div", { class: "cmp with", "data-testid": "compare-with" },
      h("h3", {}, "Avec Verity"),
      h("p", {}, T("La demande est refusée avant toute simulation, l'écart est chiffré règle par règle, et la contre-proposition est de {{w_ok}}. Chaque nombre ouvre son reçu.")),
      h("p", { class: "hint" }, "La décision reste la vôtre : vous pouvez modifier votre mandat ou renoncer. Verity n'exécute aucun ordre.")),
    h("p", { class: "hint cmp-limit", style: "grid-column:1/-1;margin:4px 0 0" }, "Limite reconnue : Verity ne connaît ni vos autres avoirs, ni votre fiscalité, ni vos besoins de liquidité. Cette comparaison décrit deux parcours ; elle ne mesure aucune performance future."));
}

function renderStory3(a, keepFocus) {
  renderStory($("#story3"), a.sections, a.facts, (s) => s.title.startsWith("Gouverneur"));
}

function renderStep3(a) {
  const g = a.governance;
  $("#verdict-zone").hidden = false;
  const v = $("#verdict"); clear(v);
  v.className = "verdict " + (g.verdict === "refusée" ? "no" : "yes");
  v.append(h("span", { class: "ico", "aria-hidden": "true" }, g.verdict === "refusée" ? "×" : "✓"),
    h("div", {},
      h("h2", {}, `Demande ${g.verdict} : ${fmtPct(g.weight, 0)} en ${g.name}`),
      h("p", { style: "margin:0" }, g.verdict === "refusée"
        ? `Le gouverneur a comparé cette demande au mandat de ${a.mandate.name} : ${g.violations.length} ${g.violations.length > 1 ? "règles seraient enfreintes" : "règle serait enfreinte"}.`
        : `Cette demande respecte toutes les règles du mandat de ${a.mandate.name}.`)));
  renderCompare(a);
  const viol = clear($("#viol"));
  if (g.violations.length) {
    viol.append(h("p", { class: "hint" }, "Règles du mandat qui seraient enfreintes, avec la valeur obtenue si la demande était acceptée."),
      h("ul", { class: "rules ko-txt" }, g.violations.map((c) => h("li", {},
        h("span", { class: "ico ko", "aria-hidden": "true" }, "×"),
        h("span", {}, h("span", { class: "sr-only" }, "Enfreinte : "), c.text),
        h("span", { class: "val num" }, c.display, h("small", {}, "avec la demande"))))));
  } else viol.append(h("p", {}, "Aucune règle n'est enfreinte."));
  const ctr = clear($("#counter"));
  const w = a.facts.w_ok;
  ctr.append(h("p", {}, g.verdict === "refusée"
    ? ["Le plus grand poids compatible avec le mandat pour ce titre est ", w ? renderTokens("{{w_ok}}", a.facts, openReceipt) : fmtPct(g.max_ok_weight), ". Voici le portefeuille qui en résulte."]
    : "Le portefeuille avec cette demande respecte le mandat :"));
  const alloc = h("div"); renderAlloc(alloc, g.counter); ctr.append(alloc);
  ctr.append(h("h3", { style: "margin-top:16px" }, "Règles du mandat, contre-proposition"));
  const ul = h("ul", { class: "rules" }); renderChecks(ul, g.counter_checks); ctr.append(ul);
  renderStory3(a);
  setNarrState($("#narr-state3"), "base", a);
  redrawCharts();
  $("#verdict").scrollIntoView({ behavior: "smooth", block: "start" });
}

function redrawCharts() {
  if (S.a2 && !$("#step2").hidden) drawChart($("#chart-main"), S.a2.series, ["portefeuille", "reference"], { title: "Portefeuille simulé contre mélange classique", refName: S.a2.bench.name });
  if (S.a3 && !$("#step3").hidden) drawChart($("#chart-req"), S.a3.series, ["portefeuille", "demande", "contre_proposition", "reference"].filter((k) => S.a3.series && S.a3.series[k]), { log: true, title: "Portefeuille, demande, contre-proposition et mélange classique (échelle logarithmique)", refName: S.a3.bench.name });
}
let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(redrawCharts, 150); });

/* ---------- Panneaux transverses ---------- */
function renderPanels(a) {
  const j = clear($("#journal"));
  j.append(h("p", { class: "hint" }, "Dans l'ordre, ce que chaque agent a fait pour produire l'écran actuel, et le temps que cela a pris."),
    h("div", { class: "tbl-wrap" }, h("table", { class: "tbl" },
      h("thead", {}, h("tr", {}, h("th", {}, "Agent"), h("th", {}, "Action"), h("th", {}, "Détail"), h("th", { class: "r" }, "Durée"))),
      h("tbody", {}, a.trace.map((t) => h("tr", {}, h("td", {}, h("b", {}, t.agent)), h("td", {}, t.action), h("td", {}, t.detail), h("td", { class: "r num" }, t.ms + " ms")))))));
  const d = clear($("#data-panel"));
  d.append(h("h3", {}, "Sources"),
    h("ul", {}, a.sources.map((s) => h("li", {}, h("b", {}, s.name), ` : ${s.origin}, ${s.date}. ${s.note[0].toUpperCase()}${s.note.slice(1)}.`))),
    h("h3", { style: "margin-top:16px" }, "Calendrier"),
    h("p", {}, `${fmtNum(a.calendar.sessions)} séances communes à tous les actifs, du ${fmtDate(a.calendar.first)} au ${fmtDate(a.calendar.last)}. Le portefeuille de ce récit est décidé le ${fmtDate(a.as_of)} ; la suite jusqu'au ${fmtDate(a.last_date)} sert seulement à juger après coup.`),
    h("h3", { style: "margin-top:16px" }, "Limites"),
    h("ul", {}, a.limits.map((l) => h("li", {}, l))));
}

/* ---------- Vérification ---------- */
const ISSUE = {
  nombre_non_source: (t) => `Le nombre « ${t} » ne renvoie à aucun fait calculé.`,
  fait_inconnu: (t) => `Le jeton « ${t} » ne correspond à aucun fait connu.`,
};
document.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => { $("#verify-text").value = b.dataset.ex; runVerify(); }));
$("#verify-go").addEventListener("click", runVerify);
$("#verify-text").addEventListener("keydown", (e) => e.key === "Enter" && runVerify());
async function runVerify() {
  const host = clear($("#verify-res"));
  host.append(spinner("Le vérificateur relit la phrase…"));
  try {
    const r = await api("/api/verify", { ...who(), as_of: S.asOf, text: $("#verify-text").value });
    clear(host);
    if (r.ok) host.append(h("div", { class: "vres yes" }, h("b", { class: "t" }, "Acceptée : chaque nombre renvoie à un fait vérifié"), h("div", {}, "Texte affiché au client : « ", r.rendered, " »")));
    else host.append(h("div", { class: "vres no" }, h("b", { class: "t" }, `Rejetée : ${r.issues.length} ${r.issues.length > 1 ? "problèmes" : "problème"}, la phrase ne serait jamais affichée`),
      h("ul", {}, r.issues.map((i) => h("li", {}, (ISSUE[i.kind] || ((t) => `${i.kind} : ${t}`))(i.token))))));
  } catch (e) { clear(host); host.append(h("div", { class: "err-box" }, "La vérification a échoué : " + e.message)); }
}

/* ---------- Tiroir reçu ---------- */
const KIND = { volatility: "Volatilité", drawdown: "Pire baisse", return: "Rendement", cagr: "Rendement annualisé", correlation: "Corrélation", risk_share: "Part du risque", mandate: "Règle du mandat", request: "Votre demande", rule: "Comptage ou construction" };
const nm = (t) => (S.names[t] ? `${S.names[t]}` : t);
function fmtVal(f, v) {
  if (v == null) return "—";
  if (f.unit === "pct") return fmtNum(v * 100, 4) + " %";
  if (f.unit === "count") return fmtNum(v, 0);
  return fmtNum(v, 4);
}
let drawerOpener = null, drawerKey = null;
const INERT = ["header.bank-header", "nav.bank-toolbar", "main", ".sim-banner"];

function openReceipt(id, opener) {
  const a = S.last && S.last.facts[id] ? S.last : (S.a3 && S.a3.facts[id] ? S.a3 : S.a2);
  const f = a.facts[id];
  closeReceipt(true);
  drawerOpener = opener;
  const calc = f.kind !== "mandate" && f.kind !== "request";
  const inp = f.inputs || {};
  const body = h("div", { class: "drawer-body dl" },
    h("div", { class: "big num" }, f.display),
    f.kind === "mandate" || f.kind === "request"
      ? h("div", { class: "agree" }, h("span", { class: "ico ok", "aria-hidden": "true" }, "✓"), f.kind === "mandate" ? "Valeur fixée par votre mandat : elle n'est pas calculée." : "Valeur saisie par vous : elle n'est pas calculée.")
      : f.verified
        ? h("div", { class: "agree" }, h("span", { class: "ico ok", "aria-hidden": "true" }, "✓"), "Deux calculs indépendants concordent")
        : h("div", { class: "agree no" }, h("span", { class: "ico ko", "aria-hidden": "true" }, "!"), "Les deux calculs ne concordent pas : ce chiffre est signalé."),
    calc ? [h("h3", {}, "Calcul A contre calcul B"),
      h("div", { class: "ab" },
        h("div", {}, h("small", {}, "Calcul A"), h("b", { class: "num" }, fmtVal(f, f.impl_a))),
        h("div", {}, h("small", {}, "Calcul B, écrit séparément"), h("b", { class: "num" }, fmtVal(f, f.impl_b))))] : null,
    h("h3", {}, "Comment c'est calculé"),
    h("p", {}, f.method),
    h("h3", {}, "Entrées"),
    inputsView(inp),
    h("h3", {}, "Données utilisées (empreintes des fichiers)"),
    h("dl", { class: "kv" }, Object.entries((f.dataset || {}).files || {}).flatMap(([k, v]) => [h("dt", {}, k), h("dd", { class: "mono" }, v)])),
    f.dataset && f.dataset.calendar ? h("p", { class: "hint" }, "Calendrier : " + f.dataset.calendar + ".") : null,
    h("p", { class: "hint" }, "L'empreinte identifie le fichier exact : si une seule ligne change, elle change aussi."));
  const root = clear($("#drawer-root"));
  const closeBtn = h("button", { class: "x", type: "button", "aria-label": "Fermer le reçu", onclick: () => closeReceipt() }, "×");
  const dlg = h("div", { class: "drawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "drawer-title", "data-testid": "receipt-drawer" },
    h("div", { class: "drawer-head" }, h("div", {}, h("div", { class: "kicker" }, "Reçu · " + (KIND[f.kind] || f.kind)), h("h2", { id: "drawer-title" }, f.label)), closeBtn), body);
  root.append(h("div", { class: "scrim", onclick: () => closeReceipt() }), dlg);
  INERT.forEach((s) => $(s) && $(s).setAttribute("inert", ""));
  closeBtn.focus();
  drawerKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); closeReceipt(); }
    else if (e.key === "Tab") {
      const foc = [...dlg.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")];
      const first = foc[0], last = foc[foc.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener("keydown", drawerKey);
}

function inputsView(inp) {
  const out = [];
  const kv = [];
  if (inp.from) kv.push(h("dt", {}, "Période"), h("dd", {}, `du ${fmtDate(inp.from)} au ${fmtDate(inp.to)}` + (inp.sessions ? ` (${inp.sessions} séances)` : "")));
  if (inp.ticker) kv.push(h("dt", {}, "Titre"), h("dd", {}, `${nm(inp.ticker)} (${inp.ticker})`));
  if (inp.tickers) kv.push(h("dt", {}, "Titres"), h("dd", {}, inp.tickers.map((t) => `${nm(t)} (${t})`).join(" et ")));
  if (inp.source) kv.push(h("dt", {}, "Origine"), h("dd", {}, inp.source[0].toUpperCase() + inp.source.slice(1)));
  if (kv.length) out.push(h("dl", { class: "kv" }, kv));
  if (inp.weights) {
    const rows = Object.entries(inp.weights).sort((a, b) => b[1] - a[1]);
    const row = ([t, w]) => h("tr", {}, h("td", {}, nm(t), " ", h("span", { class: "muted" }, t)), h("td", { class: "r num" }, fmtPct(w, 2)));
    out.push(h("p", { class: "hint", style: "margin-top:10px" }, `Titres et poids utilisés (${rows.length}) :`),
      h("div", { class: "tbl-wrap" }, h("table", { class: "tbl mini" }, h("tbody", {}, rows.slice(0, 5).map(row)))),
      rows.length > 5 ? h("details", {}, h("summary", { style: "cursor:pointer;color:var(--blue);padding:6px 0" }, `Voir les ${rows.length - 5} autres titres`),
        h("table", { class: "tbl mini" }, h("tbody", {}, rows.slice(5).map(row)))) : null);
  }
  if (inp.tests) out.push(h("p", { class: "hint", style: "margin-top:10px" }, "Variantes testées :"), h("table", { class: "tbl mini" }, h("tbody", {}, inp.tests.map((t) => h("tr", {}, h("td", {}, t.label), h("td", { class: "r num" }, fmtPct(t.overlap, 1) + " inchangé"))))));
  if (!out.length) out.push(h("p", { class: "muted" }, "Aucune donnée de marché : cette valeur ne dépend que du mandat ou du portefeuille."));
  return h("div", {}, out);
}

function closeReceipt(silent) {
  clear($("#drawer-root"));
  INERT.forEach((s) => $(s) && $(s).removeAttribute("inert"));
  if (drawerKey) { document.removeEventListener("keydown", drawerKey); drawerKey = null; }
  if (!silent && drawerOpener && document.contains(drawerOpener)) drawerOpener.focus();
}

init().then(() => { if (new URLSearchParams(location.search).get("persona")) selectPersona(new URLSearchParams(location.search).get("persona"), true); });

// Mode intégré : Échap (hors tiroir de reçu) demande à la plateforme hôte de fermer le panneau.
if (window.parent !== window) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.querySelector(".drawer")) window.parent.postMessage("verity:escape", location.origin);
  });
}
