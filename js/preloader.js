/* ============================================================
   js/preloader.js — Animated counter + curtain reveal preloader
   ============================================================ */
'use strict';

class Preloader {
  constructor(options = {}) {
    this.opts = {
      minDuration: 2000, // Minimum preloader display time (ms)
      ...options,
    };

    this.el       = DOM.qs('#preloader');
    this.counter  = DOM.qs('#preloader-counter');
    this.barFill  = DOM.qs('#preloader-bar-fill');

    this._startTime = performance.now();
    this._current   = 0;
    this._target    = 0;
    this._isReady   = false;
    this._tl        = null;

    if (!this.el) return;

    // Lock scroll during loading
    DOM.addClass(document.body, 'is-loading');
  }

  /**
   * Start the preloader animation.
   * @param {Function} onComplete — called when preloader has fully exited
   */
  start(onComplete) {
    // Simulate asset loading progress
    this._simulateProgress(onComplete);
  }

  _simulateProgress(onComplete) {
    // Phases of loading progress
    const phases = [
      { target: 30, duration: 400  },
      { target: 65, duration: 600  },
      { target: 85, duration: 400  },
      { target: 95, duration: 300  },
    ];

    let phaseIndex = 0;
    let phaseStart = performance.now();

    const tick = (now) => {
      const phaseElapsed = now - phaseStart;
      const phase = phases[phaseIndex];

      if (phase) {
        const t = MathUtils.clamp(phaseElapsed / phase.duration, 0, 1);
        const eased = MathUtils.easeInOutCubic(t);
        const prevTarget = phaseIndex === 0 ? 0 : phases[phaseIndex - 1].target;
        this._target = prevTarget + (phase.target - prevTarget) * eased;

        if (t >= 1) {
          phaseIndex++;
          phaseStart = now;
        }
      }

      // Smooth current toward target
      this._current = MathUtils.lerp(this._current, this._target, 0.12);

      // Update DOM
      const displayVal = Math.round(this._current);
      if (this.counter)  this.counter.textContent = displayVal;
      if (this.barFill)  this.barFill.style.width = `${this._current}%`;

      // Check if all phases done and min duration elapsed
      const elapsed = now - this._startTime;
      const allPhasesComplete = phaseIndex >= phases.length;
      const minTimePassed     = elapsed >= this.opts.minDuration;

      if (allPhasesComplete && minTimePassed && !this._isReady) {
        this._isReady = true;
        // Jump to 100%
        this._fillToHundred(() => this._reveal(onComplete));
      } else {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  _fillToHundred(onComplete) {
    // Animate counter from current to 100
    const startVal = this._current;
    const duration = 400;
    const startTime = performance.now();

    const tick = (now) => {
      const t      = MathUtils.clamp((now - startTime) / duration, 0, 1);
      const eased  = MathUtils.easeOut(t);
      const val    = startVal + (100 - startVal) * eased;

      if (this.counter)  this.counter.textContent = Math.round(val);
      if (this.barFill)  this.barFill.style.width = `${val}%`;

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        if (this.counter) this.counter.textContent = '100';
        if (this.barFill) this.barFill.style.width  = '100%';
        setTimeout(onComplete, 200);
      }
    };

    requestAnimationFrame(tick);
  }

  _reveal(onComplete) {
    const tl = gsap.timeline({
      onComplete: () => {
        // Remove preloader from DOM entirely
        this.el.remove();
        DOM.removeClass(document.body, 'is-loading');
        Events.emit('preloader:complete');
        if (onComplete) onComplete();
      }
    });

    // Flash the counter to accent color
    tl.to(this.counter, {
      color: 'var(--clr-accent)',
      duration: 0.2,
      ease: 'none',
    })

    // Scale up the counter
    .to(this.counter, {
      scale: 1.15,
      duration: 0.3,
      ease: 'power2.out',
    })

    // Fade out the inner content
    .to('.preloader-inner', {
      opacity: 0,
      y: -20,
      duration: 0.45,
      ease: 'power2.in',
    }, '+=0.1')

    // Slide top curtain up
    .to('.preloader-curtain--top', {
      yPercent: -100,
      duration: 0.85,
      ease: 'power4.inOut',
    }, '-=0.1')

    // Slide bottom curtain down
    .to('.preloader-curtain--bottom', {
      yPercent: 100,
      duration: 0.85,
      ease: 'power4.inOut',
    }, '<')

    // Animate nav in
    .from('#nav', {
      y: -60,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.3');

    this._tl = tl;
  }

  destroy() {
    if (this._tl) this._tl.kill();
  }
}

window.Preloader = Preloader;