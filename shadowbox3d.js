/**
 * "Classic Black" 3D shadowbox: black stepped moulding, cream fillet, printed board (name, birth date,
 * time, weight, blood group, the customer's photo) and four sculpted hand and foot casts standing off the board.
 * Units: millimetres, wall at z = 0. three.js comes from the importmap in the page.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { handSdf, footSdf, meshSdf, HAND_BOUNDS, FOOT_BOUNDS } from "./castmesh.js";

export const FINISHES = {
  silver: { name: "Silver", color: "#b4b8bf", metal: 0.95, rough: 0.38 },
  gold: { name: "Gold", color: "#d8aa46", metal: 0.95, rough: 0.32 },
  rose: { name: "Rose gold", color: "#d29a88", metal: 0.95, rough: 0.33 },
  bronze: { name: "Bronze", color: "#a26f3e", metal: 0.9, rough: 0.4 },
  white: { name: "Marble white", color: "#efebe4", metal: 0, rough: 0.55 },
};
export const BOARDS = {
  orange: { name: "Orange", c0: "#d47a2e", c1: "#873a12", ink: "#141414" },
  ivory: { name: "Ivory", c0: "#f7f0e2", c1: "#d8ccb4", ink: "#1d1a17" },
  sky: { name: "Sky blue", c0: "#cfe3f2", c1: "#87aecb", ink: "#14202b" },
  pink: { name: "Blush pink", c0: "#f6d7dc", c1: "#d79aa5", ink: "#2a1418" },
  black: { name: "Black", c0: "#3a3633", c1: "#121110", ink: "#f2e7cc" },
};

// moulding profile: [in from the outer edge, height off the wall] mm. Inner flat (black) is the lip at 50 mm.
const BOARD_Z = 6;
// Inside depth of the box, from the board to the glass: 2.5 inches.
export const INSIDE_DEPTH = 63.5;
// moulding profile: [in from the outer edge, height off the wall] mm, drawn for a lip at 50 mm and lifted to the real lip.
const PROFILE = [[0, 0], [0, 54], [1.8, 58.5], [6, 61.5], [12, 62.5], [18, 61.5], [21.5, 58], [24, 56], [28, 57.5], [32.5, 60], [37.5, 61], [42, 60.2], [45.5, 57.5], [49, 53.5], [56, 51], [62, 50], [70, 50], [70, 0]];
const LIP = BOARD_Z + INSIDE_DEPTH;
const MOULD = { W: 70, lip: LIP, p: PROFILE.map(([x, y]) => [x, y === 0 ? 0 : y + LIP - 50]) };
const GLASS_T = 2;   // slim 2 mm glass

// ---------- layout of the board, as fractions of the opening (from the Lifeimpressions sample frame) ----------
const L = {
  name: [0.58, 0.125, 0.12], cal: [0.513, 0.33, 0.086], clock: [0.62, 0.435, 0.043], time: [0.621, 0.56, 0.038],
  bell: [0.527, 0.603, 0.07], kg: [0.527, 0.672, 0.038], drop: [0.579, 0.775, 0.16], photo: [0.585, 1.0],
  // casts: centre x, centre y, length (fraction of height), tilt (degrees, + = counter-clockwise), mirror
  casts: [["hand", 0.177, 0.285, 0.5, 6, true], ["hand", 0.337, 0.29, 0.5, -4, false], ["foot", 0.128, 0.712, 0.5, 19, true], ["foot", 0.409, 0.712, 0.5, -15, false]],
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export async function fontsReady() {
  try { await Promise.all(["700 40px Lobster", "italic 700 40px 'Lora'", "700 40px 'Lora'"].map((f) => document.fonts.load(f))); } catch { /* fall back to system fonts */ }
}

