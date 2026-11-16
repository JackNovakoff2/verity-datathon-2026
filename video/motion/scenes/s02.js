// s02 — problème (2) : un chiffre sans preuve est un risque ; trois clients, un conseil générique
SCENE('s02_probleme2', {
  build(st, T, at) {
    const F = FACTS; this.t = { a: at('En finance'), b: at('un chiffre sans preuve'), c: at("n'est pas une information"), d: at("c'est un risque"), e: at('Et chaque investisseur'), am: at('Amira'), ma: at('Mateo'), ro: at('Robert prépare'), g: at('Un même conseil') };
    // typographie cinétique
    this.k = box(st, 0, 150, W, 560, ''); const k = this.k;
    this.l1 = box(k, 0, 0, W, 90, '', 'En finance,'); css(this.l1, { textAlign: 'center', fontSize: '66px', color: '#5b7384', fontWeight: '500' });
    this.l2 = box(k, 0, 90, W, 200, '', 'un chiffre <span style="color:#c40023;position:relative">sans preuve<i style="position:absolute;left:0;right:0;bottom:6px;height:12px;background:#c40023;opacity:.18"></i></span>'); css(this.l2, { textAlign: 'center', fontSize: '170px', fontWeight: '700', letterSpacing: '-2px', lineHeight: '1.1' });
    this.l3 = box(k, 0, 300, W, 90, '', "n'est pas une information :"); css(this.l3, { textAlign: 'center', fontSize: '66px', color: '#365e7e', fontWeight: '500' });
    this.l4 = box(k, 0, 390, W, 200, '', "c'est un risque."); css(this.l4, { textAlign: 'center', fontSize: '190px', fontWeight: '700', color: '#c40023', letterSpacing: '-3px', lineHeight: '1.1' });
    // titre intermédiaire
    this.h = box(st, 0, 80, W, 110, '', 'Chaque investisseur est <span style="color:#1677b8">différent</span>.'); css(this.h, { textAlign: 'center', fontSize: '84px', fontWeight: '700' });
    const P_ = F.personas;
    const defs = [['amira', ['Technologie', 'Un peu de crypto']], ['mateo', ['Critères ESG', 'Aucune énergie']], ['robert', ['Retraite', 'Pas de crypto']]];
    this.cards = defs.map(([id, tags], i) => {
      const p = P_[id]; const c = box(st, 120 + i * 590, 250, 540, 410, 'card');
      c.innerHTML = `<div style="position:absolute;left:36px;top:36px;width:92px;height:92px;border-radius:50%;background:#e3f1f9;color:#126fb2;font-size:54px;font-weight:700;text-align:center;line-height:92px">${p.name[0]}</div>
        <div style="position:absolute;left:152px;top:34px;font-size:60px;font-weight:700">${p.name}</div>
        <div style="position:absolute;left:152px;top:104px;font-size:30px;color:#5b7384;white-space:nowrap">${p.job}</div>
        <div style="position:absolute;left:36px;top:178px;font-size:46px;font-weight:500;color:#365e7e">${p.age} ans · ${id === 'robert' ? 'retraite' : id === 'mateo' ? 'critères ESG' : 'horizon ' + p.horizon + ' ans'}</div>
        <div style="position:absolute;left:36px;top:270px;display:flex;gap:10px;flex-wrap:wrap;width:480px">${tags.map(x => `<span class="tag" style="font-size:30px;padding:6px 18px;white-space:nowrap">${x}</span>`).join('')}</div>`;
      return c;
    });
    this.gen = box(st, 260, 710, 1400, 120, 'card'); css(this.gen, { borderColor: '#e6b3bc', background: '#fff' });
    this.gen.innerHTML = `<div class="lbl" style="position:absolute;left:36px;top:14px;color:#c40023">Conseil générique</div>
      <div id="gtxt" style="position:absolute;left:36px;top:44px;font-size:46px;font-weight:500;white-space:nowrap;display:inline-block">Le même mélange pour tous : ${F.bench.equity} % actions · ${F.bench.bonds} % obligations</div>
      <div id="gstrike" style="position:absolute;left:36px;top:92px;height:8px;width:0;background:#c40023;border-radius:4px"></div>`;
    this.strike = this.gen.querySelector('#gstrike'); this.cross = $('div', '', SVG_X + '<span style="margin-left:12px">ne convient pas à tous</span>', st); css(this.cross, { position: 'absolute', left: 0, width: W + 'px', top: '846px', textAlign: 'center', color: '#c40023', fontSize: '34px', fontWeight: '500', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0 }); this.cross.firstChild.setAttribute('width', 30);
  },
  update(t, T, at) {
    const a = this.t;
    enter(this.l1, t, a.a, .4, 50); enter(this.l2, t, a.b, .5, 80, E.out5);
    enter(this.l3, t, a.c, .4, 50); enter(this.l4, t, a.d, .55, 90, E.out5);
    this.l4.style.transform += ` scale(${1 + .04 * P(t, a.d + .5, a.d + 1.4, E.io)})`;
    const out = P(t, a.e - .35, a.e + .15, E.io);
    set(this.k, { o: 1 - out, y: -out * 520 }); this.k.style.display = out >= 1 ? 'none' : 'block';
    enter(this.h, t, a.e + .1, .5, 30);
    this.cards.forEach((c, i) => { const s = [a.am, a.ma, a.ro][i]; const p = P(t, s - .05, s + .55, E.back); set(c, { o: clamp(p * 2), y: (1 - p) * 120 }); });
    const g = P(t, a.g, a.g + .5, E.out); set(this.gen, { o: g, y: (1 - g) * 50 });
    this.strike.style.width = (P(t, a.g + 1.0, a.g + 1.6, E.io) * this.gen.querySelector('#gtxt').offsetWidth) + 'px';
    const k2 = P(t, a.g + 1.5, a.g + 2.0); set(this.cross, { o: k2, y: (1 - k2) * 14 });
    const dim = P(t, a.g + 1.0, a.g + 1.6); this.gen.querySelector('#gtxt').style.color = dim > .5 ? '#8a98a3' : '#151719';
  }
});
