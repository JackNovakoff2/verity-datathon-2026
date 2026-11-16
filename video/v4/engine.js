/* Moteur Verity v4 : papier, nuages de points, sous-titres karaoké. Rendu déterministe : window.setT(t). */
const W = 1920, H = 1080;
const PAPER = '#f4f2f0', INK = '#1c1917', GRAY = '#a8a29e', MID = '#6f6862', RED = '#c40023', SLATE = '#365e7e', BLUE = '#1677b8', GREEN = '#2a7157', LINE = '#d9d4cf';
const FONT = '"Nationale Sans", Roboto, Arial, sans-serif';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const E = { lin: x => x, out: x => 1 - Math.pow(1 - x, 3), out5: x => 1 - Math.pow(1 - x, 5), io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, back: x => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); } };
const P = (t, a, b, e = E.out) => e(clamp((t - a) / Math.max(1e-6, b - a)));
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const cv = document.getElementById('c'); const ctx = cv.getContext('2d');

/* ---------- temps : mots de la narration ---------- */
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
function tw(sid, pat, nth = 0) {   // début (s) du nth-ième mot dont la forme normalisée commence par pat
  const Wd = TIMING[sid].words; const p = norm(pat); let k = 0;
  for (const w of Wd) if (['', 'l', 'd'].some(pre => norm(w.w).startsWith(pre + p))) { if (k === nth) return w.s; k++; }
  throw new Error('mot introuvable ' + pat + ' ' + sid);
}
function twe(sid, pat, nth = 0) {   // fin du mot
  const Wd = TIMING[sid].words; const p = norm(pat); let k = 0;
  for (const w of Wd) if (['', 'l', 'd'].some(pre => norm(w.w).startsWith(pre + p))) { if (k === nth) return w.e; k++; }
  throw new Error('mot introuvable ' + pat + ' ' + sid);
}

/* ---------- texte / formes 2D ---------- */
function txt(s, x, y, o = {}) {
  ctx.save(); ctx.globalAlpha = o.a == null ? 1 : o.a; ctx.fillStyle = o.c || INK;
  ctx.font = `${o.w || 500} ${o.size || 40}px ${FONT}`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  ctx.fillText(s, x, y); ctx.restore();
}
function rrect(x, y, w, h, r, fill, stroke, lw = 2, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } ctx.restore();
}
function chip(s, x, y, o = {}) {   // pastille texte, ancrée à gauche (x,y = centre vertical)
  const size = o.size || 28; ctx.save(); ctx.font = `${o.w || 500} ${size}px ${FONT}`; const w = ctx.measureText(s).width + 40; ctx.restore();
  const h = size + 22; const x0 = o.align === 'center' ? x - w / 2 : x;
  rrect(x0, y - h / 2, w, h, h / 2, o.fill || '#fff', o.stroke || LINE, 2, o.a == null ? 1 : o.a);
  txt(s, x0 + 20, y + size * .35, { size, w: o.w || 500, c: o.c || INK, a: o.a == null ? 1 : o.a });
  return w;
}
function dotted(x1, y1, x2, y2, p, o = {}) {   // ligne de points qui se déploie
  const L = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(L / (o.gap || 14)); ctx.save(); ctx.fillStyle = o.c || GRAY;
  for (let i = 0; i <= n * p; i++) { const u = i / n; ctx.globalAlpha = (o.a == null ? 1 : o.a); ctx.beginPath(); ctx.arc(lerp(x1, x2, u), lerp(y1, y2, u), o.r || 2.6, 0, 6.3); ctx.fill(); }
  ctx.restore();
}
function checkMark(cx, cy, r, c, p = 1) {
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = r * .22; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  ctx.moveTo(cx - r * .45, cy + r * .02); ctx.lineTo(cx - r * .12, cy + r * .36); ctx.lineTo(cx + r * .5, cy - r * .32);
  ctx.setLineDash([r * 2.2]); ctx.lineDashOffset = r * 2.2 * (1 - p); ctx.stroke(); ctx.restore();
}

