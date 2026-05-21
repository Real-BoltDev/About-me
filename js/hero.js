/* ============================================================
   js/hero.js — Hero section: row reveals, scramble, parallax
   ============================================================ */
'use strict';

class HeroAnimations {
  constructor() {
    this.section   = DOM.qs('#hero');
    this.eyebrow   = DOM.qs('#hero-eyebrow-text');
    this.titleRows = DOM.qsa('.char-wrap');
    this.sub       = DOM.qs('.hero-sub');
    this.actions   = DOM.qs('.hero-actions');
    this.stats     = DOM.qs('.hero-stats');
    this.scrollInd = DOM.qs('.hero-scroll-indicator');
    this._isAnimated = false;
  }

  enter(delay = 0) {
    if (this._isAnimated) return;
    this._isAnimated = true;

    // Ensure visible as fallback
    this.titleRows.forEach(r => {
      r.style.transform = 'translateY(0)';
      r.style.opacity   = '1';
    });

    const tl = gsap.timeline({ delay, defaults: { ease: 'power3.out' } });

    // 1. Eyebrow lines
    tl.from('.hero-eyebrow-line', {
      scaleX: 0, duration: 0.7, stagger: 0.12,
      transformOrigin: 'left center',
    }, 0);

    // 2. Eyebrow scramble
    tl.add(() => {
      if (!this.eyebrow) return;
      const sc = new ScrambleText(this.eyebrow, {
        finalText: this.eyebrow.textContent,
        duration: 800,
        chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      });
      sc.start();
    }, 0.15);

    // 3. Title rows — slide-up reveal (rows have overflow:hidden)
    tl.fromTo(this.titleRows,
      { yPercent: 105 },
      { yPercent: 0, duration: 0.9, stagger: 0.14, ease: 'power4.out' },
      0.2
    );

    // 4. Sub text
    tl.from(this.sub, { y: 28, opacity: 0, duration: 0.85 }, 0.85);

    // 5. Buttons
    const btns = this.actions ? DOM.qsa('.btn', this.actions) : [];
    if (btns.length) {
      tl.from(btns, { y: 22, opacity: 0, scale: 0.94, stagger: 0.1, duration: 0.7 }, 1.05);
    }

    // 6. Stats
    if (this.stats) {
      tl.from(this.stats, { y: 20, opacity: 0, duration: 0.65 }, 1.25);
    }

    // 7. Scroll indicator
    if (this.scrollInd) {
      tl.from(this.scrollInd, { opacity: 0, duration: 0.5 }, 1.55);
    }

    // 8. Count up
    tl.add(() => this._animateHeroCounters(), 1.3);

    // 9. Scroll parallax
    tl.add(() => this._setupScrollParallax(), 0);

    return tl;
  }

  _animateHeroCounters() {
    DOM.qsa('.hero-stat-num[data-count-to]').forEach(el => {
      const target = parseInt(el.dataset.countTo, 10);
      if (isNaN(target)) return;
      const dur   = 1600;
      const start = performance.now();
      const tick  = (now) => {
        const t = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(MathUtils.easeOutCubic(t) * target);
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
    });
  }

  _setupScrollParallax() {
    if (!this.section) return;
    gsap.to('.hero-content', {
      y: -160, opacity: 0, scale: 0.95,
      scrollTrigger: { trigger: this.section, start: 'top top', end: 'bottom top', scrub: 1.5 }
    });
    if (this.stats) {
      gsap.to(this.stats, {
        y: -60, opacity: 0,
        scrollTrigger: { trigger: this.section, start: 'top top', end: '50% top', scrub: 1 }
      });
    }
    gsap.to('.hero-bg-grid', {
      opacity: 0,
      scrollTrigger: { trigger: this.section, start: 'top top', end: '35% top', scrub: 1 }
    });
  }

  setupMarqueeVelocity() {
    const inner = DOM.qs('.marquee-inner');
    if (!inner) return;
    inner.style.animation = 'none';
    let xPos = 0, speed = 1.2, lastY = State.scroll.y;
    Raf.add('marquee-velocity', () => {
      const dy = State.scroll.y - lastY;
      lastY = State.scroll.y;
      speed = MathUtils.lerp(speed, 1.2 + Math.abs(dy) * 0.35, 0.09);
      speed = MathUtils.clamp(speed, 0.5, 7);
      xPos -= speed;
      const halfW = inner.scrollWidth / 2;
      if (xPos <= -halfW) xPos += halfW;
      inner.style.transform = `translateX(${xPos}px)`;
    });
  }
}

window.HeroAnimations = HeroAnimations;