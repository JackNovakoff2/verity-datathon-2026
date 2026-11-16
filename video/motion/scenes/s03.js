// s03 — solution : « Verity », la signature, puis la place de Verity dans le parcours client
SCENE('s03_solution', {
  build(st, T, at) {
    this.t = { n: at('Voici Verity'), s: at('chaque chiffre a un reçu', -.2), b: at('Verity intervient'), o: at("dès l'ouverture"), r: at('On raconte'), m: at('transforme en mandat'), p: at('construit un portefeuille'), d: at('examine chaque demande'), z: at('prouve chacune') };
    st.style.background = 'linear-gradient(180deg,#ffffff,#eef7fb)';
    // marque + nom
    this.brand = box(st, 0, 250, W, 320, '');
    this.mark = box(this.brand, 470, 20, 230, 230, '', MARK(230));
    this.word = box(this.brand, 740, 0, 900, 260, '', ''); css(this.word, { fontSize: '250px', fontWeight: '700', letterSpacing: '-6px', color: '#365e7e', lineHeight: '1.05', whiteSpace: 'nowrap' });
    this.letters = charSpans(this.word, 'Verity', ''); this.letters.forEach(l => l.style.display = 'inline-block');
    this.sig = box(st, 0, 600, W, 120, '', 'Chaque chiffre a un <span style="color:#1677b8">reçu</span>.'); css(this.sig, { textAlign: 'center', fontSize: '92px', fontWeight: '500' });
    this.demo = box(st, 0, 740, W, 80, '', `<span style="font-size:44px;color:#5b7384;margin-right:20px">Exemple :</span><span class="badge" style="height:70px;font-size:46px">${FACTS.robert.vol}<span style="display:inline-block;margin-left:2px;width:44px;height:44px">${SVG_CHECK}</span><span style="font-size:26px;font-weight:500;letter-spacing:.1em;text-transform:uppercase">reçu</span></span>`); css(this.demo, { textAlign: 'center' });
    // frise
    this.steps = [['Ouverture de compte', 'On raconte sa situation'], ['Mandat', 'Le récit devient des règles'], ['Portefeuille simulé', 'Construit, sans ordre réel'], ['Demandes', 'Chaque demande est examinée'], ['Bilan', 'Chaque affirmation est prouvée']];
    this.tl = box(st, 0, 0, W, H, ''); const colW = 300, gap = 45, x0 = (W - (5 * colW + 4 * gap)) / 2;
    this.hdr = box(this.tl, 0, 90, W, 90, '', 'Le parcours client'); css(this.hdr, { textAlign: 'center', fontSize: '60px', fontWeight: '500', color: '#365e7e' });
    this.nodes = this.steps.map((s, i) => {
      const x = x0 + i * (colW + gap);
      const n = box(this.tl, x, 330, colW, 200, 'card'); n.innerHTML = `<div class="nn" style="position:absolute;left:24px;top:22px;width:52px;height:52px;border-radius:50%;border:3px solid #9fb3c0;color:#5b7384;font-weight:700;font-size:30px;text-align:center;line-height:46px">${i + 1}</div><div class="tt" style="position:absolute;left:24px;top:100px;right:16px;font-size:40px;font-weight:700;line-height:1.1">${s[0]}</div>`;
      let arr = null; if (i < 4) { arr = box(this.tl, x + colW + 4, 415, gap - 8, 30, '', '<svg width="37" height="30" viewBox="0 0 37 30"><path d="M2 15h28M20 4l12 11-12 11" fill="none" stroke="#9fb3c0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'); }
      const cp = box(this.tl, x, 560, colW, 100, '', s[1]); css(cp, { fontSize: '32px', color: '#365e7e', textAlign: 'center', lineHeight: '1.25' });
      return { n, cp, x, arr };
    });
    this.bar = box(this.tl, x0 - 14, 720, 0, 92, ''); css(this.bar, { background: '#1677b8', borderRadius: '46px', overflow: 'hidden' });
    this.barLbl = box(this.bar, 36, 14, 1500, 64, '', `<span style="display:inline-block;width:52px;vertical-align:-12px">${MARK(52, '#fff', '#1677b8')}</span> <span style="font-weight:700;font-size:46px;color:#fff;margin-left:14px">Verity</span><span id="bl2" style="font-size:36px;color:#cfe7f5;margin-left:22px;font-weight:500"></span>`); css(this.barLbl, { whiteSpace: 'nowrap' });
    this.x0 = x0; this.colW = colW; this.gapw = gap;
    this.pin = box(this.tl, x0, 268, 300, 56, '', '<span class="tag" style="background:#1677b8;color:#fff;font-size:28px">Verity commence ici</span>');
    this.mini = box(st, 70, 36, 400, 80, '', `<span style="display:inline-block;width:50px;vertical-align:-10px">${MARK(50, '#365e7e')}</span><span style="font-size:48px;font-weight:700;color:#365e7e;margin-left:12px">Verity</span>`);
  },
  update(t, T, at) {
    const a = this.t;
    const mp = P(t, a.n, a.n + .6, E.back); set(this.mark, { o: clamp(mp * 2), s: .6 + .4 * mp });
    this.letters.forEach((l, i) => { const p = P(t, a.n + .1 + i * .07, a.n + .45 + i * .07, E.out5); set(l, { o: clamp(p * 2), y: (1 - p) * 90 }); });
    enter(this.sig, t, a.s, .6, 50, E.out5); enter(this.demo, t, a.s + 1.1, .5, 30);
    const br = P(t, a.b - .1, a.b + .5, E.io);                       // la marque s'efface vers le haut
    set(this.brand, { o: 1 - br, y: -br * 220 }); set(this.sig, { o: (1 - br) * parseFloat(this.sig.style.opacity || 1), y: -br * 220 }); set(this.demo, { o: (1 - br) * parseFloat(this.demo.style.opacity || 1), y: -br * 220 });
    this.brand.style.display = this.sig.style.display = this.demo.style.display = br >= 1 ? 'none' : 'block';
    set(this.mini, { o: br });
    const tl = P(t, a.b + .15, a.b + .75, E.out); set(this.hdr, { o: tl, y: (1 - tl) * 40 });
    const dstart = [a.o, a.m, a.p, a.d, a.z];
    const reached = dstart.map(s => t >= s);
    this.nodes.forEach((nd, i) => {
      const p = P(t, a.b + .2 + i * .09, a.b + .8 + i * .09, E.back); set(nd.n, { o: clamp(p * 2), y: (1 - p) * 70 }); if (nd.arr) set(nd.arr, { o: clamp(p * 2) }); set(nd.cp, { o: clamp(p * 2) * (t >= (i === 0 ? a.r : dstart[i]) ? 1 : .0), y: (1 - p) * 30 });
      const on = reached[i]; nd.n.style.borderColor = on ? '#1677b8' : '#d6e4eb'; nd.n.style.background = on ? '#e3f1f9' : '#fff';
      const nn = nd.n.querySelector('.nn'); nn.style.background = on ? '#1677b8' : '#fff'; nn.style.color = on ? '#fff' : '#5b7384'; nn.style.borderColor = on ? '#1677b8' : '#9fb3c0';
    });
    // « commence ici » puis la barre Verity s'étend de gauche à droite
    set(this.pin, { o: P(t, a.o - .1, a.o + .3) * (1 - P(t, a.m - .2, a.m + .2)), y: (1 - P(t, a.o - .1, a.o + .3)) * 14 });
    const ends = dstart.map((s, i) => P(t, s - .1, s + .5, E.out));
    let w = 0; for (let i = 0; i < 5; i++) w += (i === 0 ? this.colW + 28 : this.colW + this.gapw) * ends[i];
    this.bar.style.width = w + 'px'; this.bar.style.opacity = ends[0] > 0 ? 1 : 0;
    const full = t > a.z + .4; this.barLbl.querySelector('#bl2').textContent = full ? 'du premier jour au bilan' : '';
  }
});
