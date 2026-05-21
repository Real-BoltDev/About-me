/* ============================================================
   js/mobile-nav.js — Mobile hamburger menu logic
   ============================================================ */
'use strict';

class MobileNav {
  constructor() {
    this.toggleBtn = DOM.qs('#mobile-toggle');
    this.navLinks = DOM.qs('.nav-links');
    this.links = DOM.qsa('.nav-link', this.navLinks);
    this.isOpen = false;

    this._init();
  }

  _init() {
    if (!this.toggleBtn || !this.navLinks) return;

    // Toggle menu on button click
    this.toggleBtn.addEventListener('click', () => this.toggle());

    // Close menu when a link is clicked
    this.links.forEach(link => {
      link.addEventListener('click', () => {
        if (this.isOpen) this.close();
      });
    });

    // Close menu automatically if user resizes back to desktop width
    Events.on('resize', ({ w }) => {
      if (w > 768 && this.isOpen) this.close();
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.toggleBtn.setAttribute('aria-expanded', 'true');
    DOM.addClass(this.toggleBtn, 'is-active');
    DOM.addClass(this.navLinks, 'is-open');
    DOM.addClass(document.body, 'has-open-menu');
  }

  close() {
    this.isOpen = false;
    this.toggleBtn.setAttribute('aria-expanded', 'false');
    DOM.removeClass(this.toggleBtn, 'is-active');
    DOM.removeClass(this.navLinks, 'is-open');
    DOM.removeClass(document.body, 'has-open-menu');
  }
}

window.MobileNav = MobileNav;