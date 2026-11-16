// s01 — problème : un assistant IA très sûr de lui, des chiffres sans source
SCENE('s01_probleme', {
  build(st, T, at) {
    const R = FACTS.robert; this.R = R;
    st.style.background = 'radial-gradient(1400px 800px at 50% 40%, #ffffff, #eef4f7)';
    this.cam = box(st, 0, 0, W, H); const cam = this.cam;
    const card = box(cam, 300, 90, 1320, 700, 'card');
    // en-tête
    const hd = box(card, 0, 0, 1320, 84, '', `<div style="position:absolute;left:40px;top:26px;width:22px;height:22px;border-radius:50%;background:#7a8f9d"></div><div style="position:absolute;left:78px;top:20px;font-size:30px;font-weight:500;color:#365e7e">Assistant IA</div><div style="position:absolute;right:40px;top:24px;font-size:24px;color:#2a7157">● en ligne</div>`);
    css(hd, { borderBottom: '2px solid #e6eef2' });
    // question de l'utilisateur
    const q = 'Mon portefeuille est-il trop risqué ?';
    this.qWrap = box(card, 1320 - 40 - 640, 112, 640, 84, '', ''); css(this.qWrap, { background: '#365e7e', color: '#fff', borderRadius: '22px 22px 6px 22px', padding: '18px 28px', fontSize: '34px', whiteSpace: 'nowrap' });
    this.qCh = charSpans(this.qWrap, q, '');
    // réponse
    this.aWrap = box(card, 40, 232, 1180, 400, '', ''); css(this.aWrap, { background: '#eef3f6', borderRadius: '22px 22px 22px 6px', padding: '26px 34px', fontSize: '40px', lineHeight: '1.7' });
    const lines = [[['Bonne nouvelle : votre portefeuille est modérément risqué.', 0]], [['Volatilité annuelle : ', 0], [R.vol, 1]], [['Rendement annualisé : ', 0], [R.cagr, 1]], [['Pire baisse historique : ', 0], [R.mdd_hist, 1]], [['Vous pouvez investir en toute confiance.', 0]]];
    this.aCh = []; this.nums = [];
    for (const ln of lines) {
      const row = $('div', '', '', this.aWrap); css(row, { whiteSpace: 'nowrap' });
      for (const [txt, isN] of ln) {
        const host = isN ? $('span', 'num', '', row) : row; if (isN) { css(host, { position: 'relative', display: 'inline-block', padding: '0 12px', borderRadius: '10px', background: '#dcecf6', color: '#126fb2' }); this.nums.push(host); }
        this.aCh.push(...charSpans(host, txt, ''));
      }
    }
    this.caret = $('span', '', '', this.aWrap); css(this.caret, { display: 'inline-block', width: '4px', height: '1em', background: '#365e7e', verticalAlign: '-6px', marginLeft: '2px' });
    this.dots = box(card, 40, 244, 150, 60, '', '<span></span><span></span><span></span>'); css(this.dots, { background: '#eef3f6', borderRadius: '22px', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' });
    [...this.dots.children].forEach(s => css(s, { width: '14px', height: '14px', borderRadius: '50%', background: '#7a8f9d', display: 'block' }));
    // étiquettes « source ? »
    this.tags = this.nums.map(n => { const t = $('div', '', 'source ?', n); css(t, { position: 'absolute', left: '100%', marginLeft: '22px', top: '8px', transform: 'none', background: '#c40023', color: '#fff', fontSize: '24px', fontWeight: '700', padding: '0 14px', borderRadius: '99px', whiteSpace: 'nowrap', opacity: 0 }); return t; });
    this.cap = box(st, 0, 830, W, 60, '', 'Aucune source. Aucun calcul à vérifier.'); css(this.cap, { textAlign: 'center', fontSize: '42px', fontWeight: '500', color: '#c40023' });
    this.tQ = at('Demandez') - .1; this.tA = at('Elle vous répondra', .3); this.tZ = at("Mais d'où"); this.tP = at('Personne');
    // transform-origin de la caméra : centre du premier chiffre
    const cr = cam.getBoundingClientRect(), nr = this.nums[0].getBoundingClientRect();
    this.ox = nr.left + nr.width / 2 - cr.left; this.oy = nr.top + nr.height / 2 - cr.top;
    cam.style.transformOrigin = `${this.ox}px ${this.oy}px`;
    this.nums[0].dataset.txt = this.nums[0].innerHTML;
  },
  isQ(n, t) { const i = this.nums.indexOf(n); return t > (i === 0 ? this.tZ + 1.25 : this.tP + .9 + (i - 1) * .3); },
  update(t, T, at) {
    const cardIn = P(t, .05, .6, E.out5); set(this.cam.children[0], { o: cardIn, y: (1 - cardIn) * 50 });
    // question tapée
    const nq = Math.floor(P(t, this.tQ + .2, this.tQ + 2.4, E.lin) * this.qCh.length);
    this.qCh.forEach((c, i) => c.style.opacity = i < nq ? 1 : 0);
    set(this.qWrap, { o: t > this.tQ + .1 ? 1 : 0 });
    // points de saisie puis réponse
    const dotsOn = t > this.tQ + 2.9 && t < this.tA;
    set(this.dots, { o: dotsOn ? 1 : 0 }); [...this.dots.children].forEach((s, i) => s.style.transform = `translateY(${Math.sin(t * 9 - i * .9) * -6}px)`);
    const na = Math.floor(P(t, this.tA, this.tZ - .5, E.lin) * this.aCh.length);
    this.aCh.forEach((c, i) => c.style.opacity = i < na ? 1 : 0);
    set(this.aWrap, { o: t >= this.tA ? 1 : 0 });
    this.nums.forEach(n => { const first = n.firstElementChild; n.style.background = first && first.style.opacity === '0' ? 'transparent' : (this.isQ(n, t) ? '#fdecef' : '#dcecf6'); n.style.color = this.isQ(n, t) ? '#c40023' : '#126fb2'; });
    const typing = t >= this.tA && na < this.aCh.length;
    this.caret.style.opacity = (typing || (Math.floor(t * 2) % 2 === 0 && t < this.tZ)) ? 1 : 0;
    // zoom sur le premier chiffre
    const z = P(t, this.tZ - .1, this.tZ + .7, E.io) - P(t, this.tP, this.tP + .6, E.io);
    this.cam.style.transform = `translate(${(W / 2 - this.ox) * z * 1.0}px,${(430 - this.oy) * z}px) scale(${1 + z * 1.0})`;
    // « source ? » sur le chiffre zoomé, puis sur tous
    const t0 = P(t, this.tZ + .55, this.tZ + .9, E.back); set(this.tags[0], { o: clamp(t0 * 2) }); this.tags[0].style.transform = `scale(${.6 + .4 * t0})`; this.tags[0].style.transformOrigin = 'left center';
    this.tags.forEach((g, i) => { if (!i) return; const p = P(t, this.tP + .5 + (i - 1) * .3, this.tP + .85 + (i - 1) * .3, E.back); g.style.opacity = clamp(p * 2); g.style.transform = `scale(${.6 + .4 * p})`; g.style.transformOrigin = 'left center'; });
    this.nums.forEach((n, i) => { const on = this.isQ(n, t); [...n.querySelectorAll('span')].forEach(s => { if (!s.classList.contains('q')) s.style.visibility = on ? 'hidden' : 'visible'; });
      let q = n.querySelector('.q'); if (!q) { q = $('span', 'q', '?', n); css(q, { position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center' }); } q.style.display = on ? 'block' : 'none'; });
    enter(this.cap, t, this.tP + 1.6, .5, 24);
    this.cap.style.opacity = t > this.tP + 1.6 ? this.cap.style.opacity : 0;
  }
});
