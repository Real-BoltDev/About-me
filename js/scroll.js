/* ============================================================
   js/scroll.js — Scroll manager: velocity, section detection, nav
   ============================================================ */
'use strict';

class ScrollManager {
  constructor() {
    this._sections   = [];
    this._navLinks   = DOM.qsa('.nav-link');
    this._nav        = DOM.qs('#nav');
    this._velocity   = 0;
    this._scrolled   = false;

    this._init();
  }

  _init() {
    this._detectSections();
    this._bindEvents();
    this._setupSmoothNavLinks();
  }

  _detectSections() {
    // Collect all sections with IDs for active-link tracking
    const sectionEls = DOM.qsa('section[id]');
    this._sections = sectionEls.map(el => ({
      el,
      id: el.id,
      top: 0,
      bottom: 0,
    }));
    this._updateSectionBounds();
  }

  _updateSectionBounds() {
    this._sections.forEach(s => {
      const r = s.el.getBoundingClientRect();
      s.top    = r.top  + State.scroll.y;
      s.bottom = r.bottom + State.scroll.y;
    });
  }

  _bindEvents() {
    Events.on('scroll', ({ y, velocity }) => {
      this._velocity = velocity;

      // Nav: add/remove scrolled class
      const isScrolled = y > 60;
      if (isScrolled !== this._scrolled) {
        this._scrolled = isScrolled;
        DOM.toggleClass(this._nav, 'is-scrolled', isScrolled);
      }

      // Active section detection
      this._updateActiveSection(y);
    });

    // Update bounds on resize
    Events.on('resize', () => {
      this._updateSectionBounds();
    });
  }

  _updateActiveSection(scrollY) {
    const trigger = scrollY + State.viewport.h * 0.4;

    let activeId = null;
    for (const section of this._sections) {
      if (trigger >= section.top && trigger < section.bottom) {
        activeId = section.id;
        break;
      }
    }

    if (activeId && activeId !== State.currentSection) {
      State.currentSection = activeId;
      Events.emit('section:change', activeId);
      this._updateNavLinks(activeId);
    }
  }

  _updateNavLinks(activeId) {
    this._navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const id   = href ? href.replace('#', '') : '';
      DOM.toggleClass(link, 'is-active', id === activeId);
    });
  }

  _setupSmoothNavLinks() {
    // Smooth scroll for anchor links with GSAP
    DOM.qsa('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;

        const target = DOM.qs(href);
        if (!target) return;

        e.preventDefault();

        const targetY = target.getBoundingClientRect().top + State.scroll.y;

        gsap.to(window, {
          scrollTo: { y: targetY, autoKill: false },
          duration: 1.2,
          ease: 'power3.inOut',
          onStart: () => {
            // Optional: close mobile menu, etc.
          }
        });
      });
    });
  }

  /** Get current scroll velocity for effects */
  getVelocity() {
    return this._velocity;
  }

  /** Scroll to a section by ID */
  scrollTo(sectionId, duration = 1.2) {
    const target = DOM.qs(`#${sectionId}`);
    if (!target) return;

    const targetY = target.getBoundingClientRect().top + State.scroll.y;
    gsap.to(window, {
      scrollTo: { y: targetY, autoKill: false },
      duration,
      ease: 'power3.inOut',
    });
  }
}

/* ─── Parallax Helper ────────────────────────────────────────
   Applies scroll-based Y parallax to elements.
   Usage: new Parallax('.hero-sub', { speed: 0.3 })
──────────────────────────────────────────────────────────── */
class Parallax {
  constructor(targets, options = {}) {
    this.opts = { speed: 0.15, ease: 0.08, ...options };
    this.items = [];

    const els = typeof targets === 'string'
      ? DOM.qsa(targets)
      : (Array.isArray(targets) ? targets : [targets]);

    els.forEach(el => {
      this.items.push({
        el,
        currentY: 0,
        targetY:  0,
      });
    });

    this._startLoop();
  }

  _startLoop() {
    Raf.add(`parallax-${Math.random()}`, () => {
      this.items.forEach(item => {
        item.targetY = State.scroll.y * this.opts.speed * -1;
        item.currentY = MathUtils.lerp(item.currentY, item.targetY, this.opts.ease);
        item.el.style.transform = `translateY(${item.currentY}px)`;
      });
    });
  }
}

/* ─── Counter Animation ──────────────────────────────────────
   Animates a number from 0 to target when element enters view
──────────────────────────────────────────────────────────── */
function animateCounters(selector = '[data-count-to]') {
  const els = DOM.qsa(selector);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);

      const el     = entry.target;
      const target = parseInt(el.dataset.countTo, 10) || 0;
      const dur    = parseFloat(el.dataset.countDur) || 1.8;

      gsap.fromTo(el,
        { textContent: 0 },
        {
          textContent: target,
          duration: dur,
          ease: 'power2.out',
          snap: { textContent: 1 },
          onUpdate() {
            el.textContent = Math.round(parseFloat(el.textContent));
          }
        }
      );
    });
  }, { threshold: 0.5 });

  els.forEach(el => observer.observe(el));
}

window.ScrollManager  = ScrollManager;
window.Parallax       = Parallax;
window.animateCounters = animateCounters;