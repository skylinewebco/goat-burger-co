/* Stack the 6 extracted layers into an assembled burger to tune vertical offsets.
   Prints each layer's display height and the running centers so I can reuse them
   as the assembled stack offsets in the website. */
const Jimp = require("jimp");
const NAMES = ["topbun","cheeseA","pattyA","cheeseB","pattyB","bottombun"];
const WDISP = 360;                     // display width (all layers same width)
const OVERLAP = 0.42;                  // fraction of the smaller edge to overlap

Jimp.read("ref-breakdown.png").then(async () => {
  const pics = await Promise.all(NAMES.map(n=>Jimp.read(n+".png")));
  pics.forEach(p=>p.resize(WDISP, Jimp.AUTO));
  const hs = pics.map(p=>p.bitmap.height);
  // running top positions with overlap
  const tops=[]; let y=0;
  for (let i=0;i<pics.length;i++){
    if (i===0) tops.push(0);
    else { const ov = Math.min(hs[i-1],hs[i])*OVERLAP; y = tops[i-1]+hs[i-1]-ov; tops.push(y); }
  }
  const totalH = tops[tops.length-1]+hs[hs.length-1];
  const centers = tops.map((t,i)=>Math.round(t+hs[i]/2));
  const mid = totalH/2;
  const offsets = centers.map(c=>Math.round(c-mid));   // center-relative offsets
  console.log(JSON.stringify({heights:hs, centersFromMid:offsets, totalH:Math.round(totalH)}));

  const canvasH = Math.round(totalH)+80;
  const C = new Jimp(WDISP+120, canvasH, 0x0d0c0bff);
  for (let i=0;i<pics.length;i++) C.composite(pics[i], 60, 40+tops[i]);
  await C.writeAsync("debug-assembled.png");
  console.log("assembled preview", (WDISP+120)+"x"+canvasH);
}).catch(e=>console.error("ERR", e.message));
