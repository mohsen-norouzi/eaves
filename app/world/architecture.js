import * as T from 'three';

export const roofProfiles = {
  silence: {
    width: 940,
    depth: 340,
    height: 285,
    x: 310,
    y: 105,
    kind: 'gable',
    bell: -1,
    tree: -420,
  },
  whisper: {
    width: 1010,
    depth: 280,
    height: 135,
    x: 295,
    y: 112,
    kind: 'arch',
    bell: 1,
    tree: -430,
  },
  sky: {
    width: 1030,
    depth: 410,
    height: 275,
    x: -230,
    y: 84,
    kind: 'hip',
    bell: 0,
    tree: 220,
  },
  landscape: {
    width: 660,
    depth: 310,
    height: 180,
    x: 390,
    y: 140,
    kind: 'tier',
    bell: 1,
    tree: -110,
  },
  rain: {
    width: 750,
    depth: 250,
    height: 105,
    x: -240,
    y: 165,
    kind: 'sweep',
    bell: 1,
    tree: -610,
  },
  memory: {
    width: 1240,
    depth: 230,
    height: 78,
    x: 525,
    y: 170,
    kind: 'long',
    bell: -1,
    tree: -385,
  },
  journey: {
    width: 610,
    depth: 260,
    height: 95,
    x: 245,
    y: 145,
    kind: 'gate',
    bell: 0,
    tree: 565,
  },
};
export function roofPoint(p, u, v) {
  const edge = Math.abs(u),
    slope = Math.abs(v);
  const hip = ['hip', 'gable'].includes(p.kind)
    ? 1 - 0.88 * edge ** 1.3
    : 1 - 0.15 * edge ** 3;
  let y = p.height * (1 - slope) ** 1.75 * hip + 34 * edge ** 7 * slope ** 1.5;
  if (p.kind === 'arch') y += 154 * Math.exp(-u * u * 5.8) * slope ** 6;
  if (p.kind === 'sweep' || p.kind === 'tier')
    y += 20 * u * slope + 20 * edge ** 6;
  return new T.Vector3((u * p.width) / 2, y, (v * p.depth) / 2);
}
const clayColors = ['#41443f', '#464942', '#4a4b44', '#42453f', '#3e423d'];
function material(color, roughness = 0.9, metalness = 0) {
  return new T.MeshStandardMaterial({ color, roughness, metalness });
}
function mesh(g, mat, parent, pos, scale) {
  const m = new T.Mesh(g, mat);
  if (pos) m.position.copy(pos);
  if (scale) m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function beam(parent, a, b, r, mat) {
  const delta = b.clone().sub(a);
  const m = mesh(
    new T.CylinderGeometry(r * 0.78, r, delta.length(), 6),
    mat,
    parent,
    a.clone().add(b).multiplyScalar(0.5),
  );
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  return m;
}
function curve(parent, pts, r, mat) {
  return mesh(
    new T.TubeGeometry(
      new T.CatmullRomCurve3(pts),
      Math.max(24, pts.length * 2),
      r,
      6,
      false,
    ),
    mat,
    parent,
  );
}
function box(parent, w, h, d, x, y, z, mat) {
  return mesh(new T.BoxGeometry(w, h, d), mat, parent, new T.Vector3(x, y, z));
}
function roofShell(p) {
  const g = new T.BufferGeometry(),
    positions = [],
    uvs = [],
    indices = [],
    nx = 64,
    nz = 28;
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const v = roofPoint(p, (i / nx) * 2 - 1, (j / nz) * 2 - 1);
      positions.push(v.x, v.y, v.z);
      uvs.push(i / nx, j / nz);
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i,
        b = a + 1,
        c = a + nx + 1,
        d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function makeRoof(p, mats) {
  const root = new T.Group();
  mesh(roofShell(p), mats.surface, root);
  const transforms = [],
    colors = [],
    obj = new T.Object3D(),
    up = new T.Vector3(0, 1, 0);
  const rows = Math.round(p.width / 17),
    segments = 11;
  for (let i = 0; i <= rows; i++)
    for (const side of [-1, 1])
      for (let j = 0; j < segments; j++) {
        const u = (i / rows) * 2 - 1,
          a = roofPoint(p, u, (side * j) / segments),
          b = roofPoint(p, u, (side * (j + 1)) / segments),
          delta = b.clone().sub(a);
        obj.position.copy(a).add(b).multiplyScalar(0.5);
        obj.position.y += 1;
        obj.quaternion.setFromUnitVectors(up, delta.clone().normalize());
        obj.scale.set(8, delta.length() + 1.4, 8);
        obj.updateMatrix();
        transforms.push(obj.matrix.clone());
        colors.push(
          new T.Color(clayColors[(i * 7 + j * 3) % clayColors.length]),
        );
      }
  const tiles = new T.InstancedMesh(
    new T.CylinderGeometry(0.88, 1, 1, 12),
    mats.tile,
    transforms.length,
  );
  transforms.forEach((m, i) => {
    tiles.setMatrixAt(i, m);
    tiles.setColorAt(i, colors[i]);
  });
  tiles.castShadow = true;
  tiles.receiveShadow = true;
  root.add(tiles);
  // Round tile ends and their incised centre make the silhouette read as ceramic.
  const ends = new T.InstancedMesh(
    new T.TorusGeometry(4.2, 1.1, 4, 10),
    mats.edge,
    (rows + 1) * 2,
  );
  let k = 0;
  for (let i = 0; i <= rows; i++)
    for (const side of [-1, 1]) {
      obj.position.copy(roofPoint(p, (i / rows) * 2 - 1, side));
      obj.rotation.set(0, 0, 0);
      obj.scale.setScalar(1);
      obj.updateMatrix();
      ends.setMatrixAt(k++, obj.matrix);
    }
  root.add(ends);
  for (const side of [-1, 1]) {
    const pts = Array.from({ length: 45 }, (_, i) =>
      roofPoint(p, (i / 44) * 2 - 1, side),
    );
    curve(
      root,
      pts.map((v) => v.clone().add(new T.Vector3(0, -7, 0))),
      5,
      mats.edge,
    );
    curve(
      root,
      pts.map((v) => v.clone().add(new T.Vector3(0, -12, -side * 4))),
      9,
      mats.wood,
    );
  }
  const ridge = Array.from({ length: 33 }, (_, i) =>
    roofPoint(p, (i / 32) * 2 - 1, 0).add(new T.Vector3(0, 10, 0)),
  );
  curve(root, ridge, 10, mats.edge);
  curve(
    root,
    ridge.map((v) => v.clone().add(new T.Vector3(0, 11, 0))),
    4,
    mats.tile,
  );
  box(root, p.width * 0.88, 22, 20, 0, -27, -p.depth * 0.34, mats.wood);
  curve(
    root,
    Array.from({ length: 45 }, (_, i) =>
      roofPoint(p, ((i / 44) * 2 - 1) * 0.9, 1).add(new T.Vector3(0, -23, -14)),
    ),
    10,
    mats.wood,
  );
  curve(
    root,
    Array.from({ length: 45 }, (_, i) =>
      roofPoint(p, ((i / 44) * 2 - 1) * 0.9, 1).add(new T.Vector3(0, -15, -10)),
    ),
    3,
    mats.woodLight,
  );
  if (p.kind === 'arch')
    box(root, p.width * 0.88, 15, 20, 0, -30, p.depth * 0.49, mats.wood);
  const brackets = Math.round(p.width / 65);
  for (let i = 0; i <= brackets; i++) {
    const x = (i / brackets - 0.5) * p.width * 0.86,
      y = roofPoint(p, x / (p.width / 2), 1).y;
    box(root, 22, 27, 54, x, y - 45, p.depth * 0.33, mats.wood);
    box(root, 37, 10, 67, x, y - 28, p.depth * 0.37, mats.woodLight);
    box(root, 13, 12, 50, x, y - 14, p.depth * 0.33, mats.wood);
    const cap = mesh(
      new T.CylinderGeometry(6, 6, 3, 12),
      mats.gold,
      root,
      new T.Vector3(x, y - 32, p.depth * 0.455),
    );
    cap.rotation.x = Math.PI / 2;
  }
  if (p.kind === 'gable') {
    const points = Array.from({ length: 25 }, (_, i) => {
      const u = (i / 24) * 2 - 1;
      return new T.Vector3(
        u * p.width * 0.29,
        22 + 165 * (1 - Math.abs(u)) ** 1.55,
        p.depth * 0.5 - 12,
      );
    });
    const shape = new T.Shape();
    shape.moveTo(points[0].x, 5);
    points.forEach((v) => shape.lineTo(v.x, v.y));
    shape.lineTo(points.at(-1).x, 5);
    shape.closePath();
    mesh(
      new T.ExtrudeGeometry(shape, { depth: 14, bevelEnabled: false }),
      mats.wood,
      root,
      new T.Vector3(0, 0, p.depth * 0.5 - 28),
    );
    curve(root, points, 12, mats.edge);
    curve(
      root,
      points.map((v) => v.clone().add(new T.Vector3(0, -12, 3))),
      2,
      mats.gold,
    );
    for (let i = -2; i <= 2; i++) {
      const diamond = mesh(
        new T.TorusGeometry(7, 1.2, 4, 4),
        mats.gold,
        root,
        new T.Vector3(i * 31, 105 - Math.abs(i) * 28, p.depth * 0.5 + 1),
      );
      diamond.rotation.z = Math.PI / 4;
    }
  }
  if (p.kind === 'hip') {
    for (let i = 0; i < 4; i++)
      mesh(
        new T.SphereGeometry(10 - i * 1.8, 10, 8),
        mats.edge,
        root,
        new T.Vector3(0, p.height + 24 + i * 15, 0),
        [1, 0.65, 1],
      );
    mesh(
      new T.ConeGeometry(5, 28, 8),
      mats.gold,
      root,
      new T.Vector3(0, p.height + 88, 0),
    );
  }
  return root;
}
function tree(parent, x, y, z, mats, blossom = false) {
  const root = new T.Group();
  root.position.set(x, y, z);
  parent.add(root);
  const rand = (i) => (Math.sin(i * 123.41 + 19.2) * 43758.5) % 1;
  beam(root, new T.Vector3(0, 0, 0), new T.Vector3(-8, 210, 4), 7, mats.bark);
  for (let i = 0; i < 18; i++) {
    const start = new T.Vector3(-i * 0.35, 40 + i * 9, 0),
      angle = i * 2.4;
    const end = new T.Vector3(
      Math.cos(angle) * (35 + Math.abs(rand(i)) * 65),
      100 + i * 9,
      Math.sin(angle) * 38,
    );
    const mid = start.clone().lerp(end, 0.6);
    mid.y -= 15;
    curve(root, [start, mid, end], i < 8 ? 2 : 1.2, mats.bark);
    const twig = end
      .clone()
      .add(
        new T.Vector3(Math.cos(angle + 1) * 25, 27, Math.sin(angle + 1) * 15),
      );
    beam(root, end, twig, 0.8, mats.bark);
    if (blossom)
      for (let j = 0; j < 4; j++)
        mesh(
          new T.SphereGeometry(2.1, 5, 4),
          mats.red,
          root,
          end.clone().lerp(twig, j / 3),
        );
  }
}
export function createArchitecture(scene) {
  const p = roofProfiles[scene.id],
    group = new T.Group();
  group.name = scene.id;
  const mats = {
    tile: material('#ffffff'),
    surface: material('#41443f'),
    edge: material('#3d413b'),
    wood: material('#514031'),
    woodLight: material('#86704e'),
    gold: material('#a68b57', 0.6, 0.2),
    stone: material('#989487'),
    bark: material('#514e41'),
    cloth: material('#393d36'),
    paper: material('#d6c7a6'),
    red: material('#a34e36'),
  };
  const grainSize = 64,
    data = new Uint8Array(grainSize * grainSize * 4);
  for (let i = 0; i < grainSize * grainSize; i++) {
    const n = Math.sin(i * 127.1 + 19.3) * 43758.5453,
      value = 145 + Math.floor((n - Math.floor(n)) * 90);
    data.set([value, value, value, 255], i * 4);
  }
  const grain = new T.DataTexture(data, grainSize, grainSize, T.RGBAFormat);
  grain.wrapS = grain.wrapT = T.RepeatWrapping;
  grain.repeat.set(8, 6);
  grain.needsUpdate = true;
  for (const key of ['tile', 'surface', 'wood', 'woodLight', 'stone']) {
    mats[key].roughnessMap = grain;
    mats[key].bumpMap = grain;
    mats[key].bumpScale = key === 'wood' ? 0.7 : 0.28;
  }
  mats.surface.side = T.DoubleSide;
  const roof = makeRoof(p, mats);
  roof.position.set(p.x, p.y, 0);
  group.add(roof);
  if (p.kind === 'tier') {
    const upper = makeRoof(
      {
        ...p,
        width: p.width * 0.68,
        depth: p.depth * 0.7,
        height: p.height * 0.65,
        kind: 'sweep',
      },
      mats,
    );
    upper.position.set(p.x + 20, p.y + 140, -65);
    group.add(upper);
  }
  if (p.kind === 'gate') {
    for (const side of [-1, 1]) {
      const x = p.x + side * p.width * 0.34;
      box(group, 29, 520, 35, x, p.y - 290, 15, mats.woodLight);
      box(group, 49, 25, 62, x, -405, 15, mats.stone);
    }
    for (let i = 0; i < 3; i++)
      box(
        group,
        p.width * 0.8 + i * 28,
        9,
        100 + i * 26,
        p.x,
        -421 - i * 9,
        45,
        mats.stone,
      );
  }
  if (['long', 'gate'].includes(p.kind))
    tree(group, p.tree, -420, 20, mats, p.kind === 'gate');
  if (p.kind === 'long') {
    box(group, 160, 15, 42, -225, -395, 45, mats.stone);
    for (const x of [-280, -170])
      box(group, 20, 28, 30, x, -413, 45, mats.stone);
  }
  for (let i = 0; i < (['long', 'gate'].includes(p.kind) ? 9 : 0); i++) {
    const rock = mesh(
      new T.DodecahedronGeometry(1, 0),
      mats.stone,
      group,
      new T.Vector3(
        p.tree + Math.sin(i * 2.5) * 85,
        -427,
        35 + Math.cos(i * 2.4) * 35,
      ),
      [8 + (i % 3) * 6, 5 + (i % 4) * 5, 8 + (i % 3) * 6],
    );
    rock.rotation.set(i * 0.8, i * 1.2, 0);
  }
  for (let i = 0; i < 7; i++)
    mesh(
      new T.CylinderGeometry(9, 11, 3, 7),
      mats.stone,
      group,
      new T.Vector3(
        p.x - 230 + Math.sin(i * 1.2) * 15 - i * 14,
        -434,
        110 + i * 42,
      ),
      [1.5, 1, 1],
    );
  const pendulums = [];
  if (p.bell) {
    const u = p.bell * 0.89,
      point = roofPoint(p, u, 1),
      g = new T.Group();
    g.position.set(p.x + point.x, p.y + point.y - 5, point.z);
    group.add(g);
    beam(g, new T.Vector3(), new T.Vector3(0, -115, 0), 0.65, mats.edge);
    const profile = [
      new T.Vector2(14, -142),
      new T.Vector2(13, -138),
      new T.Vector2(8, -135),
      new T.Vector2(7, -119),
      new T.Vector2(3, -115),
    ];
    mesh(new T.LatheGeometry(profile, 20), mats.edge, g);
    beam(
      g,
      new T.Vector3(0, -140, 0),
      new T.Vector3(0, -170, 0),
      0.6,
      mats.edge,
    );
    box(g, 9, 47, 1, 0, -193, 0, mats.paper);
    pendulums.push(g);
  }
  const anchorAt = (u) => {
    const x = scene.x1 + (scene.x2 - scene.x1) * u - 960;
    const roofU = (x - p.x) / (p.width / 2),
      edge = roofPoint(p, roofU, 1);
    return {
      x,
      y: p.y + (p.kind === 'arch' ? -60 : edge.y - 60),
      z: p.depth / 2 - 6 + (Math.floor(u * scene.count) % 3) * 3,
    };
  };
  return { group, anchorAt, pendulums, profile: p };
}
export function disposeObject(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m) {
        materials.add(m);
        for (const value of Object.values(m))
          if (value?.isTexture) textures.add(value);
      }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
