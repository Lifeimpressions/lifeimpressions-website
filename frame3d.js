/**
 * Lifeimpressions shadowbox 3D viewer.
 * Engine ported from Paramount Frame Works (frame3d.js): mitred moulding sides extruded from a real
 * profile, OrbitControls, RoomEnvironment lighting, glass, front/angle/corner/back camera moves and the
 * GLB export used by "View on my wall". The shadowbox contents (board, gold hand/foot casts, charms) are ours.
 * three.js comes from the importmap in index.html.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

const METAL_HEXES = ["#c9a14a", "#c08a7d", "#bfc1c6"];

// deep mouldings from the Paramount profile table (W = face width, H = depth off the wall, mm)
export const PROFILES = {
  deep: {"m":"390","s":"28x20","W":20,"H":28,"wall":14.8,"lip":23.7,"p":[[0.0,28.0],[0.0,0.6],[13.9,0.6],[13.9,23.7],[19.1,24.3],[19.1,28.0]],"t":"1","sellFt":33.0,"sellStick":313.5},
  extra: {"m":"490","s":"28x25","W":25,"H":28,"wall":11.5,"lip":15.1,"p":[[0.0,28.0],[0.0,0.5],[10.4,0.5],[10.9,1.1],[10.9,14.0],[12.0,15.1],[24.0,15.1],[24.5,19.9],[24.0,20.5],[10.9,20.5],[9.9,23.2],[5.7,23.2],[4.2,24.2],[4.2,28.0]],"t":"1.25","sellFt":39.0,"sellStick":370.5},
  slim: {"m":"235","s":"16x25","W":25,"H":16,"wall":19.7,"lip":7.8,"p":[[0.0,16.0],[0.0,0.8],[0.3,0.4],[19.1,0.4],[19.4,0.8],[19.4,7.4],[20.0,8.2],[24.7,8.2],[24.7,12.7],[6.6,12.7],[5.6,13.9],[5.6,16.0]],"t":"1","sellFt":22.5,"sellStick":213.75},
};

/** Outer size of the finished frame for a given print + mount and profile. */
export function outerSizeMm(innerW        , innerH        , p                 ) {
  return { width: innerW + 2 * p.wall, height: innerH + 2 * p.wall };
}

