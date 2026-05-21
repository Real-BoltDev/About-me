/* ============================================================
   js/webgl.js — Three.js: Subtle star field + small wire shapes
   ============================================================ */
'use strict';

class WebGLBackground {
  constructor() {
    this.canvas = DOM.qs('#webgl-canvas');
    if (!this.canvas) return;

    this.scene    = null;
    this.camera   = null;
    this.renderer = null;
    this.particles  = null;
    this.particles2 = null;
    this.particlesMat = null;
    this.group    = null;
    this._clock   = null;

    this._mx = 0; this._my = 0;
    this._targetMx = 0; this._targetMy = 0;
    this._cameraZ = 5;

    this._init();
    this._createParticles();
    this._createWireObjects();
    this._bindEvents();
    this._startLoop();
  }

  _init() {
    this.scene = new THREE.Scene();

    // Camera starts at z=5 so world units make more sense
    this.camera = new THREE.PerspectiveCamera(60, State.viewport.w / State.viewport.h, 0.1, 1000);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setSize(State.viewport.w, State.viewport.h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0);

    this._clock = new THREE.Clock();
  }

  _createParticles() {
    // ── Primary star field ────────────────────────────────────
    const count = State.isMobile ? 800 : 1500;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Wide spread, pushed back in Z so they stay in background
      pos[i*3]   = (Math.random() - 0.5) * 30; // x: -15 to 15
      pos[i*3+1] = (Math.random() - 0.5) * 20; // y: -10 to 10
      pos[i*3+2] = -10 - Math.random() * 20;   // z: -10 to -30
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    this.particlesMat = new THREE.PointsMaterial({
      size:            0.06,
      sizeAttenuation: true,
      color:           0x00FFD1,
      blending:        THREE.AdditiveBlending,
      transparent:     true,
      opacity:         0.5,
      depthWrite:      false,
    });
    this.particles = new THREE.Points(geo, this.particlesMat);
    this.scene.add(this.particles);

    // ── Violet secondary field ────────────────────────────────
    const count2 = State.isMobile ? 400 : 800;
    const geo2  = new THREE.BufferGeometry();
    const pos2  = new Float32Array(count2 * 3);
    for (let i = 0; i < count2; i++) {
      pos2[i*3]   = (Math.random() - 0.5) * 28;
      pos2[i*3+1] = (Math.random() - 0.5) * 18;
      pos2[i*3+2] = -12 - Math.random() * 15; // z: -12 to -27
    }
    geo2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
    this.particles2 = new THREE.Points(geo2, new THREE.PointsMaterial({
      size: 0.04, sizeAttenuation: true, color: 0x7B61FF,
      blending: THREE.AdditiveBlending, transparent: true, opacity: 0.35, depthWrite: false,
    }));
    this.scene.add(this.particles2);
  }

