/* Isolate the burger from its background → transparent PNG (pure JS, jimp). */
const Jimp = require("jimp");

const TOL = 62;          // region-growing color tolerance (traverse wood grain)

function hsv(r, g, b) {
  r/=255; g/=255; b/=255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), dif = max - min;
  const v = max;
  const s = max === 0 ? 0 : dif / max;
  let h = 0;
  if (dif !== 0) {
    if (max === r) h = 60 * (((g - b) / dif) % 6);
    else if (max === g) h = 60 * ((b - r) / dif + 2);
    else h = 60 * ((r - g) / dif + 4);
  }
  if (h < 0) h += 360;
  return { h, s, v };
}
function sv(r, g, b){ const c = hsv(r,g,b); return { s:c.s, v:c.v }; }
// protect only genuine food colours: glossy bun, molten cheese, seared beef
function isFood(r, g, b){
  const { h, s, v } = hsv(r, g, b);
  const bun    = h >= 12 && h <= 44 && s > 0.70 && v > 0.50;  // amber glazed bun (very saturated)
  const cheese = h >= 36 && h <= 72 && s > 0.48 && v > 0.60;  // molten yellow cheese
  const beef   = h <= 20 && s > 0.50 && v > 0.18 && v < 0.62; // red-brown seared beef
  return bun || cheese || beef;
}
// a background colour = white tile OR wood board (and not clearly food)
function isBg(r, g, b){
  if (isFood(r, g, b)) return false;
  const { h, s, v } = hsv(r, g, b);
  const tile  = v > 0.62 && s < 0.24;                                        // bright ceramic
  const board = h >= 12 && h <= 56 && s >= 0.14 && s <= 0.72 && v >= 0.20;   // wood (any lightness)
  return tile || board;
}

Jimp.read("burger-original.jpg").then((img) => {
  const w = img.bitmap.width, h = img.bitmap.height;
  const d = img.bitmap.data;                 // RGBA
  const idx = (x, y) => (y * w + x) * 4;
  const visited = new Uint8Array(w * h);
  const bg = new Uint8Array(w * h);          // 1 = background

  // protection mask (real food colours never become background)
  const protectAt = (x, y) => {
    const i = idx(x, y);
    return isFood(d[i], d[i + 1], d[i + 2]);
  };

  // seed queue with all border pixels
  const qx = [], qy = [];
  const push = (x, y) => { qx.push(x); qy.push(y); };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

  // flood fill: expand into any neighbour that is a BACKGROUND colour.
  // (crosses wood grain, but can't reach bun highlights enclosed by food.)
  let head = 0;
  while (head < qx.length) {
    const x = qx[head], y = qy[head]; head++;
    const p = y * w + x;
    if (visited[p]) continue;
    visited[p] = 1;
    const i = idx(x, y);
    if (!isBg(d[i], d[i + 1], d[i + 2])) continue;   // hit the food → stop
    bg[p] = 1;
    if (x + 1 < w)  push(x + 1, y);
    if (x - 1 >= 0) push(x - 1, y);
    if (y + 1 < h)  push(x, y + 1);
    if (y - 1 >= 0) push(x, y - 1);
  }

  // strip the board wedge attached under the burger base (bottom band only,
  // below the cheese — so no risk of holing the melt).
  const yBand = Math.floor(h * 0.80);
  for (let y = yBand; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (bg[p]) continue;
    const i = p * 4;
    if (isFood(d[i], d[i + 1], d[i + 2])) continue;
    const { h:hh, s, v } = hsv(d[i], d[i + 1], d[i + 2]);
    if ((hh >= 18 && hh <= 54 && s >= 0.12 && s <= 0.64 && v >= 0.28) || (v > 0.6 && s < 0.24)) bg[p] = 1;
  }

  // keep only the largest connected opaque blob (the burger) — drops the
  // detached wood-grain islands that happen to match food colours.
  const label = new Int32Array(w * h).fill(0);
  let best = -1, bestSize = 0, cur = 0;
  const sx = [], sy = [];
  for (let p0 = 0; p0 < w * h; p0++) {
    if (bg[p0] || label[p0]) continue;
    cur++; let size = 0; sx.length = 0; sy.length = 0;
    sx.push(p0 % w); sy.push((p0 / w) | 0); label[p0] = cur;
    while (sx.length) {
      const x = sx.pop(), y = sy.pop(), p = y * w + x; size++;
      const nb = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
      for (const [nx, ny] of nb) {
        if (nx<0||ny<0||nx>=w||ny>=h) continue;
        const np = ny*w+nx;
        if (!bg[np] && !label[np]) { label[np] = cur; sx.push(nx); sy.push(ny); }
      }
    }
    if (size > bestSize) { bestSize = size; best = cur; }
  }
  for (let p = 0; p < w * h; p++) if (!bg[p] && label[p] !== best) bg[p] = 1;

  // build feathered alpha (3x3 average of the background mask → soft edge)
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, n = 0;
      for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
        const X = x + xx, Y = y + yy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        sum += bg[Y * w + X] ? 0 : 255; n++;
      }
      alpha[y * w + x] = Math.round(sum / n);
    }
  }
  for (let p = 0; p < w * h; p++) d[p * 4 + 3] = alpha[p];

  // robust crop: keep rows/cols that hold a real amount of the burger
  const rowN = new Array(h).fill(0), colN = new Array(w).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[idx(x, y) + 3] > 40) { rowN[y]++; colN[x]++; }
  }
  const RMIN = 12;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) if (rowN[y] > RMIN) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  for (let x = 0; x < w; x++) if (colN[x] > RMIN) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
  // cap the bottom just under the burger base to drop the board/drip wedge
  maxY = Math.min(maxY, Math.floor(h * 0.815));
  const pad = 8;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;

  const out = img.clone().crop(minX, minY, cw, ch);
  // fade the very bottom to transparent — removes the board/drip wedge the burger
  // sits on and lets the base melt into the dark scene.
  const od2 = out.bitmap.data;
  const fadeTop = Math.floor(ch * 0.88);
  for (let y = fadeTop; y < ch; y++) {
    const t = (y - fadeTop) / (ch - fadeTop);      // 0..1
    const k = Math.max(0, 1 - t * 1.1);
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      od2[i + 3] = Math.round(od2[i + 3] * k);
    }
  }
  const removed = bg.reduce((a, v) => a + v, 0) / (w * h);
  out.writeAsync("burger-cut.png").then(() => {
    console.log(JSON.stringify({ ok: true, src: `${w}x${h}`, crop: `${cw}x${ch}`,
      bboxY: [ (minY/h).toFixed(2), (maxY/h).toFixed(2) ], removedPct: (removed*100).toFixed(1) }));
  });
}).catch((e) => { console.error("ERR", e.message); });
