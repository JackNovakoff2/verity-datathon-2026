/* Scènes motion de Verity v4. Les instants viennent des mots réellement prononcés (tw / twe). */
const fi = (t, a, d = .5) => P(t, a, a + d);
function chain(cls, keys, t, o = {}) {   // keys = [{at, dur}] ; cls = nuages pré-construits (cls[i] : set[i-1] -> set[i])
  let k = -1; for (let i = 0; i < keys.length; i++) if (t >= keys[i].at) k = i;
  if (k < 0) return; const key = keys[k]; drawCloud(cls[k], clamp((t - key.at) / key.dur), Object.assign({ t }, o));
}
function buildChain(sets, seed) { const cls = []; for (let i = 1; i < sets.length; i++) cls.push(makeCloud(sets[i - 1], sets[i], seed + i)); return cls; }

/* ----- m0 : avertissement ----- */
SCENE('m0_avert', {
  subs: false,
  update(t) {
    const l1 = ['Chaque', 'chiffre', 'que', 'vous', 'allez', 'voir', 'a', 'été', 'calculé', 'en', 'direct', 'par', 'Verity,'];
    const l2 = ['sans', 'aucune', 'retouche', '—', 'simulation', 'uniquement,', 'aucun', 'ordre', 'réel.'];
    ctx.font = `500 46px ${FONT}`; const sp = ctx.measureText(' ').width;
    [[l1, 500], [l2, 568]].forEach(([ln, y], li) => {
      const wd = ln.reduce((a, w) => a + ctx.measureText(w).width, 0) + sp * (ln.length - 1); let x = W / 2 - wd / 2;
      ln.forEach((w, i) => { const a = fi(t, .3 + (li * 13 + i) * .07, .35); txt(w, x, y, { size: 46, c: w.startsWith('Verity') ? RED : (li && i > 2 ? MID : INK), a, w: w.startsWith('Verity') ? 700 : 500 }); x += ctx.measureText(w).width + sp; });
    });
  }
});

/* ----- m2 : l'accroche ----- */
let HK;
SCENE('m2_hook', {
  build() {
    const sc = scatter(9000, 11, W / 2, H / 2, 950, 520), num = pointsFromText('26,2 %', 430, 960, 460, INK, 9000, 2), q = pointsFromText('?', 800, 960, 470, RED, 9000, 3), risk = pointsFromText('RISQUE', 300, 960, 470, RED, 9000, 4, 700, 3, 8);
    HK = { cls: buildChain([sc, num, q, risk], 20) };
  },
  update(t, T) {
    const tp = tw('m2_hook', 'Personne'), tr = twe('m2_hook', 'risque'), tf = tw('m2_hook', 'finance');
    const keys = [{ at: .2, dur: 2.2 }, { at: tw('m2_hook', 'Mais'), dur: 1.5 }, { at: tw('m2_hook', 'risque') - .1, dur: 1.4 }];
    const a = 1 - .55 * P(t, tp, tp + 1.2) + .55 * P(t, tr - 1, tr);
    const idle = 1.2 + 9 * P(t, tp, tp + 2) * (1 - P(t, tr - 1, tr));
    chain(HK.cls, keys, t, { a: clamp(a, .1, 1), idle, size: 3.2 });
    const tc = tw('m2_hook', 'chiffre', 1); // « Un chiffre, donné avec aplomb… »
    txt('annoncé avec aplomb par une IA', W / 2, 760, { size: 38, c: MID, align: 'center', a: fi(t, tc, .6) * (1 - fi(t, tw('m2_hook', 'Mais'), .4)) });
  }
});