/** The printed board as a canvas (customer photo, name and the four birth details). */
export function drawBoard(o) {
  const W = o.bg ? 3000 : 2400, H = Math.round(W * o.hCm / o.wCm), b = BOARDS[o.board] || BOARDS.orange;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const s = H / 1000;   // layout unit: the sample frame is laid out on its height
  if (o.bg) {
    // your own design (made at 50 x 25 cm) fills the whole board; it is cropped to fit if the shape differs
    const k = Math.max(W / o.bg.width, H / o.bg.height), dw = o.bg.width * k, dh = o.bg.height * k;
    g.drawImage(o.bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    if (!o.bgText) return c;
  } else {
    // background: lit from the middle, darker at the edges, with a soft mottle
    const bg = g.createRadialGradient(W * 0.55, H * 0.42, H * 0.1, W * 0.5, H * 0.5, W * 0.62);
    bg.addColorStop(0, b.c0); bg.addColorStop(1, b.c1); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const r = rng(7);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.012 + r() * 0.02})`; g.beginPath(); g.arc(r() * W, r() * H, 20 + r() * 140, 0, 7); g.fill(); }
  }
  // photo, on the right, fading into the board on its left edge
  const px = W * L.photo[0], pw = W - px;
  const ph = document.createElement("canvas"); ph.width = Math.ceil(pw); ph.height = H; const q = ph.getContext("2d");
  if (o.img) {
    const k = Math.max(pw / o.img.width, H / o.img.height) * (o.zoom || 1), dw = o.img.width * k, dh = o.img.height * k;
    q.drawImage(o.img, (pw - dw) / 2 + (o.x || 0) / 100 * pw, (H - dh) / 2 + (o.y || 0) / 100 * H, dw, dh);
  } else if (!o.bg) {
    q.fillStyle = "rgba(255,255,255,.22)"; q.beginPath(); q.arc(pw * 0.55, H * 0.36, H * 0.13, 0, 7); q.fill();
    q.beginPath(); q.ellipse(pw * 0.55, H * 0.82, H * 0.24, H * 0.27, 0, Math.PI, 0); q.fill();
    q.fillStyle = "rgba(0,0,0,.45)"; q.font = `600 ${52 * s}px 'Instrument Sans', Arial, sans-serif`; q.textAlign = "center"; q.fillText("Your photo here", pw * 0.55, H * 0.93);
  }
  q.globalCompositeOperation = "destination-in";
  const fade = q.createLinearGradient(0, 0, pw * 0.2, 0); fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,1)");
  q.fillStyle = fade; q.fillRect(0, 0, pw, H);
  g.drawImage(ph, px, 0);

  const ink = b.ink, at = (f) => [W * f[0], H * f[1]];
  g.fillStyle = ink; g.strokeStyle = ink; g.textAlign = "center"; g.textBaseline = "middle";
  // name
  if (o.name || o.ghost) {
    g.globalAlpha = o.name ? 1 : 0.35; const [x, y] = at(L.name);
    g.font = `700 ${H * L.name[2]}px Lobster, 'Brush Script MT', cursive`; g.fillText(o.name || "Baby's name", x, y, W * 0.33); g.globalAlpha = 1;
  }
  const serif = (sz) => `italic 700 ${sz}px Lora, Georgia, serif`;
  // calendar
  const dob = /^(\d{4})-(\d{2})-(\d{2})$/.exec(o.dob || "");
  { const [x, y] = at(L.cal), w = W * L.cal[2], h = w * 0.95;
    g.save(); g.translate(x, y); g.rotate(-0.05); g.globalAlpha = dob ? 1 : 0.4;
    g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(-w / 2 + 6 * s, -h / 2 + 8 * s, w, h);
    g.fillStyle = "#fbfbfa"; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = "#555"; g.lineWidth = 2 * s; g.strokeRect(-w / 2, -h / 2, w, h);
    g.fillStyle = "#d8262c"; g.fillRect(-w / 2, -h / 2, w, h * 0.2);
    for (let i = 0; i < 7; i++) { g.fillStyle = "#fff"; g.beginPath(); g.arc(-w / 2 + w * (i + 0.5) / 7, -h / 2 + h * 0.06, 4.5 * s, 0, 7); g.fill(); g.fillStyle = "#222"; g.fillRect(-w / 2 + w * (i + 0.5) / 7 - 1.6 * s, -h / 2 - 9 * s, 3.2 * s, 16 * s); }
    g.fillStyle = "#111"; g.font = `700 ${h * 0.15}px 'Instrument Sans', Arial, sans-serif`; g.fillText(dob ? MONTHS[+dob[2] - 1] : "Month", 0, -h * 0.17);
    g.font = `800 ${h * 0.36}px 'Instrument Sans', Arial, sans-serif`; g.fillText(dob ? String(+dob[3]) : "DD", 0, h * 0.09);
    g.font = `600 ${h * 0.12}px 'Instrument Sans', Arial, sans-serif`; g.fillText(dob ? dob[1] : "YYYY", 0, h * 0.36);
    g.restore(); g.fillStyle = ink; g.strokeStyle = ink; }
  // clock with the hands at the time of birth
  const tm = /^(\d{2}):(\d{2})$/.exec(o.tob || "");
  { const [x, y] = at(L.clock), R = W * L.clock[2]; g.globalAlpha = tm ? 1 : 0.4;
    g.lineWidth = R * 0.07; g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r0 = R * (i % 3 ? 0.84 : 0.76); g.lineWidth = R * (i % 3 ? 0.03 : 0.06); g.beginPath(); g.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0); g.lineTo(x + Math.sin(a) * R * 0.92, y - Math.cos(a) * R * 0.92); g.stroke(); }
    const hh = tm ? +tm[1] % 12 + +tm[2] / 60 : 10, mm = tm ? +tm[2] : 10, hand = (a, l, w) => { g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); g.stroke(); };
    hand(hh * Math.PI / 6, R * 0.5, R * 0.12); hand(mm * Math.PI / 30, R * 0.72, R * 0.08);
    const [tx, ty] = at(L.time); g.font = serif(H * L.time[2]);
    let t = "0:00 Am"; if (tm) { let h12 = +tm[1] % 12 || 12; t = `${h12}:${tm[2]} ${+tm[1] >= 12 ? "Pm" : "Am"}`; }
    g.fillText(t, tx, ty); g.globalAlpha = 1; }
  // weight
  { const [x, y] = at(L.bell), w = W * L.bell[2], wt = (o.weight || "").trim(); g.globalAlpha = wt ? 1 : 0.4;
    g.fillRect(x - w * 0.45, y - w * 0.025, w * 0.9, w * 0.05);
    for (const sx of [-1, 1]) for (const [d, hgt] of [[0.3, 0.36], [0.38, 0.28], [0.45, 0.18]]) { g.beginPath(); g.roundRect(x + sx * w * d - w * 0.03, y - w * hgt / 2, w * 0.06, w * hgt, w * 0.012); g.fill(); }
    const [kx, ky] = at(L.kg); g.font = serif(H * L.kg[2]); g.fillText(wt || "0.0 Kg", kx, ky); g.globalAlpha = 1; }
  // blood group in a drop
  { const [x, y] = at(L.drop), h = H * L.drop[2], bl = (o.blood || "").trim(); g.globalAlpha = bl ? 1 : 0.4;
    g.lineWidth = h * 0.035; g.beginPath(); g.moveTo(x, y - h / 2); g.bezierCurveTo(x + h * 0.08, y - h * 0.25, x + h * 0.36, y - h * 0.02, x + h * 0.34, y + h * 0.17);
    g.arc(x, y + h * 0.17, h * 0.34, 0, Math.PI); g.bezierCurveTo(x - h * 0.36, y - h * 0.02, x - h * 0.08, y - h * 0.25, x, y - h / 2); g.stroke();
    g.font = serif(h * 0.22); g.fillText(bl || "Group", x, y + h * 0.17, h * 0.6); g.globalAlpha = 1; }
  return c;
}

/** wrinkled skin texture for the bump map of the casts */
function skinTexture() {
  const N = 512, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), r = rng(11);
  g.fillStyle = "#808080"; g.fillRect(0, 0, N, N); g.lineCap = "round";
  for (let i = 0; i < 1400; i++) {
    const x = r() * N, y = r() * N, a = r() * Math.PI, l = 6 + r() * 26, dark = r() < 0.6;
    g.strokeStyle = dark ? `rgba(0,0,0,${0.15 + r() * 0.3})` : `rgba(255,255,255,${0.1 + r() * 0.2})`; g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l / 2 + (r() - 0.5) * 6, y + Math.sin(a) * l / 2 + (r() - 0.5) * 6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 2.2); t.userData.mimeType = "image/png"; return t;
}

// Real baby hand scan: "Baby's Hand" by dexterxu-sh (sketchfab.com/dexterxu-sh), CC BY 4.0, reduced to ~66k triangles.
// File layout: uint32 [vertices, indices, 32-bit indices?, scale], int16 xyz * scale (mm), then the indices.
// Oriented fingers +y, palm +z, thumb -x, wrist cut at the bottom.
let SCAN = null;
export async function loadHandScan(url = "assets/models/baby-hand.bin") {
  if (SCAN) return SCAN;
  try {
    const buf = await (await fetch(url)).arrayBuffer(), [n, ni, big, sc] = new Uint32Array(buf, 0, 4);
    const q = new Int16Array(buf, 16, n * 3), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    for (let i = 0; i < n * 3; i++) pos[i] = q[i] / sc;
    const io = 16 + n * 6 + ((n * 6) % 4 ? 2 : 0), idx = big ? new Uint32Array(buf, io, ni) : new Uint16Array(buf, io, ni);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx.slice(), 1));
    geo.rotateX(THREE.MathUtils.degToRad(-9));        // the scan's fingers lift toward the viewer; lay the hand back a little
    for (let i = 0; i < n; i++) { uv[i * 2] = pos[i * 3] / 70 + 0.5; uv[i * 2 + 1] = pos[i * 3 + 1] / 70 + 0.5; }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.computeVertexNormals();
    SCAN = geo;
  } catch (e) { console.warn("Hand scan not loaded, using the modelled hand", e); SCAN = false; }
  return SCAN;
}

const GEO = {};
function castGeometry(kind, mirror) {
  const key = kind + (mirror ? "-m" : "") + (kind === "hand" && SCAN ? "-scan" : "");
  if (GEO[key]) return GEO[key];
  if (kind === "hand" && SCAN) {
    const geo = SCAN.clone();
    if (mirror) { geo.scale(-1, 1, 1); const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } geo.computeVertexNormals(); }
    geo.computeBoundingBox(); const bb = geo.boundingBox, depth = bb.max.z - bb.min.z;
    geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -bb.min.z);
    geo.userData = { len: bb.max.y - bb.min.y, sink: depth * 0.38, shared: true };
    return (GEO[key] = geo);
  }
  const m = meshSdf(kind === "hand" ? handSdf() : footSdf(), kind === "hand" ? HAND_BOUNDS : FOOT_BOUNDS, 0.9, -9, mirror);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(m.positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(m.normals, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(m.uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(m.indices, 1));
  geo.computeBoundingBox();
  const bb = geo.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
  geo.translate(-cx, -cy, -bb.min.z);            // centred, back face on z = 0
  geo.computeBoundingBox(); geo.userData.len = bb.max.y - bb.min.y; geo.userData.shared = true;
  return (GEO[key] = geo);
}

/** one side of the moulding: the profile extruded, each end cut at 45° (from the Paramount engine) */
function sideGeometry(p, outerLen) {
  const shape = new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1, curveSegments: 1 });
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), t = pos.getZ(i) < 0.5 ? -1 : 1, along = t * (outerLen / 2 - x);
    pos.setXYZ(i, along, x, y); uv.setXY(i, (along + outerLen / 2) / 300, (x + y) / 40);
  }
  geo.computeVertexNormals(); return geo;
}
function brushed() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 64; const g = c.getContext("2d"), r = rng(3);
  g.fillStyle = "#e8e8e8"; g.fillRect(0, 0, 1024, 64);
  for (let i = 0; i < 700; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${r() * 0.12})`; g.lineWidth = r() * 1.4 + 0.3; const y = r() * 64; g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y + (r() - 0.5) * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.userData.mimeType = "image/png"; return t;
}

