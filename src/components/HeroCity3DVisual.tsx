import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

export interface HeroCity3DSpot {
  id: string;
  kindLabel: string;
  title: string;
  meta: string;
  accentHex: string;
  labelClass: string;
  activeBorderClass: string;
  widthClass: string;
  thumb: string;
  showVerified?: boolean;
  /** World-space rooftop anchor [x, y, z] in the 3D city */
  worldPos: [number, number, number];
  /** Camera position & lookAt target when spotlighting this location */
  focusCamPos: [number, number, number];
  focusLookAt: [number, number, number];
  /** Entry timeline threshold (seconds) when this tag pops in during the fly-in */
  revealAt: number;
}

export interface HeroCity3DAmbientPin {
  id: string;
  color: string;
  rating?: string;
  worldPos: [number, number, number];
  revealAt: number;
}

interface HeroCity3DVisualProps {
  spots: HeroCity3DSpot[];
  ambientPins: HeroCity3DAmbientPin[];
}

const PRO_SPRING = {
  type: 'spring' as const,
  stiffness: 290,
  damping: 26,
  mass: 0.88,
};

const PIN_SPRING = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 24,
  mass: 0.72,
};

const APPLE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Pre-allocated math helpers outside the render loop (zero GC per frame)
const _projVec = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _camCurrentLook = new THREE.Vector3(0, 1.1, 0);
const _dummy = new THREE.Object3D();
const _tempColor = new THREE.Color();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Generates a crisp procedural European architectural facade texture (windows, balconies, stone bands)
 */
function createFacadeTexture(
  baseHex: string,
  windowHex: string,
  trimHex: string,
  cols: number,
  rows: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle horizontal stone floor bands
  ctx.fillStyle = trimHex;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    ctx.fillRect(0, Math.round(r * rowH), 256, 3);
  }

  // Ground floor recessed arcade / storefront band
  ctx.fillStyle = trimHex;
  ctx.fillRect(0, Math.round(256 - rowH), 256, Math.round(rowH));

  // Crisp architectural windows
  const colW = 256 / cols;
  const winW = colW * 0.46;
  const winH = rowH * 0.54;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * colW + (colW - winW) * 0.5;
      const wy = r * rowH + (rowH - winH) * 0.48;
      // Window recess frame
      ctx.fillStyle = trimHex;
      ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4);
      // Glazing with subtle sky reflection gradient
      const grad = ctx.createLinearGradient(wx, wy, wx, wy + winH);
      grad.addColorStop(0, windowHex);
      grad.addColorStop(1, '#CBD8EB');
      ctx.fillStyle = grad;
      ctx.fillRect(wx, wy, winW, winH);
      // Window sill highlight
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(wx - 2, wy + winH + 1, winW + 4, 2);
    }
  }

  // Ground floor arched / tall doorways
  for (let c = 0; c < cols; c++) {
    const wx = c * colW + colW * 0.22;
    const wy = 256 - rowH * 0.82;
    ctx.fillStyle = '#94A7C0';
    ctx.fillRect(wx, wy, colW * 0.56, rowH * 0.72);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a high-resolution procedural European street map ground texture (avenues, parks, river, plaza)
 */
function createGroundMapTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Warm limestone city base
  ctx.fillStyle = '#EEF2F7';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle urban grid grain
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 1024; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Sweeping park belt (Turia-inspired green river promenade)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-40, 760);
  ctx.bezierCurveTo(220, 690, 420, 560, 620, 440);
  ctx.bezierCurveTo(780, 340, 910, 260, 1080, 210);
  ctx.lineTo(1080, 325);
  ctx.bezierCurveTo(920, 375, 800, 455, 650, 550);
  ctx.bezierCurveTo(450, 670, 240, 800, -40, 875);
  ctx.closePath();
  ctx.fillStyle = '#D5ECD0';
  ctx.fill();

  // Shimmering water ribbon inside the park belt
  ctx.beginPath();
  ctx.moveTo(-40, 805);
  ctx.bezierCurveTo(225, 735, 428, 605, 632, 485);
  ctx.bezierCurveTo(790, 385, 915, 305, 1080, 255);
  ctx.lineWidth = 26;
  ctx.strokeStyle = '#B8DAFF';
  ctx.stroke();

  // Park walking path
  ctx.beginPath();
  ctx.moveTo(-20, 782);
  ctx.bezierCurveTo(220, 712, 424, 582, 626, 462);
  ctx.bezierCurveTo(785, 362, 912, 282, 1060, 232);
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = '#F8FBF6';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Secondary neighborhood parks
  ctx.fillStyle = '#DCF1D7';
  ctx.beginPath();
  ctx.roundRect(110, 140, 185, 145, 24);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(700, 660, 200, 165, 32);
  ctx.fill();

  // Secondary white streets
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  const streetLines: Array<[number, number, number, number]> = [
    [160, 0, 220, 1024],
    [350, 0, 390, 1024],
    [660, 0, 610, 1024],
    [840, 0, 810, 1024],
    [0, 220, 1024, 190],
    [0, 390, 1024, 370],
    [0, 650, 1024, 620],
    [0, 830, 1024, 810],
  ];
  streetLines.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  // Main city avenues (warm ivory-amber like Apple/Google Maps)
  ctx.strokeStyle = '#FCE8A6';
  ctx.lineWidth = 30;
  ctx.beginPath();
  ctx.moveTo(512, 0);
  ctx.lineTo(512, 1024);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 512);
  ctx.lineTo(1024, 512);
  ctx.stroke();

  // Crisp white avenue center dashed markings
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([16, 16]);
  ctx.beginPath();
  ctx.moveTo(512, 0);
  ctx.lineTo(512, 1024);
  ctx.moveTo(0, 512);
  ctx.lineTo(1024, 512);
  ctx.stroke();
  ctx.setLineDash([]);

  // Central Plaza Roundabout
  ctx.beginPath();
  ctx.arc(512, 512, 58, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#DCE4EF';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(512, 512, 34, 0, Math.PI * 2);
  ctx.fillStyle = '#D5ECD0';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Builds a composite multi-part 3D European building (plinth, textured facade, parapet/cornice,
 * and either pitched roof, stepped penthouse, or rooftop terrace).
 * Bottom-center pivot sits strictly at y = 0.
 */
function buildCompositeBuilding(
  w: number,
  h: number,
  d: number,
  facadeMat: THREE.Material,
  plinthMat: THREE.Material,
  roofMat: THREE.Material,
  accentMat: THREE.Material,
  roofStyle: 'parapet' | 'pitched' | 'terrace' | 'stepped'
): THREE.Group {
  const group = new THREE.Group();

  // 1. Ground plinth
  const plinthH = Math.min(0.45, h * 0.2);
  const plinthGeo = new THREE.BoxGeometry(w + 0.08, plinthH, d + 0.08);
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.y = plinthH * 0.5;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 2. Main architectural facade body
  const bodyH = Math.max(0.5, h - plinthH);
  const bodyGeo = new THREE.BoxGeometry(w, bodyH, d);
  const body = new THREE.Mesh(bodyGeo, facadeMat);
  body.position.y = plinthH + bodyH * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 3. Cornice / roofline trim
  const corniceH = 0.12;
  const corniceGeo = new THREE.BoxGeometry(w + 0.12, corniceH, d + 0.12);
  const cornice = new THREE.Mesh(corniceGeo, plinthMat);
  cornice.position.y = h + corniceH * 0.5;
  cornice.castShadow = true;
  cornice.receiveShadow = true;
  group.add(cornice);

  // 4. Distinct roof crown detail
  if (roofStyle === 'pitched') {
    const roofH = Math.min(0.9, Math.min(w, d) * 0.42);
    const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, roofH, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    roof.position.y = h + corniceH + roofH * 0.5;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);
  } else if (roofStyle === 'terrace') {
    // Rooftop terrace floor + architectural pergola & warm accent awning
    const deckGeo = new THREE.BoxGeometry(w * 0.86, 0.08, d * 0.86);
    const deck = new THREE.Mesh(deckGeo, roofMat);
    deck.position.y = h + corniceH + 0.04;
    deck.receiveShadow = true;
    group.add(deck);

    const pergolaRoofGeo = new THREE.BoxGeometry(w * 0.62, 0.08, d * 0.55);
    const pergolaRoof = new THREE.Mesh(pergolaRoofGeo, accentMat);
    pergolaRoof.position.set(0, h + corniceH + 0.52, -d * 0.08);
    pergolaRoof.castShadow = true;
    group.add(pergolaRoof);

    const postGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.46, 8);
    const px = w * 0.27;
    const pz = d * 0.22;
    [
      [-px, -pz - d * 0.08],
      [px, -pz - d * 0.08],
      [-px, pz - d * 0.08],
      [px, pz - d * 0.08],
    ].forEach(([x, z]) => {
      const post = new THREE.Mesh(postGeo, plinthMat);
      post.position.set(x, h + corniceH + 0.27, z);
      group.add(post);
    });
  } else if (roofStyle === 'stepped') {
    const crownH = Math.min(0.65, h * 0.22);
    const crownGeo = new THREE.BoxGeometry(w * 0.68, crownH, d * 0.68);
    const crown = new THREE.Mesh(crownGeo, facadeMat);
    crown.position.y = h + corniceH + crownH * 0.5;
    crown.castShadow = true;
    crown.receiveShadow = true;
    group.add(crown);

    const capGeo = new THREE.BoxGeometry(w * 0.72, 0.09, d * 0.72);
    const cap = new THREE.Mesh(capGeo, accentMat);
    cap.position.y = h + corniceH + crownH + 0.045;
    group.add(cap);
  } else {
    // Classic European parapet rim + subtle skylight
    const capGeo = new THREE.BoxGeometry(w * 0.82, 0.1, d * 0.82);
    const cap = new THREE.Mesh(capGeo, roofMat);
    cap.position.y = h + corniceH + 0.05;
    cap.receiveShadow = true;
    group.add(cap);

    const skylightGeo = new THREE.BoxGeometry(w * 0.34, 0.16, d * 0.3);
    const skylight = new THREE.Mesh(skylightGeo, accentMat);
    skylight.position.set(w * 0.1, h + corniceH + 0.14, 0);
    group.add(skylight);
  }

  return group;
}

