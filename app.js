/* =========================================================
   GOAT BURGER CO. — scroll-scrubbed product film
   One continuous camera. Scroll IS the timeline.
   The burger separates layer-by-layer and reassembles.
   ========================================================= */
(function () {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover:none),(pointer:coarse)").matches;
  gsap.registerPlugin(ScrollTrigger);

  /* ---- performance config (no visual change) ----
     force3D promotes every transform to a GPU layer (translate3d);
     limitCallbacks trims callback churn; ignoreMobileResize stops the
     mobile URL-bar show/hide from thrashing ScrollTrigger refreshes. */
  gsap.config({ force3D: true });
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });

  const camera = document.getElementById("camera");
  const burger = document.getElementById("burger");
  const glow = document.getElementById("glow");
  const shadow = document.getElementById("shadow");
  const nutri = document.getElementById("nutrition");
  const captionsEl = document.getElementById("captions");
  const hint = document.getElementById("hint");
  const layerEls = gsap.utils.toArray(".layer");
  // the ACTUAL layers of the real double smash cheeseburger, top -> bottom
  const order = ["topbun","cheeseA","pattyA","cheeseB","pattyB","bottombun"];
  const spreadF = (k) => order.indexOf(k) - (order.length - 1) / 2;   // centred

  /* ---- editorial captions — each matches the real layer being revealed ---- */
  const CAPS = {
    hero:      { hero:true, idx:"GOAT BURGER CO.", title:'BIG FLAVOR.<br><span class="g">ZERO COMPROMISE.</span>', lead:"A double smash cheeseburger, deconstructed. Scroll to play the film." },
    topbun:    { idx:"01 / TOP BUN", title:"GLAZED<br>BRIOCHE", lines:["Toasted","Buttery","Glossy"] },
    cheeseA:   { idx:"02 / MELTED CHEESE", title:"MOLTEN<br>CHEESE", lines:["American","Dripping","Rich"] },
    pattyA:    { idx:"03 / BEEF PATTY", title:'SMASHED<br><span class="g">BEEF</span>', lines:["100% beef","Crispy edges","Seared"] },
    cheeseB:   { idx:"04 / DOUBLE CHEESE", title:"MORE<br>CHEESE", lines:["Second slice","Gooey","Melted"] },
    pattyB:    { idx:"05 / SECOND PATTY", title:'STACKED<br><span class="g">BEEF</span>', lines:["Smashed","Juicy","Charred"] },
    bottombun: { idx:"06 / BOTTOM BUN", title:"TOASTED<br>BASE", lines:["Griddled","Sturdy","Soft"] },
    seven:     { hero:true, idx:"THE FULL STACK", title:'TWO PATTIES,<br>DOUBLE <span class="g">CHEESE</span>', lead:"Every layer, laid bare." },
    goat:      { hero:true, idx:"THE GOAT IS READY", title:'BIG FLAVOR.<br><span class="g">ZERO COMPROMISE.</span>', lead:"Scroll on to order." },
  };
  const capNodes = {};
  Object.entries(CAPS).forEach(([key, c]) => {
    const el = document.createElement("div");
    el.className = "cap" + (c.hero ? " cap--hero" : "");
    el.innerHTML =
      `<span class="cap__idx">${c.idx}</span>` +
      `<h2 class="cap__title">${c.title}</h2>` +
      (c.lead ? `<p class="lead">${c.lead}</p>` : "") +
      (c.lines ? `<div class="cap__lines">${c.lines.map(l=>`<span>${l}</span>`).join("")}</div>` : "");
    captionsEl.appendChild(el);
    capNodes[key] = el;
  });

  const mm = gsap.matchMedia();
  mm.add({ isDesktop:"(min-width:641px)", isMobile:"(max-width:640px)" }, (ctx) => {
    const { isDesktop } = ctx.conditions;
    const H = (document.getElementById("camera").offsetHeight) || (isDesktop ? 520 : 320);
    const SPREAD = H * 0.30;   // exploded gap between layer centres
    // assembled stack offsets (fraction of camera height) — tuned so the real
    // ingredient cutouts overlap into a believable double cheeseburger.
    const STACKF = { topbun:-0.321, cheeseA:-0.178, pattyA:-0.059, cheeseB:0.059, pattyB:0.181, bottombun:0.323 };
    const stackY = (key) => STACKF[key] * H;
    burger.style.setProperty("--bx", isDesktop ? "9%" : "0%");

    const panY = (key, scale) => -(spreadF(key) * SPREAD * scale);
    const beats = [
      { cam:{s:1.00, r:-3, y:0,          g:1.0 }, mode:"stack", focus:null,       cap:"hero"  },
      { cam:{s:1.14, r: 9, y:0,          g:1.1 }, mode:"stack", focus:null,       cap:null    },
      { cam:{s:1.32, r: 4, y:panY("topbun",1.32),    g:.9 }, mode:"full", focus:"topbun",    cap:"topbun" },
      { cam:{s:1.34, r:-3, y:panY("cheeseA",1.34),   g:.95}, mode:"full", focus:"cheeseA",   cap:"cheeseA" },
      { cam:{s:1.46, r: 3, y:panY("pattyA",1.46),    g:1.1}, mode:"full", focus:"pattyA",    cap:"pattyA" },
      { cam:{s:1.34, r:-2, y:panY("cheeseB",1.34),   g:.95}, mode:"full", focus:"cheeseB",   cap:"cheeseB" },
      { cam:{s:1.46, r: 3, y:panY("pattyB",1.46),    g:1.1}, mode:"full", focus:"pattyB",    cap:"pattyB" },
      { cam:{s:1.30, r:-4, y:panY("bottombun",1.30), g:.9 }, mode:"full", focus:"bottombun", cap:"bottombun" },
      { cam:{s:0.66, r:-4, y:0,          g:1.15}, mode:"full", focus:null,       cap:"seven" },
      { cam:{s:0.60, r: 0, y:0,          g:.5 }, mode:"full", focus:null,       cap:null, nutri:1 },
      { cam:{s:1.00, r: 0, y:0,          g:1.0 }, mode:"stack", focus:null,       cap:"goat"  },
      { cam:{s:1.03, r: 0, y:0,          g:1.05}, mode:"stack", focus:null,       cap:"goat"  },
    ];

    function layerState(key, beat){
      const y = beat.mode === "full" ? spreadF(key) * SPREAD : stackY(key);
      let s = 1, o = 1, blur = 0;
      if (beat.focus){
        const active = beat.focus === key;
        s = active ? 1.14 : 0.9;
        o = active ? 1 : 0.28;
        blur = active ? 0 : 3;
      }
      return { y, s, o, blur };
    }

    gsap.set(camera, { scale:beats[0].cam.s, rotation:beats[0].cam.r, y:beats[0].cam.y });
    gsap.set(glow, { scale:beats[0].cam.g, opacity:.9 });
    layerEls.forEach((layer)=>{
      const st = layerState(layer.dataset.key, beats[0]);
      gsap.set(layer, { y:st.y, scale:st.s, autoAlpha:1, filter:"blur(0px)" });
    });
    gsap.set(nutri, { autoAlpha:0 });
    Object.values(capNodes).forEach(n=>gsap.set(n,{ autoAlpha:0, y:24 }));
    gsap.set(capNodes.hero, { autoAlpha:1, y:0 });

    const tl = gsap.timeline({
      defaults:{ ease:"none" },
      scrollTrigger:{ trigger:"#track", start:"top top", end:"bottom bottom",
        scrub: reduced ? true : 0.6, invalidateOnRefresh: true },
    });

    for (let i = 1; i < beats.length; i++){
      const b = beats[i], t = i - 1, dur = (i === beats.length-1) ? 0.6 : 1;
      tl.to(camera, { scale:b.cam.s, rotation:b.cam.r, y:b.cam.y, duration:dur }, t);
      tl.to(glow,   { scale:b.cam.g, opacity: b.nutri ? .4 : .9, duration:dur }, t);
      tl.to(shadow, { scaleX: b.mode==="full"?1.25:1, opacity: b.cam.s<0.8?.35:.7, duration:dur }, t);
      layerEls.forEach((layer)=>{
        const st = layerState(layer.dataset.key, b);
        tl.to(layer, { y:st.y, scale:st.s, autoAlpha:st.o, filter:`blur(${st.blur}px)`, duration:dur }, t);
      });
      tl.to(nutri, { autoAlpha: b.nutri ? 1 : 0, duration:dur*0.7 }, t + dur*0.15);
    }

    const capSeq = beats.map(b=>b.cap);
    let lastCap = "hero";
    capSeq.forEach((cap, i)=>{
      if (cap && cap !== lastCap){
        if (capNodes[lastCap]) tl.to(capNodes[lastCap], { autoAlpha:0, y:-18, duration:.5 }, Math.max(0, i-0.5));
        tl.fromTo(capNodes[cap], { autoAlpha:0, y:24 }, { autoAlpha:1, y:0, duration:.5 }, Math.max(0, i-0.5));
        lastCap = cap;
      }
    });

    /* =========================================================
       MEAL PACKING — continues the SAME scrubbed timeline after the
       burger reassembles: form the combo → open box → items enter → box closes.
       (real fries/shake/sauce photos + a CSS kraft box; scroll-controlled, reversible)
       ========================================================= */
    const boxBack=document.getElementById("boxBack"), boxFront=document.getElementById("boxFront"),
      boxLid=document.getElementById("boxLid"),
      pBurger=document.getElementById("pBurger"),
      pFries=document.getElementById("pFries"), pShake=document.getElementById("pShake");

    // box display geometry (matches CSS width; branded box image aspect 1400x1000)
    const BW = Math.min(window.innerWidth * (isDesktop ? 0.88 : 0.97), 1000);
    const BH = BW * 1000 / 1400;
    // size the branded food to real proportions of the box
    pBurger.style.height = (0.40 * BH) + "px";
    pFries.style.height  = (0.40 * BH) + "px";
    pShake.style.height  = (0.46 * BH) + "px";

    // settled positions inside the box (from the packed-box render)
    const S = {
      burger:{ x: 0,          y: BH*0.16 },
      fries: { x:-BW*0.245,   y: BH*0.15 },
      shake: { x: BW*0.245,   y: BH*0.12 },
    };

    // initial: everything hidden; box below with the branded lid folded open
    gsap.set([pBurger,pFries,pShake], { autoAlpha:0 });
    gsap.set(pBurger, { x:0, y:-BH*0.55, scale:1.25 });
    gsap.set(pFries,  { x:-BW*0.85, y:S.fries.y, rotation:-5 });
    gsap.set(pShake,  { x: BW*0.85, y:S.shake.y, rotation:5 });
    gsap.set([boxBack,boxFront], { autoAlpha:0, y:BH*1.15 });
    gsap.set(boxLid, { autoAlpha:0, y:-BH*0.34, rotationX:-105, transformPerspective:1000 });

    const cap = capNodes.goat, P = tl.duration();   // anchor right after the film ends
    if (cap) tl.to(cap, { autoAlpha:0, y:-18, duration:.4 }, P);

    // 0 — hand-off: the deconstructed burger reassembles then CROSSFADES into the
    //     branded GOAT burger (same spot, same size) so it feels like one object
    tl.to(camera,  { autoAlpha:0, scale:"-=0.15", duration:.8 }, P);
    tl.to(pBurger, { autoAlpha:1, duration:.8 }, P+0.1);
    tl.to(glow,    { scale:1.05, opacity:.9, duration:1 }, P);

    // 1 — OPEN BRANDED BOX rises in
    tl.to([boxBack,boxFront], { autoAlpha:1, y:0, duration:1 }, P+1);

    // 2 — BURGER settles into the box (centre)
    tl.to(pBurger, { x:S.burger.x, y:S.burger.y, scale:1, duration:1.1, ease:"power2.out" }, P+1.4);

    // 3 — FRIES slide in from the left
    tl.to(pFries, { autoAlpha:1, x:S.fries.x, rotation:0, duration:1.1, ease:"power2.out" }, P+2.4);

    // 4 — SHAKE slides in from the right
    tl.to(pShake, { autoAlpha:1, x:S.shake.x, rotation:0, duration:1.1, ease:"power2.out" }, P+3.3);

    // 5 — BOX CLOSES: the branded lid folds down over the packed meal
    tl.to(boxLid, { autoAlpha:1, duration:.3 }, P+4.3);
    tl.to(boxLid, { rotationX:0, duration:1.4, ease:"power2.inOut" }, P+4.5);
    tl.to(glow,   { scale:.9, opacity:.65, duration:1.4 }, P+4.5);

    // 6 — settle: a properly packed GOAT BURGER CO. order held briefly
    tl.to([boxBack,boxFront,boxLid], { scale:1.015, duration:.5 }, P+6.0);

    return () => { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); };
  });

  /* ---- Lenis smooth scroll ---- */
  let lenis = null;
  if (!reduced && window.Lenis){
    lenis = new Lenis({ duration:1.15, easing:(t)=>Math.min(1,1.001-Math.pow(2,-10*t)),
      smoothWheel:true, syncTouch:false, touchMultiplier:1.4 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time)=>lenis.raf(time*1000));
    gsap.ticker.lagSmoothing(0);
  }
  const goTo = (sel)=>{ const el=document.querySelector(sel); if(!el) return;
    lenis ? lenis.scrollTo(el,{duration:1.3}) : el.scrollIntoView({behavior:reduced?"auto":"smooth"}); };

  const progressBar = document.getElementById("progressBar");
  const nav = document.getElementById("nav");
  let navOn=false, hintHidden=false;
  ScrollTrigger.create({ start:0, end:"max", onUpdate:(s)=>{
    // only the compositor transform updates every frame; class/opacity flip once on state change
    progressBar.style.transform = `scaleX(${s.progress})`;
    const y = s.scroll();
    if ((y>40)!==navOn){ navOn=y>40; nav.classList.toggle("scrolled", navOn); }
    if (!hintHidden && hint && y>60){ hintHidden=true; hint.style.opacity=0; }
  }});

  let counted = false;
  ScrollTrigger.create({ trigger:"#track", start:"top top", end:"bottom bottom",
    onUpdate:(s)=>{ if(!counted && s.progress > 0.74){ counted = true; runCounters(); } }});
  function runCounters(){
    gsap.utils.toArray(".count").forEach((el)=>{
      const to = parseFloat(el.dataset.to), o = {v:0};
      gsap.to(o, { v:to, duration:1.6, ease:"power2.out", onUpdate:()=>{ el.textContent = Math.round(o.v); }});
    });
  }

  const pre = document.getElementById("preloader");
  const preBar = document.getElementById("preBar");
  let p = 0;
  const tick = setInterval(()=>{
    p += Math.random()*15 + 7; if (p>=100){ p=100; clearInterval(tick); done(); }
    preBar.style.width = p + "%";
  }, 120);
  function done(){
    setTimeout(()=>{
      pre.classList.add("done");
      if (!reduced){
        gsap.from(camera, { scale:0.7, autoAlpha:0, y:40, duration:1.4, ease:"power4.out",
          onComplete:()=>ScrollTrigger.refresh() });
        gsap.from(".cap--hero", { autoAlpha:0, y:30, duration:1.2, delay:.3, ease:"power3.out" });
      }
    }, 350);
  }

  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("menu");
  function toggleMenu(open){
    const willOpen = open ?? !menu.classList.contains("open");
    menu.classList.toggle("open", willOpen);
    hamburger.classList.toggle("open", willOpen);
    hamburger.setAttribute("aria-expanded", willOpen);
    menu.setAttribute("aria-hidden", !willOpen);
    if (lenis) willOpen ? lenis.stop() : lenis.start();
    document.body.style.overflow = willOpen ? "hidden" : "";
  }
  hamburger.addEventListener("click", ()=>toggleMenu());
  document.querySelectorAll('a[href^="#"]').forEach((a)=>{
    a.addEventListener("click",(e)=>{
      const href=a.getAttribute("href"); if(href.length<2) return;
      e.preventDefault();
      if (menu.classList.contains("open")) toggleMenu(false);
      goTo(href);
    });
  });

  const toast = document.getElementById("toast");
  document.getElementById("orderBtn").addEventListener("click",(e)=>{
    e.preventDefault(); toast.classList.add("show");
    gsap.delayedCall(2.4, ()=>toast.classList.remove("show"));
  });

  if (!isTouch && !reduced){
    const cur=document.querySelector(".cursor"), dot=document.querySelector(".cursor-dot");
    const xT=gsap.quickTo(cur,"x",{duration:.5,ease:"power3"}), yT=gsap.quickTo(cur,"y",{duration:.5,ease:"power3"});
    const xD=gsap.quickTo(dot,"x",{duration:.12,ease:"power3"}), yD=gsap.quickTo(dot,"y",{duration:.12,ease:"power3"});
    // reuse a single quickTo per axis for the glow instead of spawning a tween per mousemove
    const gX=gsap.quickTo(glow,"x",{duration:1.2,ease:"power2.out"}), gY=gsap.quickTo(glow,"y",{duration:1.2,ease:"power2.out"});
    addEventListener("mousemove",(e)=>{ xT(e.clientX);yT(e.clientY);xD(e.clientX);yD(e.clientY);
      gX((e.clientX/innerWidth-.5)*36); gY((e.clientY/innerHeight-.5)*36); }, {passive:true});
    document.querySelectorAll("[data-hover]").forEach((el)=>{
      el.addEventListener("mouseenter",()=>cur.classList.add("grow"));
      el.addEventListener("mouseleave",()=>cur.classList.remove("grow"));
    });
  }

  /* =========================================================
     STORE / MENU — photo slots, reveals, add-to-order
     ========================================================= */
  // menu card photos: show real photo when the file exists, else keep placeholder
  document.querySelectorAll(".mcard__img img").forEach((img)=>{
    const box = img.closest(".mcard__img");
    const mark = ()=>box.classList.add("has-photo");
    const cur = img.getAttribute("src");
    if (cur){ if (img.complete && img.naturalWidth) mark(); else img.addEventListener("load", mark); }
    const ds = img.getAttribute("data-photo");
    if (ds){ const p=new Image(); p.onload=()=>{ img.src=ds; mark(); }; p.src=ds; }
  });

  // reveals for store headings + cards
  gsap.utils.toArray("[data-sr], .mcard").forEach((el, i)=>{
    ScrollTrigger.create({ trigger:el, start:"top 86%", once:true,
      onEnter:()=> setTimeout(()=>el.classList.add("in"), (i%4)*60) });
  });

  // add-to-order buttons → same toast
  const toastEl = document.getElementById("toast");
  document.querySelectorAll(".addbtn").forEach((b)=>{
    b.addEventListener("click",(e)=>{ e.preventDefault();
      toastEl.classList.add("show"); gsap.delayedCall(2.4, ()=>toastEl.classList.remove("show")); });
  });

  addEventListener("load", ()=>ScrollTrigger.refresh());
  setTimeout(()=>ScrollTrigger.refresh(), 900);
})();
