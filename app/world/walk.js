// Metres, with the lane running north (negative Z).
export const WORLD_SCALE = 0.006;
export const EYE_HEIGHT = 1.72;
export const houseLocation = (index) => ({
  x: index % 2 === 0 ? -6.2 : 6.2,
  z: -7 - index * 10,
  rotation: index % 2 === 0 ? Math.PI / 2 : -Math.PI / 2,
});
export function visitHouse(index) {
  const h = houseLocation(index);
  return { x: 0, z: h.z + 4, yaw: index % 2 === 0 ? 1 : -1, pitch: 0.13 };
}
export function advanceWalker(player, keys, seconds) {
  let forward =
    Number(keys.has('KeyW') || keys.has('ArrowUp')) -
    Number(keys.has('KeyS') || keys.has('ArrowDown'));
  let side =
    Number(keys.has('KeyD') || keys.has('ArrowRight')) -
    Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  const length = Math.hypot(forward, side);
  if (!length) return false;
  forward /= length;
  side /= length;
  const speed =
    (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.2 : 2.5) *
    Math.min(seconds, 0.05);
  player.x = Math.max(
    -3.8,
    Math.min(
      3.8,
      player.x +
        (-Math.sin(player.yaw) * forward + Math.cos(player.yaw) * side) * speed,
    ),
  );
  player.z = Math.max(
    -78,
    Math.min(
      8,
      player.z +
        (-Math.cos(player.yaw) * forward - Math.sin(player.yaw) * side) * speed,
    ),
  );
  return true;
}
