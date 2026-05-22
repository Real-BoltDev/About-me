/* ============================================================
   js/main.js — App orchestrator: boot order, GSAP plugins, init
   ============================================================ */
'use strict';

gsap.registerPlugin(ScrollTrigger);

class App {
  constructor() {
    this.webgl = null;
    this.cursor = null;
    this.preloader = null;
    this.scrollManager = null;
    this.hero = null;
    this.about = null;
    this.skills = null;
    this.projects = null;
    this.contact = null;
    this.discord = null;
    this.mobileNav = null;

    gsap.defaults({ ease: 'power2.out', duration: 0.6 });
    ScrollTrigger.defaults({ markers: false });

    this._boot();
  }

  _boot() {
    this.webgl = new WebGLBackground();
    if (!State.isMobile && !State.isTablet) {
      this.cursor = new CustomCursor();
    }
    this.scrollManager = new ScrollManager();
    this.preloader = new Preloader({ minDuration: 2200 });
    this.preloader.start(() => this._onPreloaderComplete());
    this._initPassiveFeatures();
  }

  _onPreloaderComplete() {
    this.webgl && this.webgl.show(0.1);

    this.hero = new HeroAnimations();
    this.hero.enter(0.2);
    this.hero.setupMarqueeVelocity();

    this.about    = new AboutAnimations();
    this.skills   = new SkillsAnimations();
    this.projects = new ProjectsHorizontalScroll();
    this.contact  = new ContactAnimations();
    this.discord  = new DiscordPresence();
    this.mobileNav = new MobileNav();

    animateCounters('[data-count-to]');

    Events.on('section:change', (id) => {
      this.webgl && this.webgl.setColorTheme(id);
    });

    setTimeout(() => ScrollTrigger.refresh(), 300);
    State.isLoaded = true;
    Events.emit('app:ready');
  }

  _initPassiveFeatures() {
    observeReveal('[data-reveal]');

    document.addEventListener('visibilitychange', () => {
      document.hidden ? gsap.globalTimeline.pause() : gsap.globalTimeline.resume();
    });

    // Skip link for a11y
    const skip = document.createElement('a');
    skip.href = '#hero';
    skip.textContent = 'Skip to content';
    skip.style.cssText = 'position:fixed;top:-100px;left:1rem;z-index:99999;padding:0.5rem 1rem;background:var(--clr-accent);color:#000;border-radius:4px;font-weight:700;transition:top 0.2s;';
    skip.addEventListener('focus', () => { skip.style.top = '1rem'; });
    skip.addEventListener('blur',  () => { skip.style.top = '-100px'; });
    document.body.prepend(skip);

    this._initViewsCounter();
  }

  _initViewsCounter() {
    const viewCountEl = document.getElementById('view-count');
    if (!viewCountEl) return;

    // Simuliert einen View Counter via localStorage.
    // Für echte globale Daten müsstest du hier eine API (z.B. Firebase oder Supabase) anfragen.
    let views = localStorage.getItem('site_views');
    if (!views) {
      views = 12450; // Ein Startwert für den Counter
    }
    
    views = parseInt(views, 10) + 1;
    localStorage.setItem('site_views', views);

    let current = views - 50; 
    const updateCounter = () => {
      current += 2;
      viewCountEl.textContent = current.toLocaleString();
      if (current < views) {
        requestAnimationFrame(updateCounter);
      } else {
        viewCountEl.textContent = views.toLocaleString();
      }
    };
    requestAnimationFrame(updateCounter);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});