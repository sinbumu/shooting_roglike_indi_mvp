import { Assets, Texture } from 'pixi.js';
import type { EnemyId, PickupKind, ShipId } from './types';

/** Vite base('./') 대비 — public/ 하위는 상대 경로로 로드 */
const base = `${import.meta.env.BASE_URL}assets/sprites`;

export const SPRITE_PATHS = {
  ships: {
    scout: `${base}/ship_scout.png`,
    fortress: `${base}/ship_fortress.png`,
    hunter: `${base}/ship_hunter.png`,
  } satisfies Record<ShipId, string>,
  enemies: {
    drone: `${base}/enemy_drone.png`,
    zigzag: `${base}/enemy_zigzag.png`,
    dasher: `${base}/enemy_dasher.png`,
    rusher: `${base}/enemy_rusher.png`,
    tank: `${base}/enemy_tank.png`,
    shielder: `${base}/enemy_shielder.png`,
    teleporter: `${base}/enemy_teleporter.png`,
    splinter: `${base}/enemy_splinter.png`,
    mirage: `${base}/enemy_mirage.png`,
    guardian: `${base}/enemy_guardian.png`,
    trapper: `${base}/enemy_trapper.png`,
    vortex: `${base}/enemy_vortex.png`,
    warden: `${base}/enemy_warden.png`,
    herald: `${base}/enemy_herald.png`,
    architect: `${base}/enemy_architect.png`,
    boss: `${base}/boss_boss.png`,
    bossSeraph: `${base}/boss_bossSeraph.png`,
  } satisfies Record<EnemyId, string>,
  pickups: {
    heal: `${base}/pickup_heal.png`,
    magnet: `${base}/pickup_magnet.png`,
    bomb: `${base}/pickup_bomb.png`,
    cube: `${base}/pickup_cube.png`,
    goldCube: `${base}/pickup_goldCube.png`,
  } satisfies Record<PickupKind, string>,
} as const;

export interface SpriteAtlas {
  ships: Partial<Record<ShipId, Texture>>;
  enemies: Partial<Record<EnemyId, Texture>>;
  pickups: Partial<Record<PickupKind, Texture>>;
  ready: boolean;
}

/** 실패해도 빈 atlas 반환 (Graphics 폴백) */
export async function loadSpriteAtlas(): Promise<SpriteAtlas> {
  const atlas: SpriteAtlas = { ships: {}, enemies: {}, pickups: {}, ready: false };
  const entries: { bucket: 'ships' | 'enemies' | 'pickups'; id: string; url: string }[] = [];

  for (const [id, url] of Object.entries(SPRITE_PATHS.ships)) {
    entries.push({ bucket: 'ships', id, url });
  }
  for (const [id, url] of Object.entries(SPRITE_PATHS.enemies)) {
    entries.push({ bucket: 'enemies', id, url });
  }
  for (const [id, url] of Object.entries(SPRITE_PATHS.pickups)) {
    entries.push({ bucket: 'pickups', id, url });
  }

  let loaded = 0;
  await Promise.all(
    entries.map(async ({ bucket, id, url }) => {
      try {
        const tex = await Assets.load<Texture>(url);
        if (bucket === 'ships') atlas.ships[id as ShipId] = tex;
        else if (bucket === 'enemies') atlas.enemies[id as EnemyId] = tex;
        else atlas.pickups[id as PickupKind] = tex;
        loaded++;
      } catch (err) {
        console.warn('[sprites] load failed', url, err);
      }
    }),
  );

  atlas.ready = loaded > 0;
  return atlas;
}
