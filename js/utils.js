/* ============================================================
   js/utils.js — Global state, utility functions, RAF manager
   ============================================================ */
'use strict';

// ── Global State Object ─────────────────────────────────────
const State = {
  mouse: { x: 0, y: 0, nx: 0, ny: 0 },  // nx/ny = normalized -1 to 1
  scroll: { y: 0, progress: 0, velocity: 0, prevY: 0 },
  viewport: { w: window.innerWidth, h: window.innerHeight },
  isMobile: window.innerWidth < 768,
  isTablet: window.innerWidth < 1024,
  isLoaded: false,
  currentSection: 'hero',
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

// ── RAF Manager ─────────────────────────────────────────────
const Raf = {
  _callbacks: new Map(),
  _id: null,
  _running: false,

  add(key, fn) {
    this._callbacks.set(key, fn);
    if (!this._running) this.start();
  },

  remove(key) {
    this._callbacks.delete(key);
    if (this._callbacks.size === 0) this.stop();
  },

  start() {
    if (this._running) return;
    this._running = true;
    const loop = (timestamp) => {
      this._callbacks.forEach(fn => fn(timestamp));
      this._id = requestAnimationFrame(loop);
    };
    this._id = requestAnimationFrame(loop);
  },

  stop() {
    if (this._id) cancelAnimationFrame(this._id);
    this._running = false;
  }
};

// ── Math Utilities ──────────────────────────────────────────
const MathUtils = {
  lerp: (a, b, t) => a + (b - a) * t,
  clamp: (v, min, max) => Math.min(Math.max(v, min), max),
  map: (v, a1, b1, a2, b2) => a2 + ((v - a1) / (b1 - a1)) * (b2 - a2),
  norm: (v, min, max) => (v - min) / (max - min),
  sign: (v) => v >= 0 ? 1 : -1,
  round: (v, places = 2) => parseFloat(v.toFixed(places)),
  random: (min = 0, max = 1) => Math.random() * (max - min) + min,
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  dist: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2),
  angleTo: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
  degToRad: (deg) => deg * (Math.PI / 180),
  radToDeg: (rad) => rad * (180 / Math.PI),
  // Ease functions
  easeInOut: t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t,
  easeOut: t => t * (2 - t),
  easeIn: t => t * t,
  easeOutCubic: t => 1 - Math.pow(1-t, 3),
  easeInOutCubic: t => t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2, 3)/2,
  easeOutElastic: t => {
    const c = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
  }
};

// ── DOM Utilities ───────────────────────────────────────────
const DOM = {
  qs: (sel, ctx = document) => ctx.querySelector(sel),
  qsa: (sel, ctx = document) => [...ctx.querySelectorAll(sel)],

  // Get element's bounds relative to document (not viewport)
  docBounds(el) {
    const r = el.getBoundingClientRect();
    return {
      top:    r.top + State.scroll.y,
      left:   r.left,
      width:  r.width,
      height: r.height,
      bottom: r.bottom + State.scroll.y,
      right:  r.right,
    };
  },

  // Check if element is in viewport
  inView(el, margin = 0) {
    const r = el.getBoundingClientRect();
    return r.top < State.viewport.h + margin && r.bottom > -margin;
  },

  // Add / remove classes safely
  addClass(el, ...classes)    { el && el.classList.add(...classes); },
  removeClass(el, ...classes) { el && el.classList.remove(...classes); },
  toggleClass(el, cls, force) { el && el.classList.toggle(cls, force); },

  // Create element
  create(tag, attrs = {}, text = '') {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text) el.textContent = text;
    return el;
  }
};

// ── Function Utilities ──────────────────────────────────────
const FnUtils = {
  debounce(fn, ms = 150) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  throttle(fn, ms = 16) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn(...args); }
    };
  },

  once(fn) {
    let called = false;
    return (...args) => {
      if (!called) { called = true; fn(...args); }
    };
  },

  wait: (ms) => new Promise(r => setTimeout(r, ms)),

  pipe: (...fns) => (x) => fns.reduce((v, f) => f(v), x),
};

// ── Event Bus (simple pub/sub) ──────────────────────────────
const Events = {
  _listeners: {},

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(l => l !== fn);
  },

  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(fn => fn(data));
  }
};

// ── Global Mouse Tracking ───────────────────────────────────
window.addEventListener('mousemove', (e) => {
  State.mouse.x  = e.clientX;
  State.mouse.y  = e.clientY;
  State.mouse.nx = (e.clientX / State.viewport.w) * 2 - 1;
  State.mouse.ny = -((e.clientY / State.viewport.h) * 2 - 1);
  Events.emit('mousemove', State.mouse);
});

// ── Global Scroll Tracking ──────────────────────────────────
let _lastScrollY = 0;
window.addEventListener('scroll', FnUtils.throttle(() => {
  const y = window.scrollY;
  State.scroll.velocity = y - _lastScrollY;
  State.scroll.prevY    = _lastScrollY;
  State.scroll.y        = y;
  const docH = document.documentElement.scrollHeight - State.viewport.h;
  State.scroll.progress = docH > 0 ? MathUtils.clamp(y / docH, 0, 1) : 0;
  _lastScrollY = y;
  Events.emit('scroll', State.scroll);
}, 10), { passive: true });

// ── Viewport / Resize ───────────────────────────────────────
const onResize = FnUtils.debounce(() => {
  State.viewport.w = window.innerWidth;
  State.viewport.h = window.innerHeight;
  State.isMobile   = State.viewport.w < 768;
  State.isTablet   = State.viewport.w < 1024;
  Events.emit('resize', State.viewport);
}, 200);

window.addEventListener('resize', onResize);

// ── Scroll Progress Bar ─────────────────────────────────────
function createScrollProgressBar() {
  const bar = DOM.create('div', { class: 'scroll-progress-bar', id: 'scroll-progress-bar' });
  document.body.appendChild(bar);
  Events.on('scroll', ({ progress }) => {
    bar.style.width = `${progress * 100}%`;
  });
}

createScrollProgressBar();

// ── Intersection Observer helper ────────────────────────────
function observeReveal(selector = '[data-reveal]', options = {}) {
  const els = DOM.qsa(selector);
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        DOM.addClass(entry.target, 'is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, ...options });

  els.forEach(el => io.observe(el));
  return io;
}

// Make globals available
window.State = State;
window.Raf   = Raf;
window.MathUtils = MathUtils;
window.DOM   = DOM;
window.FnUtils = FnUtils;
window.Events  = Events;
window.observeReveal = observeReveal;