function grainTexture(width = 1024) {
  const c = document.createElement("canvas"); c.width = width; c.height = 64;
  const g = c.getContext("2d") ;
  g.fillStyle = "#ececec"; g.fillRect(0, 0, width, 64);
  for (let i = 0; i < width * 0.9; i++) {
    const y = Math.random() * 64, a = Math.random() * 0.14;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${a})`;
    g.lineWidth = Math.random() * 1.6 + 0.3; g.beginPath();
    let x = 0; g.moveTo(0, y);
    while (x < width) { x += 40; g.lineTo(x, y + Math.sin(x / 90 + y) * 1.6); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * One side of the frame: the profile extruded, then each end sheared to a 45° mitre.
 * tileLenMm: with a moulding photo, the photo repeats every tileLenMm along the side and spans the face
 * from the outer edge (top of the photo) to the inner edge (bottom).
 */
function sideGeometry(p                 , outerLen        , tileLenMm         ) {
  const shape = new THREE.Shape(p.p.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1 });
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = z < 0.5 ? -1 : 1;
    const along = t * (outerLen / 2 - x);             // inner points end earlier: that is the mitre
    pos.setXYZ(i, along, x, y);                        // along the side, in from the outer edge, out from the wall
    if (tileLenMm) uv.setXY(i, (along + outerLen / 2) / tileLenMm, 1 - Math.min(1, Math.max(0, x / p.W)));
    else uv.setXY(i, (along + outerLen / 2) / 300, (x + y) / 40);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Metallic-looking colours (gold, silver, bronze) get a brushed metal finish; the rest look like painted wood. */
function finishFor(hex        ) {
  if (METAL_HEXES.includes(hex.toLowerCase())) return { rough: 0.3, metal: 0.85, grain: 0.1 };
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
  const gold = hsl.h > 0.08 && hsl.h < 0.17 && hsl.s > 0.35 && hsl.l > 0.35;
  const silver = hsl.s < 0.08 && hsl.l > 0.6 && hsl.l < 0.85;
  return gold || silver ? { rough: 0.32, metal: 0.8, grain: 0.1 } : { rough: 0.52, metal: 0, grain: 0.3 };
}


const GOLD = "#d9a93a";

function loadImg(url) {
  return new Promise((res) => { if (!url) return res(null); const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
}

/**
 * Draws the board the way the flat preview lays it out: photo + name on the left, casts and charms on the right.
 * Returns { board, gold }: the flat board, and a transparent layer (casts + charms) that is raised above it.
 */
export async function drawBoard(spec) {
  const W = 1600, H = Math.round(W * spec.hCm / spec.wCm);
  const lay = spec.wCm / spec.hCm >= 1.6 ? "wide" : spec.wCm / spec.hCm < 1.1 ? "sq" : "std";
  const col = lay === "wide" ? 0.30 : lay === "sq" ? 0.46 : 0.41;
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const board = mk(), gold = mk(), g = board.getContext("2d"), o = gold.getContext("2d");
  const pad = W * 0.044, gap = W * 0.046, nameH = W * (lay === "wide" ? 0.075 : 0.095);
  const innerW = W - 2 * pad;
  const px = pad, pw = innerW * col - gap * col;
  const rx = pad + innerW * col + gap * (1 - col), rw = W - pad - rx;
  const top = pad, bodyH = H - 2 * pad - nameH;
  g.fillStyle = spec.boardColor; g.fillRect(0, 0, W, H);
  const dark = spec.dark, line = dark ? "#8a7a52" : "#111";
  g.lineWidth = W * 0.0025; g.strokeStyle = line;
  // photo
  const ph = lay === "sq" ? Math.min(bodyH, pw * 1.25) : bodyH, py = top + (lay === "sq" ? (bodyH - ph) / 2 : 0);
  g.fillStyle = "#e4e0d9"; g.fillRect(px, py, pw, ph);
  if (spec.img) {
    const s = Math.max(pw / spec.img.width, ph / spec.img.height) * (spec.zoom || 1);
    const dw = spec.img.width * s, dh = spec.img.height * s;
    g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
    g.drawImage(spec.img, px + (pw - dw) / 2 + (spec.x || 0) / 100 * pw, py + (ph - dh) / 2 + (spec.y || 0) / 100 * ph, dw, dh); g.restore();
  } else { g.fillStyle = "#8a96a8"; g.font = `600 ${W * 0.035}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Your photo", px + pw / 2, py + ph / 2); }
  g.strokeRect(px, py, pw, ph);
  // casts panel frame
  g.strokeRect(rx, top, rw, bodyH - (lay === "sq" ? 0 : 0));
  // name
  g.fillStyle = dark ? "#f3e9c9" : "#2b2622"; g.textAlign = "center"; g.textBaseline = "middle";
  g.globalAlpha = spec.name ? 1 : 0.4;
  g.font = `${W * (lay === "wide" ? 0.052 : 0.07)}px "Great Vibes", "Brush Script MT", cursive`;
  g.fillText(spec.name || "Your name", px + pw / 2, H - pad - nameH / 2, pw); g.globalAlpha = 1;
  // casts (raised layer)
  const cast = await loadImg(spec.castUrl);
  const inset = W * 0.012, cx = rx + inset, cy = top + inset, cw = rw - 2 * inset, chh = bodyH - 2 * inset - (lay === "sq" ? 0 : 0);
  if (cast) { const k = Math.min(cw / cast.width, chh / cast.height); const w = cast.width * k, h = cast.height * k; o.drawImage(cast, cx + (cw - w) / 2, cy + (chh - h) / 2, w, h); }
  // charms (raised layer): gold discs with the value
  const items = spec.charms, r = W * (lay === "sq" ? 0.04 : 0.048), cyc = H - pad - nameH / 2;
  items.forEach((it, i) => {
    const cxx = rx + rw * (i + 0.5) / items.length;
    const gr = o.createLinearGradient(cxx - r, cyc - r, cxx + r, cyc + r); gr.addColorStop(0, "#f8e08e"); gr.addColorStop(.45, GOLD); gr.addColorStop(1, "#a97c22");
    o.globalAlpha = it.ghost ? 0.45 : 1; o.fillStyle = gr; o.beginPath(); o.arc(cxx, cyc, r, 0, Math.PI * 2); o.fill();
    o.fillStyle = "#4a3410"; o.textAlign = "center"; o.textBaseline = "middle"; o.font = `700 ${r * 0.42}px sans-serif`;
    o.fillText(it.text, cxx, cyc, r * 1.7); o.globalAlpha = 1;
  });
  return { board, gold };
}