/**
 * The whole shadowbox. o = { wCm, hCm, board, finish, glass, name, dob, tob, weight, blood, img }
 * Returns { group, ow, oh, dispose }.
 */
export function buildShadowbox(o, opts = {}) {
  const iw = o.wCm * 10, ih = o.hCm * 10, ow = iw + 2 * MOULD.W, oh = ih + 2 * MOULD.W;
  const group = new THREE.Group(), own = [];
  const keep = (x) => (own.push(x), x);
  // moulding
  const grain = keep(brushed());
  const mould = keep(new THREE.MeshStandardMaterial({ color: "#101010", roughness: 0.3, metalness: 0.35, map: grain, envMapIntensity: 1.1 }));
  for (const [len, x, y, rot, name] of [[ow, 0, oh / 2, Math.PI, "top"], [oh, ow / 2, 0, Math.PI / 2, "right"], [ow, 0, -oh / 2, 0, "bottom"], [oh, -ow / 2, 0, -Math.PI / 2, "left"]]) {
    const m = new THREE.Mesh(keep(sideGeometry(MOULD.p, len)), mould); m.name = "moulding-" + name; m.rotation.z = rot; m.position.set(x, y, 0);
    m.castShadow = m.receiveShadow = true; group.add(m);
  }
  // inside walls of the box (black) and the thin cream fillet around the board
  const wallMat = keep(new THREE.MeshStandardMaterial({ color: "#1a1918", roughness: 0.8 }));
  const cream = keep(new THREE.MeshStandardMaterial({ color: "#efe6cf", roughness: 0.5 }));
  const depth = MOULD.lip - BOARD_Z;
  for (const [w, h, x, y] of [[iw, 2, 0, ih / 2 + 1], [iw, 2, 0, -ih / 2 - 1], [2, ih + 4, iw / 2 + 1, 0], [2, ih + 4, -iw / 2 - 1, 0]]) {
    const m = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, depth)), wallMat); m.position.set(x, y, BOARD_Z + depth / 2); m.receiveShadow = true; group.add(m);
  }
  const f = 4.5;
  for (const [w, h, x, y] of [[iw, f, 0, ih / 2 - f / 2], [iw, f, 0, -ih / 2 + f / 2], [f, ih, iw / 2 - f / 2, 0], [f, ih, -iw / 2 + f / 2, 0]]) {
    const m = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, 3)), cream); m.position.set(x, y, BOARD_Z + 2.5); m.receiveShadow = true; group.add(m);
  }
  // printed board
  const btex = keep(new THREE.CanvasTexture(drawBoard(o))); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = opts.anisotropy || 1; btex.userData.mimeType = "image/jpeg";
  const board = new THREE.Mesh(keep(new THREE.PlaneGeometry(iw, ih)), keep(new THREE.MeshStandardMaterial({ map: btex, color: 0xe4e4e4, roughness: 0.9, envMapIntensity: 0.6 })));
  board.position.z = BOARD_Z; board.receiveShadow = true; board.name = "board"; group.add(board);
  // back panel sits 3 mm behind the board: surfaces closer than that flicker on phones (depth precision)
  const back = new THREE.Mesh(keep(new THREE.BoxGeometry(iw + 4, ih + 4, BOARD_Z - 3)), wallMat); back.position.z = (BOARD_Z - 3) / 2; group.add(back);
  // casts
  const fin = FINISHES[o.finish] || FINISHES.silver, skin = keep(skinTexture());
  const castMat = keep(new THREE.MeshStandardMaterial({ color: fin.color, metalness: fin.metal, roughness: fin.rough, bumpMap: skin, bumpScale: 1.6, envMapIntensity: 1.0 }));
  for (const [kind, fx, fy, fl, tilt, mirror] of L.casts) {
    const geo = castGeometry(kind, mirror), m = new THREE.Mesh(geo, castMat), k = (fl * ih) / geo.userData.len;
    m.scale.setScalar(k); m.rotation.z = THREE.MathUtils.degToRad(tilt); m.position.set((fx - 0.5) * iw, (0.5 - fy) * ih, BOARD_Z - 0.5 - (geo.userData.sink || 0) * k);
    m.castShadow = true; m.receiveShadow = true; m.name = "cast-" + kind; group.add(m);
  }
  if (o.glass) {
    // slim glass just under the lip: clear, with sharp reflections of the room
    const glassMat = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.08,
      ior: 1.5, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.4, depthWrite: false }));
    const gl = new THREE.Mesh(keep(new THREE.BoxGeometry(iw + 2, ih + 2, GLASS_T)), glassMat);
    gl.position.z = MOULD.lip - GLASS_T / 2 - 0.5; gl.name = "glass"; gl.renderOrder = 2; group.add(gl);
    if (!opts.forExport) {
      // soft diagonal glare streaks, the way light catches framed glass (screen only, not in the AR file)
      const gc = document.createElement("canvas"); gc.width = 1024; gc.height = 512; const g = gc.getContext("2d");
      const band = (x, w, a) => { const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - w, 0, 2 * w, 512); };
      g.save(); g.translate(512, 256); g.rotate(-0.55); g.translate(-512, -256);
      band(330, 150, 0.5); band(470, 40, 0.65); band(760, 90, 0.3); g.restore();
      const gt = keep(new THREE.CanvasTexture(gc)); gt.colorSpace = THREE.SRGBColorSpace;
      const glare = new THREE.Mesh(keep(new THREE.PlaneGeometry(iw, ih)), keep(new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })));
      glare.position.z = MOULD.lip - 0.4; glare.name = "glass-glare"; glare.renderOrder = 3; group.add(glare);
    }
  }
  return { group, ow, oh, iw, ih, dispose: () => own.forEach((x) => x.dispose()) };
}

