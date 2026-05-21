/* ============================================================
   js/splitText.js — Manual text splitting for char animations
   ============================================================ */
'use strict';

/**
 * SplitText — splits element text into per-character spans
 * for GSAP-driven stagger animations.
 *
 * Usage:
 *   const split = new SplitText('.hero-title');
 *   gsap.from(split.chars, { y: '110%', stagger: 0.03, ... });
 */
class SplitText {
  constructor(target, options = {}) {
    this.opts = {
      type: 'chars,words',      // 'chars' | 'words' | 'lines' | combo
      charsClass: 'split-char',
      charInnerClass: 'split-char-inner',
      wordsClass: 'split-word',
      linesClass: 'split-line',
      ...options,
    };

    // Support selector string, single element, or NodeList / array
    if (typeof target === 'string') {
      this.elements = [...document.querySelectorAll(target)];
    } else if (target instanceof Element) {
      this.elements = [target];
    } else if (target instanceof NodeList || Array.isArray(target)) {
      this.elements = [...target];
    } else {
      this.elements = [];
    }

    this.chars  = [];
    this.words  = [];
    this.lines  = [];
    this._originals = new Map(); // Store original HTML for revert()

    this._split();
  }

  _split() {
    this.elements.forEach(el => {
      this._originals.set(el, el.innerHTML);
      this._processElement(el);
    });
  }

  _processElement(el) {
    const text = el.textContent;
    const doChars = this.opts.type.includes('chars');
    const doWords = this.opts.type.includes('words');

    // Split into words first
    const wordStrings = text.split(/(\s+)/);
    el.innerHTML = '';

    wordStrings.forEach(part => {
      if (/^\s+$/.test(part)) {
        // Preserve whitespace
        el.appendChild(document.createTextNode(part));
        return;
      }

      if (!part) return;

      if (doWords) {
        const wordEl = document.createElement('span');
        wordEl.classList.add(this.opts.wordsClass);
        wordEl.style.display = 'inline-block';
        wordEl.style.overflow = 'hidden';

        if (doChars) {
          [...part].forEach(char => {
            const charEl = this._makeChar(char);
            wordEl.appendChild(charEl);
            this.chars.push(charEl.querySelector(`.${this.opts.charInnerClass}`) || charEl);
          });
        } else {
          wordEl.textContent = part;
        }

        el.appendChild(wordEl);
        this.words.push(wordEl);
      } else if (doChars) {
        // Chars only, no word wrapper
        [...part].forEach(char => {
          const charEl = this._makeChar(char);
          el.appendChild(charEl);
          this.chars.push(charEl.querySelector(`.${this.opts.charInnerClass}`) || charEl);
        });
      }
    });
  }

  _makeChar(char) {
    const outer = document.createElement('span');
    outer.classList.add(this.opts.charsClass);
    outer.style.display = 'inline-block';
    outer.style.overflow = 'hidden';
    outer.style.verticalAlign = 'bottom';
    outer.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('span');
    inner.classList.add(this.opts.charInnerClass);
    inner.style.display = 'inline-block';
    inner.textContent = char === ' ' ? '\u00A0' : char; // nbsp for spaces

    outer.appendChild(inner);
    return outer;
  }

  /** Restore original HTML */
  revert() {
    this.elements.forEach(el => {
      if (this._originals.has(el)) {
        el.innerHTML = this._originals.get(el);
      }
    });
    this.chars  = [];
    this.words  = [];
    this._originals.clear();
  }

  /** Re-split (e.g., after resize / font load) */
  refresh() {
    this.revert();
    this.chars = [];
    this.words = [];
    this._split();
  }
}

/**
 * Scramble Text Effect — continuously randomizes text before
 * settling on the real value. Great for eyebrow labels.
 */
class ScrambleText {
  constructor(el, options = {}) {
    this.el = typeof el === 'string' ? document.querySelector(el) : el;
    this.opts = {
      finalText:  this.el ? this.el.textContent : '',
      chars:      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%',
      duration:   1200,  // ms total
      fps:        30,
      delay:      0,
      ...options,
    };

    this._frame    = 0;
    this._timeout  = null;
    this._interval = null;
    this._done     = false;
  }

  start(onComplete) {
    if (!this.el) return;
    const { finalText, chars, duration, fps, delay } = this.opts;
    const totalFrames = Math.round((duration / 1000) * fps);
    const frameDuration = 1000 / fps;
    let frame = 0;

    const run = () => {
      this._interval = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const revealedCount = Math.floor(progress * finalText.length);

        this.el.textContent = finalText
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (i < revealedCount) return char;
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');

        if (frame >= totalFrames) {
          clearInterval(this._interval);
          this.el.textContent = finalText;
          this._done = true;
          if (onComplete) onComplete();
        }
      }, frameDuration);
    };

    if (delay > 0) {
      this._timeout = setTimeout(run, delay);
    } else {
      run();
    }
  }

  stop() {
    clearTimeout(this._timeout);
    clearInterval(this._interval);
    if (this.el) this.el.textContent = this.opts.finalText;
  }
}

/**
 * TypeWriter effect — types text character by character with cursor
 */
class TypeWriter {
  constructor(el, options = {}) {
    this.el = typeof el === 'string' ? document.querySelector(el) : el;
    this.opts = {
      text:      '',
      speed:     60,      // ms per char
      cursor:    true,
      cursorChar: '|',
      delay:     0,
      ...options,
    };
    this._timeout = null;
    this._cursorEl = null;
  }

  start(onComplete) {
    if (!this.el) return;
    const { text, speed, cursor, cursorChar, delay } = this.opts;

    if (cursor) {
      this._cursorEl = document.createElement('span');
      this._cursorEl.textContent = cursorChar;
      this._cursorEl.style.cssText = `
        color: var(--clr-accent);
        animation: cursorBlink 1s ease-in-out infinite;
        margin-left: 2px;
      `;
    }

    this.el.textContent = '';
    if (cursor && this._cursorEl) this.el.appendChild(this._cursorEl);

    let i = 0;
    const type = () => {
      if (i < text.length) {
        const textNode = document.createTextNode(text[i]);
        this.el.insertBefore(textNode, this._cursorEl);
        i++;
        this._timeout = setTimeout(type, speed + MathUtils.random(-15, 15));
      } else {
        if (cursor && this._cursorEl) {
          setTimeout(() => {
            this._cursorEl && this._cursorEl.remove();
          }, 1800);
        }
        if (onComplete) onComplete();
      }
    };

    setTimeout(type, delay);
  }

  stop() {
    clearTimeout(this._timeout);
  }
}

// Expose globally
window.SplitText  = SplitText;
window.ScrambleText = ScrambleText;
window.TypeWriter   = TypeWriter;