  _createWireObjects() {
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // All objects placed at z = -8 to -12 (far behind camera at z=5)
    // So they appear as distant background elements, not in your face

    // Torus — right side
    const torusMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.4, 12, 40),
      new THREE.MeshBasicMaterial({ color: 0x00FFD1, wireframe: true, transparent: true, opacity: 0.15 })
    );
    torusMesh.position.set(6, 0.5, -10);
    torusMesh.rotation.x = 0.5;
    this.group.add(torusMesh);
    this.geo1 = torusMesh;

    // Icosahedron — lower left
    const icoMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({ color: 0x7B61FF, wireframe: true, transparent: true, opacity: 0.14 })
    );
    icoMesh.position.set(-6.5, -2.5, -9);
    this.group.add(icoMesh);
    this.geo2 = icoMesh;

    // Octahedron — upper area
    const octMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.0, 0),
      new THREE.MeshBasicMaterial({ color: 0xFF3366, wireframe: true, transparent: true, opacity: 0.13 })
    );
    octMesh.position.set(1.5, 4.0, -11);
    this.group.add(octMesh);
    this.geo3 = octMesh;

    // Ring — far left
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.05, 6, 50),
      new THREE.MeshBasicMaterial({ color: 0x00FFD1, transparent: true, opacity: 0.1 })
    );
    ringMesh.position.set(-4.5, 2.5, -12);
    ringMesh.rotation.x = 1.1;
    this.group.add(ringMesh);
    this.ring = ringMesh;
  }

  _bindEvents() {
    Events.on('resize', ({ w, h }) => {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    Events.on('scroll', ({ progress }) => {
      // Camera slowly moves forward as page scrolls — subtle depth effect
      this._cameraZ = 5 - progress * 1.5;
    });

    Events.on('mousemove', ({ nx, ny }) => {
      this._targetMx = nx;
      this._targetMy = ny;
    });
  }

  _startLoop() {
    Raf.add('webgl', () => this._render());
  }

  _render() {
    const t = this._clock.getElapsedTime();

    // Smooth mouse
    this._mx = MathUtils.lerp(this._mx, this._targetMx, 0.035);
    this._my = MathUtils.lerp(this._my, this._targetMy, 0.035);

    // Rotate particle fields for a "space travel" effect
    if (this.particles) {
      this.particles.rotation.y = t * 0.02  + this._mx * 0.05;
      this.particles.rotation.x = t * 0.012 + this._my * 0.03;
    }
    if (this.particles2) {
      this.particles2.rotation.y = -t * 0.015 + this._mx * 0.03;
      this.particles2.rotation.x =  t * 0.008 + this._my * 0.02;
    }

    // Opacity breathe
    if (this.particlesMat) {
      this.particlesMat.opacity = 0.4 + Math.sin(t * 0.5) * 0.08;
    }

    // Wire object rotations + float
    if (this.geo1) {
      this.geo1.rotation.x += 0.003;
      this.geo1.rotation.z += 0.002;
      this.geo1.position.y = 0.5 + Math.sin(t * 0.6) * 0.3;
    }
    if (this.geo2) {
      this.geo2.rotation.y += 0.004;
      this.geo2.rotation.x += 0.002;
      this.geo2.position.y = -2 + Math.sin(t * 0.45 + 1) * 0.25;
    }
    if (this.geo3) {
      this.geo3.rotation.y += 0.006;
      this.geo3.rotation.x += 0.004;
      this.geo3.position.y = 3.5 + Math.sin(t * 0.55 + 2) * 0.2;
    }
    if (this.ring) {
      this.ring.rotation.z += 0.003;
      this.ring.position.y = 2.2 + Math.sin(t * 0.4 + 0.5) * 0.15;
    }

    // Group-level mouse parallax
    if (this.group) {
      this.group.rotation.y = MathUtils.lerp(this.group.rotation.y, this._mx * 0.08, 0.03);
      this.group.rotation.x = MathUtils.lerp(this.group.rotation.x, this._my * 0.05, 0.03);
    }

    // Camera drift
    this.camera.position.z = MathUtils.lerp(this.camera.position.z, this._cameraZ, 0.015);
    this.camera.position.x = MathUtils.lerp(this.camera.position.x, this._mx * 0.2, 0.02);
    this.camera.position.y = MathUtils.lerp(this.camera.position.y, this._my * 0.12, 0.02);

    this.renderer.render(this.scene, this.camera);
  }

  show(delay = 0) {
    gsap.fromTo(this.canvas,
      { opacity: 0 },
      { opacity: 1, duration: 1.4, delay, ease: 'power2.out' }
    );
  }

  setColorTheme(section) {
    if (!this.particlesMat) return;
    const colors = {
      hero:     0x00FFD1,
      about:    0x7B61FF,
      skills:   0x00FFD1,
      projects: 0xFF3366,
      contact:  0x00FFD1,
    };
    const c = colors[section] || 0x00FFD1;
    gsap.to(this.particlesMat, { opacity: 0.45, duration: 1.5, ease: 'power2.inOut' });
    this.particlesMat.color.set(c);
  }

  destroy() {
    Raf.remove('webgl');
    this.renderer.dispose();
  }
}

window.WebGLBackground = WebGLBackground;