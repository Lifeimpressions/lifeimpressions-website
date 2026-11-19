/**
 * Baby hand and foot casts as real 3D surfaces.
 * Each cast is a signed distance field (palm, fingers, heel, toes blended together) turned into a mesh
 * with surface nets. Plain JS with no three.js import, so it can be tested in Node.
 * Units: millimetres. Hands: fingers point +y, palm faces +z. Feet: toes point +y, sole faces +z.
 */

const len = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function ellipsoid(px, py, pz, c, r) {
  const x = px - c[0], y = py - c[1], z = pz - c[2];
  const k0 = len(x / r[0], y / r[1], z / r[2]), k1 = len(x / (r[0] * r[0]), y / (r[1] * r[1]), z / (r[2] * r[2]));
  return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1;
}
/** capsule whose radius goes from ra (at a) to rb (at b) */
function cone(px, py, pz, a, b, ra, rb) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const x = px - a[0], y = py - a[1], z = pz - a[2];
  const h = clamp((x * bx + y * by + z * bz) / (bx * bx + by * by + bz * bz), 0, 1);
  return len(x - bx * h, y - by * h, z - bz * h) - (ra + (rb - ra) * h);
}
const rad = (d) => (d * Math.PI) / 180;

/** a two-joint digit: starts at base, leans sideways by `spread`°, curls toward +z by c1° then c2° */
function digit(base, spread, lens, r0, r1, c1, c2, lean = [0, 1, 0]) {
  const s = rad(spread);
  // starting direction: lean vector rotated around z by spread
  let dx = lean[0] * Math.cos(s) - lean[1] * Math.sin(s), dy = lean[0] * Math.sin(s) + lean[1] * Math.cos(s), dz = lean[2];
  const n = len(dx, dy, dz); dx /= n; dy /= n; dz /= n;
  const bend = (d, ang) => { // tilt the direction toward +z
    const h = len(d[0], d[1], 0) || 1, el = Math.atan2(d[2], h) + rad(ang);
    return [d[0] / h * Math.cos(el), d[1] / h * Math.cos(el), Math.sin(el)];
  };
  const d1 = bend([dx, dy, dz], c1), d2 = bend([dx, dy, dz], c1 + c2);
  const j1 = [base[0] + d1[0] * lens[0], base[1] + d1[1] * lens[0], base[2] + d1[2] * lens[0]];
  const tip = [j1[0] + d2[0] * lens[1], j1[1] + d2[1] * lens[1], j1[2] + d2[2] * lens[1]];
  const rm = (r0 + r1) / 2;
  return [[base, j1, r0, rm], [j1, tip, rm * 0.97, r1]];
}

/** right hand seen palm-up (thumb on -x). mirror=true gives the left hand. */
export function handSdf() {
  const segs = [
    ...digit([-12.5, 19, 1], 9, [13, 11], 5.7, 4.7, 8, 16),
    ...digit([-3.8, 21, 1.5], 2, [14.5, 12], 6, 4.9, 6, 14),
    ...digit([5, 20, 1], -5, [13.5, 11], 5.6, 4.5, 8, 16),
    ...digit([13, 16, 0.5], -14, [10.5, 9], 5, 4, 10, 18),
  ];
  const thumb = digit([-17, -6, 3], 52, [12, 11], 7, 5.4, 14, 10);
  return (x, y, z) => {
    let d = ellipsoid(x, y, z, [0, 1, 0], [21, 23, 10.5]);
    d = smin(d, cone(x, y, z, [0, -46, -2], [0, -14, -1], 14.5, 16), 8);
    d = smin(d, ellipsoid(x, y, z, [-13, -10, 4], [9, 11, 8]), 6);      // thumb pad
    d = smin(d, ellipsoid(x, y, z, [12, -8, 2], [8, 12, 7]), 6);        // heel of the hand
    let f = 1e9;
    for (const [a, b, ra, rb] of segs) f = Math.min(f, cone(x, y, z, a, b, ra, rb));
    d = smin(d, f, 4.5);
    for (const [a, b, ra, rb] of thumb) d = smin(d, cone(x, y, z, a, b, ra, rb), 5);
    d = Math.max(d, -(y + 44));          // flat cut at the wrist
    return d;
  };
}
export const HAND_BOUNDS = { min: [-42, -46, -14], max: [32, 52, 22] };

