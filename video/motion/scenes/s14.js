// s14 — carte de fin
SCENE('s14_fin', {
  build(st, T, at) {
    const url = (window.DEMO_URL || '').trim();
    st.style.background = '#f7fafb';
    this.band = box(st, 0, 0, W, 140, ''); css(this.band, { background: '#fff', borderBottom: '2px solid #d6e4eb' });
    this.band.innerHTML = `<img src="../../web/assets/nbdb-reference-logo.png" style="position:absolute;left:90px;top:34px;height:72px"><div style="position:absolute;left:330px;top:38px;width:2px;height:64px;background:#d6e4eb"></div><div style="position:absolute;left:366px;top:36px;font-size:44px;font-weight:700;color:#365e7e;line-height:1.1">Verity</div><div style="position:absolute;left:366px;top:86px;font-size:24px;color:#5b7384">Chaque chiffre a un reçu</div>`;
    this.mark = box(st, 0, 250, W, 200, '', MARK(190)); css(this.mark, { textAlign: 'center' });
    this.name = box(st, 0, 450, W, 260, '', 'Verity'); css(this.name, { textAlign: 'center', fontSize: '250px', fontWeight: '700', color: '#365e7e', letterSpacing: '-6px', lineHeight: '1.05' });
    this.sig = box(st, 0, 700, W, 110, '', 'Chaque chiffre a un <span style="color:#1677b8">reçu</span>.'); css(this.sig, { textAlign: 'center', fontSize: '84px', fontWeight: '500' });
    this.url = box(st, 0, 840, W, 70, '', url ? `<span style="background:#1677b8;color:#fff;padding:8px 36px 12px;border-radius:99px;font-weight:700">${url}</span>` : `<span style="border:3px dashed #9fb3c0;color:#5b7384;padding:8px 36px 12px;border-radius:99px">Adresse de l'application</span>`); css(this.url, { textAlign: 'center', fontSize: '44px' });
    this.foot = box(st, 0, 975, W, 60, '', 'Datathon 2026 · AlphaForge AI'); css(this.foot, { textAlign: 'center', fontSize: '36px', color: '#365e7e', fontWeight: '500', letterSpacing: '.06em' });
    this.t = { v: at('Verity.'), s: at('Chaque chiffre') };
  },
  update(t, T, at) {
    set(this.mark, { o: P(t, .1, .5), s: .7 + .3 * P(t, .1, .7, E.back) });
    enter(this.name, t, .3, .6, 60, E.out5); enter(this.sig, t, this.t.s, .6, 40, E.out5);
    enter(this.url, t, this.t.s + .9, .6, 30); enter(this.foot, t, this.t.s + 1.4, .6, 20);
    const pb = P(t, 0, .5); set(this.band, { o: pb, y: (pb - 1) * 40 });
  }
});
