/* ============================================================
   js/cursor.js — Custom cursor: dot + lagging ring with labels
   ============================================================ */
'use strict';

class CustomCursor {
  constructor() {
    this.dot   = DOM.qs('#cursor-dot');
    this.ring  = DOM.qs('#cursor-ring');
    this.label = DOM.qs('#cursor-ring-label');

    if (!this.dot || !this.ring || State.isMobile || State.isTablet) return;

    // Position tracking
    this._tx = -200; this._ty = -200;   // target (mouse pos)
    this._dx = -200; this._dy = -200;   // dot current
    this._rx = -200; this._ry = -200;   // ring current

    this._ringW = 42; // current ring width (updates with class changes)
    this._ringH = 42;

    this._firstMove = false;
    this._isHovering = false;

    this._bind();
    this._startLoop();
  }

  _bind() {
    // ── Track mouse ───────────────────────────────────────────
    document.addEventListener('mousemove', (e) => {
      this._tx = e.clientX;
      this._ty = e.clientY;

      if (!this._firstMove) {
        this._firstMove = true;
        this._dx = this._rx = this._tx;
        this._dy = this._ry = this._ty;
        this.dot.style.opacity  = '1';
        this.ring.style.opacity = '1';
      }
    });

    // ── Click feedback ────────────────────────────────────────
    document.addEventListener('mousedown', () => {
      DOM.addClass(this.ring, 'is-clicking');
      this._ringW = this._ringH = 30;
    });
    document.addEventListener('mouseup', () => {
      DOM.removeClass(this.ring, 'is-clicking');
      this._ringW = this._ringH = this._isHovering ? 70 : 42;
    });

    // ── Leave / enter window ──────────────────────────────────
    document.addEventListener('mouseleave', () => {
      this.dot.style.opacity  = '0';
      this.ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      this.dot.style.opacity  = '1';
      this.ring.style.opacity = '1';
    });

    // ── Hover targets ─────────────────────────────────────────
    this._bindHoverTargets();

    // Watch for new elements
    const mo = new MutationObserver(() => this._bindHoverTargets());
    mo.observe(document.body, { childList: true, subtree: true });

    // ── Magnetic elements ─────────────────────────────────────
    this._bindMagnetics();
  }

  _bindHoverTargets() {
    DOM.qsa('a, button, .hover-target, [data-cursor-label]').forEach(el => {
      if (el._cursorBound) return;
      el._cursorBound = true;

      el.addEventListener('mouseenter', () => {
        this._isHovering = true;
        const lbl = el.dataset.cursorLabel;

        DOM.removeClass(this.ring, 'is-hovering', 'has-label');
        this.label.textContent = '';

        if (lbl) {
          this.label.textContent = lbl;
          DOM.addClass(this.ring, 'has-label');
          this._ringW = this._ringH = 80;
        } else {
          DOM.addClass(this.ring, 'is-hovering');
          this._ringW = this._ringH = 70;
        }
      });

      el.addEventListener('mouseleave', () => {
        this._isHovering = false;
        this._ringW = this._ringH = 42;
        this.label.textContent = '';
        DOM.removeClass(this.ring, 'is-hovering', 'has-label');
      });
    });
  }

  _bindMagnetics() {
    DOM.qsa('.magnetic').forEach(el => {
      if (el._magnetBound) return;
      el._magnetBound = true;

      el.addEventListener('mousemove', (e) => {
        const r  = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width  / 2)) * 0.38;
        const dy = (e.clientY - (r.top  + r.height / 2)) * 0.38;
        gsap.to(el, { x: dx, y: dy, duration: 0.35, ease: 'power2.out' });
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
      });
    });
  }

  _startLoop() {
    const DOT_LERP  = 0.82;
    const RING_LERP = 0.13;

    Raf.add('cursor', () => {
      // Lerp positions
      this._dx = MathUtils.lerp(this._dx, this._tx, DOT_LERP);
      this._dy = MathUtils.lerp(this._dy, this._ty, DOT_LERP);
      this._rx = MathUtils.lerp(this._rx, this._tx, RING_LERP);
      this._ry = MathUtils.lerp(this._ry, this._ty, RING_LERP);

      // Dot: center it on cursor point (dot is 6px wide/tall → offset -3)
      this.dot.style.transform = `translate(${this._dx - 3}px, ${this._dy - 3}px)`;

      // Ring: center it (offset = half of current ring size)
      const hw = this._ringW / 2;
      const hh = this._ringH / 2;
      this.ring.style.transform = `translate(${this._rx - hw}px, ${this._ry - hh}px)`;
    });
  }

  destroy() { Raf.remove('cursor'); }
}

window.CustomCursor = CustomCursor;