const tex = (cv, aniso) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso || 1; t.userData.mimeType = "image/png"; t.userData.ownedByFrame = true; return t; };

/**
 * The shadowbox, in millimetres, wall at z = 0: four mitred moulding sides, the board at the back of the box,
 * the gold casts and charms floating above the board, and glass across the front.
 * s = { profile, frameColor, innerWmm, innerHmm, board (canvas), gold (canvas) }
 */
export function shadowboxParts(s, grain, opts) {
  const p = s.profile, iw = s.innerWmm, ih = s.innerHmm;
  const { width: ow, height: oh } = outerSizeMm(iw, ih, p);
  const group = new THREE.Group();
  const f = finishFor(s.frameColor);
  const mat = new THREE.MeshStandardMaterial({ color: s.frameColor, roughness: f.rough, metalness: f.metal, map: grain ?? undefined, bumpMap: opts.glass && grain ? grain : undefined, bumpScale: f.grain * 0.6 });
  const sides = [[ow, 0, oh / 2, Math.PI, "top"], [oh, ow / 2, 0, Math.PI / 2, "right"], [ow, 0, -oh / 2, 0, "bottom"], [oh, -ow / 2, 0, -Math.PI / 2, "left"]];
  for (const [len, x, y, rot, name] of sides) {
    const m = new THREE.Mesh(sideGeometry(p, len), mat);
    m.name = "moulding-" + name; m.castShadow = true; m.receiveShadow = true; m.rotation.z = rot; m.position.set(x, y, 0); group.add(m);
  }
  const photoTex = tex(s.board, opts.anisotropy);
  const boardZ = 3.6;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.7 }));
  board.name = "board"; board.position.z = boardZ; board.receiveShadow = true; group.add(board);
  const backing = new THREE.Mesh(new THREE.BoxGeometry(iw, ih, 3), new THREE.MeshStandardMaterial({ color: "#8d7a5e", roughness: 1 }));
  backing.name = "backing"; backing.position.z = 1.5 - 0.1; group.add(backing);
  // gold layer, raised: it casts a soft shadow on the board, which is what gives the shadowbox depth
  const goldTex = tex(s.gold, opts.anisotropy);
  const lift = Math.min(10, (p.lip - boardZ) * 0.4);
  const layer = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), new THREE.MeshStandardMaterial({
    map: goldTex, transparent: true, alphaTest: 0.4, roughness: 0.32, metalness: 0.75, envMapIntensity: 1.6 }));
  layer.name = "casts"; layer.position.z = boardZ + lift; layer.castShadow = true;
  // alpha-cut shadows need a depth material that knows the texture
  layer.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: goldTex, alphaTest: 0.4 });
  group.add(layer);
  // a thin dark under-layer just behind the gold, so the raised look also reads in the AR viewer (no shadows there)
  const under = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), new THREE.MeshBasicMaterial({ map: goldTex, transparent: true, alphaTest: 0.4, color: 0x000000, opacity: 0.35 }));
  under.position.set(lift * 0.35, -lift * 0.45, boardZ + 0.4); under.name = "cast-shadow"; group.add(under);
  if (opts.glass) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.04, metalness: 0, transmission: 1, thickness: 0.5, transparent: true, opacity: 0.12, envMapIntensity: 1.2 }));
    glass.position.z = p.lip; group.add(glass);
  }
  return { group, photoTex: { dispose: () => { photoTex.dispose(); goldTex.dispose(); } }, ow, oh };
}