/* ----- m3 : trois clients ----- */
let CL;
SCENE('m3_clients', {
  build() {
    const names = ['amira', 'mateo', 'robert']; CL = names.map((v, i) => makeCloud(scatter(7600, 40 + i, 0, 0, 800, 520), bust(7600, 50 + i, v), 60 + i));
  },
  update(t) {
    const xs = [440, 960, 1480], info = [['Amira', '26 ans · 15 ans devant elle', 'amira'], ['Mateo', 'ESG · aucune énergie fossile', 'mateo'], ['Robert', '59 ans · prépare sa retraite', 'robert']];
    const tt = [tw('m3_clients', 'Amira'), tw('m3_clients', 'Mateo'), tw('m3_clients', 'Robert')];
    const tg = tw('m3_clients', 'conseil'), tq = twe('m3_clients', 'tous');
    info.forEach((inf, i) => {
      const p = P(t, tt[i] - .2, tt[i] + 1.8); const a = 1 - .45 * fi(t, tg, .8);
      if (t >= tt[i] - .2) drawCloud(CL[i], p, { t, cx: xs[i], cy: 380, scale: .95, theta: .55 * Math.sin(t * .7 + i * 2.1), a, size: 2.9, amp: 260 });
      const la = fi(t, tt[i] + .6, .6) * a; txt(inf[0], xs[i], 800, { size: 54, w: 700, align: 'center', a: la }); txt(inf[1], xs[i], 846, { size: 30, c: MID, align: 'center', a: la });
    });
    const g = fi(t, tg, .7);
    if (g > 0) { rrect(330, 880, 1260, 64, 32, '#fff', LINE, 2, g); txt('Un conseil générique pour tous', W / 2, 922, { size: 32, c: MID, align: 'center', a: g }); }
    const x = fi(t, tq - .6, .5); if (x > 0) { ctx.save(); ctx.globalAlpha = x; ctx.strokeStyle = RED; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1170, 890); ctx.lineTo(1170 + 38 * x, 890 + 44 * x); ctx.moveTo(1208, 890); ctx.lineTo(1208 - 38 * x, 890 + 44 * x); ctx.stroke(); ctx.restore(); }
  }
});

/* ----- m4 : la solution ----- */
let SO;
function drawReceipt(o, cx, top, w, h) {
  const l = cx - w / 2, r = cx + w / 2, b = top + h, zs = 22, z = 8;
  o.strokeStyle = INK; o.lineWidth = 9; o.lineJoin = 'round'; o.beginPath(); o.moveTo(l, top); o.lineTo(r, top); o.lineTo(r, b);
  for (let i = 0; i < z; i++) { const x1 = r - (i + .5) * w / z, x2 = r - (i + 1) * w / z; o.lineTo(x1, b + zs); o.lineTo(x2, b); }
  o.lineTo(l, top); o.stroke();
  o.fillStyle = BLUE; o.font = `700 118px ${FONT}`; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText('26,2 %', cx, top + 130);
  o.strokeStyle = '#9d9892'; o.lineWidth = 7; o.lineCap = 'round'; for (let i = 0; i < 3; i++) { o.beginPath(); o.moveTo(l + 50, top + 230 + i * 36); o.lineTo(r - 50 - (i === 2 ? 120 : 0), top + 230 + i * 36); o.stroke(); }
  o.strokeStyle = GREEN; o.lineWidth = 12; o.beginPath(); o.arc(cx, top + h - 70, 46, 0, 6.283); o.stroke(); o.beginPath(); o.moveTo(cx - 22, top + h - 68); o.lineTo(cx - 6, top + h - 50); o.lineTo(cx + 26, top + h - 92); o.stroke();
}
SCENE('m4_solution', {
  build() {
    const sc = scatter(10000, 71, W / 2, 360, 950, 400);
    const wm = sampleCanvas(o => { o.font = `700 270px ${FONT}`; const w1 = o.measureText('Verity').width, w2 = o.measureText('.').width; const x0 = W / 2 - (w1 + w2) / 2; o.textBaseline = 'middle'; o.textAlign = 'left'; o.fillStyle = INK; o.fillText('Verity', x0, 340); o.fillStyle = RED; o.fillText('.', x0 + w1, 340); }, 10000, 72);
    const rc = sampleCanvas(o => drawReceipt(o, 960, 110, 430, 400), 10000, 73);
    SO = { cls: buildChain([sc, wm, rc], 80) };
  },
  update(t) {
    const keys = [{ at: tw('m4_solution', 'Voici') - .2, dur: 1.8 }, { at: tw('m4_solution', 'idee') - .3, dur: 1.6 }];
    chain(SO.cls, keys, t, { size: 3.2 });
    const tg = tw('m4_solution', 'chaque'); const ga = fi(t, tg, .6);
    txt('Chaque chiffre a un reçu.', W / 2, 640, { size: 66, w: 700, align: 'center', a: ga });
    const st = [['Ouverture du compte', 'ouverture'], ['Mandat', 'mandat'], ['Portefeuille simulé', 'portefeuille'], ['Demande examinée', 'demande'], ['Preuve', 'prouve']];
    const xs = [330, 645, 960, 1275, 1590]; const y = 770;
    st.forEach(([lab, w], i) => {
      const ta = tw('m4_solution', w); const a = fi(t, ta - .15, .4);
      if (i < 4) { const nx = fi(t, tw('m4_solution', st[i + 1][1]) - .5, .5); dotted(xs[i] + 40, y, xs[i + 1] - 40, y, nx, { a: .9 }); }
      ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(xs[i], y, 26, 0, 6.283); ctx.fillStyle = i === 4 ? RED : '#fff'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = i === 4 ? RED : INK; ctx.stroke(); ctx.restore();
      if (i === 4) checkMark(xs[i], y, 26, '#fff', fi(t, ta, .4)); else txt(String(i + 1), xs[i], y + 11, { size: 30, w: 700, align: 'center', a });
      txt(lab, xs[i], y + 76, { size: 30, w: 500, align: 'center', a, c: i === 4 ? RED : INK });
    });
  }
});

