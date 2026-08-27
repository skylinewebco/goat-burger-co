/* Draw a realistic open kraft takeaway box as image pieces I can actually SEE:
   box-back.png  = interior floor + back wall + side walls (sits BEHIND the food)
   box-front.png = front wall/rim (sits IN FRONT of the food's base → food looks inside)
   box-lid.png   = the lid panel (rotates down to close)
   Plus a preview compositing the food inside, to tune positions. */
const Jimp = require("jimp");

const W = 1300, H = 900;
const rnd = (a) => (Math.random() * 2 - 1) * a;

// fill a convex quad (p0..p3 clockwise) with a vertical gradient + cardboard grain
function quad(img, p, cTop, cBot, grain = 8) {
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(img.bitmap.width - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(img.bitmap.height - 1, Math.ceil(Math.max(...ys)));
  const yTop = Math.min(...ys), yBot = Math.max(...ys);
  const inTri = (px, py, a, b, c) => {
    const d1 = (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1]);
    const d2 = (px - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (py - c[1]);
    const d3 = (px - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (py - a[1]);
    const neg = (d1 < 0) || (d2 < 0) || (d3 < 0), pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(neg && pos);
  };
  const d = img.bitmap.data, w = img.bitmap.width;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!(inTri(x, y, p[0], p[1], p[2]) || inTri(x, y, p[0], p[2], p[3]))) continue;
    let t = (y - yTop) / (yBot - yTop + 1e-6);
    // horizontal corrugation + grain
    const corr = Math.sin((x + y * 0.2) * 0.5) * 3 + (((y % 6) < 1) ? -6 : 0);
    const r = cTop[0] + (cBot[0] - cTop[0]) * t + rnd(grain) + corr;
    const g = cTop[1] + (cBot[1] - cTop[1]) * t + rnd(grain) + corr;
    const b = cTop[2] + (cBot[2] - cTop[2]) * t + rnd(grain) + corr;
    const i = (y * w + x) * 4;
    d[i] = Math.max(0, Math.min(255, r)); d[i+1] = Math.max(0, Math.min(255, g)); d[i+2] = Math.max(0, Math.min(255, b)); d[i+3] = 255;
  }
}
// soft drop shadow ellipse (darken)
function shadow(img, cx, cy, rx, ry, al) {
  const d = img.bitmap.data, w = img.bitmap.width, h = img.bitmap.height;
  for (let y = Math.max(0, cy - ry); y < Math.min(h, cy + ry); y++)
    for (let x = Math.max(0, cx - rx); x < Math.min(w, cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, tt = dx*dx + dy*dy;
      if (tt < 1) { const a = al * (1 - tt); const i = (y*w+x)*4;
        d[i] *= (1-a); d[i+1] *= (1-a); d[i+2] *= (1-a); }
    }
}

const KL = [201,151,84], KM = [165,119,47], KD = [110,74,28], KDK=[70,47,20], INT=[38,25,14], INTD=[20,12,6];

(async () => {
  // ---------- BOX BACK (interior) ----------
  const back = new Jimp(W, H, 0x00000000);
  // interior darkness (so food reads as sitting in a cavity)
  quad(back, [[300,470],[1000,470],[900,300],[400,300]], INTD, INT, 4);
  // back wall (kraft, shadowed)
  quad(back, [[430,455],[870,455],[880,345],[420,345]], KDK, KD, 6);
  // interior floor (kraft, lit — food sits here)
  quad(back, [[330,650],[970,650],[880,470],[450,470]], KM, KL, 7);
  // left inner wall
  quad(back, [[330,650],[450,470],[420,345],[300,540]], KD, KM, 6);
  // right inner wall
  quad(back, [[970,650],[880,470],[880,345],[1000,540]], KD, KM, 6);
  // outer left & right box walls (below, exterior sides)
  quad(back, [[300,540],[330,650],[318,760],[286,650]], KM, KDK, 6);
  quad(back, [[1000,540],[970,650],[982,760],[1014,650]], KM, KDK, 6);
  // ambient occlusion in the cavity
  shadow(back, 650, 470, 420, 130, 0.35);
  await back.writeAsync("box-back.png");

  // ---------- BOX FRONT (front wall / rim that overlaps the food base) ----------
  const front = new Jimp(W, H, 0x00000000);
  quad(front, [[286,650],[1014,650],[1000,540],[300,540]], KL, KM, 7);      // front wall top band (rim, lit)
  quad(front, [[286,650],[1014,650],[1022,775],[278,775]], KM, KD, 7);       // front wall body
  // rim highlight
  quad(front, [[300,548],[1000,548],[1000,560],[300,560]], [225,180,120], [210,160,100], 3);
  shadow(front, 650, 775, 470, 40, 0.5);                                     // contact shadow under box
  await front.writeAsync("box-front.png");

  // ---------- BOX LID (folds down to close) ----------
  const lidW = 760, lidH = 250;
  const lid = new Jimp(lidW, lidH, 0x00000000);
  quad(lid, [[0,0],[lidW,0],[lidW,lidH],[0,lidH]], KL, KM, 7);
  // crease + edge shading
  quad(lid, [[0,lidH-14],[lidW,lidH-14],[lidW,lidH],[0,lidH]], KD, KDK, 4);
  // subtle embossed wordmark (low-contrast)
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const stamp = new Jimp(lidW, lidH, 0x00000000);
  stamp.print(font, 0, lidH/2-24, { text: "GOAT BURGER CO.", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, lidW);
  stamp.opacity(0.16); lid.composite(stamp, 0, 0);
  await lid.writeAsync("box-lid.png");

  // ---------- feather the fries/shake cutouts so their backgrounds vanish ----------
  const feather = (img, inner, outer) => {
    const w = img.bitmap.width, h = img.bitmap.height, d = img.bitmap.data, hw = w/2, hh = h/2;
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){
      const dx=(x-hw)/hw, dy=(y-hh)/hh, dist=Math.sqrt(dx*dx+dy*dy);
      let a=(outer-dist)/(outer-inner); a=a<0?0:a>1?1:a;
      const i=(y*w+x)*4; d[i+3]=Math.round(d[i+3]*a);
    }
  };
  const friesF = await Jimp.read("fries.png"); feather(friesF, 0.58, 1.02); await friesF.writeAsync("fries.png");
  const shakeF = await Jimp.read("shake.png"); feather(shakeF, 0.5, 1.0);  await shakeF.writeAsync("shake.png");

  // ---------- PREVIEW: food packed inside ----------
  const prev = new Jimp(W, H, 0x0d0c0bff);
  prev.composite(back, 0, 0);
  const burger = (await Jimp.read("burger-cut.png")).resize(Jimp.AUTO, 320);
  const fries  = (await Jimp.read("fries.png")).resize(Jimp.AUTO, 300);
  const shake  = (await Jimp.read("shake.png")).resize(Jimp.AUTO, 330);
  const sauce  = (await Jimp.read("sauce.png")).resize(160, Jimp.AUTO);
  prev.composite(fries,  300, 330);
  prev.composite(burger, 540, 300);
  prev.composite(shake,  770, 300);
  prev.composite(sauce,  600, 540);
  prev.composite(front, 0, 0);
  await prev.writeAsync("debug-packed.png");
  console.log(JSON.stringify({ back:"box-back.png", front:"box-front.png", lid:lidW+"x"+lidH, preview:"debug-packed.png" }));
})().catch(e => console.error("ERR", e.message));
