/* HIPERNOVA — page behavior (vanilla JS, no build step). */
(() => {
  'use strict';

  /* Tunables that were editor props in the design prototype. */
  const OPTIONS = { particles: true, density: 1400, autoplayCycle: true };

  const Y = '#FDEE3D', MIST = '#F4F4EE', INK = '#222';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = () => Math.min(2, window.devicePixelRatio || 1);

  let mouse = null;
  window.addEventListener('pointermove', e => { mouse = { x: e.clientX, y: e.clientY }; }, { passive: true });

  /* ------------------------------------------------------------------
   * Núcleo config — toggles persisted per browser (localStorage).
   * ------------------------------------------------------------------ */
  const CFG_KEY = 'hn-core';
  const cfg = Object.assign({ jose: false, escritos: true, rotate: true, cursor: true }, (() => {
    try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) { return {}; }
  })());

  function applyCfg() {
    $$('[data-cfg]').forEach(el => { el.hidden = !cfg[el.dataset.cfg]; });
    $$('[data-switch]').forEach(sw => {
      const on = !!cfg[sw.dataset.switch];
      sw.setAttribute('aria-checked', String(on));
      $('.switch__label', sw).textContent = on ? 'On' : 'Off';
    });
  }

  function setCfg(k, v) {
    cfg[k] = v;
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
    applyCfg();
    if (k === 'cursor') v ? startCursor() : stopCursor();
  }

  /* ------------------------------------------------------------------
   * Hero — rotating phrase with a decode/noise transition.
   * ------------------------------------------------------------------ */
  const PHRASES = ['ver lo que antes no veíamos.', 'cambiar de trayectoria.', 'cuestionar las reglas dadas.', 'hacer las cosas de otra manera.', 'convertir límites en posibilidades.', 'imaginar otros futuros.', 'hacer emerger algo nuevo.', 'descubrir nuevas posibilidades.', 'cambiar la forma de mirar.', 'romper con lo predecible.', 'reimaginar lo que ya existe.', 'crear desde otro lugar.', 'alterar el contexto.', 'rediseñar las condiciones.', 'abrir nuevos caminos.', 'cambiar las preguntas.', 'desafiar lo que dábamos por hecho.', 'habitar nuevos escenarios.', 'activar nuevas conversaciones.', 'expandir lo que creíamos posible.', 'conectar lo que antes estaba separado.', 'crear nuevas formas de relacionarnos.', 'dar forma a lo que todavía no existe.', 'convertir incertidumbre en posibilidad.', 'transformar el contexto.', 'ensayar otros futuros.', 'hacer visible lo invisible.'];
  const PHRASE_MS = 3200;

  function initPhrase() {
    const box = $('[data-phrase]'), live = $('[data-phrase-live]'), sr = $('[data-phrase-sr]');
    if (!box) return;
    // Invisible sizers stacked in one grid cell: the box always reserves the
    // height of the longest phrase, so nothing below it jumps.
    PHRASES.forEach(p => {
      const s = document.createElement('span');
      s.className = 'phrase__sizer'; s.setAttribute('aria-hidden', 'true'); s.textContent = p;
      box.appendChild(s);
    });
    let idx = 0, t0 = performance.now(), lastPaint = 0;
    sr.textContent = PHRASES[0];
    setInterval(() => {
      if (!cfg.rotate) return;
      idx = (idx + 1) % PHRASES.length; t0 = performance.now(); sr.textContent = PHRASES[idx];
    }, PHRASE_MS);

    const G = 'abcdeghknopqrsuvxyz0123456789#/+*:';
    const rnd = () => G[(Math.random() * G.length) | 0];
    const tick = now => {
      const txt = PHRASES[idx];
      if (reduced || !cfg.rotate) {
        if (live.textContent !== txt) live.textContent = txt;
        live.style.opacity = 1; live.style.transform = 'none';
      } else {
        const tt = now - t0;
        const inP = Math.min(1, tt / 760), outP = Math.max(0, (tt - (PHRASE_MS - 520)) / 440);
        let out = '';
        for (let k = 0; k < txt.length; k++) {
          const c = txt[k], f = k / txt.length;
          if (c === ' ') { out += ' '; continue; }
          const resolved = inP > f * .85 + Math.random() * .15 && outP < (1 - f) * .7 + Math.random() * .3;
          out += resolved ? c : rnd();
        }
        if (now - lastPaint > 45 || (inP >= 1 && outP === 0)) { live.textContent = out; lastPaint = now; }
        const noisy = inP < 1 || outP > 0;
        live.style.opacity = noisy ? (.55 + Math.random() * .45).toFixed(2) : 1;
        live.style.transform = noisy && Math.random() < .25 ? `translateX(${(Math.random() * 6 - 3).toFixed(1)}px)` : 'none';
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------
   * 03 — Qué significa: scroll-driven word sequence.
   * ------------------------------------------------------------------ */
  const WORDS = ['Acumulación', 'Tensión', 'Liberación', 'Expansión', 'Transformación', 'Emergencia'];
  const WORD_TEXT = [
    'La energía se concentra antes de que algo cambie. Preguntas, señales e incomodidades se acumulan, muchas veces sin nombre.',
    'Lo que existe ya no alcanza para contener lo que empieza a aparecer. La tensión no es un problema que eliminar: es información.',
    'Algo se suelta: un supuesto, una manera de mirar, una forma de decidir. La energía contenida encuentra salida.',
    'Lo liberado altera su entorno. Aparecen perspectivas, relaciones y futuros que antes no estaban disponibles.',
    'Cambian las condiciones y cambian quienes las habitan. No es una mejora de lo anterior: es otra configuración.',
    'Surge algo que no podía planificarse de antemano. Un orden nuevo que nace de todo lo que se movió.'
  ];
  let word = -1, heroProg = 0, meanRedraw = null;

  function setWord(w) {
    if (w === word) return;
    word = w;
    $$('[data-words] li').forEach((li, i) => {
      li.classList.toggle('is-active', i === w);
      li.classList.toggle('is-past', i < w);
    });
    $('[data-word-counter]').textContent = w < 0 ? 'Signal — 00 / 06' : 'Signal — 0' + (w + 1) + ' / 06';
    $('[data-word-title]').textContent = w < 0 ? '' : WORDS[w];
    $('[data-word-text]').textContent = w < 0 ? 'Desliza para recorrer el comportamiento de una hipernova.' : WORD_TEXT[w];
    meanRedraw && meanRedraw();
  }

  function onScroll() {
    const hero = $('#inicio');
    if (hero) { const r = hero.getBoundingClientRect(); heroProg = Math.min(1, Math.max(0, -r.top / r.height)); }
    const m = $('[data-mean]');
    if (m) {
      const r = m.getBoundingClientRect(), span = r.height - window.innerHeight;
      let w = -1;
      if (r.top < window.innerHeight * .4) w = Math.floor(Math.min(.999, Math.max(0, -r.top / span)) * 6);
      setWord(w);
    }
  }

  /* ------------------------------------------------------------------
   * Particle fields (hero nucleus that disperses on scroll; 03 shapes).
   * ------------------------------------------------------------------ */
  function startField(canvas, kind) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, raf = 0, visible = true, t = 0;
    const base = kind === 'hero' ? OPTIONS.density : OPTIONS.density * 1.1;
    const P = [];
    const target = (p, i, n, mode) => {
      const cx = w / 2, cy = h / 2, M = Math.min(w, h), X = Math.max(w, h);
      switch (mode) {
        case 0: { const r = Math.sqrt(p.r0) * M * .1; return [cx + Math.cos(p.a) * r, cy + Math.sin(p.a) * r]; }
        case 1: { const r = Math.sqrt(p.r0) * M * .065, j = Math.sin(t * .09 + i) * 2.2; return [cx + Math.cos(p.a) * r + j, cy + Math.sin(p.a) * r - j]; }
        case 2: { const a = p.ray / 40 * 6.283, r = M * .06 + Math.pow(p.r0, .7) * X * .62; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
        case 3: { const r = M * .36 + (p.r0 - .5) * M * .08; return [cx + Math.cos(p.a) * r * 1.35, cy + Math.sin(p.a) * r * .95]; }
        case 4: { const x = p.sx * w, y = h * (.2 + p.layer * .1) + Math.sin(x * .006 + t * .012 + p.layer) * h * .06; return [x, y]; }
        default: { const cols = Math.max(8, Math.round(Math.sqrt(n * w / h))), rows = Math.ceil(n / cols); return [((i % cols) + .5) * w / cols, (Math.floor(i / cols) + .5) * h / rows]; }
      }
    };
    const frame = () => {
      t++; ctx.fillStyle = INK; ctx.fillRect(0, 0, w, h);
      const n = P.length, mb = mouse ? canvas.getBoundingClientRect() : null;
      const mx = mb ? mouse.x - mb.left : -9999, my = mb ? mouse.y - mb.top : -9999;
      const mode = Math.max(0, word);
      for (let i = 0; i < n; i++) {
        const p = P[i]; let yellow;
        if (kind === 'hero') {
          if (!reduced) p.a += p.s;
          const cx = w < 800 ? w * .5 : w * .7, cy = h * .46, R = Math.min(w, h) * .46, r = Math.pow(p.r0, 1.8) * R;
          const k = heroProg * heroProg * (3 - 2 * heroProg);
          p.x = (cx + Math.cos(p.a) * r * 1.5) * (1 - k) + p.sx * w * k;
          p.y = (cy + Math.sin(p.a) * r * .78) * (1 - k) + p.sy * h * k;
          yellow = r < R * .1;
        } else {
          const [tx, ty] = target(p, i, n, mode);
          const e = reduced ? 1 : .055; p.x += (tx - p.x) * e; p.y += (ty - p.y) * e;
          if (!reduced && mode !== 5) p.a += p.s * .5;
          const d = Math.hypot(p.x - w / 2, p.y - h / 2);
          yellow = mode === 5 ? d < Math.min(w, h) * .18 : mode >= 2 ? p.r0 < .18 : p.r0 < .5;
        }
        let px = p.x, py = p.y;
        const dx = px - mx, dy = py - my, dd = Math.hypot(dx, dy);
        if (dd < 130 && dd > 0) { const f = (1 - dd / 130) * 26; px += dx / dd * f; py += dy / dd * f; }
        ctx.globalAlpha = yellow ? 1 : .55; ctx.fillStyle = yellow ? Y : MIST;
        ctx.fillRect(px, py, p.z, p.z);
      }
      ctx.globalAlpha = 1;
      if (!reduced && visible) raf = requestAnimationFrame(frame);
    };
    const resize = () => {
      const b = canvas.getBoundingClientRect(), dpr = DPR();
      w = b.width; h = b.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(base * Math.min(1, Math.max(.45, w / 1280)));
      while (P.length < n) P.push({ a: Math.random() * 6.283, r0: Math.random(), s: .0008 + Math.random() * .003, z: Math.random() * 1.5 + .6, sx: Math.random(), sy: Math.random(), ray: Math.floor(Math.random() * 40), layer: Math.floor(Math.random() * 7), x: Math.random() * w, y: Math.random() * h });
      P.length = n;
      if (reduced) frame();
    };
    new ResizeObserver(resize).observe(canvas); resize();
    new IntersectionObserver(es => es.forEach(e => {
      const was = visible; visible = e.isIntersecting;
      if (visible && !was && !reduced) raf = requestAnimationFrame(frame);
    })).observe(canvas);
    if (!reduced) raf = requestAnimationFrame(frame);
    // In reduced-motion mode the 03 field redraws once per word change.
    if (reduced && kind === 'mean') return { redraw: () => { for (let i = 0; i < 3; i++) frame(); } };
  }

  /* ------------------------------------------------------------------
   * 07 — Ciclo de cuatro movimientos (particle diagram + steps).
   * ------------------------------------------------------------------ */
  const STEPS = [
    ['OBSERVAR', 'Hacer visible lo que el sistema dejó de ver.', 'SIGNAL'],
    ['EXPANDIR', 'Introducir otras perspectivas, futuros y preguntas.', 'FIELD'],
    ['RECONFIGURAR', 'Explorar nuevas relaciones entre los elementos del sistema.', 'SYSTEM'],
    ['ACTIVAR', 'Convertir las posibilidades en experimentos, decisiones y acciones.', 'EXPERIMENT']
  ];
  let step = 0, lastPick = 0, cycleVisible = false, redrawCycle = null;

  function setStep(i) {
    step = i;
    $('[data-step-num]').textContent = '0' + (i + 1) + ' / 04';
    $('[data-step-name]').textContent = STEPS[i][0];
    $('[data-step-desc]').textContent = STEPS[i][1];
    $('[data-step-mode]').textContent = STEPS[i][2];
    $$('[data-step]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.step === i)));
    redrawCycle && redrawCycle();
  }

  function startCycle(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, raf = 0, visible = true, t = 0, last = -1, stepAt = performance.now();
    const N = 900, P = [];
    for (let i = 0; i < N; i++) P.push({ a: Math.random() * 6.283, r0: Math.random(), sx: Math.random(), sy: Math.random(), layer: i % 6, k: i % 4, sp: .4 + Math.random(), z: Math.random() * 1.4 + .7, x: 0, y: 0, life: Math.random() });
    const NA = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const frame = still => {
      t++;
      const now = performance.now(), st = step;
      if (st !== last) { last = st; stepAt = now; }
      const prog = Math.min(1, (now - stepAt) / 3600);
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .375;
      ctx.globalAlpha = 1;
      if (reduced) ctx.clearRect(0, 0, w, h);
      else { // fade trails without painting a colour (keeps the canvas transparent)
        ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over';
      }
      ctx.strokeStyle = 'rgba(244,244,238,.22)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
      const a0 = NA[st];
      ctx.strokeStyle = Y; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + (Math.PI / 2) * (reduced ? 1 : prog)); ctx.stroke();
      const scan = t * .025;
      const mb = mouse ? canvas.getBoundingClientRect() : null;
      const mx = mb ? mouse.x - mb.left : -9999, my = mb ? mouse.y - mb.top : -9999;
      const centers = [];
      if (st === 2) for (let k = 0; k < 4; k++) { const a = t * .006 + k * 1.571 + Math.sin(t * .01 + k) * .5, rr = R * (.45 + .15 * Math.sin(t * .013 + k * 2)); centers.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      for (let i = 0; i < N; i++) {
        const p = P[i]; let tx, ty, yellow = false, e = .06;
        if (st === 0) { // Observar: a rotating beam orders the scattered particles
          const ang = Math.atan2(p.sy - .5, p.sx - .5), d = ((ang - scan) % 6.283 + 6.283) % 6.283;
          if (d < .7) { const rr = R * (.2 + p.r0 * .8); tx = cx + Math.cos(ang) * rr; ty = cy + Math.sin(ang) * rr; yellow = d < .25; e = .12; }
          else { tx = p.sx * w + Math.sin(t * .01 + i) * 6; ty = p.sy * h + Math.cos(t * .012 + i) * 6; e = .03; }
        } else if (st === 1) { // Expandir: counter-rotating concentric rings
          p.a += .004 * (1 + p.layer * .35) * (p.layer % 2 ? 1 : -1);
          const rr = R * (.25 + p.layer * .16) * (1 + Math.sin(t * .03 - p.layer) * .04);
          tx = cx + Math.cos(p.a) * rr; ty = cy + Math.sin(p.a) * rr; yellow = p.layer === Math.floor(t / 30) % 6 && p.r0 < .6;
        } else if (st === 2) { // Reconfigurar: four drifting nuclei
          const c = centers[p.k], rr = Math.sqrt(p.r0) * R * .2; p.a += .01 * p.sp;
          tx = c[0] + Math.cos(p.a) * rr; ty = c[1] + Math.sin(p.a) * rr; yellow = p.r0 < .06;
        } else { // Activar: particles launched outward from the orbit
          p.a += .012 * p.sp; p.life += .006 * p.sp;
          if (p.life > 1) p.life = 0;
          const out = p.r0 < .35 ? Math.pow(p.life, 2) * R * 1.1 : 0;
          tx = cx + Math.cos(p.a) * (R + out) + Math.cos(p.a + 1.571) * out * .6; ty = cy + Math.sin(p.a) * (R + out) + Math.sin(p.a + 1.571) * out * .6;
          yellow = out > 2; e = .14;
        }
        if (still === true || reduced) e = Math.max(e, .2);
        p.x += (tx - p.x) * e; p.y += (ty - p.y) * e;
        let px = p.x, py = p.y; const dx = px - mx, dy = py - my, dd = Math.hypot(dx, dy);
        if (dd < 90 && dd > 0) { const f = (1 - dd / 90) * 20; px += dx / dd * f; py += dy / dd * f; }
        ctx.globalAlpha = yellow ? 1 : .6; ctx.fillStyle = yellow ? Y : MIST;
        ctx.fillRect(px, py, p.z, p.z);
      }
      ctx.globalAlpha = 1;
      if (st === 2) {
        const links = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]][Math.floor(t / 70) % 3];
        ctx.strokeStyle = Y; ctx.lineWidth = 1.5;
        links.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(centers[a][0], centers[a][1]); ctx.lineTo(centers[b][0], centers[b][1]); ctx.stroke(); });
        ctx.strokeStyle = 'rgba(244,244,238,.3)'; ctx.lineWidth = 1;
        for (let k = 0; k < 4; k++) { const c = centers[k], n = centers[(k + 1) % 4]; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(n[0], n[1]); ctx.stroke(); }
      }
      if (st === 0) { ctx.strokeStyle = 'rgba(253,238,61,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(scan) * R * 1.15, cy + Math.sin(scan) * R * 1.15); ctx.stroke(); }
      // travelling pulse head on the orbit
      const ha = a0 + (Math.PI / 2) * prog;
      ctx.fillStyle = Y; ctx.beginPath(); ctx.arc(cx + Math.cos(ha) * R, cy + Math.sin(ha) * R, 4 + Math.sin(t * .15) * 1.5, 0, 6.283); ctx.fill();
      if (still !== true && !reduced && visible) raf = requestAnimationFrame(() => frame());
    };
    const resize = () => {
      const b = canvas.getBoundingClientRect(), dpr = DPR();
      w = b.width; h = b.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      P.forEach(p => { p.x = p.sx * w; p.y = p.sy * h; });
      ctx.clearRect(0, 0, w, h);
      if (reduced) for (let i = 0; i < 90; i++) frame(true);
    };
    new ResizeObserver(resize).observe(canvas); resize();
    new IntersectionObserver(es => es.forEach(e => {
      const was = visible; visible = e.isIntersecting;
      if (visible && !was && !reduced) raf = requestAnimationFrame(() => frame());
    })).observe(canvas);
    if (!reduced) raf = requestAnimationFrame(() => frame());
    else redrawCycle = () => { for (let i = 0; i < 90; i++) frame(true); };
  }

  function initCycle() {
    $$('[data-step]').forEach(b => b.addEventListener('click', () => { lastPick = Date.now(); setStep(+b.dataset.step); }));
    const sec = $('[data-cycle]');
    new IntersectionObserver(es => es.forEach(e => { cycleVisible = e.isIntersecting; }), { threshold: .35 }).observe(sec);
    startCycle($('[data-cycle-canvas]'));
    setInterval(() => {
      if (reduced || !OPTIONS.autoplayCycle || !cycleVisible || Date.now() - lastPick < 9000) return;
      setStep((step + 1) % 4);
    }, 3600);
  }

  /* ------------------------------------------------------------------
   * Portafolio symbols — animate while the card is hovered.
   * ------------------------------------------------------------------ */
  function initSymbols() {
    if (reduced) return;
    const E = 'cubic-bezier(.22,.8,.26,1)';
    const K = {
      star: [[{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(45deg) scale(.8)' }, { transform: 'rotate(90deg) scale(1)' }], { duration: 1800, iterations: Infinity, easing: E }],
      orb1: [[{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 4000, iterations: Infinity }],
      orb2: [[{ transform: 'rotate(0)' }, { transform: 'rotate(-360deg)' }], { duration: 6000, iterations: Infinity }],
      orb3: [[{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 8000, iterations: Infinity }],
      rays: [[{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(45deg) scale(1.12)' }, { transform: 'rotate(90deg) scale(1)' }], { duration: 2600, iterations: Infinity, easing: E }]
    };
    $$('[data-sym]').forEach(card => {
      const parts = $$('[data-anim]', card); let anims = [];
      card.addEventListener('pointerenter', () => {
        anims = parts.map(p => { const k = K[p.dataset.anim]; return k && p.animate(k[0], k[1]); }).filter(Boolean);
      });
      card.addEventListener('pointerleave', () => {
        anims.forEach(a => { a.updatePlaybackRate(.4); setTimeout(() => a.cancel(), 250); }); anims = [];
      });
    });
  }

  /* ------------------------------------------------------------------
   * Reveal-on-scroll.
   * ------------------------------------------------------------------ */
  function initReveals() {
    if (reduced) return;
    const vh = window.innerHeight;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'none'; }, +(el.dataset.delay || 0));
      io.unobserve(el);
    }), { threshold: .18, rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach(el => {
      if (el.getBoundingClientRect().top < vh * .9) return;
      el.style.opacity = '0'; el.style.transform = 'translateY(28px)';
      const cur = getComputedStyle(el).transition;
      const own = 'opacity .9s cubic-bezier(.22,.8,.26,1),transform .9s cubic-bezier(.22,.8,.26,1)';
      el.style.transition = cur && !/^all 0s/.test(cur) ? cur + ',' + own : own;
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------
   * Cursor — 14px yellow negative (difference blend) + 5px solid core.
   * ------------------------------------------------------------------ */
  let stopCursorFn = null;
  function startCursor() {
    if (stopCursorFn || !window.matchMedia('(pointer:fine)').matches) return;
    const mk = (size, extra) => {
      const d = document.createElement('div');
      Object.assign(d.style, { position: 'fixed', left: 0, top: 0, width: size + 'px', height: size + 'px', marginLeft: -size / 2 + 'px', marginTop: -size / 2 + 'px', borderRadius: '50%', background: Y, pointerEvents: 'none', opacity: 0, transition: 'opacity .3s', willChange: 'transform' }, extra);
      document.body.appendChild(d); return d;
    };
    const dot = mk(14, { zIndex: 9999, mixBlendMode: 'difference' });
    const core = mk(5, { zIndex: 10000 });
    document.documentElement.classList.add('hn-cursor');
    let mx = -200, my = -200, px = mx, py = my, raf;
    const move = e => { mx = e.clientX; my = e.clientY; dot.style.opacity = core.style.opacity = 1; };
    const leave = () => { dot.style.opacity = core.style.opacity = 0; };
    window.addEventListener('mousemove', move); document.addEventListener('mouseleave', leave);
    const tick = () => {
      const k = reduced ? 1 : .25;
      px += (mx - px) * k; py += (my - py) * k;
      dot.style.transform = core.style.transform = 'translate(' + px + 'px,' + py + 'px)';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    stopCursorFn = () => {
      cancelAnimationFrame(raf); window.removeEventListener('mousemove', move); document.removeEventListener('mouseleave', leave);
      dot.remove(); core.remove(); document.documentElement.classList.remove('hn-cursor'); stopCursorFn = null;
    };
  }
  function stopCursor() { stopCursorFn && stopCursorFn(); }

  /* ------------------------------------------------------------------
   * Escritos — latest 3 Substack posts via rss2json.
   * ------------------------------------------------------------------ */
  function loadPosts() {
    const list = $('[data-posts]'), msg = $('[data-posts-msg]');
    const feed = 'https://hipernova.substack.com/feed';
    const strip = h => (new DOMParser().parseFromString(h || '', 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
    const clip = (s, n) => s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s;
    const fmt = d => { const x = new Date(String(d).replace(' ', 'T')); return isNaN(x) ? '' : x.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', ''); };
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed))
      .then(r => r.json())
      .then(j => {
        if (j.status !== 'ok' || !j.items || !j.items.length) throw new Error('feed');
        j.items.slice(0, 3).forEach((it, i) => {
          const img = (it.enclosure && it.enclosure.link) || it.thumbnail || ((it.content || '').match(/<img[^>]+src="([^"]+)"/) || [])[1] || '';
          const a = el('a', 'post'); a.href = it.link; a.target = '_blank'; a.rel = 'noopener';
          const fig = el('div', 'post__img');
          if (img) { const im = el('img'); im.src = img; im.alt = ''; im.loading = 'lazy'; fig.appendChild(im); }
          const body = el('div', 'post__body');
          body.append(
            el('span', 'meta', '0' + (i + 1) + ' · ' + fmt(it.pubDate)),
            el('h3', null, it.title),
            el('p', null, clip(strip(it.description || it.content), 150)),
            el('span', 'more', 'Leer artículo ↗')
          );
          a.append(fig, body); list.appendChild(a);
        });
        list.hidden = false; msg.hidden = true;
      })
      .catch(() => { msg.textContent = 'No pudimos cargar los artículos ahora. Puedes leerlos todos directamente en Substack.'; });
  }

  /* ------------------------------------------------------------------
   * Contact form — shows the confirmation. Not wired to a backend yet.
   * ------------------------------------------------------------------ */
  function initForm() {
    const form = $('[data-contact-form]'), sent = $('[data-contact-sent]');
    form.addEventListener('submit', e => { e.preventDefault(); form.hidden = true; sent.hidden = false; });
  }

  /* ------------------------------------------------------------------
   * Núcleo — admin layer. NOTE: the passphrase lives in client code, so
   * this only prevents accidental access; it is not real security.
   * ------------------------------------------------------------------ */
  const CORE_PASS = 'Hipernova.1987';
  function initCore() {
    const dlg = $('[data-core]'), lock = $('[data-core-lock]'), panel = $('[data-core-panel]');
    const pass = $('[data-core-pass]'), err = $('[data-core-error]');
    let unlocked = false;
    try { unlocked = sessionStorage.getItem('hn-core-ok') === '1'; } catch (e) {}
    const render = () => { lock.hidden = unlocked; panel.hidden = !unlocked; };
    const open = () => { dlg.hidden = false; render(); (unlocked ? $('[data-switch]', panel) : pass).focus(); };
    const close = () => { dlg.hidden = true; pass.value = ''; err.hidden = true; };
    $('[data-core-open]').addEventListener('click', open);
    $('[data-core-close]').addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !dlg.hidden) close(); });
    pass.addEventListener('input', () => { err.hidden = true; });
    lock.addEventListener('submit', e => {
      e.preventDefault();
      if (pass.value === CORE_PASS) {
        unlocked = true; pass.value = ''; err.hidden = true;
        try { sessionStorage.setItem('hn-core-ok', '1'); } catch (er) {}
        render();
      } else err.hidden = false;
    });
    $('[data-core-logout]').addEventListener('click', () => {
      unlocked = false;
      try { sessionStorage.removeItem('hn-core-ok'); } catch (er) {}
      close();
    });
    $$('[data-switch]').forEach(sw => sw.addEventListener('click', () => setCfg(sw.dataset.switch, !cfg[sw.dataset.switch])));
    if (location.hash === '#nucleo') open();
  }

  /* ------------------------------------------------------------------ */
  function init() {
    applyCfg();
    initReveals();
    initPhrase();
    if (cfg.cursor) startCursor();
    initCore();
    loadPosts();
    if (OPTIONS.particles) {
      startField($('[data-field="hero"]'), 'hero');
      const mean = startField($('[data-field="mean"]'), 'mean');
      if (mean) meanRedraw = mean.redraw;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    initCycle();
    initSymbols();
    initForm();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