/* ----- m4b : la valeur ----- */
let VA;
function icon(kind, cx, cy, color) {
  return sampleCanvas(o => {
    o.strokeStyle = color; o.fillStyle = color; o.lineWidth = 11; o.lineJoin = 'round'; o.lineCap = 'round';
    if (kind === 'bubble') { o.beginPath(); o.roundRect(cx - 80, cy - 60, 160, 105, 26); o.moveTo(cx - 30, cy + 45); o.lineTo(cx - 52, cy + 82); o.lineTo(cx + 4, cy + 45); o.stroke(); for (let i = -1; i <= 1; i++) { o.beginPath(); o.arc(cx + i * 38, cy - 8, 7, 0, 6.3); o.fill(); } }
    if (kind === 'shield') { o.beginPath(); o.moveTo(cx, cy - 78); o.lineTo(cx + 70, cy - 48); o.lineTo(cx + 64, cy + 20); o.quadraticCurveTo(cx + 50, cy + 62, cx, cy + 86); o.quadraticCurveTo(cx - 50, cy + 62, cx - 64, cy + 20); o.lineTo(cx - 70, cy - 48); o.closePath(); o.stroke(); o.beginPath(); o.moveTo(cx - 30, cy + 4); o.lineTo(cx - 6, cy + 30); o.lineTo(cx + 36, cy - 22); o.stroke(); }
    if (kind === 'person') { o.beginPath(); o.arc(cx, cy - 38, 38, 0, 6.3); o.stroke(); o.beginPath(); o.arc(cx, cy + 90, 82, Math.PI * 1.1, Math.PI * 1.9); o.stroke(); }
  }, 1800, cx + cy, 3);
}
SCENE('m4b_valeur', {
  build() {
    const xs = [410, 960, 1510]; const kinds = [['bubble', SLATE], ['shield', RED], ['person', BLUE]];
    VA = kinds.map((k, i) => makeCloud(scatter(1800, 90 + i, xs[i], 420, 500, 300), icon(k[0], xs[i], 410, k[1]), 100 + i));
  },
  update(t) {
    const xs = [410, 960, 1510]; const D = [['Le conseiller', 'Une réponse qu’il peut montrer à son client', 'conseiller'], ['Le courtier', 'La trace de chaque affirmation, prête pour la conformité', 'courtier'], ['Le client', 'Une décision qu’il comprend', 'client']];
    D.forEach((d, i) => {
      const ta = tw('m4b_valeur', d[2]) - .3; const a = fi(t, ta, .5); if (a <= 0) return;
      rrect(xs[i] - 235, 190, 470, 640, 28, '#fff', LINE, 2, a);
      drawCloud(VA[i], P(t, ta, ta + 1.4), { t, size: 3, amp: 120, a });
      txt(d[0], xs[i], 640, { size: 48, w: 700, align: 'center', a: fi(t, ta + .5, .5) });
      const words = d[1].split(' '); let lines = [], cur = ''; ctx.font = `400 34px ${FONT}`;
      for (const w of words) { const nx = cur ? cur + ' ' + w : w; if (ctx.measureText(nx).width > 400 && cur) { lines.push(cur); cur = w; } else cur = nx; } lines.push(cur);
      lines.forEach((ln, li) => txt(ln, xs[i], 702 + li * 44, { size: 34, w: 400, c: MID, align: 'center', a: fi(t, ta + .8, .5) }));
    });
    txt('Objectifs de conception — non mesurés à ce jour', W / 2, 890, { size: 28, c: '#8a847e', align: 'center', a: fi(t, tw('m4b_valeur', 'client') + 1.5, .6) });
  }
});

