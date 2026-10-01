/* ==========================================================================
   NEXUM CONSTRUCCIONES · main.js
   --------------------------------------------------------------------------
   JavaScript puro (sin librerías). Módulos:
     00 Configuración y utilidades        09 Escena 3D del hero (canvas)
     01 Preloader                          10 Panel de obra del hero + reloj
     02 Header y menú móvil                11 Galería horizontal fija (proyectos)
     03 Motor de scroll (tema, rail, barra) 12 Proceso (cronograma sincronizado)
     04 Revelado al scroll y titulares     13 Filtros de servicios
     05 Contadores y texto "scramble"      14 FAQ (acordeón)
     06 Parallax                           15 Lightbox
     07 Interacciones (tilt, glow, imán)   16 Formulario → WhatsApp
     08 Enlaces de WhatsApp                17 Botón flotante e inicio
   Todo respeta prefers-reduced-motion y pausa las animaciones fuera de pantalla.
   ========================================================================== */
(() => {
  'use strict';

  /* ========================================================================
     00 · CONFIGURACIÓN Y UTILIDADES
     ► Para cambiar el número de WhatsApp, edita CONFIG.whatsapp
       (formato internacional, sin "+"), y los enlaces wa.me del index.html.
  ======================================================================== */
  const CONFIG = {
    whatsapp: '5215642705732',
    brand: 'Nexum Construcciones',
    timezone: 'America/Mexico_City',
    defaultMessage: 'Hola, quiero cotizar un proyecto con Nexum Construcciones.'
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const ease = {
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOut: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  };

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

  /** Ejecuta un módulo sin que un error tumbe al resto de la página. */
  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.error(`[Nexum] Error en "${name}":`, err); }
  };

  /* ========================================================================
     01 · PRELOADER
     Progreso simulado con compuerta real (load + fuentes) y cortina final.
  ======================================================================== */
  const Preloader = (() => {
    const el = $('#preloader');
    let fired = false;

    function fireReady() {
      if (fired) return;
      fired = true;
      clearTimeout(window.__nxFailsafe);
      root.classList.add('is-ready');
      root.classList.remove('is-loading');
      document.dispatchEvent(new CustomEvent('nx:ready'));
      if (el) setTimeout(() => el.classList.add('is-done'), 1900);
    }

    function whenReady(fn) {
      if (fired) fn(); else document.addEventListener('nx:ready', fn, { once: true });
    }

    function init() {
      if (!el || reduceMotion) { fireReady(); return; }

      const pct = $('#plPct');
      const bar = $('#plBar');
      const ring = $('#plProgress');
      const status = $('#plStatus');
      const messages = ['Inicializando obra', 'Preparando cimentación', 'Levantando estructura', 'Instalando sistemas', 'Aplicando acabados', 'Obra lista'];

      const MIN = 2300;   // tiempo mínimo para que la animación de marca se aprecie
      const MAX = 6500;   // tope: nunca bloquea al usuario
      const t0 = performance.now();
      let loaded = document.readyState === 'complete';
      let fontsOk = !(document.fonts && document.fonts.ready);
      let phase = 'run';
      let p = 0;
      let finishAt = 0;
      let p0 = 0;
      let lastMsg = -1;

      if (!loaded) window.addEventListener('load', () => { loaded = true; }, { once: true });
      if (!fontsOk) document.fonts.ready.then(() => { fontsOk = true; }).catch(() => { fontsOk = true; });

      const render = (v) => {
        pct.textContent = pad(Math.round(v * 100), 3);
        bar.style.transform = `scaleX(${v.toFixed(4)})`;
        ring.style.strokeDashoffset = (100 - v * 100).toFixed(2);
        const m = Math.min(messages.length - 1, Math.floor(v * messages.length));
        if (m !== lastMsg) { lastMsg = m; status.textContent = messages[m]; }
      };

      const frame = (now) => {
        const t = now - t0;
        if (phase === 'run') {
          p = ease.outCubic(clamp(t / 2100)) * 0.92;
          if ((t >= MIN && loaded && fontsOk) || t >= MAX) { phase = 'finish'; finishAt = now; p0 = p; }
        } else {
          const k = clamp((now - finishAt) / 520);
          p = lerp(p0, 1, ease.outCubic(k));
          if (k >= 1) { render(1); setTimeout(fireReady, 380); return; }
        }
        render(p);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    return { init, whenReady };
  })();

  /* ========================================================================
     02 · HEADER Y MENÚ MÓVIL
  ======================================================================== */
  const Header = (() => {
    const header = $('#header');
    const burger = $('#burger');
    const menu = $('#menu');
    const blockers = () => [$('#contenido'), $('.footer'), $('#waFloat')].filter(Boolean);
    let open = false;

    function setOpen(v) {
      open = v;
      burger.setAttribute('aria-expanded', String(v));
      burger.setAttribute('aria-label', v ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('is-open', v);
      menu.setAttribute('aria-hidden', String(!v));
      if ('inert' in menu) menu.inert = !v;
      blockers().forEach((el) => { if ('inert' in el) el.inert = v; });
      root.style.overflow = v ? 'hidden' : '';
      root.classList.toggle('menu-open', v);
      if (v) header.dataset.theme = 'dark';
      else document.dispatchEvent(new CustomEvent('nx:menu-closed'));
    }

    function init() {
      if (!header || !burger || !menu) return;
      if ('inert' in menu) menu.inert = true;
      $$('.menu__list li', menu).forEach((li, i) => li.style.setProperty('--i', i));
      burger.addEventListener('click', () => setOpen(!open));
      $$('a', menu).forEach((a) => a.addEventListener('click', () => setOpen(false)));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { setOpen(false); burger.focus(); } });
      window.addEventListener('resize', () => { if (open && window.innerWidth >= 1120) setOpen(false); });
    }

    return { init, isOpen: () => open };
  })();

  /* ========================================================================
     03 · MOTOR DE SCROLL
     Un solo listener + rAF. Gestiona: barra de progreso, estado del header,
     tema bajo el header, enlace activo, rail de secciones y suscriptores.
  ======================================================================== */
  const Scroll = (() => {
    const header = $('#header');
    const bar = $('#scrollProgress span');
    const sections = $$('[data-section]');
    const navLinks = $$('.nav__link');
    const subs = [];
    let rail = null;
    let railLinks = [];
    let ticking = false;
    let vh = window.innerHeight;
    let theme = 'dark';
    let current = '';

    function buildRail() {
      rail = document.createElement('nav');
      rail.className = 'rail';
      rail.setAttribute('aria-hidden', 'true');
      rail.dataset.theme = 'dark';
      const ul = document.createElement('ul');
      sections.forEach((s) => {
        if (!s.id) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${s.id}`;
        a.tabIndex = -1;
        a.dataset.rail = s.id;
        const label = document.createElement('span');
        label.textContent = s.dataset.section;
        a.appendChild(label);
        li.appendChild(a);
        ul.appendChild(li);
      });
      rail.appendChild(ul);
      document.body.appendChild(rail);
      railLinks = $$('a', rail);
    }

    function update() {
      ticking = false;
      const y = window.scrollY || window.pageYOffset || 0;

      header.classList.toggle('is-scrolled', y > 24);
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      bar.style.transform = `scaleX(${clamp(y / max).toFixed(4)})`;

      // Qué sección está bajo el header (tema) y cuál en el centro de la pantalla (activa)
      const hy = 34;
      const my = vh * .42;
      let themeNow = theme;
      let secNow = current;
      let secTheme = theme;
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        const r = s.getBoundingClientRect();
        if (r.top <= hy && r.bottom > hy) themeNow = s.dataset.theme || themeNow;
        if (r.top <= my && r.bottom > my) { secNow = s.id; secTheme = s.dataset.theme || secTheme; }
      }
      if (themeNow !== theme && !Header.isOpen()) {
        theme = themeNow;
        header.dataset.theme = theme;
      }
      if (rail) rail.dataset.theme = secTheme;
      if (secNow !== current) {
        current = secNow;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${current}`));
        railLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.rail === current));
      }

      for (let i = 0; i < subs.length; i++) subs[i](y, vh);
    }

    function request() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    function init() {
      buildRail();
      window.addEventListener('scroll', request, { passive: true });
      window.addEventListener('resize', () => { vh = window.innerHeight; request(); }, { passive: true });
      document.addEventListener('nx:menu-closed', () => { header.dataset.theme = theme; });
      update();
    }

    return { init, on: (fn) => subs.push(fn), request };
  })();

  /* ========================================================================
     04 · REVELADO AL SCROLL, TITULARES PARTIDOS, CONTADORES Y "SCRAMBLE"
  ======================================================================== */
  const Reveal = (() => {
    /** Envuelve cada palabra de un titular para animarla desde una máscara. */
    function splitWords(el) {
      let idx = 0;
      const walk = (node) => {
        Array.from(node.childNodes).forEach((child) => {
          if (child.nodeType === 3) {
            if (!child.textContent.trim()) return;
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              const outer = document.createElement('span');
              outer.className = 'sw';
              const inner = document.createElement('span');
              inner.className = 'sw__i';
              inner.style.setProperty('--wi', idx++);
              inner.textContent = part;
              outer.appendChild(inner);
              frag.appendChild(outer);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && child.tagName !== 'BR') {
            walk(child);
          }
        });
      };
      const label = el.textContent.replace(/\s+/g, ' ').trim();
      walk(el);
      el.setAttribute('aria-label', label);
    }

    /** Efecto de decodificación de texto (para las etiquetas técnicas). */
    function scramble(el) {
      if (el.dataset.scrambled) return;
      el.dataset.scrambled = '1';
      const finalText = el.textContent;
      if (reduceMotion) return;
      const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+#';
      const dur = 620 + finalText.length * 45;
      const t0 = performance.now();
      const step = (now) => {
        const k = clamp((now - t0) / dur);
        const done = Math.floor(k * finalText.length);
        let out = '';
        for (let i = 0; i < finalText.length; i++) {
          const ch = finalText[i];
          out += (i < done || ch === ' ') ? ch : glyphs[(Math.random() * glyphs.length) | 0];
        }
        el.textContent = k < 1 ? out : finalText;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    /** Contador animado de 0 al valor objetivo. */
    function countUp(el) {
      if (el.dataset.counted) return;
      el.dataset.counted = '1';
      const end = parseFloat(el.dataset.count);
      if (Number.isNaN(end) || reduceMotion) return;
      const dur = 1500 + end * 25;
      const t0 = performance.now();
      el.textContent = '0';
      const step = (now) => {
        const k = clamp((now - t0) / dur);
        el.textContent = Math.round(end * ease.outExpo(k)).toLocaleString('es-MX');
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function onIn(target) {
      $$('[data-scramble]', target).forEach(scramble);
      $$('[data-count]', target).forEach(countUp);
      if (target.matches('[data-scramble]')) scramble(target);
      if (target.matches('[data-count]')) countUp(target);
    }

    function prepare() {
      // Las tarjetas de servicio se revelan de forma programática
      $$('.svc').forEach((el) => el.setAttribute('data-reveal', 'up'));
      $$('[data-delay]').forEach((el) => el.style.setProperty('--d', `${parseInt(el.dataset.delay, 10) || 0}ms`));

      // Escalonado por columna dentro de rejillas
      $$('[data-stagger], #svcGrid').forEach((group) => {
        const kids = Array.from(group.children).filter((c) => c.hasAttribute('data-reveal') && !c.hasAttribute('data-delay'));
        if (!kids.length) return;
        const cols = Math.max(1, new Set(kids.map((k) => Math.round(k.getBoundingClientRect().left))).size);
        kids.forEach((k, i) => k.style.setProperty('--d', `${(i % cols) * 90}ms`));
      });

      // Índice de trazo para los planos SVG (se dibujan en cascada)
      $$('.bp__draw, .bp__dim').forEach((g) => Array.from(g.children).forEach((p, i) => p.style.setProperty('--k', i)));

      $$('[data-split]').forEach(splitWords);
    }

    function observe() {
      const targets = $$('[data-reveal], [data-split], [data-io]');
      if (!('IntersectionObserver' in window)) {
        targets.forEach((t) => { t.classList.add('is-in'); onIn(t); });
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const t = entry.target;
          t.classList.add('is-in');
          onIn(t);
          io.unobserve(t);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      targets.forEach((t) => io.observe(t));
    }

    function init() {
      prepare();
      // Los efectos se activan cuando termina el preloader, para que se vean
      Preloader.whenReady(() => setTimeout(observe, 450));
    }

    return { init };
  })();

  /* ========================================================================
     06 · PARALLAX (imágenes dentro de sus marcos)
  ======================================================================== */
  const Parallax = (() => {
    const items = $$('[data-parallax-img]').map((img) => ({
      img,
      box: img.parentElement,
      speed: parseFloat(img.dataset.parallaxImg) || .08
    }));

    function update(y, vh) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const r = it.box.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) continue;
        const c = r.top + r.height / 2 - vh / 2;
        const max = r.height * .07;
        it.img.style.setProperty('--py', `${clamp(-c * it.speed, -max, max).toFixed(1)}px`);
      }
    }

    function init() {
      if (reduceMotion || !items.length) return;
      Scroll.on(update);
    }
    return { init };
  })();

  /* ========================================================================
     07 · INTERACCIONES (solo con puntero fino): tilt 3D, brillo, imán, foco
  ======================================================================== */
  const Interactions = (() => {
    function glow() {
      document.addEventListener('pointermove', (e) => {
        const el = e.target.closest ? e.target.closest('[data-glow]') : null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
        el.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
      }, { passive: true });
    }

    function tilt() {
      $$('[data-tilt]').forEach((el) => {
        let raf = 0;
        let rect = null;
        el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
        el.addEventListener('pointermove', (e) => {
          if (raf || !rect) return;
          raf = requestAnimationFrame(() => {
            raf = 0;
            const px = (e.clientX - rect.left) / rect.width - .5;
            const py = (e.clientY - rect.top) / rect.height - .5;
            el.style.setProperty('--ry', `${(px * 6).toFixed(2)}deg`);
            el.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`);
          });
        });
        el.addEventListener('pointerleave', () => {
          el.style.setProperty('--rx', '0deg');
          el.style.setProperty('--ry', '0deg');
        });
      });
    }

    function magnetic() {
      $$('[data-magnetic]').forEach((btn) => {
        btn.addEventListener('pointermove', (e) => {
          const r = btn.getBoundingClientRect();
          const x = e.clientX - (r.left + r.width / 2);
          const y = e.clientY - (r.top + r.height / 2);
          btn.style.setProperty('--tx', `${(x * .16).toFixed(1)}px`);
          btn.style.setProperty('--ty', `${(y * .26).toFixed(1)}px`);
        });
        btn.addEventListener('pointerleave', () => {
          btn.style.setProperty('--tx', '0px');
          btn.style.setProperty('--ty', '0px');
        });
      });
    }

    function heroSpot() {
      const hero = $('#inicio');
      const spot = $('.hero__spot');
      if (!hero || !spot) return;
      let raf = 0;
      hero.addEventListener('pointermove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = hero.getBoundingClientRect();
          spot.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
          spot.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
        });
      }, { passive: true });
    }

    function init() {
      if (!finePointer || reduceMotion) return;
      glow();
      tilt();
      magnetic();
      heroSpot();
    }
    return { init };
  })();

  /* ========================================================================
     08 · ENLACES DE WHATSAPP (todos salen de CONFIG)
  ======================================================================== */
  const Links = (() => {
    function init() {
      $$('[data-wa]').forEach((a) => {
        a.href = waLink(a.dataset.wa || CONFIG.defaultMessage);
        a.target = '_blank';
        a.rel = 'noopener';
      });
    }
    return { init };
  })();

  /* ========================================================================
     09 · ESCENA 3D DEL HERO (canvas 2D con proyección en perspectiva propia)
     Un conjunto de torres en alambre que se "construyen" en bucle, una red de
     nodos (Nexum = nexo), un plano de escaneo y polvo dorado. Reacciona al
     puntero y al scroll. Se pausa fuera de pantalla y con la pestaña oculta.
  ======================================================================== */
  const HeroScene = (() => {
    const canvas = $('#heroCanvas');
    const hero = $('#inicio');
    if (!canvas || !hero || !canvas.getContext) return { init() {}, onProgress() {} };
    const ctx = canvas.getContext('2d');

    // Ciclo de la escena (ms): construir → mantener (con escáner) → reiniciar
    const BUILD = 5800;
    const HOLD = 9800;
    const RESET = 2000;
    const CYCLE = BUILD + HOLD + RESET;

    // Cámara y geometría (unidades de escena)
    const CAM = 9;
    const PITCH = .5;
    const Y0 = 1.35;
    const FLOOR = .26;
    const GRID = 5;
    const cosP = Math.cos(PITCH);
    const sinP = Math.sin(PITCH);

    const towers = [
      { x: -1.9, z: .2, w: .9, d: .9, h: 1.6, o: 0 },
      { x: -.7, z: -.55, w: .95, d: .95, h: 2.7, o: .1 },
      { x: .45, z: .35, w: .85, d: .85, h: 3.5, o: .2 },
      { x: 1.6, z: -.45, w: .8, d: .8, h: 2.2, o: .3 },
      { x: -.35, z: 1.55, w: 1.2, d: .7, h: .9, o: .4 },
      { x: 1.7, z: 1.3, w: .7, d: .7, h: 1.4, o: .48 },
      { x: -1.9, z: -1.6, w: .6, d: .6, h: 1.1, o: .56 },
      { x: .35, z: -1.8, w: .75, d: .75, h: 1.9, o: .62 }
    ];
    const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

    let W = 0;
    let H = 0;
    let DPR = 1;
    let cx = 0;
    let cy = 0;
    let S = 60;
    let cxE = 0;
    let cyE = 0;
    let cosY = 1;
    let sinY = 0;
    let raf = 0;
    let last = 0;
    let start = 0;
    let running = false;
    let started = false;
    let inView = true;
    let lowPower = false;
    let scrollY = 0;
    let nodes = [];
    let dust = [];
    let progressCb = null;
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    const P = { x: 0, y: 0, d: 1 };
    const bx = [0, 0, 0, 0];
    const by = [0, 0, 0, 0];
    const tx = [0, 0, 0, 0];
    const ty = [0, 0, 0, 0];

    /** Proyección en perspectiva con rotación en Y y inclinación fija. */
    function proj(x, y, z) {
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const yy = y - Y0;
      const y2 = yy * cosP + z1 * sinP;
      const z2 = z1 * cosP - yy * sinP;
      const d = CAM / (CAM + z2);
      P.x = cxE + x1 * S * d;
      P.y = cyE - y2 * S * d;
      P.d = d;
      return P;
    }

    function buildParticles() {
      const n = lowPower ? 30 : 56;
      nodes = Array.from({ length: n }, () => ({
        x: (Math.random() * 2 - 1) * 4.8,
        y: .1 + Math.random() * 4.6,
        z: (Math.random() * 2 - 1) * 3.8,
        ph: Math.random() * 6.283,
        sp: .12 + Math.random() * .3,
        r: .8 + Math.random() * 1.3,
        wx: 0, wy: 0, wz: 0, px: 0, py: 0, pd: 1
      }));
      const m = lowPower ? 26 : 54;
      dust = Array.from({ length: m }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        v: 6 + Math.random() * 14,
        r: .5 + Math.random() * 1.4,
        ph: Math.random() * 6.283
      }));
    }

    function layout() {
      const r = hero.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      lowPower = (navigator.hardwareConcurrency || 4) <= 4 || W < 768;
      DPR = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (W >= 1100) { cx = W * .625; cy = H * .43; S = Math.min(W * .069, H * .1); }
      else if (W >= 900) { cx = W * .73; cy = H * .45; S = Math.min(W * .056, H * .09); }
      else if (W >= 768) { cx = W * .5; cy = H - 250; S = Math.min(W * .062, 64); }
      else { cx = W * .5; cy = H - 215; S = Math.min(W * .1, 46); }
      buildParticles();
      if (!running) draw(start ? performance.now() - start : 0, 1, 0);
    }

    function progressAt(t) {
      const c = ((t % CYCLE) + CYCLE) % CYCLE;
      if (c < BUILD) return c / BUILD;
      if (c < BUILD + HOLD) return 1;
      return 1 - ease.inOut((c - BUILD - HOLD) / RESET);
    }

    function ring(arrX, arrY) {
      ctx.moveTo(arrX[0], arrY[0]);
      ctx.lineTo(arrX[1], arrY[1]);
      ctx.lineTo(arrX[2], arrY[2]);
      ctx.lineTo(arrX[3], arrY[3]);
      ctx.closePath();
    }

    function draw(t, p, dt) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const secs = t / 1000;
      const still = reduceMotion;

      const yaw = (still ? 0 : secs * .12) + scrollY * .0013 + mouse.sx * .38 + .55;
      cosY = Math.cos(yaw);
      sinY = Math.sin(yaw);
      cxE = cx;
      cyE = cy - scrollY * .22 + mouse.sy * 10;

      // Polvo dorado (2D) que asciende
      for (let i = 0; i < dust.length; i++) {
        const d = dust[i];
        d.y -= d.v * dt / 1000;
        if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; }
        const a = .1 + .3 * Math.abs(Math.sin(secs * .9 + d.ph));
        ctx.fillStyle = `rgba(232,208,155,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, 6.2832);
        ctx.fill();
      }

      // Plano del terreno
      ctx.beginPath();
      for (let i = -GRID; i <= GRID + 1e-6; i += .6) {
        proj(i, 0, -GRID); const ax = P.x; const ay = P.y;
        proj(i, 0, GRID); ctx.moveTo(ax, ay); ctx.lineTo(P.x, P.y);
        proj(-GRID, 0, i); const gx = P.x; const gy = P.y;
        proj(GRID, 0, i); ctx.moveTo(gx, gy); ctx.lineTo(P.x, P.y);
      }
      ctx.strokeStyle = 'rgba(201,165,93,.10)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Red de nodos (el "nexo")
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.wx = n.x + Math.sin(secs * n.sp + n.ph) * .35;
        n.wy = n.y + Math.cos(secs * n.sp * 1.3 + n.ph) * .25;
        n.wz = n.z + Math.sin(secs * n.sp * .8 + n.ph * 2) * .35;
        proj(n.wx, n.wy, n.wz);
        n.px = P.x; n.py = P.y; n.pd = P.d;
      }
      ctx.lineWidth = .7;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.wx - b.wx; const dy = a.wy - b.wy; const dz = a.wz - b.wz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 2.6) {
            const al = (1 - d2 / 2.6) * .34;
            ctx.strokeStyle = `rgba(201,165,93,${al.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.px, a.py);
            ctx.lineTo(b.px, b.py);
            ctx.stroke();
          }
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const a = clamp(.22 + (n.pd - .8) * 1.1, .14, .9);
        ctx.fillStyle = `rgba(246,231,189,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.px, n.py, n.r * n.pd, 0, 6.2832);
        ctx.fill();
      }

      // Plano de escaneo que sube y baja
      const tri = (v) => 1 - Math.abs(2 * (v - Math.floor(v)) - 1);
      const scanY = (still ? .6 : tri(secs / 7)) * 4.4;
      const R = 3.7;
      proj(-R, scanY, -R); const s0x = P.x; const s0y = P.y;
      proj(R, scanY, -R); const s1x = P.x; const s1y = P.y;
      proj(R, scanY, R); const s2x = P.x; const s2y = P.y;
      proj(-R, scanY, R); const s3x = P.x; const s3y = P.y;
      ctx.beginPath();
      ctx.moveTo(s0x, s0y); ctx.lineTo(s1x, s1y); ctx.lineTo(s2x, s2y); ctx.lineTo(s3x, s3y); ctx.closePath();
      ctx.fillStyle = 'rgba(221,191,122,.04)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(221,191,122,.26)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Torres
      for (let k = 0; k < towers.length; k++) {
        const tw = towers[k];
        const g = ease.outCubic(clamp((p - tw.o) / .38));
        const h = tw.h * g;
        if (h < .03) continue;
        const hw = tw.w / 2;
        const hd = tw.d / 2;

        proj(tw.x, h / 2, tw.z);
        const a = clamp(.3 + (P.d - .85) * 1.7, .22, 1) * (.4 + .6 * g);

        for (let i = 0; i < 4; i++) {
          const wx = tw.x + CORNERS[i][0] * hw;
          const wz = tw.z + CORNERS[i][1] * hd;
          proj(wx, 0, wz); bx[i] = P.x; by[i] = P.y;
          proj(wx, h, wz); tx[i] = P.x; ty[i] = P.y;
        }

        // Cara superior translúcida
        ctx.beginPath();
        ring(tx, ty);
        ctx.fillStyle = `rgba(201,165,93,${(.09 * a).toFixed(3)})`;
        ctx.fill();

        // Aristas principales
        ctx.beginPath();
        for (let i = 0; i < 4; i++) { ctx.moveTo(bx[i], by[i]); ctx.lineTo(tx[i], ty[i]); }
        ring(bx, by);
        ring(tx, ty);
        ctx.strokeStyle = `rgba(236,213,160,${(.62 * a).toFixed(3)})`;
        ctx.lineWidth = 1.15;
        ctx.stroke();

        // Pisos (líneas de nivel)
        ctx.beginPath();
        for (let y = FLOOR; y < h - .02; y += FLOOR) {
          for (let i = 0; i < 4; i++) {
            proj(tw.x + CORNERS[i][0] * hw, y, tw.z + CORNERS[i][1] * hd);
            bx[i] = P.x; by[i] = P.y;
          }
          ring(bx, by);
        }
        ctx.strokeStyle = `rgba(201,165,93,${(.22 * a).toFixed(3)})`;
        ctx.lineWidth = .8;
        ctx.stroke();

        // Anillo resaltado donde el plano de escaneo corta la torre
        if (scanY < h) {
          for (let i = 0; i < 4; i++) {
            proj(tw.x + CORNERS[i][0] * hw, scanY, tw.z + CORNERS[i][1] * hd);
            bx[i] = P.x; by[i] = P.y;
          }
          ctx.beginPath();
          ring(bx, by);
          ctx.strokeStyle = `rgba(255,242,205,${(.95 * a).toFixed(3)})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }

        // Vértices superiores
        ctx.fillStyle = `rgba(255,240,200,${(.9 * a).toFixed(3)})`;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(tx[i], ty[i], 1.5, 0, 6.2832);
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      if (progressCb) progressCb(p);
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(64, now - last);
      last = now;
      mouse.sx += (mouse.x - mouse.sx) * .05;
      mouse.sy += (mouse.y - mouse.sy) * .05;
      const t = Math.max(0, now - start);
      draw(t, progressAt(t), dt);
    }

    function play() {
      if (running || reduceMotion || !started) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }
    function sync() {
      if (inView && !document.hidden) play(); else stop();
    }

    function init() {
      layout();
      if (typeof ResizeObserver !== 'undefined') {
        let pending = 0;
        new ResizeObserver(() => {
          cancelAnimationFrame(pending);
          pending = requestAnimationFrame(layout);
        }).observe(hero);
      } else {
        window.addEventListener('resize', layout, { passive: true });
      }

      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
      }
      document.addEventListener('visibilitychange', sync);

      if (finePointer && !reduceMotion) {
        hero.addEventListener('pointermove', (e) => {
          mouse.x = (e.clientX / window.innerWidth - .5) * 2;
          mouse.y = (e.clientY / window.innerHeight - .5) * 2;
        }, { passive: true });
        hero.addEventListener('pointerleave', () => { mouse.x = 0; mouse.y = 0; });
      }

      // El hero se desvanece suavemente al hacer scroll
      const copy = $('.hero__copy');
      const panel = $('.hero__panel');
      Scroll.on((y) => {
        scrollY = y;
        if (y > H * 1.1) return;
        const k = clamp(y / (H * .75));
        if (copy) {
          copy.style.opacity = (1 - k * 1.15).toFixed(3);
          copy.style.transform = `translate3d(0, ${(-k * 54).toFixed(1)}px, 0)`;
        }
        if (panel) panel.style.transform = `translate3d(0, ${(-k * 90).toFixed(1)}px, 0)`;
      });

      if (reduceMotion) { started = true; draw(0, 1, 0); return; }
      Preloader.whenReady(() => {
        start = performance.now() + 450;
        started = true;
        sync();
      });
    }

    return { init, onProgress: (fn) => { progressCb = fn; } };
  })();

  /* ========================================================================
     10 · PANEL DE OBRA DEL HERO (sincronizado con la escena) + RELOJ
  ======================================================================== */
  const HeroPanel = (() => {
    const rows = $$('.prow');
    const ringEl = $('#hpRing');
    const pctEl = $('#hpPct');
    const stateEl = $('#hpState');
    const stageEl = $('#hpStage');
    const vals = rows.map((r) => $('.prow__val', r));
    const rowPct = rows.map(() => -1);
    const last = { overall: -1, stage: -1, state: '' };

    function update(p) {
      let total = 0;
      let startedRows = 0;
      rows.forEach((row, i) => {
        const v = clamp((p - i * .16) / .36);
        total += v;
        if (v > 0) startedRows++;
        const pc = Math.round(v * 100);
        if (pc !== rowPct[i]) {
          rowPct[i] = pc;
          vals[i].textContent = `${pc}%`;
          row.style.setProperty('--v', v.toFixed(3));
          row.classList.toggle('is-done', pc >= 100);
        }
      });
      const overall = Math.round((total / rows.length) * 100);
      if (overall !== last.overall) {
        last.overall = overall;
        pctEl.textContent = overall;
        ringEl.style.strokeDashoffset = (100 - overall).toFixed(1);
      }
      const stage = Math.max(1, startedRows);
      if (stage !== last.stage) { last.stage = stage; stageEl.textContent = stage; }
      const state = overall >= 100 ? 'Obra entregada' : 'En ejecución';
      if (state !== last.state) { last.state = state; stateEl.textContent = state; }
    }

    function init() {
      if (!rows.length || !ringEl) return;
      HeroScene.onProgress(update);
      update(reduceMotion ? 1 : 0);
    }
    return { init };
  })();

  const Clock = (() => {
    function init() {
      const el = $('#hudClock');
      if (!el) return;
      let fmt;
      try {
        fmt = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: CONFIG.timezone });
      } catch (e) { return; }
      const tick = () => { el.textContent = fmt.format(new Date()); };
      tick();
      setInterval(tick, 1000);
    }
    return { init };
  })();

  /* ========================================================================
     11 · GALERÍA HORIZONTAL FIJA (proyectos)
     Escritorio con puntero: la sección se "ancla" y el scroll vertical mueve
     la galería en horizontal. Móvil / táctil: carrusel nativo con snap.
  ======================================================================== */
  const HScroll = (() => {
    const hs = $('#hs');
    const track = $('#hsTrack');
    if (!hs || !track) return { init() {} };
    const cur = $('#hsCur');
    const bar = $('#hsBar');
    const cards = $$('.pcard', track);
    const mq = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
    let pinned = false;
    let distance = 0;
    let curIdx = 0;

    function update(y, vh) {
      if (!pinned) return;
      const r = hs.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const span = hs.offsetHeight - window.innerHeight;
      const p = span > 0 ? clamp(-r.top / span) : 0;
      track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px,0,0)`;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      const idx = clamp(Math.round(p * (cards.length - 1)) + 1, 1, cards.length);
      if (idx !== curIdx) { curIdx = idx; cur.textContent = pad(idx); }
    }

    function measure() {
      pinned = mq.matches && !reduceMotion;
      hs.classList.toggle('is-pinned', pinned);
      if (!pinned) {
        track.style.transform = '';
        hs.style.removeProperty('--hs-h');
        track.setAttribute('tabindex', '0');
        return;
      }
      track.removeAttribute('tabindex');
      $$('img[loading="lazy"]', hs).forEach((img) => { img.loading = 'eager'; });
      distance = Math.max(0, track.scrollWidth - window.innerWidth);
      hs.style.setProperty('--hs-h', `${Math.round(distance + window.innerHeight)}px`);
      update(window.scrollY, window.innerHeight);
    }

    function init() {
      measure();
      Scroll.on(update);
      if (mq.addEventListener) mq.addEventListener('change', measure); else mq.addListener(measure);
      window.addEventListener('resize', measure, { passive: true });
      window.addEventListener('load', measure);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    }
    return { init };
  })();

  /* ========================================================================
     12 · PROCESO: cronograma sincronizado con el avance por los pasos
  ======================================================================== */
  const Process = (() => {
    const section = $('#proceso');
    if (!section) return { init() {} };
    const steps = $$('.step', section);
    const rows = $$('.grow', section);
    const stepsEl = $('#steps');
    const ringEl = $('#ppRing');
    const pctEl = $('#ppPct');
    const stateEl = $('#ppState');
    const stageEl = $('#ppStage');
    const names = steps.map((s) => $('.step__title', s).textContent.trim());
    const labels = { done: 'Completado', active: 'En curso', pending: 'Pendiente' };
    const last = { pct: -1, stage: -1, state: '' };

    function update(y, vh) {
      const sr = section.getBoundingClientRect();
      if (sr.bottom < -120 || sr.top > vh + 120) return;

      const line = vh * .52;
      const rects = steps.map((s) => s.getBoundingClientRect());
      const cr = stepsEl.getBoundingClientRect();
      const prog = rects.map((r) => clamp((line - r.top) / r.height));
      const allDone = prog.every((v) => v >= 1);
      let active = prog.findIndex((v) => v > 0 && v < 1);
      if (active === -1 && !allDone) active = prog.findIndex((v) => v < 1);

      stepsEl.style.setProperty('--sp', clamp((line - cr.top) / cr.height).toFixed(3));
      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === active);
        s.classList.toggle('is-past', prog[i] >= 1);
      });
      rows.forEach((row, i) => {
        const st = prog[i] >= 1 ? 'done' : (i === active ? 'active' : 'pending');
        row.classList.toggle('is-done', st === 'done');
        row.classList.toggle('is-active', st === 'active');
        const p = st === 'done' ? 1 : (st === 'active' ? Math.max(.08, prog[i]) : 0);
        row.style.setProperty('--p', p.toFixed(3));
        const tag = $('.grow__st', row);
        if (tag.textContent !== labels[st]) tag.textContent = labels[st];
      });

      const pct = Math.round((prog.reduce((a, b) => a + b, 0) / steps.length) * 100);
      if (pct !== last.pct) {
        last.pct = pct;
        pctEl.textContent = pct;
        ringEl.style.strokeDashoffset = (100 - pct).toFixed(1);
      }
      const stage = allDone ? steps.length : Math.max(1, active + 1);
      if (stage !== last.stage) { last.stage = stage; stageEl.textContent = stage; }
      const state = allDone ? 'Obra entregada' : names[Math.max(0, active)];
      if (state !== last.state) { last.state = state; stateEl.textContent = state; }
    }

    function init() {
      if (!steps.length || !rows.length) return;
      Scroll.on(update);
    }
    return { init };
  })();

  /* ========================================================================
     13 · FILTROS DE SERVICIOS
  ======================================================================== */
  const Filters = (() => {
    function init() {
      const grid = $('#svcGrid');
      if (!grid) return;
      const buttons = $$('.filter');
      const items = $$('.svc', grid);
      const status = $('#filterStatus');
      let timer = 0;

      function apply(cat) {
        buttons.forEach((b) => {
          const on = b.dataset.filter === cat;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        const show = items.filter((i) => cat === 'all' || i.dataset.cat === cat);
        const hide = items.filter((i) => !show.includes(i) && !i.hidden);
        hide.forEach((i) => i.classList.add('is-hiding'));
        clearTimeout(timer);
        timer = setTimeout(() => {
          hide.forEach((i) => { i.hidden = true; i.classList.remove('is-hiding'); });
          show.forEach((i, k) => {
            const wasHidden = i.hidden;
            i.hidden = false;
            i.classList.remove('is-hiding');
            if (wasHidden) {
              i.classList.remove('is-in');
              i.style.setProperty('--d', `${k * 55}ms`);
              requestAnimationFrame(() => requestAnimationFrame(() => i.classList.add('is-in')));
            }
          });
          status.textContent = `Mostrando ${show.length} ${show.length === 1 ? 'servicio' : 'servicios'}.`;
          Scroll.request();
        }, hide.length && !reduceMotion ? 320 : 0);
      }

      buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter)));
    }
    return { init };
  })();

  /* ========================================================================
     14 · PREGUNTAS FRECUENTES (acordeón accesible)
  ======================================================================== */
  const FAQ = (() => {
    function toggle(item, open) {
      item.classList.toggle('is-open', open);
      $('.qa__btn', item).setAttribute('aria-expanded', String(open));
    }
    function init() {
      const items = $$('.qa');
      if (!items.length) return;
      items.forEach((item) => {
        $('.qa__btn', item).addEventListener('click', () => {
          const willOpen = !item.classList.contains('is-open');
          items.forEach((o) => { if (o !== item) toggle(o, false); });
          toggle(item, willOpen);
        });
      });
      toggle(items[0], true);
    }
    return { init };
  })();

  /* ========================================================================
     15 · LIGHTBOX (visor con <dialog>: teclado, swipe y precarga)
  ======================================================================== */
  const Lightbox = (() => {
    function init() {
      const dlg = $('#lightbox');
      if (!dlg) return;
      const img = $('#lbImg');
      const cap = $('#lbCap');
      const count = $('#lbCount');
      const fig = $('.lightbox__fig', dlg);
      let group = [];
      let idx = 0;
      let lastFocus = null;
      img.draggable = false;

      function show(i, animate) {
        idx = (i + group.length) % group.length;
        const item = group[idx];
        const src = $('img', item);
        img.src = src.currentSrc || src.src;
        img.alt = src.alt;
        cap.textContent = item.dataset.caption || src.alt;
        count.textContent = `${pad(idx + 1)} / ${pad(group.length)}`;
        if (animate) { img.classList.remove('is-swap'); void img.offsetWidth; img.classList.add('is-swap'); }
        [1, -1].forEach((d) => {
          const n = $('img', group[(idx + d + group.length) % group.length]);
          if (n) { const pre = new Image(); pre.src = n.currentSrc || n.src; }
        });
      }

      function open(item) {
        group = $$(`[data-lightbox="${item.dataset.lightbox}"]`);
        lastFocus = document.activeElement;
        show(group.indexOf(item), false);
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
        root.style.overflow = 'hidden';
      }
      function close() {
        if (!dlg.open) return;
        if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
      }

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.pcard__btn, .mos__btn');
        if (!btn) return;
        const item = btn.closest('[data-lightbox]');
        if (item) open(item);
      });
      dlg.addEventListener('close', () => {
        root.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      });
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg || e.target.classList.contains('lightbox__stage')) close();
      });
      $('.lightbox__close', dlg).addEventListener('click', close);
      $('.lightbox__nav--prev', dlg).addEventListener('click', () => show(idx - 1, true));
      $('.lightbox__nav--next', dlg).addEventListener('click', () => show(idx + 1, true));
      dlg.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') show(idx + 1, true);
        if (e.key === 'ArrowLeft') show(idx - 1, true);
      });

      // Deslizar para cambiar de imagen
      let sx = null;
      fig.addEventListener('pointerdown', (e) => { sx = e.clientX; });
      fig.addEventListener('pointerup', (e) => {
        if (sx === null) return;
        const dx = e.clientX - sx;
        sx = null;
        if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1), true);
      });
    }
    return { init };
  })();

  /* ========================================================================
     16 · FORMULARIO DE COTIZACIÓN → WHATSAPP
  ======================================================================== */
  const Form = (() => {
    const TIPO_POR_SERVICIO = {
      'Cocinas de melamina': 'Cocina, clóset o vestidor de melamina',
      'Clósets de melamina': 'Cocina, clóset o vestidor de melamina',
      'Vestidores de melamina': 'Cocina, clóset o vestidor de melamina',
      'Cancelería de aluminio': 'Cancelería, ventanas o impermeabilización',
      'Ventanas de PVC': 'Cancelería, ventanas o impermeabilización',
      'Impermeabilización': 'Cancelería, ventanas o impermeabilización',
      'Loseta cerámica': 'Solo acabados',
      'Porcelanato': 'Solo acabados',
      'Yeso': 'Solo acabados',
      'Estuco': 'Solo acabados',
      'Multiplast': 'Solo acabados',
      'Pintura': 'Solo acabados'
    };

    function init() {
      const form = $('#quoteForm');
      if (!form) return;
      const el = {
        nombre: $('#f-nombre'), telefono: $('#f-telefono'), tipo: $('#f-tipo'), servicio: $('#f-servicio'),
        ubicacion: $('#f-ubicacion'), inicio: $('#f-inicio'), mensaje: $('#f-mensaje')
      };
      const status = $('#formStatus');
      const note = $('.cform__note', form);
      const btn = $('.cform__submit', form);

      const tenDigits = (v) => {
        let d = v.replace(/\D/g, '');
        if (d.length === 13 && d.startsWith('521')) d = d.slice(3);
        else if (d.length === 12 && d.startsWith('52')) d = d.slice(2);
        return d;
      };
      const rules = {
        nombre: (v) => (v.trim().length >= 3 ? '' : 'Escribe tu nombre completo.'),
        telefono: (v) => (tenDigits(v).length === 10 ? '' : 'Ingresa un teléfono de 10 dígitos.'),
        tipo: (v) => (v ? '' : 'Selecciona el tipo de proyecto.')
      };

      function setError(name, msg) {
        const field = el[name].closest('.field');
        field.classList.toggle('has-error', Boolean(msg));
        $('.field__err', field).textContent = msg;
        el[name].setAttribute('aria-invalid', msg ? 'true' : 'false');
      }
      function check(name) {
        const msg = rules[name](el[name].value);
        setError(name, msg);
        return !msg;
      }

      Object.keys(rules).forEach((name) => {
        el[name].addEventListener('blur', () => check(name));
        el[name].addEventListener('input', () => { if (el[name].closest('.field').classList.contains('has-error')) check(name); });
        el[name].addEventListener('change', () => { if (el[name].closest('.field').classList.contains('has-error')) check(name); });
      });

      // Los botones "Cotizar" de servicios y sectores preseleccionan el formulario
      function prefill(select, value) {
        select.value = value;
        const field = select.closest('.field');
        field.classList.add('is-prefilled');
        setTimeout(() => field.classList.remove('is-prefilled'), 2400);
      }
      document.addEventListener('click', (e) => {
        const s = e.target.closest('[data-service]');
        if (s) {
          prefill(el.servicio, s.dataset.service);
          if (!el.tipo.value && TIPO_POR_SERVICIO[s.dataset.service]) { prefill(el.tipo, TIPO_POR_SERVICIO[s.dataset.service]); setError('tipo', ''); }
        }
        const p = e.target.closest('[data-project]');
        if (p) { prefill(el.tipo, p.dataset.project); setError('tipo', ''); }
      });

      function buildMessage() {
        const v = (k) => el[k].value.trim();
        const lines = [
          `*Solicitud de cotización · ${CONFIG.brand}*`,
          '',
          `*Nombre:* ${v('nombre')}`,
          `*Teléfono:* ${v('telefono')}`,
          `*Tipo de proyecto:* ${v('tipo')}`
        ];
        if (v('servicio')) lines.push(`*Servicio de interés:* ${v('servicio')}`);
        if (v('ubicacion')) lines.push(`*Ubicación:* ${v('ubicacion')}`);
        if (v('inicio')) lines.push(`*Inicio estimado:* ${v('inicio')}`);
        if (v('mensaje')) lines.push(`*Detalles:* ${v('mensaje')}`);
        lines.push('', 'Enviado desde el sitio web.');
        return lines.join('\n');
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const valid = Object.keys(rules).map(check).every(Boolean);
        if (!valid) {
          const first = $('.has-error input, .has-error select', form);
          if (first) first.focus();
          status.textContent = 'Revisa los campos marcados para continuar.';
          return;
        }
        const url = waLink(buildMessage());
        form.classList.add('is-sending');
        btn.disabled = true;
        status.textContent = 'Preparando tu solicitud para WhatsApp…';
        setTimeout(() => {
          const w = window.open(url, '_blank');
          if (w) { try { w.opener = null; } catch (err) { /* noop */ } } else { window.location.href = url; }
          form.classList.remove('is-sending');
          btn.disabled = false;
          note.innerHTML = `Se abrió WhatsApp con tu solicitud. ¿No se abrió? <a href="${url}" target="_blank" rel="noopener">Ábrelo aquí</a>.`;
          status.textContent = 'WhatsApp se abrió con tu solicitud lista para enviar.';
        }, 850);
      });
    }
    return { init };
  })();

  /* ========================================================================
     17 · BOTÓN FLOTANTE DE WHATSAPP E INICIO
  ======================================================================== */
  const WaFloat = (() => {
    function init() {
      const el = $('#waFloat');
      if (!el) return;
      Preloader.whenReady(() => {
        setTimeout(() => el.classList.add('is-visible'), 1500);
        let seen = false;
        try { seen = sessionStorage.getItem('nx-wa-tip') === '1'; } catch (e) { /* noop */ }
        if (seen) return;
        setTimeout(() => {
          el.classList.add('show-tip');
          try { sessionStorage.setItem('nx-wa-tip', '1'); } catch (e) { /* noop */ }
        }, 8000);
        setTimeout(() => el.classList.remove('show-tip'), 15000);
      });
      el.addEventListener('click', () => el.classList.remove('show-tip'));
    }
    return { init };
  })();

  function init() {
    safe('Links', Links.init);
    safe('Preloader', Preloader.init);
    safe('Header', Header.init);
    safe('Scroll', Scroll.init);
    safe('Reveal', Reveal.init);
    safe('Parallax', Parallax.init);
    safe('Interactions', Interactions.init);
    safe('HeroScene', HeroScene.init);
    safe('HeroPanel', HeroPanel.init);
    safe('Clock', Clock.init);
    safe('HScroll', HScroll.init);
    safe('Process', Process.init);
    safe('Filters', Filters.init);
    safe('FAQ', FAQ.init);
    safe('Lightbox', Lightbox.init);
    safe('Form', Form.init);
    safe('WaFloat', WaFloat.init);

    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
    window.addEventListener('load', () => Scroll.request());
    Scroll.request();
  }

  init();
})();
