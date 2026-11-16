"use strict";
// Entrée « Ouvrir un compte · Mon mandat » dans la plateforme de courtage simulée.
// Le panneau est un <dialog> : la page hôte (vue, URL, état) n'est jamais rechargée,
// donc « Retour à la plateforme » ramène exactement au contexte d'origine.
(function () {
  let dlg = null, lastFocus = null;
  const VERITY = "/verity/?embedded=1";

  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.className = "verity-host";
    dlg.setAttribute("aria-label", "Ouverture de compte — Mon mandat");
    dlg.innerHTML = `<div class="verity-host-bar"><button type="button" data-testid="back-to-platform">← Retour à la plateforme</button><strong>Ouverture de compte · Mon mandat</strong><small>Simulation uniquement — aucun ordre réel</small></div><iframe title="Verity — mandat, portefeuille simulé et reçus" src="about:blank"></iframe>`;
    dlg.querySelector("[data-testid=back-to-platform]").addEventListener("click", close);
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    document.body.append(dlg);
    return dlg;
  }
  function open() {
    const d = ensureDialog();
    lastFocus = document.activeElement;
    const f = d.querySelector("iframe");
    if (f.getAttribute("src") === "about:blank") f.src = VERITY;
    if (!d.open) d.showModal();
    d.querySelector("[data-testid=back-to-platform]").focus();
  }
  function close() {
    if (dlg && dlg.open) dlg.close();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.addEventListener("message", (e) => {
    if (e.origin === location.origin && e.data === "verity:escape") close();
  });

  function button() {
    const b = document.createElement("button");
    b.type = "button"; b.className = "verity-entry"; b.dataset.testid = "open-mandate";
    b.textContent = "Ouvrir un compte · Mon mandat";
    b.addEventListener("click", open);
    return b;
  }
  function inject() {
    const nav = document.querySelector(".bank-toolbar");
    if (nav && !nav.querySelector("[data-testid=open-mandate]")) nav.append(button());
    const page = document.querySelector("#broker-page-title");
    const host = page && page.closest(".bank-heading");
    if (host && /Summary/i.test(page.textContent) && !document.querySelector(".verity-banner")) {
      const b = document.createElement("section");
      b.className = "verity-banner";
      b.innerHTML = `<div><h3>Nouveau client ? Commencez par votre mandat.</h3><p>Racontez votre situation : Verity en tire des règles vérifiables, construit un portefeuille simulé et donne un reçu pour chaque chiffre.</p></div>`;
      const sb = button(); sb.dataset.testid = "open-mandate-banner"; b.append(sb);
      host.after(b);
    }
  }
  new MutationObserver(inject).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", () => {
    inject();
    if (/[?&]entry=mandat\b/.test(location.search)) setTimeout(open, 300);
  });
})();
