/* ============================================================
   js/skills.js — Skills section: 3D tilt cards, glow tracking
   ============================================================ */
'use strict';

class SkillsAnimations {
  constructor() {
    this.section   = DOM.qs('#skills');
    this.cards     = DOM.qsa('.skill-card');
    this.title     = DOM.qs('.skills-section .section-title');
    this.header    = DOM.qs('.skills-section .section-header');
    this._split    = null;

    this._init();
  }

  _init() {
    if (!this.section) return;
    this._setupTitleReveal();
    this._setupCardReveal();
    this._setupTiltCards();
    this._setupGlowTracking();
  }

  // ── Title split reveal ────────────────────────────────────────
  _setupTitleReveal() {
    if (!this.title) return;

    this._split = new SplitText(this.title, { type: 'chars' });

    gsap.from(this._split.chars, {
      yPercent: 110,
      opacity:  0,
      stagger:  0.04,
      duration: 0.9,
      ease:     'power4.out',
      scrollTrigger: {
        trigger: this.header,
        start:   'top 80%',
      }
    });

    // Eyebrow
    const eyebrow = DOM.qs('.skills-section .section-eyebrow');
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

    // Sub
    const sub = DOM.qs('.skills-section .section-sub');
    if (sub) {
      gsap.from(sub, {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.2,
        scrollTrigger: {
          trigger: sub,
          start: 'top 85%',
        }
      });
    }
  }

  // ── Card stagger reveal ───────────────────────────────────────
  _setupCardReveal() {
    if (!this.cards.length) return;

    // 3D flip-in from below
    gsap.from(this.cards, {
      y:         80,
      opacity:   0,
      rotationX: 20,
      scale:     0.92,
      stagger: {
        each:   0.12,
        from:   'start',
      },
      duration:  0.85,
      ease:      'power3.out',
      scrollTrigger: {
        trigger: DOM.qs('.skills-grid'),
        start:   'top 75%',
        toggleActions: 'play none none none',
      }
    });

    // Tag stagger within each card
    this.cards.forEach(card => {
      const tags = DOM.qsa('.tag', card);
      gsap.from(tags, {
        scale:   0.7,
        opacity: 0,
        stagger: 0.06,
        duration: 0.45,
        ease:    'back.out(1.5)',
        scrollTrigger: {
          trigger: card,
          start:   'top 80%',
        }
      });
    });
  }

  // ── 3D Tilt on mouse move ─────────────────────────────────────
  _setupTiltCards() {
    if (State.isMobile) return; // Skip on mobile

    this.cards.forEach(card => {
      card.addEventListener('mousemove', (e) => this._onCardMouseMove(e, card));
      card.addEventListener('mouseleave', ()  => this._onCardMouseLeave(card));
      card.addEventListener('mouseenter', ()  => this._onCardMouseEnter(card));
    });
  }

  _onCardMouseEnter(card) {
    gsap.to(card, {
      z: 20,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  _onCardMouseMove(e, card) {
    const rect   = card.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const dx     = (e.clientX - cx) / (rect.width  / 2); // -1 to 1
    const dy     = (e.clientY - cy) / (rect.height / 2); // -1 to 1

    const maxTilt = 12; // degrees

    gsap.to(card, {
      rotationY:   dx * maxTilt,
      rotationX:  -dy * maxTilt,
      duration:    0.4,
      ease:        'power2.out',
      transformPerspective: 800,
    });

    // Move glow to follow mouse
    const glow = card.querySelector('.skill-card-glow');
    if (glow) {
      const glowX = e.clientX - rect.left - 100;
      const glowY = e.clientY - rect.top  - 100;
      gsap.to(glow, {
        x: glowX,
        y: glowY,
        duration: 0.5,
        ease: 'power2.out',
      });
    }
  }

  _onCardMouseLeave(card) {
    gsap.to(card, {
      rotationX: 0,
      rotationY: 0,
      z:         0,
      duration:  0.7,
      ease:      'elastic.out(1, 0.4)',
    });

    const glow = card.querySelector('.skill-card-glow');
    if (glow) {
      gsap.to(glow, {
        x: -80, y: -80,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
      });
    }
  }

  // ── Ambient glow: card border highlights on scroll ────────────
  _setupGlowTracking() {
    // Global mouse tracker for a more ambient glow effect
    Events.on('mousemove', ({ x, y }) => {
      this.cards.forEach(card => {
        if (!DOM.inView(card)) return;
        const rect = card.getBoundingClientRect();
        const dx   = x - (rect.left + rect.width  / 2);
        const dy   = y - (rect.top  + rect.height / 2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = 400;

        if (dist < maxDist) {
          const intensity = 1 - dist / maxDist;
          card.style.setProperty(
            '--glow-alpha',
            (intensity * 0.25).toFixed(3)
          );
        } else {
          card.style.setProperty('--glow-alpha', '0');
        }
      });
    });
  }
}

window.SkillsAnimations = SkillsAnimations;