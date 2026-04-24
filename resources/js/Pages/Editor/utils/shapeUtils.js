/**
 * num — safely convert a value to a finite number, falling back to `d`.
 */
export const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/**
 * pointsToPath — convert a flat points array [x0,y0, x1,y1, ...] to an SVG path string.
 */
export function pointsToPath(points) {
  if (!Array.isArray(points) || points.length < 2) return "";
  const p = points.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (p.length < 2) return "";
  let path = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length; i += 2) {
    if (!Number.isFinite(p[i]) || !Number.isFinite(p[i + 1])) continue;
    path += ` L${p[i]} ${p[i + 1]}`;
  }
  path += " Z";
  return path;
}