function wrapLines(str, maxW, size, w = 400) { ctx.save(); ctx.font = `${w} ${size}px ${FONT}`; const out = []; let cur = ''; for (const wd of str.split(' ')) { const nx = cur ? cur + ' ' + wd : wd; if (ctx.measureText(nx).width > maxW && cur) { out.push(cur); cur = wd; } else cur = nx; } out.push(cur); ctx.restore(); return out; }
/* ---------- nuages de points ---------- */
function sampleCanvas(draw, n, seed, step = 3) {
  const oc = document.createElement('canvas'); oc.width = W; oc.height = H; const o = oc.getContext('2d', { willReadFrequently: true });
  draw(o); const d = o.getImageData(0, 0, W, H).data; const pts = []; const R = rng(seed);
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) { const i = (y * W + x) * 4; if (d[i + 3] > 110) pts.push([x + (R() - .5) * step, y + (R() - .5) * step, d[i], d[i + 1], d[i + 2]]); }
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const S = mkSet(n);
  for (let i = 0; i < n; i++) { const q = pts.length ? pts[i % pts.length] : [W / 2, H / 2, 0, 0, 0]; const dup = i >= pts.length; S.x[i] = q[0] + (dup ? (R() - .5) * 3 : 0); S.y[i] = q[1] + (dup ? (R() - .5) * 3 : 0); S.z[i] = 0; S.r[i] = q[2]; S.g[i] = q[3]; S.b[i] = q[4]; }
  return S;
}
function mkSet(n) { return { n, x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), nx: new Float32Array(n), ny: new Float32Array(n), nz: new Float32Array(n) }; }
function scatter(n, seed, cx = W / 2, cy = H / 2, sx = 900, sy = 520) {
  const R = rng(seed), S = mkSet(n);
  for (let i = 0; i < n; i++) { S.x[i] = cx + (R() - .5) * 2 * sx; S.y[i] = cy + (R() - .5) * 2 * sy; S.z[i] = (R() - .5) * 200; const v = 150 + R() * 70; S.r[i] = v; S.g[i] = v - 4; S.b[i] = v - 8; }
  return S;
}
// formes 3D (buste) : surface d'ellipsoïdes ; colorées à l'affichage selon la lumière
function ellipsoid(S, off, n, c, r, R, filter) {
  const M = n * 8, ga = Math.PI * (3 - Math.sqrt(5)), pass = [];
  for (let i = 0; i < M; i++) { const yy = 1 - 2 * (i + .5) / M, rad = Math.sqrt(1 - yy * yy), th = ga * i; const nx = Math.cos(th) * rad, nz = Math.sin(th) * rad; if (!filter || filter(nx, yy, nz)) pass.push([nx, yy, nz]); }
  const step = pass.length / n; let k = 0;
  for (; k < n && pass.length; k++) {
    const q = pass[Math.floor(R() * pass.length)], j = off + k;
    S.x[j] = c[0] + q[0] * r[0] + (R() - .5) * 3; S.y[j] = c[1] + q[1] * r[1] + (R() - .5) * 3; S.z[j] = c[2] + q[2] * r[2] + (R() - .5) * 3;
    const ex = q[0] / r[0], ey = q[1] / r[1], ez = q[2] / r[2], l = Math.hypot(ex, ey, ez); S.nx[j] = ex / l; S.ny[j] = ey / l; S.nz[j] = ez / l;
  }
  return off + k;
}
function bust(n, seed, variant) {
  const R = rng(seed), S = mkSet(n); let o = 0; const budget = f => Math.floor(n * f);
  o = ellipsoid(S, o, budget(.58), [0, -40, 0], [105, 135, 110], R);
  o = ellipsoid(S, o, budget(.10), [0, 0, 0], [50, 300, 50], R, (x, y) => y > .35 && y < .62);   // cou
  o = ellipsoid(S, o, budget(.16), [0, 285, 0], [235, 130, 125], R, (x, y) => y < .05);          // épaules
  o = ellipsoid(S, o, budget(.04), [0, -18, 106], [22, 32, 38], R);                                // nez
  if (variant === 'amira') { o = ellipsoid(S, o, budget(.2), [0, -58, -10], [120, 148, 126], R, (x, y, z) => y < -.15 || z < -.35); }
  if (variant === 'robert') { o = ellipsoid(S, o, budget(.1), [0, -72, -6], [112, 128, 116], R, (x, y, z) => y < -.45); }
  if (variant === 'mateo') {
    for (const sx of [-1, 1]) for (let i = 0; i < budget(.05) / 2; i++) { const a = i / (budget(.05) / 2) * 6.283; const j = o++; S.x[j] = sx * 52 + Math.cos(a) * 40; S.y[j] = -52 + Math.sin(a) * 34; S.z[j] = 112; S.nx[j] = 0; S.ny[j] = 0; S.nz[j] = 1; }
  }
  const T = mkSet(n); for (let i = 0; i < n; i++) { const j = i % Math.max(1, o); for (const k of ['x', 'y', 'z', 'nx', 'ny', 'nz']) T[k][i] = S[k][j] + (i >= o ? (R() - .5) * 2 : 0); }
  T.is3d = true; return T;
}
function pointsFromText(text, size, x, y, color, n, seed, weight = 700, step = 3, ls = 0) {
  return sampleCanvas(o => { o.fillStyle = color; o.font = `${weight} ${size}px ${FONT}`; o.textAlign = 'center'; o.textBaseline = 'middle'; if (ls) o.letterSpacing = ls + 'px'; o.fillText(text, x, y); }, n, seed, step);
}
// morph A -> B avec décalage par point ; p in [0,1]
function cloudState(A, B, p, seed) {
  const n = A.n, R = rng(seed), out = [];
  return { A, B, p, seed, jit: Float32Array.from({ length: n * 3 }, () => (R() - .5) * 2), del: Float32Array.from({ length: n }, () => R()) };
}
function makeCloud(A, B, seed = 7) { return cloudState(A, B, 0, seed); }
function drawCloud(cl, p, o = {}) {
  const { A, B } = cl, n = A.n, t = o.t || 0, cx = o.cx || 0, cy = o.cy || 0, sc = o.scale || 1, th = o.theta || 0, alpha = o.a == null ? 1 : o.a;
  const ct = Math.cos(th), st = Math.sin(th), size = o.size || 2.8, amp = o.amp == null ? 220 : o.amp, idle = o.idle == null ? 1.2 : o.idle, f = 1500, tint = o.tint;
  ctx.save(); ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const q = E.io(clamp((p * 1.5 - cl.del[i] * .5) / 1));
    let x = lerp(A.x[i], B.x[i], q), y = lerp(A.y[i], B.y[i], q), z = lerp(A.z[i], B.z[i], q);
    const bulge = Math.sin(q * Math.PI); x += cl.jit[i * 3] * amp * bulge; y += cl.jit[i * 3 + 1] * amp * bulge; z += cl.jit[i * 3 + 2] * amp * bulge;
    x += Math.sin(t * 1.1 + i * .37) * idle; y += Math.cos(t * .9 + i * .21) * idle;
    let r, g, b;
    if (B.is3d && q > 0) {
      const nx = lerp(0, B.nx[i], q), ny = lerp(0, B.ny[i], q), nz = lerp(0, B.nz[i], q);
      const rx = nx * ct + nz * st, rz = -nx * st + nz * ct;
      const d1 = Math.max(0, -.45 * rx - .55 * ny + .7 * rz), d2 = Math.pow(Math.max(0, .9 * rx + .1 * ny + .4 * rz), 1.6);
      const v = 58 + (1 - Math.min(1, d1 / .7)) * 62; r = v + d2 * 150; g = v - d2 * 28; b = v - d2 * 30;
      const xr = x * ct + z * st, zr = -x * st + z * ct; const k = f / (f + zr); x = xr * k; y = y * k;
      r = lerp(A.r[i], r, q); g = lerp(A.g[i], g, q); b = lerp(A.b[i], b, q);
    } else { r = lerp(A.r[i], B.r[i], q); g = lerp(A.g[i], B.g[i], q); b = lerp(A.b[i], B.b[i], q); }
    if (tint) { r = lerp(r, tint[0], tint[3]); g = lerp(g, tint[1], tint[3]); b = lerp(b, tint[2], tint[3]); }
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    const X = cx + x * sc, Y = cy + y * sc; ctx.fillRect(X - size / 2, Y - size / 2, size, size);
  }
  ctx.restore();
}