/** "View on my wall": the shadowbox as a GLB (metres) that the phone's AR viewer hangs at true size. */
export async function frameGlb(s) {
  const grain = grainTexture(512);
  const { group, photoTex, ow, oh } = shadowboxParts(s, grain, { glass: false });
  const root = new THREE.Group(); root.name = "lifeimpressions-frame"; root.scale.setScalar(0.001); root.add(group);
  root.userData = { outer_mm: [Math.round(ow), Math.round(oh)] };
  try {
    const out = await new GLTFExporter().parseAsync(root, { binary: true, maxTextureSize: 2048, onlyVisible: true });
    return new Blob([out], { type: "model/gltf-binary" });
  } finally {
    root.traverse((o) => { o.geometry?.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => x.dispose()); });
    photoTex.dispose(); grain.dispose();
  }
}

export function createFrameViewer(host             )              {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 60; controls.maxDistance = 6000;

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.6;
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.35));

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.02 }));
  wall.receiveShadow = true; scene.add(wall);

  const frameGroup = new THREE.Group(); scene.add(frameGroup);
  const grain = grainTexture();
  let photoTex                             = null;
  let current                    = null;
  let view            = "angle";
  let tween                                                                                                         = null;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function disposeGroup() {
    frameGroup.traverse((o) => {
      const m = o              ;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material                                                 ;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
        const map = (x                              ).map;
        if (map?.userData?.ownedByFrame) map.dispose();   // the moulding photo texture made for this build
        x.dispose();
      });
    });
    frameGroup.clear();
  }

  function build(s            ) {
    disposeGroup();
    photoTex?.dispose();
    const parts = shadowboxParts(s, grain, { glass: true, anisotropy: renderer.capabilities.getMaxAnisotropy() });
    photoTex = parts.photoTex;
    parts.group.children.slice().forEach((c) => frameGroup.add(c));
    const { ow, oh } = parts;

    // wall and light scale with the frame
    const span = Math.max(ow, oh);
    wall.scale.set(span * 6, span * 6, 1); wall.position.z = -0.5;
    key.position.set(-span * 0.9, span * 1.3, span * 1.6);
    const sc = key.shadow.camera;
    sc.left = sc.bottom = -span; sc.right = sc.top = span; sc.near = 1; sc.far = span * 6; sc.updateProjectionMatrix();
  }

  function setView(name           , animate = true) {
    view = name;
    const box = new THREE.Box3().setFromObject(frameGroup);
    const v = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const r = Math.max(v.x, v.y);
    const dist = (r / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.35;
    let pos               , target = c.clone();
    if (name === "front") pos = new THREE.Vector3(0, 0, dist);
    else if (name === "back") pos = new THREE.Vector3(0, 0, -dist);
    else if (name === "corner") {
      const face = current?.profile.W ?? 20;
      target = new THREE.Vector3(v.x / 2 - face, v.y / 2 - face, (current?.profile.H ?? 14) / 2);
      const k = Math.max(4, face / 4);
      pos = target.clone().add(new THREE.Vector3(18 * k, 14 * k, 30 * k));
    } else pos = new THREE.Vector3(-dist * 0.45, dist * 0.18, dist * 0.9);
    wall.visible = name !== "back";
    tween = { from: camera.position.clone(), to: pos, tFrom: controls.target.clone(), tTo: target, t: animate && !reduced ? 0 : 1 };
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host);
  resize();

  renderer.setAnimationLoop(() => {
    if (tween) {
      tween.t = Math.min(1, tween.t + 0.045); const e = 1 - Math.pow(1 - tween.t, 3);
      camera.position.lerpVectors(tween.from, tween.to, e); controls.target.lerpVectors(tween.tFrom, tween.tTo, e);
      if (tween.t >= 1) tween = null;
    }
    controls.update(); renderer.render(scene, camera);
  });

  return {
    update(s, reframe = false) {
      const first = !current;
      current = s; build(s);
      if (first || reframe) setView(view, !first);
    },
    setView,
    setSpin(on) { controls.autoRotate = on; controls.autoRotateSpeed = 0.8; },
    resize,
    dispose() {
      renderer.setAnimationLoop(null); ro.disconnect(); controls.dispose();
      disposeGroup(); photoTex?.dispose(); grain.dispose(); pmrem.dispose();
      (scene.environment                        )?.dispose();
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
