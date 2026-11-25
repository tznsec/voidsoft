// ============================================================================
// V!ODSOFT — Studio Three.js 3D Engine (Bloom + PBR Reflections + Explode + X-Ray)
// Boards: CYD ESP32-2432S024 | Wemos D1 Mini | Waveshare ESP32-S3-LCD-1.47B
// ============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export const BOARD_SPECS = {
  cyd: {
    label: 'CYD ESP32-2432S024/S028',
    chip: 'ESP32-WROOM-32',
    hasLcd: true,
    lcdTitle: 'CYD 2.4" TFT',
    lcdRes: '240×320 ILI9341',
  },
  d1mini: {
    label: 'Wemos D1 Mini',
    chip: 'ESP32 / ESP-12F',
    hasLcd: false,
  },
  waveshare147: {
    label: 'Waveshare ESP32-S3-LCD-1.47B',
    chip: 'ESP32-S3R8',
    hasLcd: true,
    lcdTitle: '1.47" IPS',
    lcdRes: '172×320 ST7789',
  },
};

function createShieldTexture(title, sub) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#cfd8e3');
  grad.addColorStop(0.5, '#edf2f7');
  grad.addColorStop(1, '#a3b1c2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  for (let y = 0; y < 512; y += 3) ctx.fillRect(0, y, 512, 1);

  ctx.strokeStyle = 'rgba(15,23,42,0.28)';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 472, 472);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 40px monospace';
  ctx.fillText(title, 44, 150);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(sub, 44, 215);

  ctx.fillStyle = '#475569';
  ctx.font = '22px monospace';
  ctx.fillText('Wi-Fi + BLE // 2.4GHz', 44, 340);
  ctx.fillText('FCC ID: 2AC7Z-ESP32', 44, 385);

  ctx.fillStyle = '#1e293b';
  for (let r = 0; r < 6; r++) {
    for (let col = 0; col < 6; col++) {
      if ((r * 5 + col * 3) % 2 === 0) {
        ctx.fillRect(365 + col * 14, 320 + r * 14, 10, 10);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

function createPcbSilkTexture(bgColor, traceColor, labelText, hasAntenna = true) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.strokeStyle = traceColor;
  ctx.lineWidth = 4;
  for (let i = 0; i < 16; i++) {
    const y = 40 + i * 28;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(340 + (i % 3) * 45, y);
    ctx.lineTo(390 + (i % 3) * 45, y + (i % 2 === 0 ? 16 : -16));
    ctx.lineTo(840, y + (i % 2 === 0 ? 16 : -16));
    ctx.stroke();
  }

  if (hasAntenna) {
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10;
    ctx.beginPath();
    const ax = 870;
    ctx.moveTo(ax, 120);
    for (let k = 0; k < 5; k++) {
      ctx.lineTo(ax + 100, 120 + k * 56);
      ctx.lineTo(ax + 100, 148 + k * 56);
      ctx.lineTo(ax, 148 + k * 56);
      ctx.lineTo(ax, 176 + k * 56);
    }
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(labelText, 80, 468);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

export class Board3DViewer {
  constructor(container) {
    this.container = container;
    this.boardKey = 'cyd';
    this.connected = false;
    this.flashing = false;
    this.progress = 0;
    this.autoRotate = true;
    this.exploded = false;
    this.xray = false;
    this.spinBoost = 0;
    this.scanProgress = 0;
    this.lastLcdTick = 0;

    this.targetCamPos = new THREE.Vector3(4.5, 3.8, 5.2);
    this.isLerpingCam = false;

    this.lcdCanvas = document.createElement('canvas');
    this.lcdCanvas.width = 512;
    this.lcdCanvas.height = 320;
    this.lcdCtx = this.lcdCanvas.getContext('2d');
    this.lcdTexture = new THREE.CanvasTexture(this.lcdCanvas);
    this.lcdTexture.anisotropy = 8;

    this.xrayMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.9,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
    });

    this.initScene();
    this.buildBoard('cyd');
    this.initParticles();
    this.initLaserScanner();
    this.animate();
  }

  initScene() {
    const w = this.container.clientWidth || 640;
    const h = this.container.clientHeight || 390;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    this.camera.position.copy(this.targetCamPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.className = 'webgl-canvas';
    this.container.appendChild(this.renderer.domElement);

    // Studio HDR Environment Map for crisp metallic reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.65;
    pmrem.dispose();

    // Post-processing UnrealBloom
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.45, 0.52, 0.76);
    this.composer.addPass(this.bloomPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.8;
    this.controls.maxDistance = 13;
    this.controls.enablePan = false;
    this.controls.addEventListener('start', () => {
      this.isLerpingCam = false;
    });

    // Studio Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 6);
    this.scene.add(key);

    const limeRim = new THREE.PointLight(0xd9f99d, 4.5, 18);
    limeRim.position.set(-5, 3, -3);
    this.scene.add(limeRim);

    const cyanRim = new THREE.PointLight(0x22d3ee, 4.2, 18);
    cyanRim.position.set(5, -2, 4);
    this.scene.add(cyanRim);

    // Subtle holographic floor ring + grid
    const grid = new THREE.GridHelper(16, 28, 0x22d3ee, 0x151520);
    grid.position.y = -1.42;
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    this.scene.add(grid);

    const ringGeo = new THREE.RingGeometry(2.6, 2.66, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd9f99d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
    });
    this.haloRing = new THREE.Mesh(ringGeo, ringMat);
    this.haloRing.rotation.x = -Math.PI / 2;
    this.haloRing.position.y = -1.4;
    this.scene.add(this.haloRing);

    this.boardRoot = new THREE.Group();
    this.scene.add(this.boardRoot);

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
  }

  onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  initLaserScanner() {
    const geo = new THREE.PlaneGeometry(0.06, 4.2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xd9f99d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    this.laserBeam = new THREE.Mesh(geo, mat);
    this.laserBeam.rotation.x = -Math.PI / 2;
    this.laserBeam.position.y = 0.45;
    this.boardRoot.add(this.laserBeam);
  }

  addPart(mesh, explodeOffsetY = 0) {
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.explodeY = mesh.position.y + explodeOffsetY;
    mesh.userData.origMaterial = mesh.material;
    if (this.xray) mesh.material = this.xrayMat;
    this.boardRoot.add(mesh);
    return mesh;
  }

  updateLcdTexture(timeSec = 0) {
    const spec = BOARD_SPECS[this.boardKey];
    if (!spec || !spec.hasLcd) return;

    const ctx = this.lcdCtx;
    const W = this.lcdCanvas.width;
    const H = this.lcdCanvas.height;

    ctx.fillStyle = '#06070c';
    ctx.fillRect(0, 0, W, H);

    // Subtle oscilloscope grid
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Header
    ctx.fillStyle = '#d9f99d';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('VO!DSOFT', 30, 62);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${spec.lcdTitle}  //  ${spec.lcdRes}`, 30, 96);

    // Animated real-time waveform
    ctx.beginPath();
    const waveY = 165;
    const amp = this.flashing ? 28 : 16;
    const freq = this.flashing ? 0.055 : 0.032;
    for (let x = 30; x < W - 30; x += 4) {
      const y =
        waveY +
        Math.sin(x * freq + timeSec * (this.flashing ? 12 : 4.2)) * amp * Math.sin((x - 30) / (W - 60) * Math.PI);
      if (x === 30) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = this.flashing ? '#d9f99d' : '#22d3ee';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Status & Progress bar
    const statusText = this.flashing ? 'FLASHING' : this.connected ? 'USB ONLINE' : 'STANDBY';
    ctx.fillStyle = this.flashing ? '#d9f99d' : '#94a3b8';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(statusText, 30, 232);
    ctx.fillStyle = '#fafafa';
    ctx.fillText(`${this.progress}%`, W - 86, 232);

    ctx.fillStyle = '#151621';
    ctx.fillRect(30, 250, W - 60, 26);
    ctx.strokeStyle = '#d9f99d';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 250, W - 60, 26);

    const fillW = Math.round(((W - 64) * this.progress) / 100);
    if (fillW > 0) {
      ctx.fillStyle = '#d9f99d';
      ctx.fillRect(32, 252, fillW, 22);
    }

    this.lcdTexture.needsUpdate = true;
  }

  buildBoard(boardKey) {
    this.boardKey = boardKey;
    while (this.boardRoot.children.length > 0) {
      this.boardRoot.remove(this.boardRoot.children[0]);
    }

    this.pwrLedMat = null;
    this.txLedMat = null;
    this.rgbLedMat = null;

    if (boardKey === 'cyd') this.buildCYD();
    else if (boardKey === 'd1mini') this.buildD1Mini();
    else if (boardKey === 'waveshare147') this.buildWaveshare147B();

    if (this.laserBeam) this.boardRoot.add(this.laserBeam);
    this.scanProgress = 1.0;
    this.spinBoost = 0.28;
    this.updateLcdTexture(0);
  }

  // 1. CYD ESP32-2432S024
  buildCYD() {
    const L = 5.4;
    const W = 3.25;

    const yellowPcbMat = new THREE.MeshStandardMaterial({
      map: createPcbSilkTexture('#e5b810', '#caa00a', 'ESP32-2432S024 // CYD 2.4"', true),
      roughness: 0.32,
      metalness: 0.18,
    });
    const yellowSideMat = new THREE.MeshStandardMaterial({ color: '#c49b0a', roughness: 0.45 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#dce4ee', metalness: 0.94, roughness: 0.18 });
    const darkIcMat = new THREE.MeshStandardMaterial({ color: '#14151a', roughness: 0.32, metalness: 0.18 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#f5c542', metalness: 0.95, roughness: 0.15 });
    const whiteJstMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.4 });

    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(L, 0.14, W),
      [yellowSideMat, yellowSideMat, yellowPcbMat, yellowPcbMat, yellowSideMat, yellowSideMat]
    );
    this.addPart(pcb, 0);

    // 4 Corner Mounting Holes
    const ringGeo = new THREE.RingGeometry(0.11, 0.19, 18);
    const holeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16);
    const holeMat = new THREE.MeshStandardMaterial({ color: '#050507' });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = sx * (L / 2 - 0.26);
        const z = sz * (W / 2 - 0.26);
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.set(x, 0, z);
        this.addPart(hole, 0);
        const ringTop = new THREE.Mesh(ringGeo, goldMat);
        ringTop.rotation.x = -Math.PI / 2;
        ringTop.position.set(x, 0.075, z);
        this.addPart(ringTop, 0);
      }
    }

    // FRONT: 2.4" TFT Bezel + Active Screen
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(3.85, 0.22, 2.75),
      new THREE.MeshStandardMaterial({ color: '#090a0f', roughness: 0.15, metalness: 0.25 })
    );
    bezel.position.set(-0.22, 0.18, 0);
    this.addPart(bezel, 0.72);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.45, 2.38),
      new THREE.MeshStandardMaterial({
        map: this.lcdTexture,
        emissiveMap: this.lcdTexture,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.95,
        roughness: 0.08,
      })
    );
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(-0.22, 0.295, 0);
    this.addPart(screen, 1.12);

    const fpc = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.03, 1.4),
      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.35, metalness: 0.4 })
    );
    fpc.position.set(1.86, 0.09, 0);
    this.addPart(fpc, 0.42);

    const ldr = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: '#c2410c', roughness: 0.35 })
    );
    ldr.position.set(2.2, 0.12, -0.75);
    this.addPart(ldr, 0.3);

    // BACK: ESP-WROOM-32, MicroSD, USB-C, JST, ICs
    const shieldMat = new THREE.MeshStandardMaterial({
      map: createShieldTexture('ESP-WROOM-32', 'CYD 2432S024'),
      metalness: 0.9,
      roughness: 0.2,
    });
    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.24, 1.55),
      [metalMat, metalMat, metalMat, shieldMat, metalMat, metalMat]
    );
    shield.position.set(1.25, -0.19, 0.1);
    this.addPart(shield, -0.72);

    const sdSlot = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 1.15), metalMat);
    sdSlot.position.set(-1.35, -0.16, 0.82);
    this.addPart(sdSlot, -0.55);

    const usb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.68), metalMat);
    usb.position.set(-L / 2 + 0.2, -0.18, -0.55);
    this.addPart(usb, -0.45);

    for (const [x, z] of [[-2.0, 0.95], [-0.45, -1.25], [0.55, -1.25]]) {
      const jst = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.34), whiteJstMat);
      jst.position.set(x, -0.19, z);
      this.addPart(jst, -0.48);
    }

    const ch340 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.36), darkIcMat);
    ch340.position.set(-1.3, -0.12, -0.45);
    this.addPart(ch340, -0.35);

    const touchIc = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), darkIcMat);
    touchIc.position.set(-0.2, -0.12, 0.35);
    this.addPart(touchIc, -0.35);

    for (const z of [-0.95, 0.05]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.2), metalMat);
      sw.position.set(-2.35, -0.13, z);
      this.addPart(sw, -0.32);
    }

    this.pwrLedMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 2.2 });
    const pwrLed = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.09), this.pwrLedMat);
    pwrLed.position.set(-1.9, -0.11, -0.95);
    this.addPart(pwrLed, -0.28);

    this.txLedMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.6 });
    const txLed = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.09), this.txLedMat);
    txLed.position.set(-1.65, -0.11, -0.95);
    this.addPart(txLed, -0.28);

    this.rgbLedMat = new THREE.MeshStandardMaterial({ color: 0xd9f99d, emissive: 0xd9f99d, emissiveIntensity: 2.8 });
    const rgbLed = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.22), this.rgbLedMat);
    rgbLed.position.set(2.2, 0.12, 0.65);
    this.addPart(rgbLed, 0.38);
  }

  // 2. Wemos D1 Mini
  buildD1Mini() {
    const L = 3.85;
    const W = 2.75;

    const bluePcbMat = new THREE.MeshStandardMaterial({
      map: createPcbSilkTexture('#0b4f8c', '#1466ad', 'WEMOS D1 MINI', true),
      roughness: 0.34,
      metalness: 0.2,
    });
    const blueSideMat = new THREE.MeshStandardMaterial({ color: '#073561', roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#dce4ee', metalness: 0.94, roughness: 0.18 });
    const darkIcMat = new THREE.MeshStandardMaterial({ color: '#14151a', roughness: 0.32 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#f5c542', metalness: 0.95, roughness: 0.15 });
    const shroudMat = new THREE.MeshStandardMaterial({ color: '#111116', roughness: 0.65 });

    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(L, 0.14, W),
      [blueSideMat, blueSideMat, bluePcbMat, bluePcbMat, blueSideMat, blueSideMat]
    );
    this.addPart(pcb, 0);

    const shieldMat = new THREE.MeshStandardMaterial({
      map: createShieldTexture('D1 MINI', 'ESP32 / ESP-12F'),
      metalness: 0.9,
      roughness: 0.2,
    });
    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.26, 1.75),
      [metalMat, metalMat, shieldMat, metalMat, metalMat, metalMat]
    );
    shield.position.set(0.35, 0.2, 0);
    this.addPart(shield, 0.85);

    const usb = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.76), metalMat);
    usb.position.set(-L / 2 + 0.18, 0.19, 0);
    this.addPart(usb, 0.52);

    const rstBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.22), metalMat);
    rstBase.position.set(-L / 2 + 0.38, 0.15, -W / 2 + 0.25);
    this.addPart(rstBase, 0.4);

    const ch340 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.45), darkIcMat);
    ch340.position.set(-0.55, -0.13, 0);
    this.addPart(ch340, -0.42);

    const reg = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.46), darkIcMat);
    reg.position.set(-1.25, -0.13, 0.55);
    this.addPart(reg, -0.42);

    const pinGeo = new THREE.BoxGeometry(0.07, 0.58, 0.07);
    const padGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.16, 12);
    const span = 2.45;
    const step = span / 7;

    for (const side of [-1, 1]) {
      const z = side * (W / 2 - 0.2);
      const shroud = new THREE.Mesh(new THREE.BoxGeometry(span + 0.22, 0.18, 0.22), shroudMat);
      shroud.position.set(-0.1, -0.16, z);
      this.addPart(shroud, -0.68);

      for (let i = 0; i < 8; i++) {
        const x = -0.1 - span / 2 + i * step;
        const pin = new THREE.Mesh(pinGeo, goldMat);
        pin.position.set(x, -0.25, z);
        this.addPart(pin, -0.95);
        const pad = new THREE.Mesh(padGeo, goldMat);
        pad.position.set(x, 0.01, z);
        this.addPart(pad, 0);
      }
    }

    this.pwrLedMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 2.4 });
    const pwrLed = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.09), this.pwrLedMat);
    pwrLed.position.set(1.45, 0.11, 0.72);
    this.addPart(pwrLed, 0.3);

    this.txLedMat = new THREE.MeshStandardMaterial({ color: 0xd9f99d, emissive: 0xd9f99d, emissiveIntensity: 0.6 });
    const txLed = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.09), this.txLedMat);
    txLed.position.set(-1.15, 0.11, 0.65);
    this.addPart(txLed, 0.3);
  }

  // 3. Waveshare ESP32-S3-LCD-1.47B
  buildWaveshare147B() {
    const L = 5.1;
    const W = 2.05;

    const blackPcbMat = new THREE.MeshStandardMaterial({
      map: createPcbSilkTexture('#101116', '#212430', 'WAVESHARE ESP32-S3-LCD-1.47B', false),
      roughness: 0.3,
      metalness: 0.26,
    });
    const sideMat = new THREE.MeshStandardMaterial({ color: '#1b1d26', roughness: 0.45 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#dce4ee', metalness: 0.94, roughness: 0.16 });
    const darkIcMat = new THREE.MeshStandardMaterial({ color: '#13141a', roughness: 0.28 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#f5c542', metalness: 0.95, roughness: 0.15 });

    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(L, 0.13, W),
      [sideMat, sideMat, blackPcbMat, blackPcbMat, sideMat, sideMat]
    );
    this.addPart(pcb, 0);

    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(3.55, 0.18, 1.72),
      new THREE.MeshStandardMaterial({ color: '#07080b', roughness: 0.12, metalness: 0.25 })
    );
    bezel.position.set(0.28, 0.15, 0);
    this.addPart(bezel, 0.65);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.22, 1.44),
      new THREE.MeshStandardMaterial({
        map: this.lcdTexture,
        emissiveMap: this.lcdTexture,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.95,
        roughness: 0.08,
      })
    );
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0.28, 0.245, 0);
    this.addPart(screen, 1.05);

    const usb = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.74), metalMat);
    usb.position.set(-L / 2 + 0.18, 0.14, 0);
    this.addPart(usb, 0.42);

    const ceramicAnt = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.14, 0.55),
      new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.28 })
    );
    ceramicAnt.position.set(L / 2 - 0.22, 0.13, 0);
    this.addPart(ceramicAnt, 0.35);

    const s3Chip = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.12, 0.88), darkIcMat);
    s3Chip.position.set(0.75, -0.12, 0);
    this.addPart(s3Chip, -0.52);

    const imuChip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.32), darkIcMat);
    imuChip.position.set(1.55, -0.11, -0.35);
    this.addPart(imuChip, -0.45);

    const tfSlot = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.16, 1.1), metalMat);
    tfSlot.position.set(-0.95, -0.14, 0);
    this.addPart(tfSlot, -0.78);

    for (const x of [-1.7, -1.2]) {
      const btn = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.18), metalMat);
      btn.position.set(x, -0.11, W / 2 - 0.12);
      this.addPart(btn, -0.36);
    }

    const padGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.14, 10);
    for (const side of [-1, 1]) {
      const z = side * (W / 2 - 0.11);
      for (let i = 0; i < 10; i++) {
        const x = -1.6 + i * 0.36;
        const pad = new THREE.Mesh(padGeo, goldMat);
        pad.position.set(x, 0, z);
        this.addPart(pad, 0);
      }
    }

    this.rgbLedMat = new THREE.MeshStandardMaterial({ color: 0xd9f99d, emissive: 0xd9f99d, emissiveIntensity: 3.0 });
    const rgbLed = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.24), this.rgbLedMat);
    rgbLed.position.set(-1.82, 0.12, -0.58);
    this.addPart(rgbLed, 0.38);

    this.pwrLedMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 2.0 });
    const pwrLed = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), this.pwrLedMat);
    pwrLed.position.set(-1.82, 0.11, 0.58);
    this.addPart(pwrLed, 0.32);

    this.txLedMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.6 });
    const txLed = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), this.txLedMat);
    txLed.position.set(-1.58, 0.11, 0.58);
    this.addPart(txLed, 0.32);
  }

  initParticles() {
    const count = 56;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = -6.5 + Math.random() * 4.2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xd9f99d,
      size: 0.14,
      transparent: true,
      opacity: 0.0,
    });
    this.dataParticles = new THREE.Points(geo, mat);
    this.scene.add(this.dataParticles);
  }

  setStatus({ connected, flashing, progress }) {
    if (typeof connected === 'boolean') this.connected = connected;
    if (typeof flashing === 'boolean') this.flashing = flashing;
    if (typeof progress === 'number') this.progress = progress;
    this.updateLcdTexture(performance.now() * 0.001);
  }

  setCameraPreset(preset) {
    if (preset === 'iso') this.targetCamPos.set(4.5, 3.8, 5.2);
    else if (preset === 'front') this.targetCamPos.set(0.01, 6.8, 0.02);
    else if (preset === 'back') this.targetCamPos.set(0.01, -6.8, 0.02);
    else if (preset === 'usb') this.targetCamPos.set(-5.2, 1.9, 2.3);
    this.isLerpingCam = true;
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  toggleExplode() {
    this.exploded = !this.exploded;
    return this.exploded;
  }

  toggleXray() {
    this.xray = !this.xray;
    this.boardRoot.children.forEach((child) => {
      if (child === this.laserBeam || !child.userData.origMaterial) return;
      child.material = this.xray ? this.xrayMat : child.userData.origMaterial;
    });
    this.bloomPass.strength = this.xray ? 0.82 : 0.45;
    return this.xray;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const now = performance.now();
    const t = now * 0.001;

    // Live LCD waveform refresh (~20 fps)
    if (now - this.lastLcdTick > 50) {
      this.lastLcdTick = now;
      this.updateLcdTexture(t);
    }

    // Levitation & rotation
    this.boardRoot.position.y = Math.sin(t * 1.9) * 0.08;
    if (this.autoRotate) {
      this.boardRoot.rotation.y += 0.0045 + this.spinBoost;
    } else if (this.spinBoost > 0.001) {
      this.boardRoot.rotation.y += this.spinBoost;
    }
    this.spinBoost *= 0.9;

    // Explode layer spring interpolation
    this.boardRoot.children.forEach((child) => {
      if (typeof child.userData.baseY === 'number') {
        const targetY = this.exploded ? child.userData.explodeY : child.userData.baseY;
        child.position.y += (targetY - child.position.y) * 0.1;
      }
    });

    // Laser calibration sweep on board switch
    if (this.laserBeam && this.scanProgress > 0.01) {
      this.scanProgress *= 0.94;
      this.laserBeam.position.x = (0.5 - this.scanProgress) * 6.5;
      this.laserBeam.material.opacity = Math.sin(this.scanProgress * Math.PI) * 0.95;
    } else if (this.laserBeam) {
      this.laserBeam.material.opacity = 0;
    }

    // Subtle pulsing floor halo
    if (this.haloRing) {
      const s = 1 + Math.sin(t * 2.2) * 0.025;
      this.haloRing.scale.set(s, s, 1);
      this.haloRing.material.color.setHex(this.xray ? 0x22d3ee : 0xd9f99d);
    }

    // Smooth camera preset lerp
    if (this.isLerpingCam) {
      this.camera.position.lerp(this.targetCamPos, 0.085);
      if (this.camera.position.distanceTo(this.targetCamPos) < 0.05) {
        this.isLerpingCam = false;
      }
    }

    // LEDs
    if (this.pwrLedMat) {
      const col = this.connected ? 0xd9f99d : 0xf43f5e;
      this.pwrLedMat.color.setHex(col);
      this.pwrLedMat.emissive.setHex(col);
      this.pwrLedMat.emissiveIntensity = this.connected ? 2.4 + Math.sin(t * 5) * 0.8 : 1.6;
    }
    if (this.txLedMat) {
      this.txLedMat.emissiveIntensity = this.flashing
        ? 2.2 + Math.abs(Math.sin(t * 28)) * 3.0
        : this.connected
          ? 0.8
          : 0.2;
    }
    if (this.rgbLedMat) {
      const hue = this.flashing ? 0.24 : (t * 0.16) % 1;
      this.rgbLedMat.color.setHSL(hue, 0.92, 0.65);
      this.rgbLedMat.emissive.setHSL(hue, 0.95, 0.55);
      this.rgbLedMat.emissiveIntensity = this.flashing ? 3.8 : 2.2;
    }

    // Neon data particles
    if (this.dataParticles) {
      const mat = this.dataParticles.material;
      mat.opacity += ((this.flashing ? 0.95 : 0.0) - mat.opacity) * 0.12;
      if (mat.opacity > 0.02) {
        const pos = this.dataParticles.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let x = pos.getX(i) + 0.17;
          if (x > -2.2) x = -6.6;
          pos.setX(i, x);
        }
        pos.needsUpdate = true;
      }
    }

    this.controls.update();
    this.composer.render();
  }
}
