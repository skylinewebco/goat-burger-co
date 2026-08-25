/* Extract the 6 real ingredient layers from the GOAT BURGER CO. breakdown sheet.
   Fixed windows at each layer's position; black background keyed out + autocrop. */
const Jimp = require("jimp");
const LUM = (r,g,b) => 0.299*r + 0.587*g + 0.114*b;
const X0 = 600, X1 = 963;

// name, y0, y1  (top -> bottom; sauce/onions/pickles intentionally skipped)
const WIN = [
  ["topbun",    78, 205],
  ["cheeseA",  448, 545],
  ["pattyA",   548, 645],
  ["cheeseB",  650, 728],
  ["pattyB",   735, 840],
  ["bottombun",848, 972],
];

Jimp.read("ref-breakdown.png").then(async (img) => {
  const results = [];
  for (const [name, y0, y1] of WIN){
    const sub = img.clone().crop(X0, y0, X1-X0, y1-y0);
    const sw=sub.bitmap.width, sh=sub.bitmap.height, sd=sub.bitmap.data;
    // key black background → alpha
    for (let p=0;p<sw*sh;p++){ const i=p*4; const l=LUM(sd[i],sd[i+1],sd[i+2]);
      let a=(l-24)/(58-24); a=a<0?0:a>1?1:a; sd[i+3]=Math.round(a*255); }
    // autocrop to opaque content
    let minX=sw,minY=sh,maxX=0,maxY=0;
    for (let y=0;y<sh;y++) for (let x=0;x<sw;x++){ if (sd[(y*sw+x)*4+3]>50){
      if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; } }
    const cw=maxX-minX+1, ch=maxY-minY+1;
    const out=sub.crop(minX,minY,cw,ch);
    await out.writeAsync(name+".png");
    results.push({name, size:cw+"x"+ch});
  }
  console.log(JSON.stringify(results));

  // montage on dark for inspection
  const pics = await Promise.all(WIN.map(([n])=>Jimp.read(n+".png")));
  const maxW = Math.max(...pics.map(p=>p.bitmap.width));
  const gap=20; let totH=gap; pics.forEach(p=>totH+=p.bitmap.height+gap);
  const M = new Jimp(maxW+40, totH, 0x0d0c0bff);
  let y=gap; for (const p of pics){ M.composite(p, (maxW+40-p.bitmap.width)/2, y); y+=p.bitmap.height+gap; }
  await M.writeAsync("debug-layers.png");
  console.log("montage done", (maxW+40)+"x"+totH);
}).catch(e=>console.error("ERR", e.message));
