/* Turn the provided branded assets into web-ready files:
   - menu-*.jpg  : optimized card images (used as-is on the dark cards)
   - burger/fries/shake .png : edge-feathered cutouts for the packing box scene
   - goat-mark.png : gold goat logo cropped for the box branding */
const Jimp = require("jimp");

// fade alpha within the outer `m` fraction of each edge (keeps centred subject,
// dissolves the black photo border so it blends into the dark box floor)
function edgeFeather(img, m) {
  const w = img.bitmap.width, h = img.bitmap.height, d = img.bitmap.data;
  const mx = w * m, my = h * m;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = Math.min(1, Math.min(x, w - 1 - x) / mx);
    const fy = Math.min(1, Math.min(y, h - 1 - y) / my);
    const a = Math.min(fx, fy);
    const i = (y * w + x) * 4; d[i + 3] = Math.round(d[i + 3] * a);
  }
}
const cropFrac = (img, x0, y0, x1, y1) => {
  const w = img.bitmap.width, h = img.bitmap.height;
  return img.clone().crop(Math.round(x0*w), Math.round(y0*h), Math.round((x1-x0)*w), Math.round((y1-y0)*h));
};

(async () => {
  // ---------- MENU CARD IMAGES (optimized JPEGs, already on black) ----------
  const mkMenu = async (src, out, wdt) => {
    const im = await Jimp.read(src); im.resize(wdt, Jimp.AUTO); await im.quality(82).writeAsync(out);
    return out + " " + im.bitmap.width + "x" + im.bitmap.height;
  };
  const m1 = await mkMenu("asset-6.png", "menu-burger.jpg", 1050);
  const m2 = await mkMenu("asset-4.png", "menu-fries.jpg", 1050);
  const m3 = await mkMenu("asset-5.png", "menu-shake.jpg", 900);
  const m4 = await mkMenu("asset-2.png", "menu-combo.jpg", 1400);

  // ---------- BOX-SCENE FOOD (feathered cutouts of the branded items) ----------
  // burger: fills the square frame
  let burger = cropFrac(await Jimp.read("asset-6.png"), 0.04, 0.03, 0.96, 0.99);
  edgeFeather(burger, 0.10); await burger.writeAsync("burger.png");
  // fries box: centred column
  let fries = cropFrac(await Jimp.read("asset-4.png"), 0.24, 0.02, 0.76, 1.0);
  edgeFeather(fries, 0.10); await fries.writeAsync("fries.png");
  // shake cup: centred column
  let shake = cropFrac(await Jimp.read("asset-5.png"), 0.18, 0.02, 0.82, 0.99);
  edgeFeather(shake, 0.10); await shake.writeAsync("shake.png");

  // ---------- GOLD GOAT MARK for the box branding (from the fries box logo) ----------
  let mark = cropFrac(await Jimp.read("asset-4.png"), 0.30, 0.66, 0.70, 0.92);
  await mark.writeAsync("goat-mark.png");

  console.log(JSON.stringify({ menus:[m1,m2,m3,m4],
    box:{ burger:burger.bitmap.width+"x"+burger.bitmap.height, fries:fries.bitmap.width+"x"+fries.bitmap.height, shake:shake.bitmap.width+"x"+shake.bitmap.height },
    mark:mark.bitmap.width+"x"+mark.bitmap.height }));
})().catch(e => console.error("ERR", e.message));