/* ----- m5 : les cinq agents ----- */
let AG;
function ring(cx, cy, label) { return sampleCanvas(o => { o.strokeStyle = INK; o.lineWidth = 9; o.beginPath(); o.arc(cx, cy, 92, 0, 6.283); o.stroke(); o.fillStyle = RED; o.font = `700 84px ${FONT}`; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(label, cx, cy + 4); }, 1900, cx * 3 + 1, 3); }
SCENE('m5_agents', {
  build() { const xs = [250, 605, 960, 1315, 1670]; AG = xs.map((x, i) => makeCloud(scatter(1900, 120 + i, x, 440, 260, 260), ring(x, 440, String(i + 1)), 130 + i)); },
  update(t) {
    const xs = [250, 605, 960, 1315, 1670]; const ag = [
      ['Accueil', 'le récit devient des règles', 'Sonnet 5.5 · Bedrock', 'accueil', BLUE],
      ['Constructeur', 'données ≤ date de décision', 'code déterministe', 'constructeur', SLATE],
      ['Analyste', 'chaque chiffre calculé deux fois', 'code déterministe', 'analyste', SLATE],
      ['Narrateur', 'l’explication, en phrases', 'Haiku 5.5 · Bedrock', 'narrateur', BLUE],
      ['Vérificateur', 'refuse tout nombre sans reçu', 'code déterministe', 'verificateur', SLATE]];
    const th = tw('m5_agents', 'agents') - .2; const ha = fi(t, th, .6);
    txt('Cinq agents', W / 2, 190, { size: 72, w: 700, align: 'center', a: ha }); txt('deux appels de modèle ; le reste est du code déterministe', W / 2, 245, { size: 32, c: MID, align: 'center', a: ha });
    ag.forEach((g, i) => {
      const ta = tw('m5_agents', g[3]) - .1; const a = fi(t, ta, .5);
      if (i < 4) { const nt = tw('m5_agents', ag[i + 1][3]) - .3; dotted(xs[i] + 112, 440, xs[i + 1] - 112, 440, fi(t, nt, .5), { a: .9 }); }
      if (t >= ta) drawCloud(AG[i], P(t, ta, ta + 1.3), { t, size: 3, amp: 150 });
      const la = fi(t, ta + .5, .5); txt(g[0], xs[i], 616, { size: 42, w: 700, align: 'center', a: la }); wrapLines(g[1], 300, 27).forEach((ln, k) => txt(ln, xs[i], 664 + k * 34, { size: 27, c: MID, align: 'center', a: la }));
      chip(g[2], xs[i], 752, { size: 24, align: 'center', a: la, c: g[4], fill: g[4] === BLUE ? '#e6f1f9' : '#fff', stroke: g[4] === BLUE ? '#9ccbe6' : LINE });
      if (i === 2) { const ca = fi(t, ta + 1.4, .5); txt('A = B', xs[i], 828, { size: 36, w: 700, align: 'center', a: ca, c: GREEN }); checkMark(xs[i] + 70, 817, 22, GREEN, ca); }
      if (i === 4) { const ca = fi(t, twe('m5_agents', 'sans') - .3, .4); txt('« 300 % » → rejeté', xs[i], 828, { size: 34, w: 700, align: 'center', a: ca, c: RED }); }
    });
  }
});

