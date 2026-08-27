/* Render the GOAT BURGER CO. branded takeaway box (black + gold, matches asset-1):
   box-back.png  = gold open-lid backdrop (with logo) + black interior floor  (BEHIND food)
   box-front.png = black front wall with the gold wordmark                    (IN FRONT of food base)
   box-lid.png   = black lid with the gold logo (folds down to close) */
const Jimp = require("jimp");
const W = 1400, H = 1000;
const rnd = a => (Math.random()*2-1)*a;

function quad(img, p, cTop, cBot, grain=6){
  const xs=p.map(q=>q[0]), ys=p.map(q=>q[1]);
  const x0=Math.max(0,Math.floor(Math.min(...xs))), x1=Math.min(img.bitmap.width-1,Math.ceil(Math.max(...xs)));
  const y0=Math.max(0,Math.floor(Math.min(...ys))), y1=Math.min(img.bitmap.height-1,Math.ceil(Math.max(...ys)));
  const yTop=Math.min(...ys), yBot=Math.max(...ys);
  const inTri=(px,py,a,b,c)=>{const d1=(px-b[0])*(a[1]-b[1])-(a[0]-b[0])*(py-b[1]);const d2=(px-c[0])*(b[1]-c[1])-(b[0]-c[0])*(py-c[1]);const d3=(px-a[0])*(c[1]-a[1])-(c[0]-a[0])*(py-a[1]);const neg=(d1<0)||(d2<0)||(d3<0),pos=(d1>0)||(d2>0)||(d3>0);return !(neg&&pos);};
  const d=img.bitmap.data,w=img.bitmap.width;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    if(!(inTri(x,y,p[0],p[1],p[2])||inTri(x,y,p[0],p[2],p[3])))continue;
    const t=(y-yTop)/(yBot-yTop+1e-6);
    const r=cTop[0]+(cBot[0]-cTop[0])*t+rnd(grain), g=cTop[1]+(cBot[1]-cTop[1])*t+rnd(grain), b=cTop[2]+(cBot[2]-cTop[2])*t+rnd(grain);
    const i=(y*w+x)*4; d[i]=Math.max(0,Math.min(255,r));d[i+1]=Math.max(0,Math.min(255,g));d[i+2]=Math.max(0,Math.min(255,b));d[i+3]=255;
  }
}
function shadow(img,cx,cy,rx,ry,al){const d=img.bitmap.data,w=img.bitmap.width,h=img.bitmap.height;
  for(let y=Math.max(0,cy-ry);y<Math.min(h,cy+ry);y++)for(let x=Math.max(0,cx-rx);x<Math.min(w,cx+rx);x++){
    const dx=(x-cx)/rx,dy=(y-cy)/ry,tt=dx*dx+dy*dy;if(tt<1){const a=al*(1-tt);const i=(y*w+x)*4;d[i]*=(1-a);d[i+1]*=(1-a);d[i+2]*=(1-a);}}}

const BLK=[22,18,14], BLKD=[10,8,6], BLKL=[38,31,24];
const GOLD=[201,150,46], GOLDL=[228,186,88], GOLDD=[140,104,30];

(async()=>{
  const mark = await Jimp.read("goat-mark.png");                 // gold logo on black
  // black silhouette version of the logo (for the gold backdrop)
  const markDark = mark.clone();
  { const d=markDark.bitmap.data,n=markDark.bitmap.width*markDark.bitmap.height;
    for(let p=0;p<n;p++){const i=p*4;const l=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
      if(l>55){d[i]=26;d[i+1]=20;d[i+2]=12;d[i+3]=255;} else {d[i+3]=0;} } }

  // ---------- BOX BACK: black interior (so the black-backed food blends) ----------
  const back=new Jimp(W,H,0x00000000);
  // raised back wall (the open lid, seen edge-on) — black with a thin gold rim
  quad(back, [[150,60],[1250,60],[1210,470],[190,470]], BLKL, BLK, 5);
  quad(back, [[150,60],[1250,60],[1250,74],[150,74]], GOLDD, GOLDD, 2);   // top gold rim of the raised lid
  // black interior floor (food sits here)
  quad(back, [[190,860],[1210,860],[1080,470],[320,470]], BLK, BLKD, 5);
  // black side walls
  quad(back, [[190,860],[320,470],[300,430],[170,760]], BLKD, BLK, 4);
  quad(back, [[1210,860],[1080,470],[1100,430],[1230,760]], BLKD, BLK, 4);
  shadow(back, 700, 500, 540, 130, 0.45);                                  // cavity occlusion
  // subtle gold goat emblem on the back wall (behind the food)
  const md = mark.clone().resize(360, Jimp.AUTO); md.opacity(0.5);
  back.composite(md, (W-md.bitmap.width)/2, 150);
  await back.writeAsync("box-back.png");

  // ---------- BOX FRONT: black front wall + gold wordmark ----------
  const front=new Jimp(W,H,0x00000000);
  quad(front, [[150,700],[1250,700],[1290,880],[110,880]], BLKL, BLK, 6);   // front wall (lit top edge)
  quad(front, [[110,880],[1290,880],[1300,990],[100,990]], BLK, BLKD, 6);   // lower front
  // gold hairline
  quad(front, [[150,706],[1250,706],[1250,712],[150,712]], GOLDL, GOLD, 2);
  const mf = mark.clone().resize(430, Jimp.AUTO);
  front.composite(mf, (W-mf.bitmap.width)/2, 748);
  shadow(front, 700, 985, 560, 34, 0.5);
  await front.writeAsync("box-front.png");

  // ---------- BOX LID: black lid with gold logo (folds to close) ----------
  const lidW=1180, lidH=360;
  const lid=new Jimp(lidW,lidH,0x00000000);
  quad(lid, [[0,0],[lidW,0],[lidW,lidH],[0,lidH]], BLKL, BLK, 6);
  quad(lid, [[0,0],[lidW,0],[lidW,14],[0,14]], GOLDL, GOLDD, 2);            // rim
  const ml = mark.clone().resize(480, Jimp.AUTO);
  lid.composite(ml, (lidW-ml.bitmap.width)/2, (lidH-ml.bitmap.height)/2);
  await lid.writeAsync("box-lid.png");

  // ---------- PREVIEW: packed ----------
  const prev=new Jimp(W,H,0x08070699|0x000000ff); // dark
  prev.composite(back,0,0);
  const bg=(await Jimp.read("burger.png")).resize(Jimp.AUTO,360);
  const fr=(await Jimp.read("fries.png")).resize(Jimp.AUTO,360);
  const sh=(await Jimp.read("shake.png")).resize(Jimp.AUTO,400);
  prev.composite(fr, 250, 470);
  prev.composite(bg, 560, 470);
  prev.composite(sh, 930, 430);
  prev.composite(front,0,0);
  await prev.writeAsync("debug-packed.png");
  console.log(JSON.stringify({back:"1400x1000",front:"1400x1000",lid:lidW+"x"+lidH}));
})().catch(e=>console.error("ERR",e.message));
