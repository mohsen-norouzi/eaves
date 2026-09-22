// Centimetre-like world units preserve the spacing of the original ink curtain.
export const SEGMENT = 12;
export function makeRopes3D(scene, anchorAt) {
  return Array.from({ length: scene.count }, (_, i) => {
    const u = i / (scene.count - 1),
      anchor = anchorAt(u);
    return {
      seed: i,
      anchor,
      nodes: Array.from(
        { length: Math.floor(scene.length(u, i) / SEGMENT) },
        (_, j) => ({
          x: anchor.x,
          y: anchor.y - j * SEGMENT,
          z: anchor.z,
          px: anchor.x,
          py: anchor.y - j * SEGMENT,
          pz: anchor.z,
        }),
      ),
    };
  });
}
export function stepRopes3D(ropes, pointer, time, wind = true) {
  for (const rope of ropes) {
    const ns = rope.nodes;
    for (let j = 1; j < ns.length; j++) {
      const p = ns[j],
        vx = (p.x - p.px) * 0.962,
        vy = (p.y - p.py) * 0.962,
        vz = (p.z - p.pz) * 0.956;
      p.px = p.x;
      p.py = p.y;
      p.pz = p.z;
      p.x +=
        vx +
        (wind
          ? Math.sin(time * 0.0006 + rope.seed * 0.38 + j * 0.11) * 0.023
          : 0);
      p.y += vy - 0.22;
      p.z +=
        vz +
        (wind
          ? Math.cos(time * 0.0008 + rope.seed * 0.21 + j * 0.1) * 0.035
          : 0);
      if (pointer?.active) {
        const dx = p.x - pointer.x,
          dy = p.y - pointer.y,
          d = Math.hypot(dx, dy);
        if (d < 105) {
          const f = (1 - d / 105) ** 2;
          p.x +=
            ((dx / Math.max(d, 1)) * 2 +
              Math.max(-26, Math.min(26, pointer.vx)) * 0.19) *
            f;
          p.y +=
            (dy / Math.max(d, 1) +
              Math.max(-18, Math.min(18, pointer.vy)) * 0.06) *
            f;
          p.z += (1.2 + Math.min(3, Math.abs(pointer.vx) * 0.1)) * f;
        }
      }
    }
    for (let it = 0; it < 8; it++) {
      Object.assign(ns[0], rope.anchor);
      for (let j = 1; j < ns.length; j++) {
        const a = ns[j - 1],
          b = ns[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          dz = b.z - a.z,
          d = Math.hypot(dx, dy, dz) || 1,
          e = (d - SEGMENT) / d;
        if (j === 1) {
          b.x -= dx * e;
          b.y -= dy * e;
          b.z -= dz * e;
        } else {
          a.x += dx * e * 0.5;
          a.y += dy * e * 0.5;
          a.z += dz * e * 0.5;
          b.x -= dx * e * 0.5;
          b.y -= dy * e * 0.5;
          b.z -= dz * e * 0.5;
        }
      }
    }
    Object.assign(ns[0], rope.anchor);
  }
}
