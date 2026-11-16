// s12 — preuves : AWS, destruction du futur, tests
SCENE('s12_preuves', {
  build(st, T, at) {
    const F = FACTS; this.t = { a: at('Tout est déployé'), b: at('Les agents tournent'), c: at('Un test détruit'), d: at('le portefeuille ne change', -.4), e: T.speech_end + .3 };
    this.hdr = box(st, 0, 40, W, 90, '', 'Trois preuves'); css(this.hdr, { textAlign: 'center', fontSize: '62px', fontWeight: '500', color: '#365e7e' });
    const wd = [470, 790, 470], gap = 40, x0 = (W - (wd[0] + wd[1] + wd[2] + 2 * gap)) / 2; this.cx = [x0, x0 + wd[0] + gap, x0 + wd[0] + wd[1] + 2 * gap];
    this.c = wd.map((w, i) => box(st, this.cx[i], 160, w, 640, 'card'));
    // 1. AWS
    const c1 = this.c[0];
    c1.innerHTML = `<div class="lbl" style="position:absolute;left:36px;top:30px">1 · Déploiement</div><div style="position:absolute;left:36px;top:70px;font-size:36px;font-weight:700;white-space:nowrap">Amazon Web Services</div>`;
    const svc = [['API Gateway', 'point d\'entrée HTTP'], ['AWS Lambda', 'le moteur de calcul'], ['Amazon Bedrock', 'les agents (Claude)']];
    this.svc = svc.map((s, i) => { const b = box(c1, 36, 170 + i * 150, 398, 118, '', `<div style="position:absolute;left:24px;top:14px;font-size:38px;font-weight:700">${s[0]}</div><div style="position:absolute;left:24px;top:66px;font-size:26px;color:#5b7384">${s[1]}</div>`); css(b, { border: '2px solid #d6e4eb', borderRadius: '14px', background: '#f7fafb' }); if (i < 2) box(c1, 223, 292 + i * 150, 20, 26, '', '<svg width="20" height="26" viewBox="0 0 20 26"><path d="M10 2v20M3 15l7 8 7-8" fill="none" stroke="#9fb3c0" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'); return b; });
    this.region = box(c1, 36, 590, 398, 40, '', `Région ${F.aws}`); css(this.region, { fontSize: '26px', color: '#5b7384' });
    // 2. destruction du futur
    const c2 = this.c[1]; const fu = F.future;
    c2.innerHTML = `<div class="lbl" style="position:absolute;left:36px;top:30px">2 · Test « destruction du futur »</div><div style="position:absolute;left:36px;top:70px;font-size:38px;font-weight:700;white-space:nowrap">Portefeuille de Robert au ${fu.as_of}</div>`;
    const mk = (x, title) => { const col = box(c2, x, 140, 310, 330, ''); col.innerHTML = `<div style="font-size:30px;font-weight:700;color:#365e7e;margin-bottom:8px">${title}</div>`; return col; };
    this.colA = mk(36, 'Avant'); this.colB = mk(444, 'Après');
    const bars = (col) => fu.top.map((r, i) => { const row = $('div', '', '', col); css(row, { position: 'relative', height: '46px', marginBottom: '6px' }); row.innerHTML = `<div style="position:absolute;left:0;top:6px;font-size:25px;width:90px;color:#365e7e">${r.ticker.replace('.TO', '')}</div><div class="bar" style="position:absolute;left:92px;top:10px;height:24px;border-radius:5px;background:#1677b8;width:0"></div><div class="val" style="position:absolute;right:0;top:6px;font-size:25px;font-weight:700"></div>`; return row; });
    this.rowsA = bars(this.colA); this.rowsB = bars(this.colB);
    this.mid = box(c2, 346, 250, 90, 120, '', ''); this.mid.innerHTML = '<svg width="60" height="40" viewBox="0 0 60 40" style="margin-left:14px"><path d="M4 20h44M36 6l14 14-14 14" fill="none" stroke="#c40023" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    this.noise = box(c2, 36, 480, 718, 70, ''); this.noise.innerHTML = `<svg width="718" height="70" viewBox="0 0 718 70"><path id="pn" d="" fill="none" stroke="#c40023" stroke-width="3"/><path id="pk" d="" fill="none" stroke="#365e7e" stroke-width="3"/><line id="pl" x1="300" x2="300" y1="0" y2="70" stroke="#365e7e" stroke-dasharray="6 6" stroke-width="2"/></svg><div style="position:absolute;left:300px;top:-2px;font-size:22px;color:#365e7e;transform:translateX(-50%)"></div>`;
    this.noiseTxt = box(c2, 330, 552, 420, 40, '', 'les prix après cette date sont détruits'); css(this.noiseTxt, { fontSize: '24px', color: '#c40023' });
    this.knownTxt = box(c2, 36, 552, 290, 40, '', 'données connues'); css(this.knownTxt, { fontSize: '24px', color: '#365e7e' });
    this.same = box(c2, 36, 586, 718, 50, '', `<span class="tag green" style="font-size:30px;font-weight:700">Identique au cent près · écart maximal ${fr((fu.max_abs_diff * 100).toFixed(1))} %</span>`); css(this.same, { textAlign: 'center' });
    // 3. tests
    const c3 = this.c[2];
    c3.innerHTML = `<div class="lbl" style="position:absolute;left:36px;top:30px">3 · Tests</div><div style="position:absolute;left:36px;top:66px;font-size:44px;font-weight:700">Automatisés</div>`;
    const mkT = (y, n, label, sub) => { const b = box(c3, 36, y, 398, 190, ''); css(b, { border: '2px solid #d6e4eb', borderRadius: '14px', background: '#f7fafb' }); b.innerHTML = `<div class="tn" style="position:absolute;left:24px;top:8px;font-size:100px;font-weight:700;color:#1677b8;line-height:1.2">${n}</div><div style="position:absolute;left:24px;top:116px;font-size:34px;font-weight:700">${label}</div><div style="position:absolute;left:24px;top:152px;font-size:24px;color:#5b7384">${sub}</div><div class="ck" style="position:absolute;right:20px;top:20px;width:56px;height:56px;border-radius:50%;background:#2a7157;color:#fff;padding:12px">${SVG_CHECK}</div>`; return b; };
    this.tu = mkT(170, F.tests.unit, 'tests unitaires', 'tous réussis'); this.te = mkT(380, F.tests.e2e, 'scénarios bout en bout', 'contre la pile AWS déployée');
    const rnd = (i) => { const x = Math.sin(i * 91.7) * 43758.5453; return x - Math.floor(x); };
    this.pts = Array.from({ length: 60 }, (_, i) => 35 + 8 * Math.sin(i * .5) + 10 * rnd(i) - (i * .12));
    this.rnd = rnd;
  },
  update(t, T, at) {
    const a = this.t, F = FACTS, fu = F.future;
    enter(this.hdr, t, .2, .5, 20);
    // carte 1
    enter(this.c[0], t, a.a - .1, .6, 80, E.out5);
    this.svc.forEach((s, i) => { const st_ = a.a + .5 + i * .45; const p = P(t, st_, st_ + .4, E.back); set(s, { o: clamp(p * 2), x: (1 - p) * -40 }); });
    const bed = P(t, a.b, a.b + .4); this.svc[2].style.borderColor = bed > .5 ? '#1677b8' : '#d6e4eb'; this.svc[2].style.background = bed > .5 ? '#e3f1f9' : '#f7fafb';
    // carte 2
    enter(this.c[1], t, a.c - .2, .7, 80, E.out5);
    const bg = a.c + .5;
    this.rowsA.forEach((r, i) => { const p = P(t, bg + i * .12, bg + i * .12 + .6, E.out); r.querySelector('.bar').style.width = (fu.top[i].before * 3.3 * p) + 'px'; r.querySelector('.val').textContent = p > .3 ? pct1(fu.top[i].before * p) : ''; });
    // le futur est détruit
    const kill = P(t, bg + 1.6, bg + 2.6, E.lin);
    const d = []; this.pts.forEach((v, i) => { const x = 12 + i * 11.3; if (x <= 300) d.push([x, 70 - v]); }); document.getElementById('pk') && (document.getElementById('pk').setAttribute('d', 'M' + d.map(p => p.join(',')).join(' L')));
    const nz = []; const nn = Math.floor(kill * 36); for (let i = 0; i < nn; i++) { const x = 300 + i * 11.6; nz.push([x, 8 + 54 * this.rnd(i + Math.floor(t * 3) * 7)]); }
    document.getElementById('pn').setAttribute('d', nz.length > 1 ? 'M' + nz.map(p => p.join(',')).join(' L') : '');
    set(this.noise, { o: P(t, bg + 1.3, bg + 1.7) }); set(this.noiseTxt, { o: kill > .5 ? 1 : 0 }); set(this.knownTxt, { o: P(t, bg + 1.3, bg + 1.7) });
    set(this.mid, { o: P(t, bg + 2.7, bg + 3.1), x: (1 - P(t, bg + 2.7, bg + 3.1)) * -20 });
    const rb = bg + 3.3;
    this.rowsB.forEach((r, i) => { const p = P(t, rb + i * .12, rb + i * .12 + .6, E.out); r.querySelector('.bar').style.width = (fu.top[i].after * 3.3 * p) + 'px'; r.querySelector('.val').textContent = p > .3 ? pct1(fu.top[i].after * p) : ''; });
    set(this.colB, { o: P(t, rb - .2, rb + .3) }); set(this.colA, { o: 1 });
    const sm = P(t, rb + 1.4, rb + 1.9, E.back); set(this.same, { o: clamp(sm * 2), s: .7 + .3 * sm });
    // carte 3
    enter(this.c[2], t, a.e - .1, .6, 80, E.out5);
    const tp = P(t, a.e + .3, a.e + 1.1, E.out); this.tu.querySelector('.tn').textContent = Math.round(F.tests.unit * tp); set(this.tu, { o: clamp(tp * 3) });
    const tp2 = P(t, a.e + .8, a.e + 1.6, E.out); this.te.querySelector('.tn').textContent = Math.round(F.tests.e2e * tp2); set(this.te, { o: clamp(tp2 * 3) });
    this.tu.querySelector('.ck').style.opacity = P(t, a.e + 1.1, a.e + 1.4); this.te.querySelector('.ck').style.opacity = P(t, a.e + 1.6, a.e + 1.9);
  }
});