/** right foot seen sole-up (big toe on -x). */
export function footSdf() {
  const toes = [[[-11, 21, 1], [-12.5, 35, 3.5], 7.6, 7.2], [[-1.5, 23, 1], [-1.5, 33.5, 3], 5.3, 5], [[5.5, 22, 1], [6.8, 30.5, 2.5], 4.9, 4.6],
    [[11.5, 19, 0.5], [13.5, 26.5, 2], 4.5, 4.2], [[16.5, 14, 0], [18.6, 20.5, 1.5], 4, 3.8]];
  return (x, y, z) => {
    let d = ellipsoid(x, y, z, [2, -38, 0], [15, 16, 13]);
    d = smin(d, ellipsoid(x, y, z, [1, -12, -1], [14.5, 21, 11]), 10);
    d = smin(d, ellipsoid(x, y, z, [-1, 13, 0], [19.5, 12.5, 11]), 10);
    d = smin(d, cone(x, y, z, [1, -32, -6], [1, -28, -40], 16, 17), 10);   // ankle, runs back into the board
    let t = 1e9;
    for (const [a, b, ra, rb] of toes) t = Math.min(t, cone(x, y, z, a, b, ra, rb));
    d = smin(d, t, 3.2);
    return d;
  };
}
export const FOOT_BOUNDS = { min: [-32, -56, -14], max: [34, 46, 18] };

/**
 * Surface nets over sdf inside bounds, clipped flat at z = zCut (the side that sits on the board).
 * Returns { positions, normals, uvs, indices } as typed arrays.
 */
export function meshSdf(sdf0, bounds, step = 1, zCut = -1e9, mirror = false) {
  const sdf = (x, y, z) => Math.max(sdf0(mirror ? -x : x, y, z), zCut - z);
  const mn = bounds.min.slice(), mx = bounds.max.slice();
  if (mirror) { const a = -mx[0], b = -mn[0]; mn[0] = a; mx[0] = b; }
  for (let i = 0; i < 3; i++) { mn[i] -= step * 2; mx[i] += step * 2; }
  const nx = Math.ceil((mx[0] - mn[0]) / step) + 1, ny = Math.ceil((mx[1] - mn[1]) / step) + 1, nz = Math.ceil((mx[2] - mn[2]) / step) + 1;
  const v = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[id(i, j, k)] = sdf(mn[0] + i * step, mn[1] + j * step, mn[2] + k * step);
  const cell = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const P = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { cv[c] = v[id(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]; if (cv[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      if ((cv[a] < 0) === (cv[b] < 0)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      sx += (a & 1) + (((b & 1) - (a & 1)) * t); sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * t); sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * t); n++;
    }
    cell[cid(i, j, k)] = P.length / 3;
    P.push(mn[0] + (i + sx / n) * step, mn[1] + (j + sy / n) * step, mn[2] + (k + sz / n) * step);
  }
  const I = [];
  const quad = (a, b, c, d) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; I.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const s0 = v[id(i, j, k)] < 0;
    if (i < nx - 1 && s0 !== (v[id(i + 1, j, k)] < 0)) {
      const q = [cell[cid(i, j - 1, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i, j - 1, k)]];
      s0 ? quad(...q) : quad(q[3], q[2], q[1], q[0]);
    }
    if (j < ny - 1 && s0 !== (v[id(i, j + 1, k)] < 0)) {
      const q = [cell[cid(i - 1, j, k - 1)], cell[cid(i - 1, j, k)], cell[cid(i, j, k)], cell[cid(i, j, k - 1)]];
      s0 ? quad(...q) : quad(q[3], q[2], q[1], q[0]);
    }
    if (k < nz - 1 && s0 !== (v[id(i, j, k + 1)] < 0)) {
      const q = [cell[cid(i - 1, j - 1, k)], cell[cid(i, j - 1, k)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)]];
      s0 ? quad(...q) : quad(q[3], q[2], q[1], q[0]);
    }
  }
  const positions = new Float32Array(P), normals = new Float32Array(P.length), uvs = new Float32Array((P.length / 3) * 2);
  const e = step * 0.5;
  for (let p = 0; p < P.length; p += 3) {
    const x = P[p], y = P[p + 1], z = P[p + 2];
    let gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const g = len(gx, gy, gz) || 1; normals[p] = gx / g; normals[p + 1] = gy / g; normals[p + 2] = gz / g;
    uvs[(p / 3) * 2] = x / 70 + 0.5; uvs[(p / 3) * 2 + 1] = y / 70 + 0.5;
  }
  return { positions, normals, uvs, indices: positions.length / 3 > 65535 ? new Uint32Array(I) : new Uint16Array(I) };
}
