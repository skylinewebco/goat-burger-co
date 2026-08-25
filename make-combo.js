/* Cut out fries + shake from the provided photos (dark bg keyed), then compose
   a premium GOAT BURGER CO combo meal (burger + fries + shake) on a dark set. */
const Jimp = require("jimp");
const LUM = (r,g,b)=>0.299*r+0.587*g+0.114*b;

function keyDark(img, lo, hi){
  const d=img.bitmap.data, n=img.bitmap.width*img.bitmap.height;
  for(let p=0;p<n;p++){ const i=p*4; let a=(LUM(d[i],d[i+1],d[i+2])-lo)/(hi-lo);
    a=a<0?0:a>1?1:a; d[i+3]=Math.round(a*255); }
}
function largestBlob(img){
  const w=img.bitmap.width,h=img.bitmap.height,d=img.bitmap.data;
  const bg=new Uint8Array(w*h); for(let p=0;p<w*h;p++) bg[p]=d[p*4+3]<40?1:0;
  const lab=new Int32Array(w*h); let best=0,bs=0,cur=0;const sx=[],sy=[];
  for(let p0=0;p0<w*h;p0++){ if(bg[p0]||lab[p0])continue; cur++;let sz=0;sx.length=0;sy.length=0;
    sx.push(p0%w);sy.push((p0/w)|0);lab[p0]=cur;
    while(sx.length){const x=sx.pop(),y=sy.pop();sz++;
      const nb=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
      for(const[nx,ny]of nb){if(nx<0||ny<0||nx>=w||ny>=h)continue;const np=ny*w+nx;
        if(!bg[np]&&!lab[np]){lab[np]=cur;sx.push(nx);sy.push(ny);}}}
    if(sz>bs){bs=sz;best=cur;}}
  for(let p=0;p<w*h;p++) if(!bg[p]&&lab[p]!==best) d[p*4+3]=0;
}
function autocrop(img){
  const w=img.bitmap.width,h=img.bitmap.height,d=img.bitmap.data;
  const rowN=new Array(h).fill(0),colN=new Array(w).fill(0);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>50){rowN[y]++;colN[x]++;}
  let minX=w,minY=h,maxX=0,maxY=0;const R=8;
  for(let y=0;y<h;y++)if(rowN[y]>R){if(y<minY)minY=y;if(y>maxY)maxY=y;}
  for(let x=0;x<w;x++)if(colN[x]>R){if(x<minX)minX=x;if(x>maxX)maxX=x;}
  return img.crop(minX,minY,maxX-minX+1,maxY-minY+1);
}

