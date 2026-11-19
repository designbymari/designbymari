/* =========================================================
   MARI — interacciones
   GSAP + ScrollTrigger. Todo respeta prefers-reduced-motion.
   ========================================================= */
(function(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = window.matchMedia('(min-width: 1024px)');
  const hasGsap = typeof window.gsap !== 'undefined';
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

  /* ---------- Menú mobile ---------- */
  const toggle = $('.menu-toggle'), nav = $('#nav');
  if (toggle && nav){
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    $$('a', nav).forEach(a => a.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded','false'); nav.classList.remove('is-open');
    }));
  }

  /* ---------- Header: completo arriba, se esconde al scrollear, vuelve al pasar el mouse ---------- */
  const header = $('[data-autohide]');
  const hot = $('.header-hotzone');
  if (header){
    let hovering = false, resting = location.hash.length > 1;   // si llegamos a una sección desde otra página, arranca retirado
    const threshold = () => (document.body.classList.contains('home') ? 30 : 140);
    const update = () => {
      if (!desktop.matches){ header.classList.remove('is-hidden'); return; }
      const hide = window.scrollY > threshold() && (resting || (!hovering && !header.contains(document.activeElement)));
      header.classList.toggle('is-hidden', hide);
    };
    window.addEventListener('scroll', update, {passive:true});
    hot && hot.addEventListener('mouseenter', () => { if (resting) return; hovering = true; update(); });
    header.addEventListener('mouseenter', () => { if (resting) return; hovering = true; update(); });
    // al elegir una sección del menú, el header se retira y deja ver las pestañas;
    // vuelve recién cuando el mouse bajó a la página y regresa a la franja superior
    $$('a[href*="#"]', header).forEach(a => a.addEventListener('click', () => {
      if (!desktop.matches) return;
      resting = true; hovering = false; a.blur();
      setTimeout(update, 120);
    }));
    document.addEventListener('mousemove', e => { if (resting && e.clientY > header.offsetHeight + 20){ resting = false; } }, {passive:true});
    header.addEventListener('mouseleave', () => { hovering = false; setTimeout(update, 250); });
    header.addEventListener('focusin', update);
    header.addEventListener('focusout', () => setTimeout(update, 50));
    update();
  }

  /* ---------- Escala de las composiciones (1440×816) para que entren enteras ---------- */
  const panels = $$('.panel');
  const fit = () => panels.forEach(p => {
    if (!desktop.matches){ p.style.removeProperty('--fit'); return; }
    const f = Math.min(1, p.clientWidth / 1440, p.clientHeight / 816);
    p.style.setProperty('--fit', f.toFixed(4));
  });
  fit(); window.addEventListener('resize', fit);

  /* ---------- Pestañas: tocar una de las de arriba reabre su sección ---------- */
  // posición "natural" de cada bloque dentro del apilado (sin el efecto sticky)
  const naturalTop = (el) => {
    const stackEl = el.closest('.stack');
    if (!stackEl) return el.getBoundingClientRect().top + window.scrollY;
    let y = stackEl.getBoundingClientRect().top + window.scrollY;
    for (const sib of stackEl.children){ if (sib === el) break; y += sib.offsetHeight; }
    return y;
  };
  const goTo = (target, smooth=true) => {
    // en la home la franja de pestañas mide 84px; en el resto de las páginas descontamos el header fijo
    const off = target.closest('.stack') ? (desktop.matches ? 84 : 0) : (header ? header.offsetHeight : 0);
    let y = naturalTop(target) - off;
    const sp = target.nextElementSibling;
    if (desktop.matches && sp && sp.hasAttribute('data-proj-spacer')) y += sp.offsetHeight;   // las pausas (spacer--rest) no se saltean
    y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - window.innerHeight));
    if (reduce || !smooth){ window.scrollTo(0, y); return; }
    glide(y);
  };
  // desplazamiento propio: arranca y frena suave (easeInOutCubic) y dura más cuanto más lejos va.
  // Si la persona scrollea con la rueda o el dedo a mitad de camino, se corta y le devuelve el control.
  let glideRAF = 0;
  const stopGlide = () => { if (glideRAF){ cancelAnimationFrame(glideRAF); glideRAF = 0; } };
  ['wheel','touchstart','keydown','mousedown'].forEach(ev => window.addEventListener(ev, stopGlide, {passive:true}));
  const glide = (to) => {
    stopGlide();
    const from = window.scrollY, dist = to - from;
    if (Math.abs(dist) < 2){ window.scrollTo(0, to); return; }
    const dur = Math.min(1700, Math.max(850, 520 + Math.sqrt(Math.abs(dist)) * 14));
    const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, from + dist * ease(t));
      glideRAF = t < 1 ? requestAnimationFrame(step) : 0;
    };
    glideRAF = requestAnimationFrame(step);
  };
  // links a una sección de esta misma página: "#seccion" o "index.html#seccion" estando en la home
  const samePage = a => {
    const h = a.getAttribute('href') || '';
    if (h.startsWith('#')) return true;
    if (!h.includes('#')) return false;
    const u = new URL(a.href, location.href), norm = p => p.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
    return u.origin === location.origin && norm(u.pathname) === norm(location.pathname);
  };
  // carga ya el peso 800 de Archivo (lo usa el hover de las pestañas): si no, el primer hover deja el texto en blanco mientras baja la fuente
  try { document.fonts && document.fonts.load('800 15px Archivo'); } catch(e){}
  $$('a[href*="#"]').filter(samePage).forEach(t => t.addEventListener('click', e => {
    const id = '#' + t.getAttribute('href').split('#')[1];
    if (id.length < 2) return;
    const target = $(id);
    if (!target || id === '#contenido') return;
    e.preventDefault();
    goTo(target);
  }));
  /* ---------- Home: las pestañas de las secciones que vienen esperan abajo de la pantalla ---------- */
  // cada pestaña real tiene un "doble" fijo al borde inferior; cuando la sección sube y su pestaña
  // llega a ese borde, el doble se apaga y sigue la real (mismo lugar, mismo dibujo: no se nota el relevo)
  const realTabs = $$('.stack a.tab[data-tab]');
  if (realTabs.length){
    const dock = document.createElement('div');
    dock.className = 'tab-dock'; dock.setAttribute('aria-hidden', 'true');
    const pairs = realTabs.map(t => {
      const c = t.cloneNode(true);
      c.removeAttribute('id'); c.removeAttribute('data-tab'); c.tabIndex = -1;
      c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      c.classList.add('tab--dock');
      c.addEventListener('click', e => { e.preventDefault(); const tg = $(t.getAttribute('href')); tg && goTo(tg); });
      dock.appendChild(c);
      return {t, c};
    });
    document.body.appendChild(dock);
    const place = () => pairs.forEach(({t, c}) => { const r = t.getBoundingClientRect(); c.style.left = r.left + 'px'; c.style.width = r.width + 'px'; });
    const sync = () => {
      const on = desktop.matches, vh = window.innerHeight;
      dock.style.display = on ? '' : 'none';
      if (!on) return;
      pairs.forEach(({t, c}) => { c.style.visibility = t.getBoundingClientRect().bottom > vh + 1.5 ? 'visible' : 'hidden'; });
    };
    let raf = 0;
    const tick = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); }); };
    window.addEventListener('scroll', tick, {passive:true});
    window.addEventListener('resize', () => { place(); sync(); });
    window.addEventListener('load', () => { place(); sync(); });
    place(); sync();
  }

  if (location.hash && location.hash.length > 1){
    const target = $(location.hash);
    const reveal = () => document.documentElement.classList.remove('is-jumping');
    if (target){
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.addEventListener('load', () => setTimeout(() => {
        goTo(target, false);
        requestAnimationFrame(() => requestAnimationFrame(reveal));
      }, 60));
      setTimeout(reveal, 3000);
    } else reveal();
  }

  /* ---------- Pantalla de carga (solo la primera vez por visita) ---------- */
  const loader = $('#loader');
  if (loader){
    let seen = false; try { seen = sessionStorage.getItem('mari-loaded') === '1'; } catch(e){}
    if (seen){ loader.remove(); setTimeout(() => window.dispatchEvent(new Event('mari:ready')), 250); }
    else {
      try { sessionStorage.setItem('mari-loaded','1'); } catch(e){}
      const t0 = performance.now();
      const hide = () => {
        const wait = Math.max(0, 1600 - (performance.now() - t0));
        setTimeout(() => { if (!loader.isConnected || loader.classList.contains('is-out')) return; loader.classList.add('is-out'); window.dispatchEvent(new Event('mari:ready')); setTimeout(() => loader.remove(), 800); }, wait);
      };
      if (document.readyState === 'complete') hide(); else window.addEventListener('load', hide);
      setTimeout(() => loader.isConnected && hide(), 6000);
    }
  }

  /* ---------- Hero: "marca e imagen." se escribe a máquina (una vez, sin borrar) ---------- */
  const tw = $('[data-type]');
  if (tw && !reduce){
    const text = tw.textContent;
    tw.setAttribute('aria-label', text);
    tw.textContent = '';
    const chars = [...text].map(ch => { const s = document.createElement('span'); s.textContent = ch; s.className = 'tw-c'; s.setAttribute('aria-hidden','true'); tw.appendChild(s); return s; });
    const cur = document.createElement('span'); cur.className = 'tw-cursor'; cur.setAttribute('aria-hidden','true');
    tw.insertBefore(cur, chars[0]);
    let started = false, visible = true;
    // se escribe, queda unos segundos, se borra y vuelve a escribirse (solo mientras el hero está en pantalla)
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(tw);
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const untilVisible = async () => { while (!visible) await wait(400); };
    const start = async () => {
      if (started) return; started = true;
      await wait(350);
      for (;;){
        for (let i = 0; i < chars.length; i++){
          await untilVisible();
          chars[i].classList.add('is-on'); chars[i].after(cur);
          await wait(chars[i].textContent === ' ' ? 40 : 70 + Math.random() * 70);
        }
        await wait(4200);
        for (let i = chars.length - 1; i >= 0; i--){
          await untilVisible();
          chars[i].classList.remove('is-on'); chars[i].before(cur);
          await wait(110 + Math.random() * 60);
        }
        await wait(700);
      }
    };
    window.addEventListener('mari:ready', start);
    if (!$('#loader')) setTimeout(start, 300);
    setTimeout(start, 4000);
  }

  if (!hasGsap) return;

  /* ---------- Alfiler: colgantes que se mecen con el viento y con el paso del mouse ---------- */
  const perlas = $('.pin__perlas'), pua = $('.pin__pua');
  if (perlas && pua && !reduce){
    const wind = (el, amp, dur, delay) => gsap.timeline({repeat:-1, yoyo:true, delay})
      .fromTo(el, {rotation:-amp}, {rotation:amp, duration:dur, ease:'sine.inOut'});
    const t1 = wind(perlas, 3, 2.4, 0);
    const t2 = wind(pua, 2.5, 2.9, .6);
    const gust = () => {
      gsap.to([t1, t2], {timeScale: gsap.utils.random(.7, 1.5), duration: 1.5, ease:'sine.inOut'});
      gsap.delayedCall(gsap.utils.random(2.5, 5), gust);
    };
    gust();
    // al pasar el mouse cerca, los colgantes se apartan (como empujados por un imán) y vuelven balanceándose
    const hero = $('.hero');
    let mouse = null;
    hero.addEventListener('mousemove', e => { mouse = {x:e.clientX, y:e.clientY}; }, {passive:true});
    const hs = [{el:perlas, v:0, p:0}, {el:pua, v:0, p:0}];
    const tick = () => {
      hs.forEach(s => {
        let target = 0;
        if (mouse){
          const r = s.el.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height * .55;
          const dx = mouse.x - cx, dy = mouse.y - cy, d = Math.hypot(dx, dy);
          const R = 190;
          if (d < R) target = -Math.sign(dx || 1) * (R - d) / R * 16;   // se aleja del mouse
        }
        // resorte: llega al objetivo y rebota un poco al soltarse
        s.v += (target - s.p) * .08; s.v *= .86; s.p += s.v;
        s.el.style.setProperty('--push', s.p.toFixed(2));
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    hero.addEventListener('mouseleave', () => { mouse = null; });
    ScrollTrigger.create({trigger:'.hero', start:'top top', end:'bottom top',
      onLeave:()=>{t1.pause();t2.pause();}, onEnterBack:()=>{t1.play();t2.play();}});
  }

  /* ---------- Proyectos: primero la frase, después caen los 3 proyectos ---------- */
  const phrase = $('[data-proj-phrase]');
  const drops = $$('[data-drop]');
  const spacer = $('[data-proj-spacer]');
  if (phrase && drops.length && spacer){
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      // los proyectos bajan desde arriba (pasando por encima de la pestaña) y van tapando la frase
      // ocultos hasta que les toca caer (así no asoman sobre el hero)
      gsap.set(drops, {y:-1150, autoAlpha:0, rotation:(i)=> [ -9, 5, 10 ][i]});
      const R=[-2.1,0,2.8];
      const tl = gsap.timeline({scrollTrigger:{trigger:spacer, start:'top bottom', end:'bottom bottom', scrub:.6}});
      tl.to({}, {duration:.5});
      drops.forEach((d, i) => {
        const at = .5 + i * .85;
        tl.set(d, {autoAlpha:1}, at)
          .to(d, {y:0, rotation:R[i], duration:1, ease:'power2.out'}, at);
      });
      tl.to({}, {duration:.5});
      return () => gsap.set(drops, {clearProps:'all'});
    });
    mm.add('(max-width: 1023px), (prefers-reduced-motion: reduce)', () => {
    });
  }

  /* ---------- Lo que hago: tiras del flyer que se arrancan ---------- */
  $$('[data-tear]').forEach((strip, i) => {
    strip.addEventListener('click', e => {
      if (reduce) return;            // navega directo
      e.preventDefault();
      const href = strip.getAttribute('href');
      strip.classList.add('is-torn');
      const dir = i === 0 ? -1 : 1;
      gsap.timeline({onComplete:() => { window.location.href = href; }})
        .to(strip, {rotation:dir * 4, y:6, duration:.12, ease:'power1.out'})
        .to(strip, {rotation:dir * 18, y: window.innerHeight * .6, x: dir * 60, opacity:0, duration:.75, ease:'power2.in'});
    });
  });
  // si vuelve con "atrás", reponer las tiras
  window.addEventListener('pageshow', () => {
    $$('[data-tear]').forEach(s => { s.classList.remove('is-torn'); gsap.set(s, {clearProps:'transform,opacity'}); });
  });

  /* ---------- Lo que hago: piezas de Lyra que se apilan ---------- */
  const stack = $('[data-lyra-stack]');
  if (stack){
    const cards = $$('img', stack);
    const pauseBtn = $('[data-pause]', stack);
    let z = cards.length, playing = !reduce, timer = null, inView = false;
    // como en yasstudio: abanico con ángulos fijos; cada pieza nueva aparece arriba con un fundido
    const ANG = [0, -9, -16, 7, -4];
    let step = cards.length;
    const next = () => {
      const bottom = cards.reduce((a,b) => (+a.style.zIndex||0) <= (+b.style.zIndex||0) ? a : b);
      bottom.style.zIndex = ++z;
      gsap.set(bottom, {rotation: ANG[step++ % ANG.length]});
      gsap.fromTo(bottom, {scale:1.035}, {scale:1, duration:.35, ease:'power2.out'});
    };
    cards.forEach((c,i) => {
      c.style.zIndex = i+1;
      c.style.transform = 'none';
      gsap.set(c, {x:0, y:0, xPercent:-50, yPercent:-50, rotation: ANG[i % ANG.length]});
    });
    const loop = () => { clearTimeout(timer); if (playing && inView){ next(); timer = setTimeout(loop, 1600); } };
    ScrollTrigger.create({trigger:stack, start:'top bottom', end:'bottom top',
      onToggle: self => { inView = self.isActive; if (inView) timer = setTimeout(loop, 900); else clearTimeout(timer); }});
    if (pauseBtn){
      if (reduce) pauseBtn.hidden = true;
      pauseBtn.addEventListener('click', () => {
        playing = !playing;
        pauseBtn.setAttribute('aria-pressed', String(!playing));
        pauseBtn.setAttribute('aria-label', playing ? 'Pausar animación' : 'Reanudar animación');
        pauseBtn.textContent = playing ? '❚❚' : '▶';
        if (playing) loop(); else clearTimeout(timer);
      });
    }
    stack.addEventListener('mouseenter', () => clearTimeout(timer));
    stack.addEventListener('mouseleave', () => { timer = setTimeout(loop, 600); });
  }

  /* ---------- Ficha: credencial colgada del clip ---------- */
  const cred = $('[data-cred]');
  if (cred){
    const body = $('[data-cred-body]', cred);
    const btn = $('[data-cred-btn]', cred);
    const charms = $$('.charm', cred);
    let flipped = false, busy = false;
    const sway = () => {
      if (reduce) return;
      return;
    };
    // imán: la credencial y los dijes se apartan del mouse y vuelven con un rebote suave
    if (!reduce && window.matchMedia('(hover: hover)').matches){
      let m = null;
      cred.addEventListener('mousemove', e => { m = {x:e.clientX, y:e.clientY}; }, {passive:true});
      cred.addEventListener('mouseleave', () => { m = null; });
      const cs = {v:0, p:0}, ch = charms.map(el => ({el, v:0, p:0}));
      const loop = () => {
        const pr = cred.getBoundingClientRect();
        const px = pr.left + 312 * (pr.width / 900);       // punto donde cuelga (el clip)
        let tc = 0;
        if (m && !busy){ tc = gsap.utils.clamp(-1, 1, (px - m.x) / 420) * 2; }
        cs.v += (tc - cs.p) * .04; cs.v *= .88; cs.p += cs.v;
        body.style.rotate = cs.p.toFixed(2) + 'deg';
        ch.forEach(s => {
          let t = 0;
          if (m){
            const r = s.el.getBoundingClientRect();
            const dx = m.x - (r.left + r.width / 2), dy = m.y - (r.top + r.height / 2), d = Math.hypot(dx, dy);
            const R = Math.max(220, r.width);
            if (d < R) t = -Math.sign(dx || 1) * (R - d) / R * 7;
          }
          s.v += (t - s.p) * .05; s.v *= .88; s.p += s.v;
          s.el.style.setProperty('--sw', s.p.toFixed(2));
        });
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    btn.addEventListener('click', () => {
      if (busy) return;
      flipped = !flipped;
      btn.setAttribute('aria-pressed', String(flipped));
      if (reduce){ gsap.set(body, {rotationY: flipped ? -180 : 0}); return; }
      busy = true;
      gsap.timeline({onComplete:() => busy = false})
        .to(body, {rotationY: flipped ? -180 : 0, duration:1.1, ease:'power3.inOut'}, 0)
        .to(body, {rotationZ: 4, duration:.45, ease:'sine.out'}, .55)
        .to(body, {rotationZ: -1.5, duration:.5, ease:'sine.inOut'}, 1)
        .to(body, {rotationZ: 0, duration:.6, ease:'sine.out'}, 1.5);
      sway();
    });
  }

  /* credencial en mobile: escalar la composición al ancho disponible */
  const credScene = $('.cred-scene');
  const credFit = () => { if (!credScene) return;
    if (desktop.matches){ credScene.style.removeProperty('--cs'); return; }
    credScene.style.setProperty('--cs', (credScene.parentElement.clientWidth / 900).toFixed(4)); };
  credFit(); window.addEventListener('resize', credFit);

  /* ---------- Escribime: el papel flota apenas (en CSS) ---------- */


  /* ---------- Proyectos: filtros y aparición de las tarjetas ---------- */
  const grid = $('.grid');
  if (grid){
    const works = $$('.work', grid), chips = $$('[data-filter]');
    const apply = (f, animate=true) => {
      chips.forEach(c => { const on = c.dataset.filter === f; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
      const show = works.filter(w => f === 'todos' || w.dataset.cat === f);
      const run = () => {
        works.forEach(w => w.hidden = !show.includes(w));
        if (animate && !reduce) gsap.fromTo(show, {opacity:0, y:24}, {opacity:1, y:0, duration:.6, stagger:.06, ease:'power2.out'});
        ScrollTrigger.refresh();
      };
      if (animate && !reduce) gsap.to(works.filter(w=>!w.hidden), {opacity:0, y:12, duration:.22, ease:'power1.in', onComplete:run});
      else run();
    };
    chips.forEach(c => c.addEventListener('click', () => {
      apply(c.dataset.filter);
      const u = new URL(location.href);
      if (c.dataset.filter === 'todos') u.searchParams.delete('filtro'); else u.searchParams.set('filtro', c.dataset.filter);
      history.replaceState(null, '', u);
    }));
    const q = new URLSearchParams(location.search).get('filtro');
    if (q && chips.some(c => c.dataset.filter === q)) apply(q, false);
    if (!reduce){
      works.forEach(w => gsap.from(w, {opacity:0, y:40, duration:.8, ease:'power2.out',
        scrollTrigger:{trigger:w, start:'top 92%', once:true}}));
    }
  }


  /* ---------- Caso: videos que se pausan fuera de pantalla ---------- */
  $$('[data-autovideo]').forEach(v => {
    if (reduce){ v.removeAttribute('autoplay'); v.pause(); return; }
    ScrollTrigger.create({trigger:v, start:'top bottom', end:'bottom top',
      onToggle: s => { if (s.isActive) v.play().catch(()=>{}); else v.pause(); }});
  });

  /* ---------- Caso: galerías que pasan solas (sin efecto) + puntitos ---------- */
  $$('[data-stack]').forEach(st => {
    const imgs = $$('img', st);
    if (imgs.length < 2) return;
    let i = 0, timer = null, active = false;
    const dots = document.createElement('div');
    dots.className = 'cs-dots';
    dots.setAttribute('role', 'tablist');
    dots.setAttribute('aria-label', 'Imágenes de la galería');
    const btns = imgs.map((im, k) => {
      const d = document.createElement('button');
      d.type = 'button'; d.setAttribute('aria-label', `Imagen ${k+1} de ${imgs.length}`);
      d.addEventListener('click', () => { show(k); restart(); });
      dots.appendChild(d); return d;
    });
    const wrap = document.createElement('div');
    st.before(wrap); wrap.append(st, dots);
    const show = k => {
      i = k;
      imgs.forEach((im, n) => im.style.visibility = n === k ? 'visible' : 'hidden');
      btns.forEach((d, n) => d.setAttribute('aria-current', n === k ? 'true' : 'false'));
    };
    const restart = () => { clearTimeout(timer); if (active && !reduce) timer = setTimeout(tick, 2200); };
    const tick = () => { show((i + 1) % imgs.length); restart(); };
    show(0);
    ScrollTrigger.create({trigger:st, start:'top 85%', end:'bottom 10%',
      onToggle: s => { active = s.isActive; restart(); }});
  });

  /* ---------- Caso: header transparente sobre el hero ---------- */
  if ($('.cs-hero') && header){
    const top = () => header.classList.toggle('is-top', window.scrollY < 40);
    top(); window.addEventListener('scroll', top, {passive:true});
  }

  /* ---------- Caso: entrada del hero y aparición suave de bloques ---------- */
  if (!reduce && $('.cs-hero')){
    gsap.from('.cs-hero__in > *', {'--rise':'30px', opacity:0, duration:1, stagger:.18, ease:'power3.out', delay:.15});
    $$('.cs-sec .cs-in > *, .cs-final, .cs-uso .cs-stack').forEach(el => gsap.from(el, {y:40, opacity:0, duration:.9, ease:'power2.out',
      scrollTrigger:{trigger:el, start:'top 88%', once:true}}));
  }


  /* ---------- Fotografía: la serie se desplaza en horizontal con el scroll ---------- */
  $$('[data-serie]').forEach(sec => {
    const track = $('[data-serie-track]', sec), pin = $('.serie__pin', sec), out = $('[data-serie-n]', sec);
    const imgs = $$('img', track);
    const count = () => {
      // la foto "actual" es la que ocupa el centro de la pantalla
      const mid = window.innerWidth / 2; let best = 0, bd = Infinity;
      imgs.forEach((im, k) => { const r = im.getBoundingClientRect(); const d = Math.abs(r.left + r.width/2 - mid); if (d < bd){ bd = d; best = k; } });
      const atEnd = window.innerWidth >= 1024 ? track.getBoundingClientRect().right <= window.innerWidth + 4 : track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
      if (atEnd) best = imgs.length - 1;
      out.textContent = best + 1;
    };
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 150);
      gsap.set(track, {x:150});
      // pausa al final: la última foto queda quieta un tramo de scroll antes de soltar la sección
      const hold = () => Math.round(window.innerHeight * .6);
      const tw = gsap.timeline({scrollTrigger:{trigger:sec, start:'top top', end:() => '+=' + (dist() + hold()), pin:pin, scrub:reduce ? true : .6,
          invalidateOnRefresh:true, onUpdate:count}});
      tw.to(track, {x:() => 150 - dist(), ease:'none', duration:() => dist(), onUpdate:count})
        .to({}, {duration:() => hold()});
      return () => { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); gsap.set(track, {clearProps:'x'}); };
    });
    track.addEventListener('scroll', count, {passive:true});
    // ventana angosta + mouse: la ruedita vertical mueve la serie en horizontal (y suelta la página en los extremos)
    track.addEventListener('wheel', e => {
      if (window.innerWidth >= 1024 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = track.scrollWidth - track.clientWidth, at = track.scrollLeft;
      if ((e.deltaY > 0 && at >= max - 1) || (e.deltaY < 0 && at <= 0)) return;
      e.preventDefault();
      track.style.scrollSnapType = 'none';   // con mouse no hace falta el imán del swipe táctil
      track.scrollLeft = at + e.deltaY;
    }, {passive:false});
    imgs.forEach(im => im.complete || im.addEventListener('load', () => ScrollTrigger.refresh(), {once:true}));
  });


  /* =========================== FICHA PERSONAL =========================== */
  /* tags y títulos que flotan y se alejan del mouse (como un imán que repele) */
  const floaters = $$('[data-float]');
  if (floaters.length && !reduce){
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let mouse = null;
    if (fine){
      document.addEventListener('mousemove', e => { mouse = {x:e.clientX, y:e.clientY}; }, {passive:true});
      document.addEventListener('mouseout', e => { if (!e.relatedTarget) mouse = null; });
    }
    const st = floaters.map((el, i) => ({el, px:0, py:0, ax:0, ay:0, ph:i * 1.3}));
    const frame = t => {
      const vh = window.innerHeight;
      st.forEach(s => {
        const r = s.el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const fy = Math.sin(t / 900 + s.ph) * 4, fx = Math.cos(t / 1300 + s.ph) * 2;
        let tx = 0, ty = 0;
        if (mouse && window.innerWidth >= 1024){
          const cx = r.left + r.width / 2 - s.ax, cy = r.top + r.height / 2 - s.ay;
          const dx = cx - mouse.x, dy = cy - mouse.y, d = Math.hypot(dx, dy) || 1;
          const R = Math.max(130, r.width * .8);
          if (d < R){ const push = (R - d) / R * 26; tx = dx / d * push; ty = dy / d * push; }
        }
        s.px += (tx - s.px) * .1; s.py += (ty - s.py) * .1;
        s.ax = s.px + fx; s.ay = s.py + fy;
        s.el.style.translate = s.ax.toFixed(1) + 'px ' + s.ay.toFixed(1) + 'px';
      });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* línea de tiempo: la línea baja con el scroll; cada flor aparece cuando la línea la alcanza
     y desde ahí gira; el hito aparece en ese momento (sin movimiento) */
  const tl = $('[data-tl]');
  if (tl && !reduce){
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      const line = $('.tl__line', tl), bar = $('[data-tl-bar]', tl);
      const hitos = $$('[data-hito]', tl).map(h => {
        const fl = $('.hito__flor', h);
        const parts = [$('.hito__text', h), $('.hito__img', h)];
        gsap.set(fl, {scale:0}); gsap.set(parts, {autoAlpha:0});
        return {fl, parts, p:0, on:false};
      });
      const measure = () => {
        const lt = line.offsetTop, lh = line.offsetHeight;
        hitos.forEach(h => { h.p = (parseFloat(getComputedStyle(h.fl).top) - lt) / lh; });
      };
      measure();
      const st = ScrollTrigger.create({trigger:line, start:'top 55%', end:'bottom 55%', scrub:true,
        onRefresh:measure,
        onUpdate:self => {
          const p = self.progress;
          gsap.set(bar, {scaleY:p});
          hitos.forEach(h => {
            const reached = p >= h.p;
            if (reached !== h.on){
              h.on = reached;
              gsap.to(h.fl, {scale:reached ? 1 : 0, duration:reached ? .5 : .25, ease:reached ? 'back.out(2.5)' : 'power1.in', overwrite:'auto'});
              gsap.to(h.parts, {autoAlpha:reached ? 1 : 0, duration:.6, ease:'power1.out', overwrite:'auto'});
            }
            if (reached) gsap.set(h.fl, {rotation:(p - h.p) * 900});
          });
        }});
      gsap.set(bar, {scaleY:0});
      return () => { st.kill(); gsap.set($$('.hito__text,.hito__img,.hito__flor,[data-tl-bar]', tl), {clearProps:'all'}); };
    });
  }

  /* ideas: en pantallas táctiles, tocar da vuelta la tarjeta */
  $$('.idea').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));

  /* match (al estilo yasstudio: sello que golpea, corazoncitos que saltan, la tarjeta se inclina) */
  const mres = $('[data-match-result]');
  if (mres){
    const cards = $$('[data-mcard]');
    const msg = n => n === 0 ? '' : n <= 1 ? '<b>Escribime igual,</b> capaz te sorprendo...'
      : n <= 3 ? '<b>Es un buen comienzo,</b> escribime y lo charlamos :)'
      : n <= 5 ? '<b>Esto ya es un match,</b> escribime!'
      : '<b>Full match?!</b> Qué esperás para escribirme?';
    const update = () => {
      const html = msg(cards.filter(c => c.classList.contains('is-yes')).length);
      if (mres.innerHTML === html) return;
      if (reduce){ mres.innerHTML = html; return; }
      gsap.to(mres, {opacity:0, y:8, duration:.15, onComplete:() => { mres.innerHTML = html; gsap.fromTo(mres, {opacity:0, y:8}, {opacity:1, y:0, duration:.35, ease:'back.out(2)'}); }});
    };
    const anim = (el, frames, ms) => { if (!reduce && el.animate) el.animate(frames, {duration:ms, easing:'ease-out', composite:'add'}); };
    const burst = btn => {
      if (reduce) return;
      const r = btn.getBoundingClientRect();
      for (let k = 0; k < 8; k++){
        const h = document.createElement('span');
        h.className = 'm-burst'; h.setAttribute('aria-hidden','true'); h.textContent = '\u2665';
        h.style.left = (r.left + r.width / 2) + 'px'; h.style.top = (r.top + r.height / 2) + 'px';
        document.body.appendChild(h);
        const a = (k / 8) * Math.PI * 2 + Math.random() * .4, d = 38 + Math.random() * 22;
        h.animate([{translate:'-50% -50%', scale:.4, opacity:1},
          {translate:`calc(-50% + ${(Math.cos(a)*d).toFixed(1)}px) calc(-50% + ${(Math.sin(a)*d).toFixed(1)}px)`, scale:1.1, opacity:0}],
          {duration:700, easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish = () => h.remove();
      }
    };
    cards.forEach((c, n) => {
      const yes = $('[data-yes]', c), no = $('[data-no]', c), stamp = $('.mcard__stamp', c);
      const set = state => {
        c.classList.toggle('is-yes', state === 'yes'); c.classList.toggle('is-no', state === 'no');
        yes.setAttribute('aria-pressed', String(state === 'yes')); no.setAttribute('aria-pressed', String(state === 'no'));
        update();
      };
      yes.addEventListener('click', () => {
        const on = !c.classList.contains('is-yes'); set(on ? 'yes' : null);
        if (!on) return;
        anim(stamp, [{scale:2.2, opacity:0}, {scale:.9, opacity:1, offset:.6}, {scale:1, opacity:1}], 380);
        burst(yes);
        anim(c, [{rotate:'0deg', translate:'0 0'}, {rotate:'5deg', translate:'14px -16px', offset:.4}, {rotate:'-2deg', translate:'0 4px', offset:.7}, {rotate:'0deg', translate:'0 0'}], 600);
      });
      no.addEventListener('click', () => {
        const on = !c.classList.contains('is-no'); set(on ? 'no' : null);
        if (!on) return;
        anim(c, [{rotate:'0deg'}, {rotate:'-4deg', offset:.15}, {rotate:'4deg', offset:.35}, {rotate:'-3deg', offset:.55}, {rotate:'2deg', offset:.75}, {rotate:'0deg'}], 650);
      });
      // al pasar el mouse la tarjeta se inclina apenas (alternando hacia un lado y el otro)
      if (!reduce && window.matchMedia('(hover: hover)').matches){
        const dir = n % 2 ? -1 : 1;
        c.style.transition = 'rotate .35s ease, filter .5s, opacity .5s';
        c.addEventListener('mouseenter', () => { c.style.rotate = (3 * dir) + 'deg'; });
        c.addEventListener('mouseleave', () => { c.style.rotate = '0deg'; });
      }
    });
  }

  /* instagram: últimos 4 posts (vía Behold, se actualiza solo) + aparición como cortina */
  const ig = $('[data-ig]');
  if (ig){
    const posts = $$('.ig__post', ig);
    const reveal = () => { if (!reduce) gsap.fromTo(posts, {clipPath:'inset(100% 0 0 0)'}, {clipPath:'inset(0% 0 0 0)', duration:.9, ease:'power3.out', stagger:.12,
      scrollTrigger:{trigger:ig, start:'top 85%', once:true}}); };
    const id = ig.dataset.behold;
    if (id && window.fetch){
      fetch('https://feeds.behold.so/' + id).then(r => r.json()).then(d => {
        (d.posts || []).slice(0, posts.length).forEach((p, k) => {
          const a = posts[k];
          const src = (p.sizes && (p.sizes.medium || p.sizes.large || {}).mediaUrl) || p.thumbnailUrl || p.mediaUrl;
          a.href = p.permalink;
          const txt = (p.prunedCaption || '').trim();
          a.setAttribute('aria-label', 'Ver en Instagram' + (txt ? ': ' + txt.slice(0, 80) : ''));
          const im = new Image(); im.src = src; im.alt = ''; im.loading = 'lazy';
          a.appendChild(im);
          if (txt){ const cap = document.createElement('span'); cap.className = 'ig__cap'; cap.setAttribute('aria-hidden','true'); const t = document.createElement('span'); t.textContent = txt; cap.appendChild(t); a.appendChild(cap); }
        });
      }).catch(() => {}).finally(reveal);
    } else reveal();
  }

  /* recalcular cuando cargan imágenes y fuentes */
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
