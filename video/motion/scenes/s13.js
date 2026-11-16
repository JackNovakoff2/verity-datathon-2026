// s13 — limites et bénéfices
SCENE('s13_limites', {
  build(st, T, at) {
    const F = FACTS; this.t = { a: at('Verity reste'), l1: at('aucun ordre réel'), l2: at('aucun conseil personnalisé'), l3: at('ses limites sont dites'), c: at('Pour le client'), b: at('Pour le courtier'), g: T.speech_end + .2 };
    this.ban = box(st, 360, 60, 1200, 130, ''); css(this.ban, { background: '#c40023', color: '#fff', borderRadius: '22px', textAlign: 'center', fontSize: '84px', fontWeight: '700', lineHeight: '130px', letterSpacing: '.02em' });
    this.ban.textContent = 'SIMULATION UNIQUEMENT';
    this.ban2 = box(st, 0, 205, W, 60, '', 'Aucun ordre réel · aucun conseil personnalisé'); css(this.ban2, { textAlign: 'center', fontSize: '38px', color: '#365e7e', fontWeight: '500' });
    // colonne de gauche : limites (courtes, tirées des limites déclarées par l'engin)
    this.lt = box(st, 110, 310, 800, 50, '', 'Trois limites, dites clairement'); css(this.lt, { fontSize: '40px', fontWeight: '700', color: '#365e7e' });
    const L = F.limits; const lim = [['Prix ajustés après coup', 'pas de données « point-in-time » strictes ; aucune donnée postérieure à la décision n\'est utilisée'], ['Règles = hypothèses', 'plafonds et tolérances de démonstration, pas des normes réglementaires'], ['Portefeuille idéalisé', 'sans frais, sans impôt, sans rééquilibrage']];
    this.lims = lim.map((l, i) => { const b = box(st, 110, 385 + i * 150, 800, 134, 'card'); b.innerHTML = `<div style="position:absolute;left:24px;top:22px;width:46px;height:46px;border-radius:50%;background:#fdecef;color:#c40023;font-weight:700;font-size:28px;text-align:center;line-height:46px">${i + 1}</div><div style="position:absolute;left:92px;top:10px;right:20px;font-size:34px;font-weight:700">${l[0]}</div><div style="position:absolute;left:92px;top:56px;right:20px;font-size:26px;line-height:1.2;color:#5b7384">${l[1]}</div>`; return b; });
    // colonne de droite : bénéfices
    this.bt = box(st, 1010, 310, 800, 50, '', 'Trois bénéfices'); css(this.bt, { fontSize: '40px', fontWeight: '700', color: '#1677b8' });
    const ben = [['Pour le client', 'La clarté', 'Chaque chiffre du récit s\'ouvre sur son reçu.'], ['Pour le courtier', 'Une confiance vérifiable', 'Il montre ses calculs, au lieu de demander de le croire.'], ['Pour la conformité', 'Une trace complète', 'Formule, période, titres, deux calculs, empreintes.']];
    this.bens = ben.map((l, i) => { const b = box(st, 1010, 385 + i * 150, 800, 134, 'card'); css(b, { borderColor: '#9ccbe6' }); b.innerHTML = `<div style="position:absolute;left:24px;top:22px;width:46px;height:46px;border-radius:50%;background:#1677b8;color:#fff;padding:9px">${SVG_CHECK}</div><div style="position:absolute;left:92px;top:8px;right:20px;font-size:23px;color:#5b7384;letter-spacing:.08em;text-transform:uppercase">${l[0]}</div><div style="position:absolute;left:92px;top:34px;right:20px;font-size:36px;font-weight:700;color:#126fb2">${l[1]}</div><div style="position:absolute;left:92px;top:82px;right:20px;font-size:26px;line-height:1.2;color:#5b7384">${l[2]}</div>`; return b; });
  },
  update(t, T, at) {
    const a = this.t; const p = P(t, .1, .55, E.back);
    set(this.ban, { o: clamp(p * 2), s: .85 + .15 * p }); enter(this.ban2, t, a.l1 - .3, .5, 20);
    enter(this.lt, t, a.l2, .4, 20);
    [a.l2 + .1, a.l3 - .2, a.l3 + 1.0].forEach((s, i) => enter(this.lims[i], t, s, .5, 50));
    enter(this.bt, t, a.c - .3, .4, 20);
    enter(this.bens[0], t, a.c, .5, 50); enter(this.bens[1], t, a.b, .5, 50); enter(this.bens[2], t, a.g, .5, 50);
  }
});
