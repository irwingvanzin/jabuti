/* ==========================================================================
   JABUTI · interações e animações (JavaScript puro, sem bibliotecas)
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIGURAÇÃO: troque aqui e o site inteiro acompanha
     ------------------------------------------------------------------------ */
  const CONFIG = {
    // Número do WhatsApp para reservas: DDI + DDD + número, só dígitos.
    whatsapp: '551155490524',
    founded: 1968,
    timeZone: 'America/Sao_Paulo',
    // Horário em minutos desde 00:00 → [abre, fecha]. 0 = domingo.
    hours: {
      0: [690, 1020], // dom  11h30–17h
      1: [690, 960],  // seg  11h30–16h
      2: [690, 1380], // ter  11h30–23h
      3: [690, 1380],
      4: [690, 1380],
      5: [690, 1380],
      6: [690, 1380], // sáb
    },
    defaultMessage: 'Olá, Jabuti! Gostaria de reservar uma mesa. 🐢',
  };

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (name, attrs = {}) => {
    const el = document.createElementNS(SVGNS, name);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };
  const seeded = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktopMQ = matchMedia('(min-width: 900px)');

  let vw = innerWidth;
  let vh = innerHeight;
  let docH = 1;

  /* ------------------------------------------------------------------------
     Datas: "58 anos" e o ano do rodapé se atualizam sozinhos
     ------------------------------------------------------------------------ */
  const YEAR = new Date().getFullYear();
  const YEARS_OPEN = YEAR - CONFIG.founded;
  $$('[data-years]').forEach((el) => (el.textContent = YEARS_OPEN));
  $$('[data-year]').forEach((el) => (el.textContent = YEAR));

  /* ------------------------------------------------------------------------
     Links do WhatsApp
     ------------------------------------------------------------------------ */
  const waUrl = (msg) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  $$('[data-wa]').forEach((a) => {
    a.href = waUrl(a.dataset.waMsg || CONFIG.defaultMessage);
    a.target = '_blank';
    a.rel = 'noopener';
  });

  /* ------------------------------------------------------------------------
     Entrada do hero
     ------------------------------------------------------------------------ */
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 700))]).then(() => {
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  });

  /* ------------------------------------------------------------------------
     Revelações ao rolar
     ------------------------------------------------------------------------ */
  $$('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
  });

  // A checagem roda dentro do laço principal (ver checkReveals): assim as entradas
  // ficam sincronizadas com a rolagem, inclusive em saltos por âncora.
  const revealables = $$('.reveal, .reveal-clip, .split');
  let pendingReveals = revealables.slice();

  /* ------------------------------------------------------------------------
     Contadores
     ------------------------------------------------------------------------ */
  const counters = $$('[data-count]');
  const runCounter = (el) => {
    const target = parseFloat(el.textContent.replace(',', '.'));
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const format = (v) => v.toFixed(decimals).replace('.', ',');
    if (REDUCED) { el.textContent = format(target); return; }
    const start = performance.now();
    const dur = 1700;
    const tick = (now) => {
      const p = clamp((now - start) / dur);
      el.textContent = format(target * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  let pendingCounters = counters.slice();

  const checkReveals = () => {
    if (pendingReveals.length) {
      const hits = pendingReveals.filter((el) => el.getBoundingClientRect().top < vh * 0.92);
      if (hits.length) {
        hits.forEach((el) => el.classList.add('is-in'));
        pendingReveals = pendingReveals.filter((el) => !hits.includes(el));
      }
    }
    if (pendingCounters.length) {
      const hits = pendingCounters.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top < vh * 0.9 && r.bottom > 0;
      });
      if (hits.length) {
        hits.forEach(runCounter);
        pendingCounters = pendingCounters.filter((el) => !hits.includes(el));
      }
    }
  };

  /* ------------------------------------------------------------------------
     Navegação
     ------------------------------------------------------------------------ */
  const nav = $('#nav');
  const burger = $('#burger');
  const drawer = $('#drawer');
  const fab = $('.fab');
  let menuOpen = false;

  const setMenu = (open) => {
    menuOpen = open;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('menu-open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!menuOpen));
  $$('a', drawer).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });
  desktopMQ.addEventListener('change', () => setMenu(false));

  // destaca o link da seção atual
  const spyMap = { sobre: 'sobre', historia: 'sobre', queridinhos: 'cardapio', cardapio: 'cardapio', depoimentos: 'depoimentos', localizacao: 'localizacao' };
  const navLinks = $$('[data-nav]');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const key = spyMap[e.target.id];
        navLinks.forEach((l) => l.classList.toggle('is-current', l.getAttribute('href') === `#${key}`));
      }),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    Object.keys(spyMap).forEach((id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ------------------------------------------------------------------------
     Botões magnéticos
     ------------------------------------------------------------------------ */
  if (FINE_POINTER && !REDUCED) {
    $$('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.32;
        btn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      });
      btn.addEventListener('mouseleave', () => (btn.style.transform = ''));
    });
  }

  /* ------------------------------------------------------------------------
     Faixas (marquee) que andam com a rolagem
     ------------------------------------------------------------------------ */
  const marquees = $$('[data-marquee]').map((el) => {
    const inner = $('.marquee__inner', el);
    const originals = [...inner.children];
    const m = { el, inner, originals, x: 0, w: 1, speed: parseFloat(el.dataset.speed || '1'), visible: true };
    return m;
  });
  const setupMarquees = () => {
    marquees.forEach((m) => {
      $$('[data-clone]', m.inner).forEach((c) => c.remove());
      const gap = parseFloat(getComputedStyle(m.inner).columnGap) || 0;
      m.w = m.inner.scrollWidth + gap;
      const copies = Math.ceil((vw * 1.2) / m.w) + 1;
      for (let i = 0; i < copies; i++) {
        m.originals.forEach((node) => {
          const c = node.cloneNode(true);
          c.setAttribute('data-clone', '');
          m.inner.appendChild(c);
        });
      }
    });
  };
  if ('IntersectionObserver' in window) {
    const mio = new IntersectionObserver((entries) => entries.forEach((e) => {
      const m = marquees.find((x) => x.el === e.target);
      if (m) m.visible = e.isIntersecting;
    }), { rootMargin: '80px' });
    marquees.forEach((m) => mio.observe(m.el));
  }

  /* ------------------------------------------------------------------------
     Ondas (hero e seção de visita)
     ------------------------------------------------------------------------ */
  const waves = $$('[data-wave]').map((path, i) => ({ path, seed: i * 2.3, visible: true }));
  const buildWave = (t, seed) => {
    const n = 6;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      pts.push([
        (i / n) * 1440,
        62 + Math.sin(i * 1.1 + t * 0.0011 + seed) * 20 + Math.cos(i * 0.6 - t * 0.0007 + seed * 2) * 12,
      ]);
    }
    let d = `M0,${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const cx = (x0 + x1) / 2;
      d += ` C${cx},${y0.toFixed(1)} ${cx},${y1.toFixed(1)} ${x1},${y1.toFixed(1)}`;
    }
    return `${d} L1440,120 L0,120 Z`;
  };
  if ('IntersectionObserver' in window) {
    const wio = new IntersectionObserver((entries) => entries.forEach((e) => {
      const w = waves.find((x) => x.path.ownerSVGElement === e.target);
      if (w) w.visible = e.isIntersecting;
    }), { rootMargin: '60px' });
    waves.forEach((w) => wio.observe(w.path.ownerSVGElement));
  }

  /* ------------------------------------------------------------------------
     Hero: prato giratório, parallax e elementos flutuantes
     ------------------------------------------------------------------------ */
  const hero = $('.hero');
  const heroCopy = $('.hero__copy');
  const heroVisual = $('.hero__visual');
  const plateDish = $('#plateDish');
  const plateRing = $('#plateRing');
  const floaties = $$('.floaty').map((el) => ({ el, depth: parseFloat(el.dataset.depth || '1') }));
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (FINE_POINTER && !REDUCED) {
    hero.addEventListener('pointermove', (e) => {
      mouse.tx = (e.clientX / vw - 0.5) * 2;
      mouse.ty = (e.clientY / vh - 0.5) * 2;
    });
    hero.addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; });
  }

  /* ------------------------------------------------------------------------
     História: o copo de chope enche conforme a página rola
     ------------------------------------------------------------------------ */
  const story = $('.story');
  const liquid = $('#liquid');
  const foam = $('#foam');
  const foamShape = $('#foamShape');
  const foamDots = $('#foamDots');
  const foamTop = $('#foamTop');
  const bubblesG = $('#bubbles');
  const dropsG = $('#drops');
  const coasterRing = $('#coasterRing');
  const storyYear = $('#storyYear');
  const chapters = $$('.chapter');
  const storyDots = $$('.story__dots i');
  const GLASS = { top: 46, bottom: 411, full: 98 };
  const glassLeft = (y) => lerp(73, 105, clamp((y - GLASS.top) / (399 - GLASS.top))) + 5;
  const storyState = { p: 0, sp: 0, year: CONFIG.founded, chapter: 0, visible: false };

  const rand = seeded(1968);
  const bubbles = [];
  for (let i = 0; i < 34; i++) {
    const node = svgEl('circle', { fill: '#FFF3C4', opacity: '0' });
    bubblesG.appendChild(node);
    bubbles.push({ node, y: lerp(120, 405, rand()), fx: rand(), r: lerp(1.1, 3.4, rand() * rand()), v: lerp(0.5, 1.9, rand()), ph: rand() * 6.28 });
  }
  const foamBits = [];
  for (let i = 0; i < 12; i++) {
    const node = svgEl('circle', { r: lerp(1.4, 4, rand()).toFixed(1) });
    foamDots.appendChild(node);
    foamBits.push({ node, fx: lerp(70, 230, rand()), fy: lerp(0.15, 0.8, rand()) });
  }
  const drops = [];
  for (let i = 0; i < 22; i++) {
    const y = lerp(130, 390, rand());
    const left = glassLeft(y) + 4;
    const x = lerp(left, 300 - left, rand());
    const r = lerp(1.6, 4.6, rand() * rand() + 0.1);
    const node = svgEl('ellipse', { cx: x.toFixed(1), cy: y.toFixed(1), rx: r.toFixed(1), ry: (r * lerp(1.1, 1.7, rand())).toFixed(1), fill: 'url(#drop-g)', opacity: '0' });
    dropsG.appendChild(node);
    drops.push({ node, y, th: lerp(0.25, 0.9, rand()), o: -1 });
  }
  const renderGlass = (e, t, tilt) => {
    const level = lerp(GLASS.bottom, GLASS.full, e);
    const foamH = lerp(6, 48, e);
    const wob = Math.sin(t * 0.0022) * 1.6;
    const tf = `translate(0,${level.toFixed(2)}) rotate(${tilt.toFixed(2)} 150 0)`;
    liquid.setAttribute('transform', tf);
    foam.setAttribute('transform', tf);
    foamShape.setAttribute(
      'd',
      `M56,${(-foamH + wob).toFixed(1)} Q105,${(-foamH - 5 - wob).toFixed(1)} 150,${(-foamH + wob * 0.5).toFixed(1)} T244,${(-foamH - wob).toFixed(1)} L244,7 Q150,13 56,7 Z`
    );
    foamBits.forEach((b) => { b.node.setAttribute('cx', b.fx); b.node.setAttribute('cy', (-foamH * b.fy).toFixed(1)); });

    // espuma que transborda no fim
    const over = clamp((e - 0.9) / 0.1);
    foamTop.setAttribute('transform', `translate(150,46) scale(1,${(over * (1 + Math.sin(t * 0.003) * 0.03)).toFixed(3)})`);

    // bolhas subindo
    const active = level < GLASS.bottom - 14;
    bubbles.forEach((b) => {
      if (!active) { if (b.o !== 0) { b.node.setAttribute('opacity', '0'); b.o = 0; } return; }
      b.y -= b.v * (0.5 + e * 0.9);
      if (b.y < level + 2 || b.y > GLASS.bottom - 4) { b.y = GLASS.bottom - 6 - Math.random() * 20; b.fx = Math.random(); }
      const left = glassLeft(b.y) + 3;
      const x = lerp(left, 300 - left, b.fx) + Math.sin(t * 0.004 + b.ph) * 2;
      b.node.setAttribute('cx', x.toFixed(1));
      b.node.setAttribute('cy', b.y.toFixed(1));
      b.node.setAttribute('r', b.r);
      b.node.setAttribute('opacity', clamp((b.y - level) / 30, 0, 0.75).toFixed(2));
      b.o = 1;
    });

    // gotinhas de condensação aparecem conforme o copo gela
    drops.forEach((d) => {
      const o = d.y > level + 6 ? clamp((e - d.th * 0.7) * 5) : 0;
      const q = Math.round(o * 20);
      if (q !== d.o) { d.node.setAttribute('opacity', (q / 20).toFixed(2)); d.o = q; }
    });
  };

  const renderStory = (t, vel) => {
    const s = storyState;
    const e = easeInOut(s.sp);
    renderGlass(e, t, clamp(vel * 0.12, -5, 5));
    coasterRing.style.transform = `rotate(${(s.sp * 140).toFixed(2)}deg)`;

    const yr = Math.round(lerp(CONFIG.founded, YEAR, e));
    if (yr !== s.year) { s.year = yr; storyYear.textContent = yr; storyYear.dataset.y = yr; }
    storyYear.style.setProperty('--fill', `${(e * 100).toFixed(1)}%`);

    const idx = s.sp < 0.3 ? 0 : s.sp < 0.64 ? 1 : 2;
    if (idx !== s.chapter) {
      s.chapter = idx;
      chapters.forEach((c, i) => { c.classList.toggle('is-active', i === idx); c.classList.toggle('is-past', i < idx); });
      storyDots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    }
  };

  /* ------------------------------------------------------------------------
     Queridinhos: rolagem horizontal presa (desktop)
     ------------------------------------------------------------------------ */
  const faves = $('.faves');
  const favesTrack = $('#favesTrack');
  const favesBar = $('#favesBar');
  const favesState = { pinned: false, dist: 0, p: 0 };
  const setupFaves = () => {
    const pin = desktopMQ.matches && !REDUCED;
    favesState.pinned = pin;
    faves.classList.toggle('is-pinned', pin);
    if (pin) {
      favesState.dist = Math.max(0, favesTrack.scrollWidth - vw);
      faves.style.height = `${vh + favesState.dist}px`;
    } else {
      faves.style.height = '';
      favesTrack.style.transform = '';
    }
  };

  /* ------------------------------------------------------------------------
     Parallax genérico, colunas de depoimentos, selos giratórios, rodapé
     ------------------------------------------------------------------------ */
  const parallaxEls = $$('[data-parallax]').map((el) => ({ el, frame: el.parentElement, speed: parseFloat(el.dataset.parallax) }));
  const reviewCols = $$('[data-col]').map((el) => ({ el, f: parseFloat(el.dataset.col) }));
  const reviewsWrap = $('.reviews__cols');
  const spinners = $$('[data-spin]').map((el) => (el instanceof SVGElement ? el : el.firstElementChild));
  const footer = $('.footer');
  const footerWord = $('#footerWord');

  /* ------------------------------------------------------------------------
     O jabuti que anda no rodapé da tela
     ------------------------------------------------------------------------ */
  const trailFill = $('#trailFill');
  const walker = $('#walker');
  const walkerSvg = $('svg', walker);
  const wBody = $('#w-body');
  const wHead = $('#w-head');
  const wLegs = $$('.w-leg').map((el) => ({ el, phase: parseFloat(el.dataset.phase) }));
  const walk = { phase: 0, dir: 1, lastP: -1 };
  walkerSvg.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1)';

  /* ------------------------------------------------------------------------
     Cardápio: abas + foto que segue o cursor
     ------------------------------------------------------------------------ */
  const tabs = $$('.tab');
  const panels = $$('.panel');
  const pill = $('.tabs__pill');
  const movePill = () => {
    const active = $('.tab.is-active');
    if (!active) return;
    pill.style.width = `${active.offsetWidth}px`;
    pill.style.transform = `translateX(${active.offsetLeft}px)`;
  };
  const selectTab = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p) => {
      const on = p.id === tab.getAttribute('aria-controls');
      p.hidden = !on;
      p.classList.toggle('is-active', on);
    });
    movePill();
    if (focus) tab.focus({ preventScroll: true });
    // no celular as abas rolam de lado: centraliza a escolhida sem mexer na página
    const strip = tab.parentElement;
    strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior: REDUCED ? 'auto' : 'smooth' });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next, true);
    });
  });
  panels.forEach((p) => $$('.item', p).forEach((item, i) => item.style.setProperty('--i', i)));

  const preview = $('#menuPreview');
  const previewImg = $('img', preview);
  const pv = { x: 0, y: 0, tx: 0, ty: 0, on: false };
  const previewSrc = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=480&h=600&q=70`;
  if (FINE_POINTER) {
    const photoItems = $$('.item[data-img]');
    photoItems.forEach((item) => {
      item.addEventListener('mouseenter', (e) => {
        previewImg.src = previewSrc(item.dataset.img);
        if (!pv.on) { pv.x = e.clientX + 18; pv.y = e.clientY - 300; }
        pv.on = true;
        preview.classList.add('is-on');
      });
      item.addEventListener('mouseleave', () => { pv.on = false; preview.classList.remove('is-on'); });
    });
    $('.menu').addEventListener('mousemove', (e) => { pv.tx = e.clientX; pv.ty = e.clientY; });
    // pré-carrega as fotos quando o cardápio se aproxima
    if ('IntersectionObserver' in window) {
      const pio = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        photoItems.forEach((item) => { const im = new Image(); im.src = previewSrc(item.dataset.img); });
        pio.disconnect();
      }, { rootMargin: '300px' });
      pio.observe($('.menu'));
    }
  }

  /* ------------------------------------------------------------------------
     Aberto agora? (horário de São Paulo)
     ------------------------------------------------------------------------ */
  const nowSP = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CONFIG.timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
      mins: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10),
      iso: `${get('year')}-${get('month')}-${get('day')}`,
    };
  };
  const fmtTime = (m) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return mm ? `${h}h${String(mm).padStart(2, '0')}` : `${h}h`;
  };
  const updateStatus = () => {
    const { day, mins } = nowSP();
    const [open, close] = CONFIG.hours[day];
    const isOpen = mins >= open && mins < close;
    let text;
    if (isOpen) text = close - mins <= 60 ? `Aberto · fecha às ${fmtTime(close)}` : `Aberto agora · até as ${fmtTime(close)}`;
    else if (mins < open) text = `Fechado agora · abre hoje às ${fmtTime(open)}`;
    else text = `Fechado agora · abre amanhã às ${fmtTime(CONFIG.hours[(day + 1) % 7][0])}`;
    $$('[data-open-status]').forEach((el) => {
      el.classList.toggle('is-open', isOpen);
      el.classList.toggle('is-closed', !isOpen);
      $('[data-open-text]', el).textContent = text;
    });
    $$('.hours tr').forEach((tr) => tr.classList.toggle('is-today', tr.dataset.day.split(' ').includes(String(day))));
  };
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ------------------------------------------------------------------------
     Reserva → mensagem pronta no WhatsApp
     ------------------------------------------------------------------------ */
  const form = $('#bookingForm');
  const fDate = form.elements.data;
  const fTime = form.elements.hora;
  const fName = form.elements.nome;
  const fObs = form.elements.obs;
  const people = $('#pessoas');
  const peopleHint = $('#pessoasHint');
  const formError = $('#bookingError');

  const addDays = (iso, n) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d + n);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const weekdayOf = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };
  const slotsFor = (iso) => {
    const today = nowSP();
    const [open, close] = CONFIG.hours[weekdayOf(iso)];
    const slots = [];
    for (let m = open; m <= close - 60; m += 30) {
      if (iso === today.iso && m < today.mins + 30) continue;
      slots.push(m);
    }
    return slots;
  };
  const fillTimes = () => {
    const previous = fTime.value;
    const slots = fDate.value ? slotsFor(fDate.value) : [];
    fTime.innerHTML = '';
    if (!slots.length) {
      fTime.add(new Option('Sem horários neste dia', ''));
      fTime.disabled = true;
      return;
    }
    fTime.disabled = false;
    slots.forEach((m) => fTime.add(new Option(fmtTime(m), fmtTime(m))));
    const keep = [...fTime.options].find((o) => o.value === previous);
    if (keep) fTime.value = previous;
    else {
      // sugere 12h30 no almoço ou 19h30 se houver
      const prefer = [...fTime.options].find((o) => o.value === '19h30') || [...fTime.options].find((o) => o.value === '12h30');
      if (prefer) fTime.value = prefer.value;
    }
  };
  const todayIso = nowSP().iso;
  fDate.min = todayIso;
  fDate.value = slotsFor(todayIso).length ? todayIso : addDays(todayIso, 1);
  fillTimes();
  fDate.addEventListener('change', () => { fillTimes(); fDate.closest('.field').classList.remove('is-invalid'); });

  const hintFor = (n) => {
    if (n === 1) return 'Mesa pra um também é mesa.';
    if (n === 2) return 'Mesa pra dois saindo.';
    if (n <= 5) return 'Mesa boa pra dividir porção.';
    if (n <= 10) return 'Turma boa! A gente junta as mesas.';
    return 'Festa? Avisa que a gente capricha.';
  };
  $$('.stepper button').forEach((b) => b.addEventListener('click', () => {
    const n = clamp(parseInt(people.textContent, 10) + parseInt(b.dataset.step, 10), 1, 40);
    people.textContent = n;
    peopleHint.textContent = hintFor(n);
    people.classList.remove('is-bump');
    void people.offsetWidth;
    people.classList.add('is-bump');
  }));
  fName.addEventListener('input', () => fName.closest('.field').classList.remove('is-invalid'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = fName.value.trim();
    const problems = [];
    const mark = (el, bad) => el.closest('.field').classList.toggle('is-invalid', bad);
    mark(fName, name.length < 2); if (name.length < 2) problems.push('seu nome');
    mark(fDate, !fDate.value); if (!fDate.value) problems.push('o dia');
    mark(fTime, !fTime.value); if (fDate.value && !fTime.value) problems.push('um horário disponível');
    if (problems.length) {
      formError.hidden = false;
      formError.textContent = `Faltou só ${problems.join(' e ')} pra gente reservar.`;
      (form.querySelector('.is-invalid input, .is-invalid select') || fName).focus();
      return;
    }
    formError.hidden = true;
    const [y, m, d] = fDate.value.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long' });
    const lines = [
      'Olá, Jabuti! Gostaria de reservar uma mesa 🐢',
      '',
      `• Nome: ${name}`,
      `• Dia: ${weekday}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
      `• Horário: ${fTime.value}`,
      `• Pessoas: ${people.textContent}`,
    ];
    if (fObs.value.trim()) lines.push(`• Recado: ${fObs.value.trim()}`);
    window.open(waUrl(lines.join('\n')), '_blank', 'noopener');
  });

  /* ------------------------------------------------------------------------
     Medidas
     ------------------------------------------------------------------------ */
  const measure = () => {
    vw = document.documentElement.clientWidth;
    vh = innerHeight;
    setupFaves();
    docH = Math.max(1, document.documentElement.scrollHeight - vh);
    movePill();
  };
  let resizeTimer;
  let lastW = innerWidth;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const widthChanged = innerWidth !== lastW;
      lastW = innerWidth;
      measure();
      if (widthChanged) setupMarquees();
    }, 140);
  });
  addEventListener('load', () => { measure(); setupMarquees(); });
  fontsReady.then(() => { measure(); setupMarquees(); });
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { docH = Math.max(1, document.documentElement.scrollHeight - innerHeight); }).observe(document.body);
  }
  measure();
  setupMarquees();

  /* ------------------------------------------------------------------------
     Laço principal: lê a rolagem uma vez por quadro e move tudo
     ------------------------------------------------------------------------ */
  const S = { y: scrollY, vel: 0, dir: 1 };
  let frameCount = 0;

  if (REDUCED) {
    // sem animação contínua: deixa tudo no estado final
    storyState.sp = 1;
    renderStory(0, 0);
    chapters.forEach((c) => c.classList.add('is-active'));
    revealables.forEach((el) => el.classList.add('is-in'));
    counters.forEach(runCounter);
    const staticUpdate = () => {
      const y = scrollY;
      nav.classList.toggle('is-scrolled', y > 40);
      fab.classList.toggle('is-on', y > vh * 0.6);
      const p = clamp(y / docH);
      trailFill.style.transform = `scaleX(${p})`;
      walker.style.transform = `translate3d(${(p * (vw - 58) + 4).toFixed(1)}px,0,0)`;
    };
    addEventListener('scroll', staticUpdate, { passive: true });
    staticUpdate();
    return;
  }

  const frame = (t) => {
    /* ---- leituras ---- */
    const y = window.scrollY;
    const dy = y - S.y;
    S.y = y;
    S.vel = lerp(S.vel, dy, 0.18);
    if (Math.abs(dy) > 0.5) S.dir = Math.sign(dy);

    if (frameCount++ % 3 === 0) checkReveals();
    let storyRect = story.getBoundingClientRect();
    if (storyRect.bottom < -120 || storyRect.top > vh + 120) storyRect = null;
    const favesRect = favesState.pinned ? faves.getBoundingClientRect() : null;
    const pRects = parallaxEls.map((p) => p.frame.getBoundingClientRect());
    const revRect = desktopMQ.matches ? reviewsWrap.getBoundingClientRect() : null;
    const footRect = footer.getBoundingClientRect();

    /* ---- navegação ---- */
    nav.classList.toggle('is-scrolled', y > 40);
    if (!menuOpen) {
      if (y > vh * 0.7 && dy > 3) nav.classList.add('is-hidden');
      else if (dy < -3 || y < vh * 0.7) nav.classList.remove('is-hidden');
    }
    fab.classList.toggle('is-on', y > vh * 0.6);

    /* ---- jabuti andando ---- */
    const p = clamp(y / docH);
    trailFill.style.transform = `scaleX(${p.toFixed(4)})`;
    walk.phase += Math.abs(dy) * 0.045;
    const walkerW = walker.offsetWidth || 50;
    walker.style.transform = `translate3d(${(p * (vw - walkerW - 8) + 4).toFixed(1)}px,0,0)`;
    if (S.dir !== walk.dir) { walk.dir = S.dir; walkerSvg.style.transform = `scaleX(${S.dir})`; }
    if (Math.abs(dy) > 0.2 || walk.lastP !== walk.phase) {
      walk.lastP = walk.phase;
      wLegs.forEach((l) => (l.el.style.transform = `rotate(${(Math.sin(walk.phase + l.phase) * 24).toFixed(1)}deg)`));
      wBody.style.transform = `translateY(${(Math.abs(Math.sin(walk.phase)) * -1.6).toFixed(2)}px)`;
      wHead.style.transform = `rotate(${(Math.sin(walk.phase * 0.5) * 5).toFixed(1)}deg)`;
    }

    /* ---- hero ---- */
    if (y < vh * 1.3) {
      mouse.x = lerp(mouse.x, mouse.tx, 0.06);
      mouse.y = lerp(mouse.y, mouse.ty, 0.06);
      plateDish.style.transform = `rotate(${(y * 0.07 + t * 0.0035).toFixed(2)}deg)`;
      plateRing.style.transform = `rotate(${(-(y * 0.05) - t * 0.006).toFixed(2)}deg)`;
      heroVisual.style.transform = `translate3d(${(mouse.x * -10).toFixed(1)}px, ${(y * 0.1 + mouse.y * -8).toFixed(1)}px, 0)`;
      heroCopy.style.transform = `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0)`;
      heroCopy.style.opacity = clamp(1 - y / (vh * 0.85)).toFixed(3);
      floaties.forEach((f) => {
        f.el.style.translate = `${(mouse.x * f.depth * 22).toFixed(1)}px ${(mouse.y * f.depth * 18 - y * f.depth * 0.14).toFixed(1)}px`;
      });
    }

    /* ---- ondas ---- */
    waves.forEach((w) => { if (w.visible) w.path.setAttribute('d', buildWave(t, w.seed)); });

    /* ---- faixas ---- */
    marquees.forEach((m) => {
      if (!m.visible) return;
      m.x += m.speed * S.dir * (0.7 + Math.min(Math.abs(S.vel), 70) * 0.32);
      m.x = ((m.x % m.w) + m.w) % m.w;
      m.inner.style.transform = `translate3d(${(-m.x).toFixed(1)}px,0,0)`;
    });

    /* ---- história / chope ---- */
    if (storyRect) {
      storyState.p = clamp(-storyRect.top / Math.max(1, storyRect.height - vh));
      storyState.sp = lerp(storyState.sp, storyState.p, 0.09);
      renderStory(t, S.vel);
    }

    /* ---- queridinhos ---- */
    if (favesRect) {
      const fp = clamp(-favesRect.top / Math.max(1, favesRect.height - vh));
      favesState.p = lerp(favesState.p, fp, 0.11);
      favesTrack.style.transform = `translate3d(${(-favesState.p * favesState.dist).toFixed(1)}px,0,0)`;
      favesTrack.style.setProperty('--px', (favesState.p - 0.5).toFixed(3));
      favesTrack.style.setProperty('--tilt', clamp(S.vel * 0.05, -2.2, 2.2).toFixed(2));
      favesBar.style.transform = `scaleX(${favesState.p.toFixed(4)})`;
    }

    /* ---- parallax de fotos ---- */
    parallaxEls.forEach((pe, i) => {
      const r = pRects[i];
      if (r.bottom < -80 || r.top > vh + 80) return;
      const prog = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
      pe.el.style.transform = `translate3d(0, ${(prog * r.height * -pe.speed).toFixed(1)}px, 0)`;
    });

    /* ---- colunas de depoimentos ---- */
    if (revRect && revRect.bottom > -200 && revRect.top < vh + 200) {
      const off = revRect.top + revRect.height / 2 - vh / 2;
      reviewCols.forEach((c) => (c.el.style.transform = `translate3d(0, ${(off * c.f).toFixed(1)}px, 0)`));
    }

    /* ---- selos giratórios ---- */
    spinners.forEach((el) => (el.style.transform = `rotate(${(y * 0.09).toFixed(1)}deg)`));

    /* ---- palavra gigante do rodapé ---- */
    if (footRect.top < vh) {
      const fp = clamp((vh - footRect.top) / (footRect.height || 1));
      footerWord.style.transform = `translate3d(${((1 - fp) * -9).toFixed(2)}vw, ${((1 - fp) * 30).toFixed(1)}px, 0)`;
    }

    /* ---- foto que segue o cursor no cardápio ---- */
    if (pv.on || preview.classList.contains('is-on')) {
      // fica acima do cursor (ou abaixo, se faltar espaço) para não cobrir o nome do prato
      const targetX = clamp(pv.tx + 18, 12, vw - 250);
      const targetY = pv.ty - 320 > 70 ? pv.ty - 320 : Math.min(pv.ty + 34, vh - 310);
      pv.x = lerp(pv.x, targetX, 0.16);
      pv.y = lerp(pv.y, targetY, 0.16);
      preview.style.transform = `translate3d(${pv.x.toFixed(1)}px, ${pv.y.toFixed(1)}px, 0) rotate(${clamp((targetX - pv.x) * 0.08, -10, 10).toFixed(2)}deg)`;
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
