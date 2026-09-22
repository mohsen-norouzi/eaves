import * as T from 'three';
import { poem } from '../scenes';
import { makeRopes3D, stepRopes3D } from './ropes3d';

export function createInkCurtain(scene, anchorAt) {
  const ropes = makeRopes3D(scene, anchorAt),
    glyphs = [...new Set(poem)],
    cells = 8,
    cell = 64;
  const atlas = document.createElement('canvas');
  atlas.width = atlas.height = cells * cell;
  const ctx = atlas.getContext('2d');
  ctx.font = '43px "Songti SC", "Noto Serif CJK SC", "SimSun", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  glyphs.forEach((c, i) =>
    ctx.fillText(
      c,
      ((i % cells) + 0.5) * cell,
      (Math.floor(i / cells) + 0.5) * cell,
    ),
  );
  const stamp = glyphs.length;
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.strokeRect(
    (stamp % cells) * cell + 12,
    Math.floor(stamp / cells) * cell + 7,
    40,
    50,
  );
  ctx.font = '32px serif';
  ctx.fillText(
    '靜',
    ((stamp % cells) + 0.5) * cell,
    (Math.floor(stamp / cells) + 0.5) * cell,
  );
  const texture = new T.CanvasTexture(atlas);
  texture.anisotropy = 4;
  const count = ropes.reduce((n, r) => n + r.nodes.length - 1, 0),
    positions = new Float32Array(count * 18),
    uvs = [],
    colors = [],
    alphas = [];
  const glyphIndex = Object.fromEntries(glyphs.map((c, i) => [c, i]));
  const corners = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ],
    records = [];
  for (const r of ropes)
    for (let j = 1; j < r.nodes.length; j++) {
      const isStamp = r.seed % 11 === 3 && j === r.nodes.length - 7;
      const index = isStamp
          ? stamp
          : glyphIndex[poem[(r.seed * 7 + j) % poem.length]],
        col = index % cells,
        row = Math.floor(index / cells);
      for (const [x, y] of corners) {
        uvs.push((col + (x + 1) / 2) / cells, 1 - (row + (1 - y) / 2) / cells);
        colors.push(
          ...(isStamp ? [0.34, 0.075, 0.027] : [0.095, 0.084, 0.063]),
        );
        alphas.push(
          (0.64 + 0.12 * Math.sin(r.seed * 1.7)) *
            Math.min(1, (r.nodes.length - j) / 10),
        );
      }
      records.push({ rope: r, j });
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute(
    'position',
    new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage),
  );
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('inkColor', new T.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('inkAlpha', new T.Float32BufferAttribute(alphas, 1));
  const material = new T.ShaderMaterial({
    uniforms: { atlas: { value: texture } },
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    vertexShader:
      'attribute vec3 inkColor; attribute float inkAlpha; varying vec2 vUv; varying vec3 vColor; varying float vAlpha; void main(){vUv=uv;vColor=inkColor;vAlpha=inkAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:
      'uniform sampler2D atlas; varying vec2 vUv; varying vec3 vColor; varying float vAlpha; void main(){float alpha=texture2D(atlas,vUv).a*vAlpha;if(alpha<0.01)discard;gl_FragColor=vec4(vColor,alpha);\n#include <colorspace_fragment>\n}',
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const group = new T.Group();
  group.add(mesh);
  const threadPositions = new Float32Array(count * 6),
    threadGeometry = new T.BufferGeometry();
  threadGeometry.setAttribute(
    'position',
    new T.BufferAttribute(threadPositions, 3).setUsage(T.DynamicDrawUsage),
  );
  const threads = new T.LineSegments(
    threadGeometry,
    new T.LineBasicMaterial({
      color: '#746b59',
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
    }),
  );
  threads.frustumCulled = false;
  group.add(threads);
  const projected = ropes.map((r) => ({
    seed: r.seed,
    nodes: r.nodes.map(() => ({ x: 0, y: 0 })),
  }));
  const v = new T.Vector3();
  function update(time, simulate, pointer, reduced) {
    if (simulate) stepRopes3D(ropes, pointer, time, !reduced);
    let k = 0,
      t = 0;
    for (const { rope, j } of records) {
      const p = rope.nodes[j],
        a = rope.nodes[j - 1],
        dx = p.x - a.x,
        dy = p.y - a.y,
        d = Math.hypot(dx, dy) || 1;
      const twist = Math.max(-0.55, Math.min(0.55, (p.z - a.z) * 0.045));
      const right = {
          x: (-dy / d) * Math.cos(twist),
          y: dx / d,
          z: Math.sin(twist),
        },
        up = { x: -dx / d, y: -dy / d, z: 0 };
      const size = 7.5;
      for (const [x, y] of corners) {
        positions[k++] = p.x + (right.x * x + up.x * y) * size;
        positions[k++] = p.y + (right.y * x + up.y * y) * size;
        positions[k++] = p.z + (right.z * x + up.z * y) * size;
      }
      threadPositions[t++] = a.x;
      threadPositions[t++] = a.y;
      threadPositions[t++] = a.z;
      threadPositions[t++] = p.x;
      threadPositions[t++] = p.y;
      threadPositions[t++] = p.z;
    }
    geometry.attributes.position.needsUpdate = true;
    threadGeometry.attributes.position.needsUpdate = true;
  }
  function project(camera, width, height) {
    ropes.forEach((r, i) =>
      r.nodes.forEach((p, j) => {
        v.set(p.x, p.y, p.z);
        group.localToWorld(v);
        v.project(camera);
        projected[i].nodes[j].x = ((v.x + 1) * width) / 2;
        projected[i].nodes[j].y = ((1 - v.y) * height) / 2;
      }),
    );
    return projected;
  }
  update(0, false, null, false);
  return { group, ropes, update, project, dispose: () => texture.dispose() };
}
