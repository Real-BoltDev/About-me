/* ============================================================
   js/projects.js — Horizontal scroll: pin, drag, card reveals
   ============================================================ */
'use strict';

class ProjectsHorizontalScroll {
  constructor() {
    this.section   = DOM.qs('#projects');
    this.pin       = DOM.qs('#projects-pin');
    this.track     = DOM.qs('#projects-track');
    this.cards     = DOM.qsa('.project-card-h');
    this.introPanel = DOM.qs('.project-intro-panel');

    // Drag state
    this._isDragging   = false;
    this._dragStartX   = 0;
    this._dragStartScroll = 0;
    this._velocity     = 0;
    this._lastX        = 0;
    this._momentumId   = null;
    this._scrollTrigger = null;
    this._titleSplit   = null;

    if (!this.section || !this.track) return;

    // Don't set up horizontal on mobile
    if (State.isMobile) {
      this._setupMobileFallback();
      return;
    }

    this._init();
  }

  _init() {
    this._setupGSAPHorizontal();
    this._setupDrag();
    this._setupCardAnimations();
    this._setupIntroPanel();
    this._setupProjectTitles();
  }

  // ── GSAP pin + horizontal scroll ─────────────────────────────
  _setupGSAPHorizontal() {
    // Compute total scroll width
    const getScrollWidth = () => {
      return this.track.scrollWidth - State.viewport.w;
    };

    this._scrollTrigger = gsap.to(this.track, {
      x: () => -getScrollWidth(),
      ease: 'none',
      scrollTrigger: {
        trigger:  this.section,
        pin:      true,
        scrub:    0.8,
        end:      () => '+=' + getScrollWidth(),
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          Events.emit('projects:progress', self.progress);
        },
      }
    });

    // Refresh on resize
    Events.on('resize', () => {
      this._scrollTrigger && ScrollTrigger.refresh();
    });
  }

  // ── Drag-to-scroll support ────────────────────────────────────
  _setupDrag() {
    if (!this.pin) return;

    const onPointerDown = (e) => {
      // Disable custom drag on touch devices to allow native scrolling without conflict
      if (e.touches || e.pointerType === 'touch') return;

      this._isDragging    = true;
      this._dragStartX    = e.clientX;
      this._lastX         = this._dragStartX;
      this._velocity      = 0;
      clearInterval(this._momentumId);
      DOM.addClass(this.pin, 'is-dragging');
    };

    const onPointerMove = (e) => {
      if (!this._isDragging) return;
      const currentX = e.clientX;
      const dx = currentX - this._lastX;
      this._velocity = dx;
      this._lastX    = currentX;

      // Convert drag to scroll
      const totalDragDist = this._dragStartX - currentX;
      const scrollAmount  = totalDragDist * 2.5;

      const st = ScrollTrigger.getById ? null : null;
      // Move window scroll to drive the ScrollTrigger
      const trigger = ScrollTrigger.getAll().find(t => t.trigger === this.section);
      if (trigger) {
        const range = trigger.end - trigger.start;
        const targetScroll = trigger.start + (scrollAmount / (this.track.scrollWidth - State.viewport.w)) * range;
        window.scrollTo({ top: MathUtils.clamp(targetScroll, trigger.start, trigger.end) });
      }
    };

    const onPointerUp = () => {
      if (!this._isDragging) return;
      this._isDragging = false;
      DOM.removeClass(this.pin, 'is-dragging');
      this._applyMomentum();
    };

    // Mouse events
    this.pin.addEventListener('mousedown',  onPointerDown);
    window.addEventListener('mousemove',  onPointerMove);
    window.addEventListener('mouseup',    onPointerUp);
  }

  _applyMomentum() {
    let velocity = -this._velocity * 8;
    const decay  = 0.92;
    const minVel = 0.5;

    const step = () => {
      if (Math.abs(velocity) < minVel) return;
      velocity *= decay;
      window.scrollBy({ top: velocity });
      this._momentumId = requestAnimationFrame(step);
    };

    this._momentumId = requestAnimationFrame(step);
  }

  // ── Card reveal animations (triggered by horizontal progress) ─
  _setupCardAnimations() {
    this.cards.forEach((card, i) => {
      // Reveal image from clip-path
      const img = card.querySelector('.project-card-h-img');
      if (img) {
        gsap.from(img, {
          clipPath: 'inset(100% 0 0 0)',
          duration: 1.0,
          ease: 'power3.out',
          scrollTrigger: {
            trigger:       card,
            start:         'left 90%',
            end:           'left 30%',
            containerAnimation: this._scrollTrigger,
            toggleActions: 'play none none reverse',
          }
        });
      }

      // Body text reveal
      const body = card.querySelector('.project-card-h-body');
      if (body) {
        const children = [...body.children];
        gsap.from(children, {
          y:       40,
          opacity: 0,
          stagger: 0.1,
          duration: 0.7,
          ease:    'power3.out',
          scrollTrigger: {
            trigger:            card,
            start:              'left 80%',
            containerAnimation: this._scrollTrigger,
            toggleActions:      'play none none none',
          }
        });
      }
    });
  }

  // ── Intro panel animation ─────────────────────────────────────
  _setupIntroPanel() {
    if (!this.introPanel) return;
    const eyebrow = DOM.qs('.section-eyebrow', this.introPanel);
    const title   = DOM.qs('.project-intro-title', this.introPanel);
    const sub     = DOM.qs('.project-intro-sub', this.introPanel);
    const badge   = DOM.qs('.project-count-badge', this.introPanel);

    const items = [eyebrow, title, sub, badge].filter(Boolean);

    gsap.from(items, {
      y: 40,
      opacity: 0,
      stagger: 0.12,
      duration: 0.85,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: this.section,
        start:   'top 80%',
      }
    });

    // Scroll indicator on intro panel
    gsap.to(sub, {
      x: 10,
      duration: 1.2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // ── Project card title hover animation ───────────────────────
  _setupProjectTitles() {
    this.cards.forEach(card => {
      const title = DOM.qs('.project-title', card);
      if (!title) return;

      card.addEventListener('mouseenter', () => {
        gsap.to(title, {
          x: 8,
          duration: 0.35,
          ease: 'power2.out',
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(title, {
          x: 0,
          duration: 0.5,
          ease: 'elastic.out(1, 0.5)',
        });
      });
    });
  }

  // ── Mobile: vertical stack fallback ──────────────────────────
  _setupMobileFallback() {
    // On mobile, this acts as a native CSS horizontal scroll carousel.
    // We just animate them in when the section comes into view.
    gsap.from(this.introPanel, {
      y: 30, opacity: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: this.section, start: 'top 85%' }
    });

    this.cards.forEach((card, i) => {
      gsap.from(card, {
        x:       40,
        opacity: 0,
        duration: 0.85,
        ease:    'power3.out',
        delay:   i * 0.15 + 0.2,
        scrollTrigger: {
          trigger: this.section,
          start:   'top 75%',
        }
      });
    });
  }
}

window.ProjectsHorizontalScroll = ProjectsHorizontalScroll;