/* ----- m6 : AWS et preuve ----- */
SCENE('m6_aws', {
  update(t) {
    const ta = tw('m6_aws', 'Amazon') - .1; txt('Amazon Web Services', W / 2, 170, { size: 66, w: 700, align: 'center', a: fi(t, ta, .6) });
    const bx = [[150, 'Navigateur', 'plateforme du courtier', ta + .4], [560, 'API Gateway', 'HTTP API', tw('m6_aws', 'API') - .2], [970, 'AWS Lambda', 'agents + calculs', tw('m6_aws', 'Lambda') - .2], [1380, 'Amazon Bedrock', 'Claude Sonnet · Haiku 5.5', tw('m6_aws', 'Bedrock') - .2]];
    bx.forEach((b, i) => {
      const a = fi(t, b[3], .5); if (a <= 0) return; rrect(b[0], 250, 390, 150, 24, '#fff', i === 3 ? '#9ccbe6' : LINE, 3, a);
      txt(b[1], b[0] + 195, 322, { size: 42, w: 700, align: 'center', a }); txt(b[2], b[0] + 195, 368, { size: 27, c: MID, align: 'center', a });
      if (i > 0) dotted(bx[i - 1][0] + 395, 325, b[0] - 5, 325, fi(t, b[3] - .2, .5), { a: a, r: 3 });
    });
    txt('CloudFormation · S3 · CloudWatch · IAM — déploiement dédié, us-east-1', W / 2, 450, { size: 26, c: '#8a847e', align: 'center', a: fi(t, tw('m6_aws', 'Bedrock') + .6, .6) });
    // test « destruction du futur »
    const tt = tw('m6_aws', 'test') - .2, pa = fi(t, tt, .6);
    if (pa > 0) {
      rrect(170, 520, 1580, 300, 28, '#fff', LINE, 2, pa); txt('Test « destruction du futur »', 230, 580, { size: 38, w: 700, a: pa });
      const bars = [34.1, 8.7, 6.1, 5.5, 4.9], bx0 = [240, 1170];
      bx0.forEach((x0, k) => {
        txt(k ? 'Après : tous les prix postérieurs modifiés' : 'Avant : prix réels', x0, 640, { size: 28, c: k ? RED : MID, a: pa });
        bars.forEach((v, i) => { rrect(x0, 668 + i * 28, v * 11, 16, 8, k ? '#d99aa4' : '#c9c3bd', null, 0, pa); });
      });
      const ea = fi(t, twe('m6_aws', 'change') - .8, .5); txt('=', 955, 760, { size: 120, w: 700, align: 'center', a: ea, c: GREEN });
      const ia = fi(t, twe('m6_aws', 'cent') - .6, .5); if (ia > 0) { checkMark(1620, 580, 36, GREEN, ia); txt('identique', 1500, 595, { size: 36, w: 700, align: 'right', c: GREEN, a: ia }); }
    }
    const tc = tw('m6_aws', 'tests') - .1; const cs = ['12 tests unitaires', '8/8 contrats HTTP', 'parcours navigateur ✓'];
    let x = 330; cs.forEach((s, i) => { const a = fi(t, tc + i * .35, .4); const w = chip(s, x, 890, { size: 30, a, c: GREEN, stroke: '#a6cdbd', fill: '#eef7f2' }); x += w + 28; });
  }
});