/**
 * Builds a composite 3D location beacon (grounded glowing ring, vertical stem, sculpted pin head)
 */
function build3DPinBeacon(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(colorHex);

  const ringMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.42, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.name = 'beaconRing';
  group.add(ring);

  const stemMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.15,
    emissive: color,
    emissiveIntensity: 0.25,
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.55, 10), stemMat);
  stem.position.y = 0.3;
  group.add(stem);

  const headMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.22,
    metalness: 0.1,
    emissive: color,
    emissiveIntensity: 0.22,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), headMat);
  head.position.y = 0.66;
  head.castShadow = true;
  group.add(head);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  core.position.y = 0.66;
  group.add(core);

  return group;
}

/**
 * Real-time Three.js 3D sunlit European city fly-in visual.
 * Camera swoops smoothly into the 3D skyline while geolocated tags pop in progressively
 * anchored to their real 3D rooftop coordinates.
 */
export const HeroCity3DVisual = React.memo(function HeroCity3DVisual({
  spots,
  ambientPins,
}: HeroCity3DVisualProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(containerRef, { amount: 0.15 });
  const isInViewRef = useRef<boolean>(true);
  isInViewRef.current = isInView;

  const [webglFailed, setWebglFailed] = useState(false);
  const [revealedSpotIds, setRevealedSpotIds] = useState<Record<string, boolean>>(() => {
    if (prefersReducedMotion) {
      return Object.fromEntries(spots.map((s) => [s.id, true]));
    }
    return {};
  });
  const [revealedAmbientIds, setRevealedAmbientIds] = useState<Record<string, boolean>>(() => {
    if (prefersReducedMotion) {
      return Object.fromEntries(ambientPins.map((p) => [p.id, true]));
    }
    return {};
  });
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Direct DOM refs for 60/120fps 3D->2D projected tag positioning (zero React re-renders per frame)
  const spotElRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const ambientElRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const gpsElRef = useRef<HTMLDivElement | null>(null);

  // Keep latest props in refs so WebGL scene mounts strictly once
  const spotsRef = useRef(spots);
  spotsRef.current = spots;
  const ambientPinsRef = useRef(ambientPins);
  ambientPinsRef.current = ambientPins;

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    const containerEl = containerRef.current;
    if (!mountEl || !containerEl) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let envRT: THREE.WebGLRenderTarget | null = null;
    let scene: THREE.Scene | null = null;
    let frameId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;

    const isSoftwareGl = detectSoftwareWebGL();

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglFailed(true);
      setRevealedSpotIds(Object.fromEntries(spotsRef.current.map((s) => [s.id, true])));
      setRevealedAmbientIds(Object.fromEntries(ambientPinsRef.current.map((p) => [p.id, true])));
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    // Scene & horizon-matched daylight fog (zero boxed void walls)
    const skyColor = new THREE.Color(0xedf2f9);
    scene = new THREE.Scene();
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0xedf2f9, 0.0175);

    // Mandatory studio environment reflections via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    // Camera
    const initialW = Math.max(1, containerEl.clientWidth);
    const initialH = Math.max(1, containerEl.clientHeight);
    const initialAspect = initialW / initialH;
    const camera = new THREE.PerspectiveCamera(
      initialAspect < 0.85 ? 45 : 38,
      initialAspect,
      0.5,
      160
    );
    renderer.setSize(initialW, initialH, false);

    // Balanced warm/cool outdoor studio lighting rig (1 crisp shadow caster)
    const hemiLight = new THREE.HemisphereLight(0xf6faff, 0xd8dfe8, 1.15);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff6e8, 1.65);
    sunLight.position.set(16, 26, 14);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 65;
    const sd = 18;
    sunLight.shadow.camera.left = -sd;
    sunLight.shadow.camera.right = sd;
    sunLight.shadow.camera.top = sd;
    sunLight.shadow.camera.bottom = -sd;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xd9e8ff, 0.55);
    rimLight.position.set(-18, 14, -16);
    scene.add(rimLight);

    // Extended infinite-feel horizon ground + central textured city district
    const outerGround = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: 0xeef2f7, roughness: 0.95, metalness: 0 })
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.02;
    outerGround.receiveShadow = true;
    scene.add(outerGround);

    const groundTex = createGroundMapTexture(maxAniso);
    const cityGround = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 36),
      new THREE.MeshStandardMaterial({
        map: groundTex,
        roughness: 0.92,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    cityGround.rotation.x = -Math.PI / 2;
    cityGround.position.y = 0;
    cityGround.receiveShadow = true;
    scene.add(cityGround);

    // Subtle raised plaza platform at center (0, 0)
    const plazaRim = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.85, 0.08, 36),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8, metalness: 0.04 })
    );
    plazaRim.position.y = 0.04;
    plazaRim.receiveShadow = true;
    scene.add(plazaRim);

    const plazaGarden = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.1, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: 0xcbe8c4, roughness: 0.92, metalness: 0 })
    );
    plazaGarden.position.y = 0.06;
    plazaGarden.receiveShadow = true;
    scene.add(plazaGarden);

    // Architectural materials palette (warm ivory, Mediterranean sand, soft limestone, terracotta, slate)
    const facadeIvory = new THREE.MeshStandardMaterial({
      map: createFacadeTexture('#F9F7F3', '#8CA7C7', '#E6E0D6', 4, 5, maxAniso),
      roughness: 0.78,
      metalness: 0.05,
    });
    const facadeWarmSand = new THREE.MeshStandardMaterial({
      map: createFacadeTexture('#F5ECE0', '#86A1C2', '#E2D4C3', 4, 4, maxAniso),
      roughness: 0.82,
      metalness: 0.04,
    });
    const facadeSlateBlue = new THREE.MeshStandardMaterial({
      map: createFacadeTexture('#EFF4FA', '#7596BE', '#DCE4F0', 5, 6, maxAniso),
      roughness: 0.65,
      metalness: 0.12,
    });
    const facadeBlushStone = new THREE.MeshStandardMaterial({
      map: createFacadeTexture('#F6EFEA', '#8DA7C4', '#E5D8D0', 4, 5, maxAniso),
      roughness: 0.8,
      metalness: 0.04,
    });

    const plinthStone = new THREE.MeshStandardMaterial({
      color: 0xe6ebf2,
      roughness: 0.86,
      metalness: 0.03,
    });
    const roofTerracotta = new THREE.MeshStandardMaterial({
      color: 0xd99b7c,
      roughness: 0.82,
      metalness: 0.03,
    });
    const roofSlate = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.72,
      metalness: 0.08,
    });
    const roofWarmWood = new THREE.MeshStandardMaterial({
      color: 0xd9b994,
      roughness: 0.85,
      metalness: 0.02,
    });
    const accentGlass = new THREE.MeshStandardMaterial({
      color: 0x9fc2eb,
      roughness: 0.18,
      metalness: 0.35,
    });
    const accentBrandBlue = new THREE.MeshStandardMaterial({
      color: 0x3b6dff,
      roughness: 0.35,
      metalness: 0.2,
    });
    const accentWarmOrange = new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      roughness: 0.42,
      metalness: 0.12,
    });
    const accentPurple = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      roughness: 0.42,
      metalness: 0.12,
    });

    // City blocks specification: 3 hero landmark buildings + rich surrounding European skyline
    interface BuildingSpec {
      x: number;
      z: number;
      w: number;
      h: number;
      d: number;
      rotY?: number;
      facade: THREE.Material;
      roof: THREE.Material;
      accent: THREE.Material;
      style: 'parapet' | 'pitched' | 'terrace' | 'stepped';
    }

    const buildings: BuildingSpec[] = [
      // HERO 1: Dr. Clara Moreau Clinic (upper-left quadrant)
      {
        x: -3.7,
        z: -3.2,
        w: 2.35,
        h: 2.65,
        d: 2.05,
        rotY: 0.05,
        facade: facadeSlateBlue,
        roof: roofSlate,
        accent: accentBrandBlue,
        style: 'stepped',
      },
      // HERO 2: Rooftop Aperitivo Terrace (mid-right quadrant)
      {
        x: 3.85,
        z: -0.35,
        w: 2.45,
        h: 2.85,
        d: 2.15,
        rotY: -0.06,
        facade: facadeWarmSand,
        roof: roofWarmWood,
        accent: accentWarmOrange,
        style: 'terrace',
      },
      // HERO 3: Vintage City Bike Corner Courtyard (lower-left/center quadrant)
      {
        x: -1.65,
        z: 3.95,
        w: 2.1,
        h: 1.85,
        d: 1.85,
        rotY: 0.04,
        facade: facadeBlushStone,
        roof: roofTerracotta,
        accent: accentPurple,
        style: 'pitched',
      },

      // Midground architectural fabric (creating authentic European street corridors)
      { x: -7.1, z: -3.6, w: 2.2, h: 2.3, d: 2.2, facade: facadeIvory, roof: roofTerracotta, accent: accentGlass, style: 'pitched' },
      { x: -3.6, z: -6.9, w: 2.4, h: 3.2, d: 2.0, facade: facadeWarmSand, roof: roofSlate, accent: accentGlass, style: 'parapet' },
      { x: 0.1, z: -6.5, w: 2.6, h: 3.6, d: 2.1, facade: facadeSlateBlue, roof: roofSlate, accent: accentGlass, style: 'stepped' },
      { x: 3.8, z: -6.2, w: 2.3, h: 2.9, d: 2.1, facade: facadeIvory, roof: roofTerracotta, accent: accentGlass, style: 'pitched' },
      { x: 7.4, z: -5.4, w: 2.2, h: 2.4, d: 2.0, facade: facadeBlushStone, roof: roofSlate, accent: accentGlass, style: 'parapet' },

      { x: -7.4, z: 0.2, w: 2.3, h: 2.1, d: 2.1, facade: facadeWarmSand, roof: roofTerracotta, accent: accentGlass, style: 'pitched' },
      { x: -3.7, z: 0.3, w: 2.0, h: 1.9, d: 1.9, facade: facadeIvory, roof: roofSlate, accent: accentGlass, style: 'parapet' },
      { x: 3.7, z: -3.4, w: 2.1, h: 2.35, d: 1.85, facade: facadeIvory, roof: roofTerracotta, accent: accentGlass, style: 'pitched' },
      { x: 7.5, z: -1.7, w: 2.3, h: 2.65, d: 2.0, facade: facadeSlateBlue, roof: roofSlate, accent: accentGlass, style: 'stepped' },

      { x: -7.2, z: 3.9, w: 2.4, h: 1.75, d: 2.1, facade: facadeIvory, roof: roofSlate, accent: accentGlass, style: 'parapet' },
      { x: -4.4, z: 4.1, w: 1.85, h: 1.55, d: 1.75, facade: facadeWarmSand, roof: roofTerracotta, accent: accentGlass, style: 'pitched' },
      { x: 3.7, z: 3.6, w: 2.25, h: 2.1, d: 2.0, facade: facadeBlushStone, roof: roofSlate, accent: accentGlass, style: 'terrace' },
      { x: 7.3, z: 2.6, w: 2.1, h: 2.25, d: 2.0, facade: facadeIvory, roof: roofTerracotta, accent: accentGlass, style: 'pitched' },

      // Foreground flanking blocks (creates dramatic depth when flying into the city!)
      { x: -5.6, z: 8.2, w: 2.5, h: 1.65, d: 2.1, facade: facadeSlateBlue, roof: roofSlate, accent: accentGlass, style: 'parapet' },
      { x: -1.9, z: 8.4, w: 2.2, h: 1.5, d: 1.9, facade: facadeIvory, roof: roofTerracotta, accent: accentGlass, style: 'pitched' },
      { x: 3.3, z: 7.8, w: 2.4, h: 1.75, d: 2.0, facade: facadeWarmSand, roof: roofSlate, accent: accentGlass, style: 'parapet' },
      { x: 7.1, z: 7.2, w: 2.2, h: 1.85, d: 2.0, facade: facadeBlushStone, roof: roofTerracotta, accent: accentGlass, style: 'pitched' },

      // Distant background skyline silhouette fading smoothly into horizon fog
      { x: -10.8, z: -7.5, w: 2.6, h: 3.1, d: 2.4, facade: facadeIvory, roof: roofSlate, accent: accentGlass, style: 'parapet' },
      { x: -6.8, z: -10.2, w: 2.8, h: 3.8, d: 2.4, facade: facadeSlateBlue, roof: roofSlate, accent: accentGlass, style: 'stepped' },
      { x: -2.2, z: -10.8, w: 3.0, h: 4.3, d: 2.5, facade: facadeWarmSand, roof: roofSlate, accent: accentGlass, style: 'stepped' },
      { x: 2.6, z: -10.6, w: 2.8, h: 4.1, d: 2.4, facade: facadeIvory, roof: roofSlate, accent: accentGlass, style: 'parapet' },
      { x: 7.2, z: -9.8, w: 2.7, h: 3.5, d: 2.3, facade: facadeSlateBlue, roof: roofSlate, accent: accentGlass, style: 'stepped' },
      { x: 11.0, z: -6.4, w: 2.5, h: 2.8, d: 2.3, facade: facadeWarmSand, roof: roofTerracotta, accent: accentGlass, style: 'pitched' },
      { x: -11.0, z: -1.8, w: 2.5, h: 2.4, d: 2.3, facade: facadeBlushStone, roof: roofTerracotta, accent: accentGlass, style: 'pitched' },
      { x: 11.2, z: 0.8, w: 2.6, h: 2.5, d: 2.4, facade: facadeIvory, roof: roofSlate, accent: accentGlass, style: 'parapet' },
      { x: -10.6, z: 4.8, w: 2.4, h: 2.0, d: 2.2, facade: facadeWarmSand, roof: roofSlate, accent: accentGlass, style: 'parapet' },
      { x: 10.6, z: 5.4, w: 2.5, h: 2.1, d: 2.2, facade: facadeSlateBlue, roof: roofSlate, accent: accentGlass, style: 'parapet' },
    ];

    buildings.forEach((b) => {
      const meshGroup = buildCompositeBuilding(
        b.w,
        b.h,
        b.d,
        b.facade,
        plinthStone,
        b.roof,
        b.accent,
        b.style
      );
      meshGroup.position.set(b.x, 0, b.z);
      if (b.rotY) meshGroup.rotation.y = b.rotY;
      scene!.add(meshGroup);
    });

    // Instanced Mediterranean trees across parks, plaza & avenues
    const treePositions: Array<[number, number, number]> = [
      // Central plaza
      [-0.55, 0.1, -0.4],
      [0.52, 0.1, 0.38],
      // Park belt & river walk
      [-8.6, 0, 6.2],
      [-6.8, 0, 6.0],
      [-4.9, 0, 5.7],
      [-3.1, 0, 5.4],
      [-0.2, 0, 5.1],
      [1.8, 0, 4.4],
      [2.1, 0, 2.2],
      [5.5, 0, 1.5],
      [6.1, 0, -3.5],
      [8.9, 0, -3.7],
      [9.4, 0, -5.0],
      // North park
      [-9.2, 0, -6.2],
      [-8.2, 0, -7.4],
      [-6.4, 0, -7.2],
      [-5.6, 0, -5.8],
      // South-east park
      [5.5, 0, 5.4],
      [6.4, 0, 6.0],
      [8.4, 0, 4.6],
      [9.1, 0, 5.8],
      // Avenue boulevards
      [-1.7, 0, -4.6],
      [1.7, 0, -4.4],
      [-1.7, 0, -1.8],
      [1.7, 0, -1.9],
      [-1.7, 0, 1.8],
      [1.7, 0, 1.8],
      [-5.4, 0, -1.5],
      [5.5, 0, -1.5],
      [-5.4, 0, 2.1],
      [5.5, 0, 2.1],
    ];

    const trunkGeo = new THREE.CylinderGeometry(0.055, 0.085, 0.42, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b6f55, roughness: 0.92, metalness: 0 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    trunkInst.castShadow = !isSoftwareGl;

    const canopyGeo = new THREE.IcosahedronGeometry(0.38, 1);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length);
    canopyInst.castShadow = !isSoftwareGl;
    canopyInst.receiveShadow = true;

    const treePalette = [0x74b77a, 0x84c587, 0x67a96f, 0x95cf92];
    treePositions.forEach(([tx, ty, tz], idx) => {
      const scale = 0.86 + ((idx * 37) % 100) / 330; // deterministic ±15% variation
      _dummy.position.set(tx, ty + 0.21 * scale, tz);
      _dummy.rotation.set(0, idx * 0.7, 0);
      _dummy.scale.set(scale, scale, scale);
      _dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(tx, ty + 0.62 * scale, tz);
      _dummy.scale.set(scale * 1.05, scale * 0.92, scale * 1.05);
      _dummy.updateMatrix();
      canopyInst.setMatrixAt(idx, _dummy.matrix);

      _tempColor.setHex(treePalette[idx % treePalette.length]);
      canopyInst.setColorAt(idx, _tempColor);
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    canopyInst.computeBoundingSphere();
    scene.add(trunkInst);
    scene.add(canopyInst);

    // Subtle living city traffic (6 tiny sleek minimalist vehicles gliding along the two main avenues)
    const carSpecs = [
      { axis: 'z' as const, lane: -0.35, dir: 1, offset: -12, speed: 2.1, color: 0xffffff },
      { axis: 'z' as const, lane: 0.35, dir: -1, offset: 6, speed: 1.9, color: 0x3b6dff },
      { axis: 'z' as const, lane: -0.35, dir: 1, offset: 3, speed: 2.2, color: 0x64748b },
      { axis: 'x' as const, lane: 0.35, dir: 1, offset: -10, speed: 2.0, color: 0xffffff },
      { axis: 'x' as const, lane: -0.35, dir: -1, offset: 9, speed: 1.8, color: 0xfb923c },
      { axis: 'x' as const, lane: 0.35, dir: 1, offset: 4, speed: 2.15, color: 0x94a3b8 },
    ];
    const carBodyGeo = new THREE.BoxGeometry(0.28, 0.14, 0.56);
    const carCabinGeo = new THREE.BoxGeometry(0.22, 0.1, 0.28);
    const carCabinMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2, metalness: 0.3 });
    const carGroups = carSpecs.map((spec) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        carBodyGeo,
        new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.35, metalness: 0.2 })
      );
      body.position.y = 0.09;
      body.castShadow = !isSoftwareGl;
      const cabin = new THREE.Mesh(carCabinGeo, carCabinMat);
      cabin.position.set(0, 0.19, -0.03);
      g.add(body, cabin);
      if (spec.axis === 'x') g.rotation.y = spec.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      else g.rotation.y = spec.dir > 0 ? 0 : Math.PI;
      scene!.add(g);
      return { group: g, spec };
    });

    // 3D GPS Central Plaza Beacon
    const gpsBeacon = new THREE.Group();
    const gpsPulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.42, 32),
      new THREE.MeshBasicMaterial({
        color: 0x0038ff,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    gpsPulseRing.rotation.x = -Math.PI / 2;
    gpsPulseRing.position.y = 0.14;
    gpsBeacon.add(gpsPulseRing);
    scene.add(gpsBeacon);

    // 3D Rooftop Pin Beacons + Glowing Route Ribbons for each spotlight spot
    const spotBeacons = spotsRef.current.map((spot) => {
      const beacon = build3DPinBeacon(spot.accentHex);
      beacon.position.set(spot.worldPos[0], spot.worldPos[1], spot.worldPos[2]);
      beacon.scale.setScalar(prefersReducedMotion ? 1 : 0.001);
      scene!.add(beacon);

      // Curved 3D route ribbon from central plaza to building entrance
      const midX = spot.worldPos[0] * 0.5 + (spot.worldPos[2] * 0.18);
      const midZ = spot.worldPos[2] * 0.5 - (spot.worldPos[0] * 0.12);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.14, 0),
        new THREE.Vector3(midX, 0.16, midZ),
        new THREE.Vector3(spot.worldPos[0], 0.14, spot.worldPos[2]),
      ]);
      const routeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(spot.accentHex),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const routeMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.055, 6, false), routeMat);
      scene!.add(routeMesh);

      return { spot, beacon, routeMat };
    });

    // 3D Ambient Neighborhood Beacons
    const ambientBeacons = ambientPinsRef.current.map((pin) => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(pin.color),
          roughness: 0.3,
          metalness: 0.1,
          emissive: new THREE.Color(pin.color),
          emissiveIntensity: 0.25,
        })
      );
      dot.position.set(pin.worldPos[0], pin.worldPos[1], pin.worldPos[2]);
      dot.scale.setScalar(prefersReducedMotion ? 1 : 0.001);
      scene!.add(dot);
      return { pin, dot };
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Starting high-altitude approach camera coordinates (entering the 3D city!)
    const ENTRY_START_POS = new THREE.Vector3(0.4, 24.5, 34.5);
    const ENTRY_START_LOOK = new THREE.Vector3(0, 0.4, -1.5);
    const ENTRY_END_POS = new THREE.Vector3(-1.4, 11.8, 17.6);
    const ENTRY_END_LOOK = new THREE.Vector3(0, 1.3, 0.1);

    if (prefersReducedMotion) {
      camera.position.copy(ENTRY_END_POS);
      _camCurrentLook.copy(ENTRY_END_LOOK);
      camera.lookAt(_camCurrentLook);
    } else {
      camera.position.copy(ENTRY_START_POS);
      _camCurrentLook.copy(ENTRY_START_LOOK);
      camera.lookAt(_camCurrentLook);
    }

    // State trackers inside the loop (only trigger React state updates on discrete milestones)
    const revealedSpotsLocal: Record<string, boolean> = {};
    const revealedAmbientsLocal: Record<string, boolean> = {};
    let currentActiveIdx = 0;

    // Project 3D world anchors directly onto DOM elements (zero React re-renders per frame)
    const updateDomProjections = () => {
      const width = containerEl.clientWidth;
      const height = containerEl.clientHeight;
      if (width <= 0 || height <= 0) return;

      camera.updateMatrixWorld();

      // GPS plaza dot
      if (gpsElRef.current) {
        _projVec.set(0, 0.22, 0).project(camera);
        const gx = (_projVec.x * 0.5 + 0.5) * width;
        const gy = (-_projVec.y * 0.5 + 0.5) * height;
        gpsElRef.current.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }

      // Ambient pins
      for (let i = 0; i < ambientPinsRef.current.length; i++) {
        const pin = ambientPinsRef.current[i];
        const el = ambientElRefs.current[pin.id];
        if (!el) continue;
        _projVec.set(pin.worldPos[0], pin.worldPos[1] + 0.28, pin.worldPos[2]).project(camera);
        const visible = _projVec.z < 1 && _projVec.x > -1.08 && _projVec.x < 1.08 && _projVec.y > -1.08 && _projVec.y < 1.08;
        if (!visible) {
          el.style.visibility = 'hidden';
          continue;
        }
        el.style.visibility = 'visible';
        const px = (_projVec.x * 0.5 + 0.5) * width;
        const py = (-_projVec.y * 0.5 + 0.5) * height;
        el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }

      // 3 Spotlight tag cards anchored cleanly right above their 3D rooftop beacons
      const halfCardPad = width < 420 ? 96 : 114;
      const topPad = 88;
      const bottomPad = 24;
      for (let i = 0; i < spotsRef.current.length; i++) {
        const spot = spotsRef.current[i];
        const el = spotElRefs.current[spot.id];
        if (!el) continue;
        // Anchor directly above the 3D rooftop pin head
        _projVec.set(spot.worldPos[0], spot.worldPos[1] + 0.9, spot.worldPos[2]).project(camera);
        const rawX = (_projVec.x * 0.5 + 0.5) * width;
        const rawY = (-_projVec.y * 0.5 + 0.5) * height;
        const clampedX = Math.max(halfCardPad, Math.min(width - halfCardPad, rawX));
        const clampedY = Math.max(topPad, Math.min(height - bottomPad, rawY));
        el.style.transform = `translate3d(${clampedX.toFixed(1)}px, ${clampedY.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
    };

    const handleResize = () => {
      if (!renderer || !containerEl) return;
      const w = Math.max(1, containerEl.clientWidth);
      const h = Math.max(1, containerEl.clientHeight);
      const aspect = w / h;
      camera.aspect = aspect;
      camera.fov = aspect < 0.85 ? 45 : 38;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      updateDomProjections();
      if (prefersReducedMotion && scene) {
        renderer.render(scene, camera);
      }
    };

    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerEl);

    // Reduced-motion static render
    if (prefersReducedMotion) {
      spotBeacons.forEach(({ beacon, routeMat }, idx) => {
        beacon.scale.setScalar(1);
        routeMat.opacity = idx === 0 ? 0.65 : 0;
      });
      ambientBeacons.forEach(({ dot }) => dot.scale.setScalar(1));
      renderer.render(scene, camera);
      updateDomProjections();
      return () => {
        resizeObserver?.disconnect();
        envRT?.dispose();
        scene?.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              const std = m as THREE.MeshStandardMaterial;
              std.map?.dispose();
              m.dispose();
            });
          }
        });
        renderer?.dispose();
      };
    }

    // Continuous smooth animation loop (fly-in entry -> living 3D city tour)
    let elapsed = 0;
    let lastNow = performance.now();
    const ENTRY_DURATION = 3.8; // Seconds to fly into the 3D city
    const SPOT_HOLD = 3.4; // Seconds per spotlight focus during tour

    const afterDraw = (cb: () => void) => {
      if (!renderer || disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed || !renderer || !scene) return;

      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;

      // Pause GPU work when hero is scrolled out of viewport
      if (!isInViewRef.current) {
        frameId = window.setTimeout(tick, 180);
        return;
      }

      elapsed += dt;

      // 1. Progressive tag & beacon reveal as camera enters the city
      let spotsChanged = false;
      for (let i = 0; i < spotsRef.current.length; i++) {
        const s = spotsRef.current[i];
        if (!revealedSpotsLocal[s.id] && elapsed >= s.revealAt) {
          revealedSpotsLocal[s.id] = true;
          spotsChanged = true;
          if (elapsed < ENTRY_DURATION && i !== currentActiveIdx) {
            currentActiveIdx = i;
            setActiveIndex(i);
          }
        }
      }
      if (spotsChanged) {
        setRevealedSpotIds({ ...revealedSpotsLocal });
      }

      let ambientsChanged = false;
      for (let i = 0; i < ambientPinsRef.current.length; i++) {
        const p = ambientPinsRef.current[i];
        if (!revealedAmbientsLocal[p.id] && elapsed >= p.revealAt) {
          revealedAmbientsLocal[p.id] = true;
          ambientsChanged = true;
        }
      }
      if (ambientsChanged) {
        setRevealedAmbientIds({ ...revealedAmbientsLocal });
      }

      // 2. Camera choreography: dramatic smooth fly-in -> living city tour
      if (elapsed < ENTRY_DURATION) {
        // Quintic ease-out descent into the sunlit 3D city
        const u = elapsed / ENTRY_DURATION;
        const ease = 1 - Math.pow(1 - u, 3.2);
        // Gentle curved horizontal banking arc during approach
        const arcX = Math.sin(u * Math.PI) * 3.8;
        camera.position.lerpVectors(ENTRY_START_POS, ENTRY_END_POS, ease);
        camera.position.x += arcX;
        _camCurrentLook.lerpVectors(ENTRY_START_LOOK, ENTRY_END_LOOK, ease);
        camera.lookAt(_camCurrentLook);
      } else {
        const tourT = elapsed - ENTRY_DURATION;
        const spotCount = spotsRef.current.length;
        const nextActiveIdx = Math.floor(tourT / SPOT_HOLD) % spotCount;
        if (nextActiveIdx !== currentActiveIdx) {
          currentActiveIdx = nextActiveIdx;
          setActiveIndex(nextActiveIdx);
        }

        const activeSpot = spotsRef.current[currentActiveIdx];
        // Continuous subtle orbital breathing motion so the 3D city always feels alive
        const swayX = Math.sin(tourT * 0.42) * 0.95;
        const swayY = Math.cos(tourT * 0.35) * 0.42;
        const swayZ = Math.sin(tourT * 0.28) * 0.6;

        _camTargetPos.set(
          activeSpot.focusCamPos[0] + swayX,
          activeSpot.focusCamPos[1] + swayY,
          activeSpot.focusCamPos[2] + swayZ
        );
        _camTargetLook.set(
          activeSpot.focusLookAt[0],
          activeSpot.focusLookAt[1],
          activeSpot.focusLookAt[2]
        );

        const dampLambda = 1.65;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, dampLambda, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, dampLambda, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, dampLambda, dt);

        _camCurrentLook.x = THREE.MathUtils.damp(_camCurrentLook.x, _camTargetLook.x, dampLambda, dt);
        _camCurrentLook.y = THREE.MathUtils.damp(_camCurrentLook.y, _camTargetLook.y, dampLambda, dt);
        _camCurrentLook.z = THREE.MathUtils.damp(_camCurrentLook.z, _camTargetLook.z, dampLambda, dt);

        camera.lookAt(_camCurrentLook);
      }

      // 3. Animate 3D beacons, route ribbons, GPS pulse & gliding vehicles
      const gpsPhase = (elapsed * 0.55) % 1;
      const gpsScale = 0.8 + gpsPhase * 2.4;
      gpsPulseRing.scale.set(gpsScale, gpsScale, 1);
      (gpsPulseRing.material as THREE.MeshBasicMaterial).opacity = (1 - gpsPhase) * 0.45;

      for (let i = 0; i < spotBeacons.length; i++) {
        const { spot, beacon, routeMat } = spotBeacons[i];
        const isRevealed = Boolean(revealedSpotsLocal[spot.id]);
        const isSpotActive = isRevealed && i === currentActiveIdx;
        const targetScale = !isRevealed ? 0.001 : isSpotActive ? 1.24 : 0.92;
        const nextScale = THREE.MathUtils.damp(beacon.scale.x, targetScale, 6.5, dt);
        beacon.scale.setScalar(nextScale);
        beacon.position.y = spot.worldPos[1] + (isRevealed ? Math.sin(elapsed * 2.4 + i * 1.6) * 0.055 : 0);

        const targetRouteOpacity = isSpotActive ? 0.68 : isRevealed ? 0.1 : 0;
        routeMat.opacity = THREE.MathUtils.damp(routeMat.opacity, targetRouteOpacity, 4.5, dt);
      }

      for (let i = 0; i < ambientBeacons.length; i++) {
        const { pin, dot } = ambientBeacons[i];
        const isRevealed = Boolean(revealedAmbientsLocal[pin.id]);
        const targetScale = isRevealed ? 1 + Math.sin(elapsed * 2.2 + i) * 0.08 : 0.001;
        const nextScale = THREE.MathUtils.damp(dot.scale.x, targetScale, 6.0, dt);
        dot.scale.setScalar(nextScale);
      }

      // Glide tiny urban vehicles cleanly along avenues (looping [-16, 16], skipping central plaza circle)
      for (let i = 0; i < carGroups.length; i++) {
        const { group, spec } = carGroups[i];
        const span = 32;
        let pos = ((spec.offset + elapsed * spec.speed * spec.dir + span * 10) % span) - span * 0.5;
        // Gently bow around central plaza circle radius ~2.0
        const distCenter = Math.abs(pos);
        const bow = distCenter < 2.3 ? Math.cos((distCenter / 2.3) * (Math.PI * 0.5)) * 1.45 * spec.dir : 0;
        if (spec.axis === 'z') {
          group.position.set(spec.lane + bow, 0, pos);
        } else {
          group.position.set(pos, 0, spec.lane + bow);
        }
      }

      renderer.render(scene, camera);
      updateDomProjections();

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      frameId = window.setTimeout(tick, 30);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver?.disconnect();
      envRT?.dispose();
      scene?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            std.map?.dispose();
            m.dispose();
          });
        }
      });
      renderer?.dispose();
    };
  }, [prefersReducedMotion]);

  return (
    <motion.div
      ref={containerRef}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.08, ease: APPLE_EASE }}
      className="relative h-[460px] sm:h-[520px] rounded-[32px] overflow-hidden border border-slate-200/90 bg-[#EDF2F9] shadow-[0_24px_60px_rgba(10,15,44,0.09)] pointer-events-none select-none will-change-transform"
    >
      {/* Dedicated isolated WebGL canvas mount */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Graceful fallback backdrop if WebGL is completely unavailable */}
      {webglFailed && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(155deg, #EDF2F9 0%, #E2EAF5 50%, #D9E8DB 100%)',
          }}
        />
      )}

      {/* 3D-projected Central GPS Marker */}
      <div
        ref={gpsElRef}
        className="absolute top-0 left-0 z-10 will-change-transform"
        style={{ transform: 'translate3d(50%, 50%, 0) translate(-50%, -50%)' }}
      >
        <span className="w-6 h-6 rounded-full bg-brand-blue/15 flex items-center justify-center">
          <span className="w-3 h-3 rounded-full bg-brand-blue border-[2.5px] border-white shadow-[0_3px_10px_rgba(0,56,255,0.45)]" />
        </span>
      </div>

      {/* 3D-projected Ambient Neighborhood Tags appearing progressively during fly-in */}
      {ambientPins.map((pin) => {
        const isRevealed = Boolean(revealedAmbientIds[pin.id]);
        return (
          <div
            key={pin.id}
            ref={(el) => {
              ambientElRefs.current[pin.id] = el;
            }}
            className="absolute top-0 left-0 z-10 will-change-transform"
            style={{ visibility: 'hidden' }}
          >
            <motion.div
              initial={false}
              animate={
                isRevealed
                  ? { opacity: 0.94, scale: 1, y: 0 }
                  : { opacity: 0, scale: 0.45, y: 12 }
              }
              transition={PIN_SPRING}
              className="will-change-transform"
            >
              {pin.rating ? (
                <div className="bg-white/95 border border-slate-200/90 shadow-[0_4px_12px_rgba(10,15,44,0.14)] rounded-full px-1.5 py-0.5 flex items-center gap-0.5 text-[9px] font-bold text-brand-navy tabular-nums relative">
                  <span
                    style={{ backgroundColor: pin.color }}
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                  />
                  <span>{pin.rating}</span>
                  <span className="text-amber-500">★</span>
                  <span className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-white" />
                </div>
              ) : (
                <div
                  style={{ backgroundColor: pin.color }}
                  className="w-4 h-4 rounded-full border-2 border-white shadow-[0_4px_10px_rgba(10,15,44,0.22)] relative flex items-center justify-center"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span
                    style={{ borderTopColor: pin.color }}
                    className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-t-[4.5px] border-l-transparent border-r-transparent"
                  />
                </div>
              )}
            </motion.div>
          </div>
        );
      })}

      {/* 3D-projected Spotlight Spot Tags appearing progressively as you enter the 3D city */}
      {spots.map((spot, idx) => {
        const isRevealed = Boolean(revealedSpotIds[spot.id]);
        const isActive = isRevealed && idx === activeIndex;

        return (
          <div
            key={spot.id}
            ref={(el) => {
              spotElRefs.current[spot.id] = el;
            }}
            className={`absolute top-0 left-0 will-change-transform ${isActive ? 'z-30' : 'z-20'}`}
          >
            <motion.div
              initial={false}
              animate={
                !isRevealed
                  ? { opacity: 0, y: 20, scale: 0.72 }
                  : {
                      opacity: isActive ? 1 : 0.84,
                      y: isActive ? -5 : 2,
                      scale: isActive ? 1.04 : 0.93,
                    }
              }
              transition={PRO_SPRING}
              className="relative flex flex-col items-center will-change-transform"
            >
              {/* Crisp solid-surface card anchored directly onto the 3D rooftop pin (no backdrop-blur over WebGL) */}
              <div
                className={`mb-1 ${spot.widthClass} rounded-2xl bg-white/95 border p-2.5 flex items-center gap-2.5 text-left relative transition-colors duration-300 ${
                  isActive
                    ? spot.activeBorderClass
                    : 'border-slate-200/95 shadow-[0_10px_24px_rgba(10,15,44,0.1)]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200/80 shrink-0 bg-slate-50">
                  <img
                    src={spot.thumb}
                    alt={spot.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-[9.5px] font-bold leading-none ${spot.labelClass}`}>
                    {spot.kindLabel}
                  </p>
                  <p className="text-[11.5px] sm:text-[12.5px] font-bold text-brand-navy truncate leading-snug mt-0.5 flex items-center gap-1">
                    <span className="truncate">{spot.title}</span>
                    {spot.showVerified && (
                      <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    )}
                  </p>
                  <p className="text-[9.5px] sm:text-[10px] text-slate-500 truncate leading-tight tabular-nums mt-0.5">
                    {spot.meta}
                  </p>
                </div>

                <span
                  aria-hidden="true"
                  className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-r border-b border-slate-200/90"
                />
              </div>
            </motion.div>
          </div>
        );
      })}

      {/* Soft daylight sky-horizon vignette pinned to viewport frame */}
      <div
        className="absolute inset-0 pointer-events-none z-40"
        style={{
          background:
            'radial-gradient(circle at 50% 54%, transparent 66%, rgba(237,242,249,0.58) 100%)',
        }}
      />
    </motion.div>
  );
});