/* ---------- sous-titres karaoké ---------- */
function drawSubs(sid, t, o = {}) {
  const T = TIMING[sid]; if (!T.chunks.length) return; const y0 = o.y || 985; const words = T.words;
  let ci = -1; for (let i = 0; i < T.chunks.length; i++) { const c = T.chunks[i]; if (t >= words[c.i0].s - .12) ci = i; }
  if (ci < 0) return; const c = T.chunks[ci]; const lastEnd = words[c.i1].e; const nxt = T.chunks[ci + 1];
  if (!nxt && t > lastEnd + .5) return; if (nxt && false) return;
  const fade = clamp((t - (words[c.i0].s - .12)) / .15) * (nxt ? 1 : clamp((lastEnd + .5 - t) / .3));
  ctx.save(); ctx.globalAlpha = fade; ctx.font = `500 44px ${FONT}`; ctx.textBaseline = 'alphabetic';
  const parts = []; for (let i = c.i0; i <= c.i1; i++) parts.push(words[i].w); const full = parts.join(' ');
  const maxW = 1560; const lines = [[]]; let lw = 0; const sp = ctx.measureText(' ').width;
  for (let i = c.i0; i <= c.i1; i++) { const w = ctx.measureText(words[i].w).width; if (lw + w > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(i); lw += w + sp; }
  const lh = 58, yy = y0 - (lines.length - 1) * lh / 2;
  lines.forEach((ln, li) => {
    const wd = ln.reduce((a, i) => a + ctx.measureText(words[i].w).width, 0) + sp * (ln.length - 1); let x = W / 2 - wd / 2;
    for (const i of ln) {
      const w = words[i]; const k = clamp((t - w.s) / .14); const done = t >= w.e - .02; const cur = t >= w.s && !done;
      let col; if (cur) col = RED; else if (done) col = INK; else col = '#b9b3ad';
      ctx.fillStyle = col; ctx.fillText(w.w, x, yy + li * lh); x += ctx.measureText(w.w).width + sp;
    }
  });
  ctx.restore();
}

/* ---------- scènes ---------- */
const SCENES = {};
function SCENE(id, def) { SCENES[id] = def; }
function bg() { ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); }
function boot() {
  const q = new URLSearchParams(location.search); const id = q.get('scene'); const overlay = q.get('overlay') === '1';
  const T = TIMING[id]; const def = SCENES[id];
  if (overlay) { document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent'; } else def.build && def.build(T);
  window.setT = t => { ctx.clearRect(0, 0, W, H); if (overlay) { drawSubs(id, t); return; } bg(); def.update(t, T); if (def.subs !== false) drawSubs(id, t); };
  window.setT(0); document.body.dataset.ready = '1';
}
window.addEventListener('load', async () => {
  for (const w of [400, 500, 700]) await document.fonts.load(`${w} 40px "Nationale Sans"`);
  boot();
});