/** "View on my wall": the frame as a GLB in metres, for the phone's AR viewer. */
export async function shadowboxGlb(o) {
  await loadHandScan();
  const sb = buildShadowbox(o, { forExport: true });
  const root = new THREE.Group(); root.name = "lifeimpressions-shadowbox"; root.scale.setScalar(0.001); root.add(sb.group);
  try { return new Blob([await new GLTFExporter().parseAsync(root, { binary: true, maxTextureSize: 2048 })], { type: "model/gltf-binary" }); }
  finally { sb.dispose(); }
}

export function createViewer(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%", touchAction: "none" });
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 5, 20000);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 120; controls.maxDistance = 5000;
  const key = new THREE.DirectionalLight(0xfff6ea, 2.1); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.8; key.shadow.radius = 4;
  scene.add(key, key.target, new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.45));
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.18 })); wall.receiveShadow = true; scene.add(wall);
  const holder = new THREE.Group(); scene.add(holder);
  let sb = null, view = "front", tween = null;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function update(o, reframe) {
    const first = !sb; if (sb) { holder.clear(); sb.dispose(); }
    sb = buildShadowbox(o, { anisotropy: renderer.capabilities.getMaxAnisotropy() }); holder.add(sb.group);
    const span = Math.max(sb.ow, sb.oh);
    wall.scale.set(span * 6, span * 6, 1); wall.position.z = -0.5;
    key.position.set(span * 0.55, span * 0.75, span * 1.5);
    const sc = key.shadow.camera; sc.left = sc.bottom = -span * 0.7; sc.right = sc.top = span * 0.7; sc.near = 10; sc.far = span * 5; sc.updateProjectionMatrix();
    if (first || reframe) setView(view, !first);
  }
  function setView(name, animate = true) {
    view = name; if (!sb) return;
    const r = Math.max(sb.ow, sb.oh * camera.aspect) / camera.aspect;
    const dist = (Math.max(sb.ow / camera.aspect, sb.oh) / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.2;
    void r;
    const pos = name === "angle" ? new THREE.Vector3(-dist * 0.5, dist * 0.17, dist * 1.08) : name === "side" ? new THREE.Vector3(dist * 0.95, -dist * 0.04, dist * 0.7) : name === "close" ? new THREE.Vector3(-sb.iw * 0.12, sb.ih * 0.1, dist * 0.42) : new THREE.Vector3(0, 0, dist);
    const target = name === "close" ? new THREE.Vector3(-sb.iw * 0.25, 0, 20) : new THREE.Vector3(0, 0, 20);
    tween = { from: camera.position.clone(), to: pos, tf: controls.target.clone(), tt: target, t: animate && !calm ? 0 : 1 };
  }
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(() => { resize(); }); ro.observe(host); resize();
  renderer.setAnimationLoop(() => {
    if (tween) { tween.t = Math.min(1, tween.t + 0.04); const e = 1 - Math.pow(1 - tween.t, 3); camera.position.lerpVectors(tween.from, tween.to, e); controls.target.lerpVectors(tween.tf, tween.tt, e); if (tween.t >= 1) tween = null; }
    controls.update(); renderer.render(scene, camera);
  });
  controls.addEventListener("start", () => { tween = null; });
  return { update, setView, setSpin(on) { controls.autoRotate = on; controls.autoRotateSpeed = 1.2; }, resize, renderer };
}
