// s04 — architecture : données, cinq agents, du « brut » au « reçu », le vérificateur
SCENE('s04_architecture', {
  build(st, T, at) {
    const F = FACTS, R = F.robert; this.R = R;
    this.t = { g: at("D'abord les données"), n: at('trente et un'), s: at('cinq ans de prix'), cad: at('convertis en dollars'), ag: at('Ensuite, cinq agents'), a1: at("L'agent d'accueil"), a2: at('Le constructeur'), a3: at("L'analyste"), a4: at('Le narrateur'), a5: at('Et le vérificateur'), rej: at('refuse toute phrase') };
    const A = this.t;
    st.style.background = 'linear-gradient(180deg,#ffffff,#eef7fb)';
    // pastilles de phase
    this.steps = box(st, 0, 36, W, 60, ''); const ph = ['Données', 'Agents', 'Du brut au reçu', 'Vérification'];
    this.steps.innerHTML = ph.map((p, i) => `<span class="ph" style="display:inline-block;margin:0 22px;font-size:30px;font-weight:500;padding:6px 26px;border-radius:99px"><b style="margin-right:10px">${i + 1}</b>${p}</span>`).join(''); css(this.steps, { textAlign: 'center' });
    this.phs = [...this.steps.querySelectorAll('.ph')];
    // ---------- 1. données ----------
    this.d = box(st, 0, 120, W, 760, '');
    this.big = box(this.d, 110, 20, 520, 300, '', `<div style="font-size:250px;font-weight:700;color:#365e7e;line-height:1;letter-spacing:-6px"><span id="cnt">0</span></div><div style="font-size:64px;font-weight:500;color:#5b7384;margin-top:-10px">actifs</div>`);
    const gcol = { 'Actions canadiennes': '#c40023', 'Actions américaines': '#1677b8', "FNB d'actions": '#126fb2', 'Obligations': '#365e7e', 'Or': '#8a5a00', 'Cryptomonnaie': '#2a7157' };
    this.tiles = Object.entries(F.groups).map(([k, v], i) => { const x = 700 + (i % 2) * 560, y = 20 + Math.floor(i / 2) * 124; const b = box(this.d, x, y, 530, 104, 'card'); b.innerHTML = `<div style="position:absolute;left:26px;top:12px;font-size:60px;font-weight:700;color:${gcol[k]}">${v}</div><div style="position:absolute;left:108px;top:30px;font-size:34px;font-weight:500">${k}</div>`; css(b, { borderLeft: `10px solid ${gcol[k]}` }); return b; });
    // prix sur cinq ans
    this.px = box(this.d, 110, 440, 1060, 300, 'card');
    const sp = F.spark.values, mn = Math.min(...sp), mx = Math.max(...sp); this.sp = sp.map((v, i) => [30 + i * (1000 / (sp.length - 1)), 250 - (v - mn) / (mx - mn) * 200]);
    this.px.innerHTML = `<div class="lbl" style="position:absolute;left:30px;top:20px">Prix quotidiens · ${F.spark.ticker}</div><svg width="1060" height="330" style="position:absolute;left:0;top:0"><path id="spl" d="" fill="none" stroke="#1677b8" stroke-width="4" stroke-linejoin="round"/></svg><div id="pxl" style="position:absolute;left:30px;bottom:18px;font-size:28px;color:#365e7e"></div>`;
    this.pxl = this.px.querySelector('#pxl'); this.pxl.innerHTML = `<b>${F.years} ans</b> · ${F.first} → ${F.last} · ${String(F.sessions).replace(/(\d)(?=(\d{3})$)/, '$1 ')} séances communes`;
    this.fx = box(this.d, 1230, 440, 580, 300, 'card'); this.fx.innerHTML = `<div class="lbl" style="position:absolute;left:30px;top:20px">Devise commune</div><div style="position:absolute;left:30px;top:76px;font-size:56px;font-weight:700;color:#365e7e">USD <span style="color:#9fb3c0">→</span> <span style="color:#1677b8">CAD</span></div><div style="position:absolute;left:30px;top:150px;font-size:25px;line-height:1.3;color:#5b7384;right:24px">Taux : Banque du Canada<br>Tous les prix sont convertis en dollars canadiens.</div><div style="position:absolute;left:30px;bottom:14px;font-size:19px;color:#5b7384;font-family:monospace">${Object.entries(F.files).map(([k, v]) => v).join(' · ')}</div>`;
    // ---------- 2. agents ----------
    this.ag = box(st, 0, 130, W, 760, '');
    const names = [['Accueil', 'Agent 1'], ['Constructeur', 'Agent 2'], ['Analyste', 'Agent 3'], ['Narrateur', 'Agent 4'], ['Vérificateur', 'Agent 5']];
    const nw = 312, gp = 40, x0 = (W - (5 * nw + 4 * gp)) / 2;
    this.nodes = names.map((n, i) => { const x = x0 + i * (nw + gp); const b = box(this.ag, x, 0, nw, 130, 'card'); b.innerHTML = `<div class="lbl" style="position:absolute;left:24px;top:14px;font-size:20px">${n[1]}</div><div style="position:absolute;left:24px;top:46px;font-size:46px;font-weight:700">${n[0]}</div>`; if (i === 2) b.innerHTML += `<div class="ab" style="position:absolute;right:20px;top:18px;display:flex;gap:6px"><span class="tag" style="font-size:22px;padding:2px 12px">A</span><span class="tag" style="font-size:22px;padding:2px 12px">B</span></div>`; if (i < 4) box(this.ag, x + nw + 6, 52, gp - 12, 28, '', '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M3 14h20M15 5l9 9-9 9" fill="none" stroke="#9fb3c0" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'); return b; });
    const key = ['Traduit le récit du client en règles vérifiables.', "N'utilise que les données connues à la date de décision.", 'Calcule chaque chiffre deux fois, avec deux méthodes indépendantes.', "Rédige l'explication.", 'Refuse toute phrase qui contient un nombre sans reçu.'];
    this.keys = key.map(k => { const b = box(this.ag, 80, 168, W - 160, 70, '', k); css(b, { textAlign: 'center', fontSize: '50px', fontWeight: '500', color: '#126fb2' }); return b; });
    // panneaux illustratifs (y 270 → 740)
    const pan = () => box(this.ag, 160, 270, W - 320, 380, '');
    // accueil
    this.p1 = pan(); const story = (S => S)(window.STORY || "Je pense à la retraite d'ici quelques années. Je veux protéger mon capital […] Pas de crypto.");
    this.p1.innerHTML = `<div class="card" style="left:0;top:0;width:760px;height:340px;padding:24px 36px"><div class="lbl">Le récit de Robert</div><div style="font-size:32px;line-height:1.35;margin-top:10px;color:#365e7e">« ${F.story} »</div></div>
      <div style="position:absolute;left:790px;top:140px"><svg width="110" height="60" viewBox="0 0 110 60"><path d="M6 30h84M66 8l26 22-26 22" fill="none" stroke="#1677b8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div id="rules" style="position:absolute;left:930px;top:0;width:700px"></div>`;
    this.rules = F.rules.slice(0, 4).map((r, i) => { const d = $('div', 'card', `<div style="position:absolute;left:20px;top:11px;width:38px;height:38px;border-radius:50%;background:#e3f1f9;color:#126fb2;padding:7px">${SVG_CHECK}</div><div style="position:absolute;left:74px;top:9px;right:12px;font-size:28px;line-height:1.2;white-space:nowrap">${r}</div>`, this.p1.querySelector('#rules')); css(d, { position: 'relative', height: '62px', marginBottom: '14px', borderRadius: '14px' }); return d; });
    // constructeur : ligne de temps avec date de décision
    this.p2 = pan(); this.p2.innerHTML = `<div style="position:absolute;left:0;top:80px;width:1600px;height:30px;border-radius:15px;background:#e6eef2"></div>
      <div id="known" style="position:absolute;left:0;top:80px;width:0;height:30px;border-radius:15px 0 0 15px;background:#1677b8"></div>
      <div id="future" style="position:absolute;top:80px;height:30px;border-radius:0 15px 15px 0;background:repeating-linear-gradient(135deg,#c9d5dc 0 10px,#e6eef2 10px 20px)"></div>
      <div id="cut" style="position:absolute;top:40px;width:6px;height:110px;background:#c40023"></div>
      <div id="cutl" style="position:absolute;top:164px;font-size:42px;font-weight:700;color:#c40023;white-space:nowrap">Date de décision · ${F.as_of}</div>
      <div style="position:absolute;left:0;top:10px;font-size:28px;color:#5b7384">${F.first}</div><div style="position:absolute;right:0;top:10px;font-size:28px;color:#5b7384">${F.last}</div>
      <div id="kl" style="position:absolute;left:0;top:260px;font-size:38px;font-weight:700;color:#1677b8">Connu à la décision : utilisé</div><div id="fl" style="position:absolute;top:260px;font-size:38px;font-weight:700;color:#5b7384;white-space:nowrap">Futur : inaccessible</div>`;
    // analyste
    this.p3 = pan(); const fmt = v => fr(v.toFixed(12)); this.p3.innerHTML = `<div style="position:absolute;left:0;right:0;top:0;text-align:center;font-size:38px;color:#365e7e">Volatilité annuelle du portefeuille de Robert</div>
      <div class="card" style="left:160px;top:60px;width:560px;height:220px"><div class="lbl" style="position:absolute;left:30px;top:20px">Calcul A</div><div style="position:absolute;left:30px;top:62px;font-size:62px;font-weight:700;color:#126fb2" id="va">${fmt(R.a)}</div><div style="position:absolute;left:30px;top:150px;font-size:26px;color:#5b7384">première implémentation</div></div>
      <div class="card" style="left:880px;top:60px;width:560px;height:220px"><div class="lbl" style="position:absolute;left:30px;top:20px">Calcul B</div><div style="position:absolute;left:30px;top:62px;font-size:62px;font-weight:700;color:#126fb2" id="vb">${fmt(R.b)}</div><div style="position:absolute;left:30px;top:150px;font-size:26px;color:#5b7384">seconde méthode, indépendante</div></div>
      <div id="eq" style="position:absolute;left:728px;top:130px;width:144px;height:90px;text-align:center;font-size:90px;font-weight:700;color:#2a7157;line-height:90px">=</div>
      <div id="conc" style="position:absolute;left:0;right:0;top:300px;text-align:center"><span class="tag green" style="font-size:42px;padding:6px 30px">Les deux calculs concordent</span></div>`;
    // narrateur : brut → reçu ; vérificateur
    this.p4 = pan(); this.p4.innerHTML = `<div class="card" style="left:0;top:0;width:1600px;height:110px"></div>
      <div id="s1" style="position:absolute;left:46px;top:26px;font-size:48px;white-space:nowrap">La volatilité annuelle du portefeuille est de <span id="n1" style="display:inline-block"></span>.</div>
      <div id="lab1" style="position:absolute;right:50px;top:-40px;font-size:30px;font-weight:500"></div>
      <div class="card" id="c2" style="left:0;top:150px;width:1600px;height:110px"></div>
      <div id="s2" style="position:absolute;left:46px;top:176px;font-size:48px;white-space:nowrap">Ce portefeuille a rendu <span id="n2" style="display:inline-block;position:relative;color:#151719;font-weight:700">+300 %</span>.</div>
      <div id="rejl" style="position:absolute;left:0;right:0;top:290px;text-align:center;font-size:40px;font-weight:700;color:#c40023"></div>`;
    this.n1 = this.p4.querySelector('#n1');
    // base de données
    this.base = box(st, 160, 800, W - 320, 70, ''); css(this.base, { background: '#365e7e', color: '#fff', borderRadius: '16px', fontSize: '32px', lineHeight: '70px', paddingLeft: '34px' });
    this.base.innerHTML = `<b style="letter-spacing:.14em;margin-right:30px;font-size:26px;color:#9ccbe6">DONNÉES</b>${F.n_assets} actifs · ${F.years} ans de prix quotidiens · dollars canadiens`;
  },
  update(t, T, at) {
    const A = this.t, F = FACTS, R = this.R;
    // phase courante
    const ph = t < A.ag - .2 ? 0 : t < A.a4 ? 1 : t < A.a5 ? 2 : 3;
    this.phs.forEach((p, i) => { const on = i === ph; p.style.background = on ? '#1677b8' : 'transparent'; p.style.color = on ? '#fff' : '#8aa0ae'; });
    enter(this.steps, t, .1, .4, -20);
    // données
    const d1 = P(t, A.ag - .25, A.ag + .3, E.io);
    set(this.d, { o: 1 - d1, y: d1 * 60 }); this.d.style.display = d1 >= 1 ? 'none' : 'block';
    const nb = P(t, A.n - .2, A.n + 1.1, E.out); document.getElementById('cnt').textContent = Math.round(F.n_assets * nb); set(this.big, { o: clamp(nb * 3) });
    this.tiles.forEach((b, i) => { const s = A.n + .5 + i * .35; const p = P(t, s, s + .45, E.back); set(b, { o: clamp(p * 2), x: (1 - p) * 60 }); });
    enter(this.px, t, A.s - .2, .5, 50);
    const dr = P(t, A.s, A.cad - .3, E.lin); const nn = Math.max(2, Math.floor(dr * this.sp.length));
    document.getElementById('spl').setAttribute('d', 'M' + this.sp.slice(0, nn).map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L'));
    this.pxl.style.opacity = P(t, A.s + .5, A.s + 1);
    enter(this.fx, t, A.cad - .1, .5, 50);
    // agents
    const g = P(t, A.ag - .1, A.ag + .5, E.out); set(this.ag, { o: g, y: (1 - g) * 40 });
    const starts = [A.a1, A.a2, A.a3, A.a4, A.a5]; const ends = [A.a2, A.a3, A.a4, A.a5, 1e9];
    const act = starts.map((s, i) => t >= s - .05 && t < ends[i]);
    this.nodes.forEach((n, i) => { const lit = t >= starts[i] - .05; const on = act[i]; n.style.borderColor = on ? '#1677b8' : '#d6e4eb'; n.style.background = on ? '#e3f1f9' : '#fff'; n.style.opacity = on ? 1 : lit ? .55 : .35; const p = P(t, A.ag + .1 + i * .12, A.ag + .6 + i * .12, E.back); n.style.transform = `translateY(${(1 - p) * 40}px) scale(${on ? 1.04 : 1})`; });
    const ep = P(t, A.ag, A.ag + 1, E.out); // flèches
    this.keys.forEach((k, i) => { const on = act[i]; const p = on ? P(t, starts[i], starts[i] + .35, E.out) : 0; k.style.opacity = p; k.style.transform = `translateY(${(1 - p) * 20}px)`; k.style.color = i === 4 ? '#c40023' : '#126fb2'; });
    const panEl = [this.p1, this.p2, this.p3, this.p4, this.p4];
    [this.p1, this.p2, this.p3, this.p4].forEach(p => p.style.opacity = 0);
    this.p4.style.opacity = 0;
    const a = act.findIndex(x => x);
    if (a >= 0) { const s0 = starts[a]; const p = P(t, s0 + .05, s0 + .5, E.out); const el = a === 4 ? this.p4 : panEl[a]; el.style.opacity = p; el.style.transform = `translateY(${(1 - p) * 30}px)`; }
    // 1. règles
    this.rules.forEach((r, i) => { const s = A.a1 + 1.3 + i * .45; const p = P(t, s, s + .4, E.back); set(r, { o: clamp(p * 2), x: (1 - p) * 60 }); });
    // 2. frise
    const full = 1600, cutx = full * 0.43; const kn = P(t, A.a2 + .3, A.a2 + 1.3, E.io);
    this.p2.querySelector('#known').style.width = (cutx * kn) + 'px';
    const fu = this.p2.querySelector('#future'); fu.style.left = cutx + 'px'; fu.style.width = ((full - cutx) * P(t, A.a2 + 1.2, A.a2 + 2.0, E.io)) + 'px';
    const ct = this.p2.querySelector('#cut'); ct.style.left = (cutx - 3) + 'px'; ct.style.opacity = P(t, A.a2 + 1.0, A.a2 + 1.4);
    const cl = this.p2.querySelector('#cutl'); cl.style.left = (cutx - 330) + 'px'; cl.style.opacity = P(t, A.a2 + 1.2, A.a2 + 1.7);
    const kl = this.p2.querySelector('#kl'); kl.style.opacity = P(t, A.a2 + 1.6, A.a2 + 2); kl.style.left = '40px';
    const fl = this.p2.querySelector('#fl'); fl.style.left = (cutx + 70) + 'px'; fl.style.opacity = P(t, A.a2 + 2.2, A.a2 + 2.6);
    // 3. deux calculs
    const va = this.p3.querySelector('#va'), vb = this.p3.querySelector('#vb'); const ca = P(t, A.a3 + .5, A.a3 + 1.6, E.out), cb = P(t, A.a3 + 1.3, A.a3 + 2.4, E.out);
    const dgt = (v, p) => { const s = fr(v.toFixed(12)); return p >= 1 ? s : s.replace(/\d/g, (c, i) => (i / s.length < p ? c : String(Math.floor(Math.abs(Math.sin(Math.floor(t * 20) + i * 7)) * 10)))); };
    va.textContent = ca > 0 ? dgt(R.a, ca) : ''; vb.textContent = cb > 0 ? dgt(R.b, cb) : '';
    set(this.p3.querySelector('#eq'), { o: P(t, A.a3 + 2.4, A.a3 + 2.8), s: .6 + .4 * P(t, A.a3 + 2.4, A.a3 + 2.9, E.back) });
    set(this.p3.querySelector('#conc'), { o: P(t, A.a3 + 2.9, A.a3 + 3.3) });
    // 4. brut → reçu
    const n1 = this.n1; const tb = A.a4 + .9;
    const rawIn = P(t, A.a4 + .15, A.a4 + .5);
    this.p4.querySelector('#s1').style.opacity = rawIn; this.p4.firstElementChild.style.opacity = rawIn;
    if (t < tb) { n1.className = ''; n1.style.cssText = 'display:inline-block;color:#8a98a3;border-bottom:4px dashed #b7c5ce;font-weight:500'; n1.innerHTML = R.vol; this.p4.querySelector('#lab1').innerHTML = '<span class="tag gray">brut · aucune preuve</span>'; }
    else { const p = P(t, tb, tb + .4, E.back); n1.className = 'badge'; n1.style.cssText = `display:inline-flex;font-size:44px;padding:0 14px;height:64px;vertical-align:-10px;transform:scale(${.85 + .15 * p})`; n1.innerHTML = `${R.vol}<span style="display:inline-block;width:34px;height:34px">${SVG_CHECK}</span>`; this.p4.querySelector('#lab1').innerHTML = '<span class="tag green">avec reçu</span>'; }
    // 5. vérificateur
    const v5 = ph === 3; const c2 = this.p4.querySelector('#c2'), s2 = this.p4.querySelector('#s2');
    const r2 = P(t, A.a5 + 1.2, A.a5 + 1.7);
    c2.style.opacity = s2.style.opacity = r2; s2.style.transform = `translateY(${(1 - r2) * 20}px)`;
    const rj = P(t, A.rej + 1.6, A.rej + 2.4, E.io);
    const n2 = this.p4.querySelector('#n2'); n2.style.color = rj > .5 ? '#c40023' : '#151719';
    if (!n2.querySelector('i')) n2.innerHTML = '+300 %<i style="position:absolute;left:-6px;top:56%;height:7px;background:#c40023;width:0"></i>'; n2.querySelector('i').style.width = (rj * 104) + '%';
    this.p4.querySelector('#rejl').innerHTML = rj > .6 ? `<span style="display:inline-block;width:40px;vertical-align:-6px">${SVG_X}</span> Rejetée : ce nombre n'a pas de reçu` : '';
    this.p4.querySelector('#rejl').style.opacity = P(t, A.rej + 2.0, A.rej + 2.4);
    // la ligne « acceptée » sur la 1re phrase quand on passe au vérificateur
    if (v5) { this.p4.querySelector('#lab1').innerHTML = '<span class="tag green">acceptée</span>'; }
    this.base.style.opacity = P(t, A.ag + .3, A.ag + .8); this.base.style.transform = `translateY(${(1 - P(t, A.ag + .3, A.ag + .8)) * 30}px)`;
  }
});
