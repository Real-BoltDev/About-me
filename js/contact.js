/* ============================================================
   js/contact.js — Contact section: headline split, email, socials
   ============================================================ */
'use strict';

class ContactAnimations {
  constructor() {
    this.section   = DOM.qs('#contact');
    this.headline  = DOM.qs('.contact-headline');
    this.email     = DOM.qs('.contact-email-link');
    this.socials   = DOM.qsa('.social-link');
    this.desc      = DOM.qs('.contact-desc');
    this.footer    = DOM.qs('.site-footer');
    this._split    = null;
    this._init();
  }

  _init() {
    if (!this.section) return;
    this._setupHeadlineReveal();
    this._setupEmailAnimation();
    this._setupSocialsReveal();
    this._setupEyebrowReveal();
    this._setupFooterReveal();
  }

  _setupHeadlineReveal() {
    if (!this.headline) return;
    this._split = new SplitText(this.headline, { type: 'chars,words' });
    gsap.from(this._split.chars, {
      yPercent: 110, opacity: 0, stagger: 0.03, duration: 0.9,
      ease: 'power4.out',
      scrollTrigger: { trigger: this.headline, start: 'top 80%' }
    });
  }

  _setupEmailAnimation() {
    if (!this.email) return;
    gsap.from(this.email, {
      y: 40, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: this.email, start: 'top 85%' }
    });

    if (!State.isMobile) {
      this.email.addEventListener('mousemove', (e) => {
        const rect = this.email.getBoundingClientRect();
        gsap.to(this.email, {
          x: (e.clientX - rect.left - rect.width/2) * 0.2,
          y: (e.clientY - rect.top  - rect.height/2) * 0.2,
          duration: 0.35, ease: 'power2.out'
        });
      });
      this.email.addEventListener('mouseleave', () => {
        gsap.to(this.email, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
      });
    }

    this.email.addEventListener('click', (e) => this._createRipple(e, this.email));
  }

  _setupSocialsReveal() {
    if (!this.socials.length) return;
    gsap.from(this.socials, {
      y: 25, opacity: 0, stagger: 0.09, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: DOM.qs('.contact-socials') || this.section, start: 'top 85%' }
    });
    this.socials.forEach(link => {
      link.addEventListener('mouseenter', () => gsap.to(link, { x: 6, duration: 0.3, ease: 'power2.out' }));
      link.addEventListener('mouseleave', () => gsap.to(link, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.5)' }));
    });
  }

  _setupEyebrowReveal() {
    const eyebrow = DOM.qs('.contact-section .section-eyebrow');
    if (eyebrow) {
      gsap.from(eyebrow, { x: -40, opacity: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: eyebrow, start: 'top 85%' }
      });
    }
    if (this.desc) {
      gsap.from(this.desc, { y: 30, opacity: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: this.desc, start: 'top 85%' }
      });
    }
  }

  _setupFooterReveal() {
    if (!this.footer) return;
    gsap.from(DOM.qsa('span', this.footer), {
      y: 15, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power2.out',
      scrollTrigger: { trigger: this.footer, start: 'top 95%' }
    });
  }

  _createRipple(e, el) {
    const rect   = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.style.cssText = `position:absolute;width:4px;height:4px;left:${e.clientX-rect.left}px;top:${e.clientY-rect.top}px;border-radius:50%;background:rgba(0,255,209,0.4);pointer-events:none;transform:translate(-50%,-50%) scale(0);z-index:10;`;
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);
    gsap.to(ripple, { scale: 60, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => ripple.remove() });
  }
}

window.ContactAnimations = ContactAnimations;