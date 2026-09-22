import * as T from 'three';

// Quiet silhouettes surround the lane, so the landscape still has depth when walking.
function mountainRing(radius, height, phase, color, opacity) {
  const positions = [],
    heights = [],
    indices = [];
  const count = 88;
  for (let i = 0; i <= count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const ridge =
      height *
      (0.48 +
        0.24 * Math.sin(angle * 3 + phase) +
        0.16 * Math.cos(angle * 7 - phase) +
        0.09 * Math.sin(angle * 19 + phase));
    const x = Math.sin(angle) * radius,
      z = -35 - Math.cos(angle) * radius;
    positions.push(x, -2, z, x, ridge, z);
    heights.push(0, ridge);
    if (i < count) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute(
    'ridgeHeight',
    new T.Float32BufferAttribute(heights, 1),
  );
  geometry.setIndex(indices);
  const material = new T.ShaderMaterial({
    uniforms: {
      ink: { value: new T.Color(color) },
      strength: { value: opacity },
    },
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    vertexShader: `attribute float ridgeHeight; varying float vHeight;
      void main(){vHeight=ridgeHeight;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 ink; uniform float strength; varying float vHeight;
      void main(){gl_FragColor=vec4(ink,strength*smoothstep(0.0,22.0,vHeight));
      #include <colorspace_fragment>
      }`,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.name = 'Mist-softened mountain ridge';
  return mesh;
}

function stoneMaterial() {
  const material = new T.MeshStandardMaterial({
    color: '#a29883',
    roughness: 1,
    flatShading: true,
    transparent: true,
    depthWrite: false,
  });
  // Fade the bases into ground mist instead of adding moving fog particles.
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying float groundHeight;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n groundHeight=(modelMatrix*vec4(position,1.0)).y;',
    );
    shader.fragmentShader =
      'varying float groundHeight;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      '#include <dithering_fragment>\n gl_FragColor.a*=mix(0.08,1.0,smoothstep(0.0,0.65,groundHeight));',
    );
  };
  return material;
}

export function createEnvironment() {
  const group = new T.Group();
  group.name = 'Mountains, sun and stone garden';
  const layers = [
    [205, 66, 0.4, '#b5aa95', 0.42],
    [156, 40, 2.1, '#b1a892', 0.4],
    [110, 15, 4.8, '#aba28d', 0.32],
  ];
  layers.forEach((layer, i) => {
    const ridge = mountainRing(...layer);
    ridge.renderOrder = i + 1;
    group.add(ridge);
  });
  const sun = new T.Mesh(
    new T.PlaneGeometry(12, 12),
    new T.ShaderMaterial({
      uniforms: { color: { value: new T.Color('#bb7657') } },
      transparent: true,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 color; varying vec2 vUv;
      void main(){float r=length(vUv*2.0-1.0);if(r>1.0)discard;
      float grain=fract(sin(dot(vUv,vec2(12.9898,78.233)))*43758.5453);
      gl_FragColor=vec4(color,(0.60+grain*0.018)*(1.0-smoothstep(0.985,1.0,r)));
      #include <colorspace_fragment>
      }`,
    }),
  );
  sun.name = 'Terracotta sun';
  sun.position.set(27, 43, -143);
  group.add(sun);

  const stone = stoneMaterial();
  function block(parent, w, h, d, x, y, z) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), stone);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  const benches = [
    [-10, -5, 0.12],
    [9, -13, -0.15],
    [13, -24, 0.2],
    [-11, -31, -0.2],
    [10, -48, 0.08],
    [-12, -64, 0.2],
  ];
  benches.forEach(([x, z, angle]) => {
    const bench = new T.Group();
    bench.name = 'Stone bench';
    bench.position.set(x, 0, z);
    bench.rotation.y = angle;
    block(bench, 2.2, 0.17, 0.7, 0, 0.65, 0);
    for (const side of [-1, 1])
      block(bench, 0.24, 0.56, 0.54, side * 0.78, 0.28, 0);
    group.add(bench);
  });
  const rocks = [
    [-12, -12, 1.3],
    [13, -19, 1.05],
    [-16, -27, 1.7],
    [10, -37, 0.8],
    [-11, -46, 1.1],
    [15, -57, 1.6],
    [-14, -74, 1.4],
  ];
  rocks.forEach(([x, z, size], i) => {
    const rock = new T.Mesh(new T.DodecahedronGeometry(1, 0), stone);
    rock.name = 'Weathered stone';
    rock.position.set(x, size * 0.4, z);
    rock.scale.set(size * 1.1, size * 0.8, size * 0.85);
    rock.rotation.set(0.1, i * 0.9, 0.13);
    rock.receiveShadow = true;
    group.add(rock);
    const pebble = new T.Mesh(new T.DodecahedronGeometry(1, 0), stone);
    pebble.position.set(x + size * 1.6, 0.12, z + 0.7);
    pebble.scale.set(0.5, 0.3, 0.38);
    pebble.rotation.y = i;
    group.add(pebble);
  });
  // A distant sun keeps its angular size as the visitor walks along the lane.
  const sunOffset = new T.Vector3(27, 41.28, -146);
  return {
    group,
    update(camera) {
      sun.position.copy(camera.position).add(sunOffset);
      sun.quaternion.copy(camera.quaternion);
    },
  };
}
