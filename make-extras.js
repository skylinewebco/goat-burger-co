/* 1) menu-burger.jpg  — the real burger on the card's dark background (small, fast,
      fixes the missing mobile GOAT Signature image; matches the desktop card look).
   2) sauce.png        — a sauce cup cut from the provided fries photo (for packing). */
const Jimp = require("jimp");
const LUM = (r,g,b)=>0.299*r+0.587*g+0.114*b;

(async()=>{
  // ---------- menu-burger.jpg ----------
  const CW=1200, CH=900;
  const card=new Jimp(CW,CH,0x000000ff);
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){
    const dx=(x-CW*0.5)/CW, dy=(y-CH*0.42)/CH, dist=Math.sqrt(dx*dx+dy*dy);
    const t=Math.min(1,dist*1.35);
    const r=Math.round(0x2a*(1-t)+0x14*t), g=Math.round(0x26*(1-t)+0x12*t), b=Math.round(0x22*(1-t)+0x10*t);
    const i=(y*CW+x)*4; card.bitmap.data[i]=r;card.bitmap.data[i+1]=g;card.bitmap.data[i+2]=b;
  }
  const burger=(await Jimp.read("burger-cut.png")).resize(Jimp.AUTO, 840);
  // soft contact shadow
  const sc=Math.round(CH*0.86), scx=Math.round(CW*0.5);
  for(let y=sc-40;y<sc+40;y++)for(let x=scx-360;x<scx+360;x++){
    if(x<0||y<0||x>=CW||y>=CH)continue;const dx=(x-scx)/360,dy=(y-sc)/40,tt=dx*dx+dy*dy;
    if(tt<1){const a=0.5*(1-tt);const i=(y*CW+x)*4;
      card.bitmap.data[i]=Math.round(card.bitmap.data[i]*(1-a));card.bitmap.data[i+1]=Math.round(card.bitmap.data[i+1]*(1-a));card.bitmap.data[i+2]=Math.round(card.bitmap.data[i+2]*(1-a));}}
  card.composite(burger, Math.round(CW*0.5-burger.bitmap.width*0.5), Math.round(CH*0.5-burger.bitmap.height*0.5)+10);
  await card.quality(86).writeAsync("menu-burger.jpg");

  // ---------- sauce.png ----------
  const fr=await Jimp.read("menu-fries.jpg");
  const W=fr.bitmap.width,H=fr.bitmap.height;
  // the cheese-sauce cup sits bottom-centre of the fries photo
  let cup=fr.clone().crop(Math.round(W*0.28), Math.round(H*0.60), Math.round(W*0.50), Math.round(H*0.34));
  const cw=cup.bitmap.width, ch=cup.bitmap.height, d=cup.bitmap.data, cx=cw/2, cy=ch*0.5, rad=Math.min(cw,ch)*0.52;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    const dx=x-cx, dy=(y-cy)*(cw/ch), dist=Math.sqrt(dx*dx+dy*dy);
    let a=(rad-dist)/(rad*0.18); a=a<0?0:a>1?1:a;          // circular feather → round cup
    const i=(y*cw+x)*4; d[i+3]=Math.round(d[i+3]*a);
  }
  await cup.writeAsync("sauce.png");

  console.log(JSON.stringify({menuBurger:CW+"x"+CH, burgerH:burger.bitmap.height, sauce:cw+"x"+ch}));
})().catch(e=>console.error("ERR",e.message));
