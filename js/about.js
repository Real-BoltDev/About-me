/* ============================================================
   js/about.js — About section: scroll reveal, skill bars, tilt
   ============================================================ */
'use strict';

class AboutAnimations {
  constructor() {
    this.section  = DOM.qs('#about');
    this.title    = DOM.qs('.about-title');
    this.blob     = DOM.qs('#about-blob');
    this.badge    = DOM.qs('.about-badge');
    this.bars     = DOM.qsa('.skill-bar-fill');
    this.rows     = DOM.qsa('.skill-bar-row');
    this.bodies   = DOM.qsa('.about-subtitle, .about-body');
    this.frame    = DOM.qs('.about-img-frame');

    this._barsAnimated  = false;
    this._titleSplit    = null;

    this._init();
  }

  _init() {
    if (!this.section) return;
    this._setupTitleReveal();
    this._setupContentReveal();
    this._setupSkillBars();
    this._setupBlobParallax();
    this._setupBadgeFloat();
    this._setupImageReveal();
  }

  // ── Title: character split reveal ────────────────────────────
  _setupTitleReveal() {
    if (!this.title) return;

    // Split title into chars
    this._titleSplit = new SplitText(this.title, { type: 'chars,words' });

    gsap.from(this._titleSplit.chars, {
      yPercent: 100,
      opacity: 0,
      stagger: 0.025,
      duration: 0.8,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: this.title,
        start: 'top 80%',
        toggleActions: 'play none none none',
      }
    });
  }

  // ── Body text + eyebrow reveal ───────────────────────────────
  _setupContentReveal() {
    const eyebrow = DOM.qs('.about-content-col .section-eyebrow');
    if (eyebrow) {
      gsap.from(eyebrow, {
        x: -30,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: eyebrow,
          start: 'top 85%',
        }
      });
    }

    this.bodies.forEach((body, i) => {
      gsap.from(body, {
        y: 25,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: i * 0.12,
        scrollTrigger: {
          trigger: body,
          start: 'top 82%',
        }
      });
    });
  }

  // ── Animated skill bars ──────────────────────────────────────
  _setupSkillBars() {
    if (!this.bars.length) return;

    // Build correct DOM for skill bars (label + track side by side)
    // They may need to be restructured via JS
    this.rows.forEach(row => {
      // Find the label and pct span
      const label = row.querySelector('.skill-bar-label');
      const track = row.querySelector('.skill-bar-track');
      const pct   = row.querySelector('.skill-bar-pct');
      const fill  = row.querySelector('.skill-bar-fill');

      // Restructure row: label + pct on one line, track below
      if (label && track && pct && fill) {
        // Wrap label and pct into a flex header
        const header = document.createElement('div');
        header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;';
        row.insertBefore(header, label);
        header.appendChild(label);
        header.appendChild(pct);
        // track stays below header naturally
      }
    });

    // IntersectionObserver triggers bars
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || this._barsAnimated) return;
        this._barsAnimated = true;
        observer.disconnect();
        this._animateBars();
      });
    }, { threshold: 0.3 });

    const barContainer = DOM.qs('.skill-bars');
    if (barContainer) observer.observe(barContainer);
  }

  _animateBars() {
    this.bars.forEach((bar, i) => {
      const targetWidth = parseInt(bar.dataset.fillTo, 10) || 0;

      gsap.fromTo(bar,
        { width: '0%' },
        {
          width: `${targetWidth}%`,
          duration: 1.4,
          ease: 'power3.out',
          delay: i * 0.12 + 0.2,
        }
      );
    });

    // Stagger the whole rows
    gsap.from(this.rows, {
      y: 15,
      opacity: 0,
      stagger: 0.1,
      duration: 0.6,
      ease: 'power2.out',
    });
  }

  // ── Blob parallax ─────────────────────────────────────────────
  _setupBlobParallax() {
    if (!this.blob) return;

    // The blob already morphs via CSS animation
    // Add scroll-driven Y parallax
    gsap.to(this.blob, {
      y: -60,
      scrollTrigger: {
        trigger: this.section,
        start: 'top bottom',
        end:   'bottom top',
        scrub: 1.5,
      }
    });

    // Also animate blob scale on mouse move (section-scoped)
    this.section.addEventListener('mousemove', (e) => {
      const rect = this.section.getBoundingClientRect();
      const nx   = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      const ny   = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;

      gsap.to(this.blob, {
        x: nx * 20,
        y: ny * 15,
        scale: 1 + Math.abs(nx) * 0.05,
        duration: 1.2,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  }

  // ── Badge floating animation ──────────────────────────────────
  _setupBadgeFloat() {
    if (!this.badge) return;

    // Entry animation
    gsap.from(this.badge, {
      scale: 0.6,
      opacity: 0,
      rotation: -15,
      duration: 0.85,
      ease: 'back.out(1.7)',
      scrollTrigger: {
        trigger: this.section,
        start: 'top 70%',
      }
    });

    // Continuous float
    gsap.to(this.badge, {
      y: -10,
      rotation: 3,
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // ── Image frame reveal ────────────────────────────────────────
  _setupImageReveal() {
    if (!this.frame) return;

    gsap.from(this.frame, {
      x: -80,
      opacity: 0,
      rotation: -5,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: this.section,
        start: 'top 70%',
        toggleActions: 'play none none none',
      }
    });

    // Subtle tilt on scroll within section
    gsap.to(this.frame, {
      rotation: 3,
      scrollTrigger: {
        trigger: this.section,
        start: 'top bottom',
        end:   'bottom top',
        scrub: 2,
      }
    });
  }
}

window.AboutAnimations = AboutAnimations;