import { useEffect, useRef } from 'react';
import * as T from 'three';
import { scenes } from '../scenes';
import { brushedStrands } from '../chimes';
import { createArchitecture, disposeObject } from './architecture';
import { createInkCurtain } from './InkCurtain';
import { createEnvironment } from './environment';
import {
  advanceWalker,
  houseLocation,
  visitHouse,
  WORLD_SCALE,
  EYE_HEIGHT,
} from './walk';

export default function WorldCanvas({
  entered,
  panel,
  chimes,
  onStatus,
  onPlace,
  visit,
  controls,
}) {
  const host = useRef(null),
    latest = useRef({ entered, panel });
  useEffect(() => {
    latest.current = { entered, panel };
  }, [entered, panel]);
  const navigate = useRef(null);
  useEffect(() => {
    let renderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      onStatus('fallback');
      return;
    }
    const element = host.current,
      canvas = renderer.domElement;
    element.appendChild(canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    const world = new T.Scene();
    world.background = new T.Color('#e9dfcd');
    world.fog = new T.FogExp2('#e9dfcd', 0.022);
    const environment = createEnvironment();
    world.add(environment.group);
    const sky = new T.HemisphereLight('#fff4dc', '#9e9785', 2);
    world.add(sky);
    const sun = new T.DirectionalLight('#fff1d5', 3);
    sun.position.set(-14, 24, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -16,
      right: 16,
      top: 20,
      bottom: -20,
      near: 1,
      far: 65,
    });
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.025;
    world.add(sun);
    world.add(sun.target);
    const floor = new T.Mesh(
      new T.PlaneGeometry(500, 500),
      new T.MeshStandardMaterial({ color: '#d9cdb6', roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    world.add(floor);
    // The street and house bodies stay as fine architectural lines.
    const lineMat = new T.LineBasicMaterial({
      color: '#817663',
      transparent: true,
      opacity: 0.48,
    });
    const lanePoints = [];
    for (const x of [-3.65, 3.65]) lanePoints.push(x, 0.014, 10, x, 0.014, -90);
    for (let i = 0; i < 46; i++) {
      const z = 8 - i * 2;
      lanePoints.push(-3.65, 0.015, z, 3.65, 0.015, z);
    }
    const lane = new T.LineSegments(
      new T.BufferGeometry().setAttribute(
        'position',
        new T.Float32BufferAttribute(lanePoints, 3),
      ),
      new T.LineBasicMaterial({
        color: '#a09178',
        transparent: true,
        opacity: 0.2,
      }),
    );
    world.add(lane);
    const houses = scenes.map((scene, index) => {
      const architecture = createArchitecture(scene),
        ink = createInkCurtain(scene, architecture.anchorAt),
        h = houseLocation(index),
        p = architecture.profile;
      const house = new T.Group();
      house.position.set(h.x, 0, h.z);
      house.rotation.y = h.rotation;
      world.add(house);
      architecture.group.add(ink.group);
      architecture.group.scale.setScalar(WORLD_SCALE);
      architecture.group.position.set(-p.x * WORLD_SCALE, 438 * WORLD_SCALE, 0);
      house.add(architecture.group);
      const width = p.width * WORLD_SCALE * 0.83,
        height = (438 + p.y - 38) * WORLD_SCALE,
        depth = p.depth * WORLD_SCALE * 0.77;
      const body = new T.LineSegments(
        new T.EdgesGeometry(new T.BoxGeometry(width, height, depth)),
        lineMat,
      );
      body.position.set(0, height / 2, -0.08);
      house.add(body);
      const frame = [];
      for (const x of [-width * 0.25, width * 0.25])
        frame.push(x, 0, depth / 2 - 0.08, x, height, depth / 2 - 0.08);
      frame.push(
        -width / 2,
        height * 0.35,
        -depth / 2 - 0.08,
        width / 2,
        height * 0.35,
        -depth / 2 - 0.08,
      );
      house.add(
        new T.LineSegments(
          new T.BufferGeometry().setAttribute(
            'position',
            new T.Float32BufferAttribute(frame, 3),
          ),
          lineMat,
        ),
      );
      const slab = new T.Mesh(
        new T.BoxGeometry(width + 0.2, 0.045, depth + 0.25),
        new T.MeshStandardMaterial({ color: '#b9ad96', roughness: 1 }),
      );
      slab.position.set(0, 0.02, -0.08);
      slab.receiveShadow = true;
      house.add(slab);
      return { ...architecture, ink, house, index };
    });
    world.updateMatrixWorld(true);
    const camera = new T.PerspectiveCamera(58, 1, 0.08, 400),
      player = { x: 0, z: 3, yaw: 0.28, pitch: 0.09 };
    camera.rotation.order = 'YXZ';
    let frame = 0,
      last = 0,
      accumulator = 0,
      disposed = false,
      ready = false,
      nearest = -1,
      width = 1,
      height = 1,
      drag = null,
      lastInput = null,
      brushHouse = null;
    const keys = new Set(),
      pointer = { active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0 };
    const raycaster = new T.Raycaster(),
      plane = new T.Plane(),
      point = new T.Vector3(),
      normal = new T.Vector3(),
      origin = new T.Vector3();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = mq.matches;
    function setCamera() {
      camera.position.set(player.x, EYE_HEIGHT, player.z);
      camera.rotation.set(player.pitch, player.yaw, 0);
      camera.updateMatrixWorld();
    }
    function release() {
      pointer.active = false;
      lastInput = null;
      brushHouse = null;
      chimes.current?.releaseBrush();
    }
    function resetInput() {
      keys.clear();
      controls.current.clear();
      drag = null;
      release();
    }
    function resize() {
      width = element.clientWidth;
      height = element.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = camera.aspect < 1 ? 72 : 58;
      camera.updateProjectionMatrix();
      wake();
    }
    function jump(index) {
      Object.assign(player, visitHouse(index));
      resetInput();
      setCamera();
      wake();
    }
    navigate.current = jump;
    function render(time) {
      frame = 0;
      if (disposed || document.hidden) return;
      const state = latest.current,
        dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60;
      last = time;
      if (state.entered && !state.panel) {
        const moving = advanceWalker(
          player,
          new Set([...keys, ...controls.current]),
          dt,
        );
        if (moving) release();
        setCamera();
        let closest = 0,
          distance = Infinity;
        for (const h of houses) {
          const d = Math.abs(h.house.position.z - player.z);
          if (d < distance) {
            distance = d;
            closest = h.index;
          }
        }
        if (closest !== nearest) {
          nearest = closest;
          onPlace(closest);
        }
        accumulator += dt;
        const steps = Math.min(3, Math.floor(accumulator * 60));
        accumulator -= steps / 60;
        for (const h of houses) {
          const d = h.house.position.distanceTo(camera.position);
          h.house.visible = d < 66;
          if (d < 20) {
            for (let i = 0; i < steps; i++)
              h.ink.update(
                time,
                true,
                h === brushHouse ? pointer : null,
                reduced,
              );
          }
          for (const bell of h.pendulums)
            bell.rotation.z = reduced
              ? 0
              : Math.sin(time * 0.0014 + h.index) * 0.018;
        }
        pointer.vx *= 0.75;
        pointer.vy *= 0.75;
        chimes.current?.releaseIdle();
        // Keep the shadow map near the walker rather than spanning the whole village.
        sun.position.set(player.x - 14, 24, player.z + 10);
        sun.target.position.set(player.x, 0, player.z - 5);
        sun.target.updateMatrixWorld();
      } else resetInput();
      environment.update(camera);
      renderer.render(world, camera);
      if (!ready) {
        ready = true;
        onStatus('ready');
      }
      if (state.entered && !state.panel) frame = requestAnimationFrame(render);
    }
    function wake() {
      if (!frame && !disposed && !document.hidden) {
        last = 0;
        frame = requestAnimationFrame(render);
      }
    }
    const isWorld = (e) => Boolean(e.target.closest?.('.walk-surface'));
    function move(e) {
      if (!latest.current.entered || latest.current.panel) return;
      if (drag && drag.id === e.pointerId) {
        player.yaw -= (e.clientX - drag.x) * 0.004;
        player.pitch = Math.max(
          -0.48,
          Math.min(0.65, player.pitch - (e.clientY - drag.y) * 0.003),
        );
        drag.x = e.clientX;
        drag.y = e.clientY;
        release();
        setCamera();
        wake();
        return;
      }
      if (!isWorld(e)) {
        release();
        return;
      }
      const rect = element.getBoundingClientRect(),
        x = e.clientX - rect.left,
        y = e.clientY - rect.top;
      raycaster.setFromCamera(
        new T.Vector2((x / width) * 2 - 1, 1 - (y / height) * 2),
        camera,
      );
      let hit = null,
        best = 13,
        local = null;
      for (const h of houses) {
        origin.set(0, 0, h.profile.depth / 2);
        h.ink.group.localToWorld(origin);
        normal.set(0, 0, 1).transformDirection(h.ink.group.matrixWorld);
        plane.setFromNormalAndCoplanarPoint(normal, origin);
        if (!raycaster.ray.intersectPlane(plane, point)) continue;
        const distance = point.distanceTo(camera.position);
        if (distance > best) continue;
        const q = h.ink.group.worldToLocal(point.clone()),
          scene = scenes[h.index];
        if (
          q.x < scene.x1 - 985 ||
          q.x > scene.x2 - 935 ||
          q.y > h.profile.y + 150 ||
          q.y < -440
        )
          continue;
        hit = h;
        local = q;
        best = distance;
      }
      if (!hit) {
        release();
        return;
      }
      const same = hit === brushHouse;
      pointer.vx = same && pointer.active ? local.x - pointer.x : 0;
      pointer.vy = same && pointer.active ? local.y - pointer.y : 0;
      pointer.x = local.x;
      pointer.y = local.y;
      pointer.z = local.z;
      pointer.active = true;
      brushHouse = hit;
      const now = performance.now();
      if (same && lastInput && now - lastInput.time < 140) {
        const speed =
          (Math.hypot(x - lastInput.x, y - lastInput.y) /
            Math.max(8, now - lastInput.time)) *
          1000;
        for (const brushed of brushedStrands(
          hit.ink.project(camera, width, height),
          lastInput,
          { x, y },
        ))
          if (
            chimes.current?.strike(
              scenes[hit.index].id,
              brushed.strand,
              speed,
              (x / width - 0.5) * 1.5,
            )
          )
            break;
      }
      lastInput = { x, y, time: now };
      wake();
    }
    const down = (e) => {
      if (
        isWorld(e) &&
        latest.current.entered &&
        !latest.current.panel &&
        e.button === 0
      ) {
        if (e.pointerType === 'touch') {
          move(e);
          if (brushHouse) return;
        }
        drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
        release();
      }
    };
    const up = (e) => {
      if (drag?.id === e.pointerId) drag = null;
      if (e.pointerType === 'touch') release();
    };
    const allowed = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ShiftLeft',
      'ShiftRight',
    ]);
    const keydown = (e) => {
      if (
        !latest.current.entered ||
        latest.current.panel ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.target.closest?.('button,a,input,textarea,select') ||
        !allowed.has(e.code)
      )
        return;
      e.preventDefault();
      keys.add(e.code);
      wake();
    };
    const keyup = (e) => keys.delete(e.code);
    const visibility = () => {
      resetInput();
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else wake();
    };
    const preference = () => {
      reduced = mq.matches;
      wake();
    };
    const lost = (e) => {
      e.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      resetInput();
      onStatus('fallback');
    };
    const restored = () => {
      ready = false;
      wake();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    setCamera();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', resetInput);
    window.addEventListener('blur', resetInput);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    document.documentElement.addEventListener('pointerleave', resetInput);
    document.addEventListener('visibilitychange', visibility);
    mq.addEventListener('change', preference);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    element.addEventListener('worldchange', wake);
    wake();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      navigate.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', resetInput);
      window.removeEventListener('blur', resetInput);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      document.documentElement.removeEventListener('pointerleave', resetInput);
      document.removeEventListener('visibilitychange', visibility);
      mq.removeEventListener('change', preference);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      element.removeEventListener('worldchange', wake);
      houses.forEach((h) => h.ink.dispose());
      disposeObject(world);
      sun.shadow.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [chimes, onStatus, onPlace, controls]);
  useEffect(() => {
    host.current?.dispatchEvent(new Event('worldchange'));
  }, [entered, panel]);
  useEffect(() => {
    if (visit) navigate.current?.(visit.index);
  }, [visit]);
  return <div ref={host} className="world-canvas" aria-hidden="true" />;
}
