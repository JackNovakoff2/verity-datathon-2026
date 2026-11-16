const W = 1920, H = 1080;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const E = { lin: x => x, out: x => 1 - Math.pow(1 - x, 3), out5: x => 1 - Math.pow(1 - x, 5), io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  back: x => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); } };
const P = (t, a, b, e = E.out) => e(clamp((t - a) / Math.max(1e-6, b - a)));
const $ = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
const css = (e, o) => { Object.assign(e.style, o); return e; };
const box = (parent, x, y, w, h, cls = '', html = '') => { const e = $('div', 'abs ' + cls, html, parent); css(e, { left: x + 'px', top: y + 'px', width: w + 'px', height: h == null ? 'auto' : h + 'px' }); return e; };
// opacité + translation + échelle
function set(e, o) { if (o.o != null) e.style.opacity = o.o; const tr = []; if (o.x || o.y) tr.push(`translate(${o.x || 0}px,${o.y || 0}px)`); if (o.s != null) tr.push(`scale(${o.s})`); if (o.r) tr.push(`rotate(${o.r}deg)`); e.style.transform = tr.join(' ') || 'none'; }
// entrée standard : fondu + montée
const enter = (e, t, a, d = .5, dy = 40, ease = E.out) => { const p = P(t, a, a + d, ease); set(e, { o: clamp(p * 1.6), y: (1 - p) * dy }); return p; };
const fr = (n) => String(n).replace('.', ',');
const pct1 = (n) => fr(n.toFixed(1)) + ' %';
const SCENES = {};
function SCENE(id, def) { SCENES[id] = def; }
// instant (s de scène) où une expression commence dans la narration
function atFn(id) {
  const T = TIMING[id];
  return (phrase, off = 0) => {
    let pos = T.text.indexOf(phrase); if (pos < 0) throw new Error('phrase introuvable: ' + phrase + ' / ' + id);
    const A = T.anchors; let t = A[A.length - 1].t;
    for (let i = 0; i < A.length - 1; i++) if (pos <= A[i + 1].pos) { t = A[i].t + (A[i + 1].t - A[i].t) * (pos - A[i].pos) / Math.max(1, A[i + 1].pos - A[i].pos); break; }
    return t + off;
  };
}
const SVG_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>';
const SVG_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>';
// marque Verity : un reçu dentelé et une coche
const MARK = (s, c1 = '#1677b8', c2 = '#fff') => `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><path d="M12 4h40v52l-6.67-5-6.66 5L32 51l-6.67 5-6.66-5L12 56z" fill="${c1}"/><path d="M22 27l7 7 13-14" fill="none" stroke="${c2}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// frises (typage)
function charSpans(parent, text, cls) { // retourne la liste de spans (un par caractère)
  const out = []; for (const ch of text) { const s = $('span', cls, ch === ' ' ? ' ' : ch.replace('<', '&lt;'), parent); out.push(s); } return out;
}
// transition « essuie-glace » : recouvre (fin de scène) et révèle (début de scène)
function wipe(t, dur, opt) {
  let w = document.getElementById('wipe'); if (!w) { w = $('div', 'abs', '<div style="position:absolute;top:0;bottom:0;width:100%;background:#365e7e"></div><div style="position:absolute;top:0;bottom:0;width:18px;background:#c40023"></div>', document.getElementById('stage')); w.id = 'wipe'; css(w, { left: 0, top: 0, width: W + 'px', height: H + 'px', zIndex: 9999, pointerEvents: 'none' }); }
  const pan = w.children[0], edge = w.children[1];
  const R = .26, C = .22; let x0 = null, x1 = null;
  if (opt.in && t < R) { const p = E.io(t / R); x0 = p * W; x1 = W; }
  else if (opt.out && t > dur - C) { const p = E.io(clamp((t - (dur - C)) / C)); x0 = 0; x1 = p * W; }
  if (x0 == null) { w.style.display = 'none'; return; }
  w.style.display = 'block'; css(pan, { left: x0 + 'px', width: Math.max(0, x1 - x0) + 'px' });
  css(edge, { left: (x1 === W ? x0 : x1 - 18) + 'px', display: (x1 === W && x0 === 0) || (x0 === x1) ? 'none' : 'block' });
}
let CUR = null, OPT = {};
function boot() {
  const q = new URLSearchParams(location.search); const id = q.get('scene');
  OPT = { in: q.get('in') !== '0', out: q.get('out') !== '0' };
  const stage = document.getElementById('stage'); const def = SCENES[id];
  if (id === '_sub') { return; }
  const T = TIMING[id];
  CUR = def; def.id = id; def.T = T; def.at = atFn(id);
  def.build(stage, T, def.at);
  window.setT = (t) => { def.update(t, T, def.at); wipe(t, T.dur, OPT); };
  window.setT(0);
}
window.addEventListener('load', async () => { await document.fonts.load('700 40px "Nationale Sans"'); await document.fonts.load('500 40px "Nationale Sans"'); await document.fonts.load('400 40px "Nationale Sans"'); await document.fonts.ready; boot(); document.body.dataset.ready = '1'; });