/* ----- m7 : limites ----- */
SCENE('m7_limites', {
  update(t) {
    const ts = tw('m7_limites', 'simulation') - .1; const a = fi(t, ts, .5);
    txt('Simulation uniquement', W / 2, 220, { size: 84, w: 700, align: 'center', a, c: INK }); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = RED; ctx.fillRect(W / 2 - 60, 252, 120 * a, 6); ctx.restore();
    chip('aucun ordre réel', 700, 340, { size: 32, align: 'center', a: fi(t, tw('m7_limites', 'aucun') - .1, .4) }); chip('aucun conseil personnalisé', 1180, 340, { size: 32, align: 'center', a: fi(t, tw('m7_limites', 'aucun', 1) - .1, .4) });
    const tl = tw('m7_limites', 'limites') - .2; const C = [['Ce qu’on sait', 'prix, calendrier, règles du mandat', GREEN], ['Ce qu’on suppose', 'construction par poches, volatilité inverse', SLATE], ['Ce qu’on ignore', 'autres avoirs, fiscalité, liquidité', RED]];
    C.forEach((c, i) => {
      const la = fi(t, tl + i * .3, .5); if (la <= 0) return; const x = 190 + i * 520; rrect(x, 410, 480, 230, 24, '#fff', LINE, 2, la);
      ctx.save(); ctx.globalAlpha = la; ctx.fillStyle = c[2]; ctx.fillRect(x + 30, 440, 56, 7); ctx.restore();
      txt(c[0], x + 30, 506, { size: 40, w: 700, a: la }); ctx.font = `400 31px ${FONT}`; const wd = c[1].split(' '); let ln = [], cur = '';
      for (const w of wd) { const nx = cur ? cur + ' ' + w : w; if (ctx.measureText(nx).width > 420 && cur) { ln.push(cur); cur = w; } else cur = nx; } ln.push(cur);
      ln.forEach((s, k) => txt(s, x + 30, 556 + k * 40, { size: 31, w: 400, c: MID, a: la }));
    });
    const t1 = tw('m7_limites', 'client') - .2, t2 = tw('m7_limites', 'courtier') - .2;
    [['Pour le client', 'de la clarté', t1, BLUE], ['Pour le courtier', 'une confiance qu’on peut vérifier', t2, RED]].forEach((c, i) => {
      const ca = fi(t, c[2], .5); if (ca <= 0) return; const x = 190 + i * 780; rrect(x, 720, 740, 120, 24, c[3], null, 0, ca);
      txt(c[0], x + 36, 770, { size: 30, c: 'rgba(255,255,255,.8)', a: ca }); txt(c[1], x + 36, 815, { size: 40, w: 700, c: '#fff', a: ca });
    });
  }
});

/* ----- m8 : fin ----- */
let FN;
SCENE('m8_fin', {
  build() {
    const sc = scatter(11000, 201, W / 2, 400, 950, 450);
    const wm = sampleCanvas(o => { o.font = `700 330px ${FONT}`; const w1 = o.measureText('Verity').width, w2 = o.measureText('.').width; const x0 = W / 2 - (w1 + w2) / 2; o.textBaseline = 'middle'; o.textAlign = 'left'; o.fillStyle = INK; o.fillText('Verity', x0, 400); o.fillStyle = RED; o.fillText('.', x0 + w1, 400); }, 11000, 202);
    FN = { cls: buildChain([sc, wm], 210) };
  },
  update(t) {
    chain(FN.cls, [{ at: .2, dur: 2.4 }], t, { size: 3.4 });
    const tg = tw('m8_fin', 'Chaque') - .1; txt('Chaque chiffre a un reçu.', W / 2, 700, { size: 78, w: 700, align: 'center', a: fi(t, tg, .7) });
    const fa = fi(t, tg + 1.6, .8); txt('Simulation uniquement — aucun ordre réel', W / 2, 800, { size: 32, c: MID, align: 'center', a: fa }); txt('Déployé sur AWS : Lambda · API Gateway · Bedrock', W / 2, 850, { size: 32, c: MID, align: 'center', a: fa });
  }
});