(async()=>{
  // ---- FRIES cutout (bright food on dark tray) ----
  let fr = await Jimp.read("menu-fries.jpg");
  keyDark(fr, 40, 74); largestBlob(fr); fr = autocrop(fr);
  await fr.writeAsync("fries.png");

  // ---- SHAKE cutout (crop to the jar, key the dark teal bg) ----
  let sh0 = await Jimp.read("menu-shake.jpg");
  const W=sh0.bitmap.width,H=sh0.bitmap.height;
  let sh = sh0.clone().crop(Math.round(W*0.22),Math.round(H*0.20),Math.round(W*0.56),Math.round(H*0.70));
  keyDark(sh, 46, 84); largestBlob(sh); sh = autocrop(sh);
  await sh.writeAsync("shake.png");

  // ---- BURGER assembled from the 6 real layers (transparent) ----
  const NAMES=["topbun","cheeseA","pattyA","cheeseB","pattyB","bottombun"];
  const pics=await Promise.all(NAMES.map(n=>Jimp.read(n+".png")));
  const BW=360; pics.forEach(p=>p.resize(BW,Jimp.AUTO));
  const hs=pics.map(p=>p.bitmap.height); const OV=0.42; const tops=[]; let y=0;
  for(let i=0;i<pics.length;i++){ if(i===0)tops.push(0);
    else{const ov=Math.min(hs[i-1],hs[i])*OV; y=tops[i-1]+hs[i-1]-ov; tops.push(y);} }
  const bH=Math.round(tops[tops.length-1]+hs[hs.length-1]);
  const burger=new Jimp(BW,bH,0x00000000);
  for(let i=0;i<pics.length;i++) burger.composite(pics[i],0,Math.round(tops[i]));

  // ---- COMBO canvas (dark set; photos feather into it seamlessly) ----
  const CW=1280, CH=820;
  const C=new Jimp(CW,CH,0x000000ff);
  for(let yy=0;yy<CH;yy++)for(let xx=0;xx<CW;xx++){
    const cx=(xx-CW*0.5)/CW, cy=(yy-CH*0.40)/CH;
    const glow=Math.max(0,1-Math.sqrt(cx*cx+cy*cy)*1.9);
    let r=14+glow*20, g=13+glow*15, b=12+glow*9;   // deep warm-dark, subtle center light
    const i=(yy*CW+xx)*4; C.bitmap.data[i]=r;C.bitmap.data[i+1]=g;C.bitmap.data[i+2]=b;
  }
  // radial feather: fade a photo's rectangular edges to transparent so its dark
  // background merges into the canvas (no hard seams)
  const feather=(img, inner, outer)=>{
    const w=img.bitmap.width,h=img.bitmap.height,d=img.bitmap.data,hw=w/2,hh=h/2;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const dx=(x-hw)/hw, dy=(y-hh)/hh, dist=Math.sqrt(dx*dx+dy*dy);
      let a=(outer-dist)/(outer-inner); a=a<0?0:a>1?1:a;
      const i=(y*w+x)*4; d[i+3]=Math.round(d[i+3]*a);
    }
  };
  const ellShadow=(cx,cy,rx,ry,al)=>{ for(let yy=Math.max(0,cy-ry);yy<Math.min(CH,cy+ry|0);yy++)
    for(let xx=Math.max(0,cx-rx);xx<Math.min(CW,cx+rx|0);xx++){
      const dx=(xx-cx)/rx,dy=(yy-cy)/ry,t=dx*dx+dy*dy; if(t<1){const a=al*(1-t)*(1-t);
        const i=(yy*CW+xx)*4; C.bitmap.data[i]=Math.round(C.bitmap.data[i]*(1-a));
        C.bitmap.data[i+1]=Math.round(C.bitmap.data[i+1]*(1-a)); C.bitmap.data[i+2]=Math.round(C.bitmap.data[i+2]*(1-a)); } } };

  // use the ORIGINAL photos (rich detail) feathered into the dark set
  let frs=(await Jimp.read("menu-fries.jpg")).resize(560,Jimp.AUTO); feather(frs,0.55,1.02);
  let shk=(await Jimp.read("menu-shake.jpg")).resize(Jimp.AUTO,660);  feather(shk,0.5,0.98);
  const bg=(await Jimp.read("burger-cut.png")).resize(440,Jimp.AUTO); // clean single burger cutout

  const base=628;
  const frX=40,  frY=base-frs.bitmap.height+70;
  const shX=CW-shk.bitmap.width-40, shY=base-shk.bitmap.height+70;
  const bgX=Math.round(CW*0.5-bg.bitmap.width*0.5), bgY=base-bg.bitmap.height+20;

  ellShadow((frX+frs.bitmap.width*0.5)|0, base+4, (frs.bitmap.width*0.4)|0, 40, 0.5);
  ellShadow((shX+shk.bitmap.width*0.5)|0, base+4, (shk.bitmap.width*0.42)|0, 38, 0.5);
  C.composite(frs, frX, frY);
  C.composite(shk, shX, shY);
  ellShadow((bgX+bg.bitmap.width*0.5)|0, base+8, (bg.bitmap.width*0.5)|0, 46, 0.6);
  C.composite(bg,  bgX, bgY);

  await C.quality(90).writeAsync("menu-combo.jpg");
  console.log(JSON.stringify({fries:fr.bitmap.width+"x"+fr.bitmap.height,
    shake:sh.bitmap.width+"x"+sh.bitmap.height, burger:BW+"x"+bH, combo:CW+"x"+CH}));
})().catch(e=>console.error("ERR",e.message));
