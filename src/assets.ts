import { Assets, Rectangle, Texture } from 'pixi.js';
import type { EnemyId, PickupKind, ShipId, WeaponId } from './types';

/** Vite base('./') 대비 — public/ 하위는 상대 경로로 로드 */
const base = `${import.meta.env.BASE_URL}assets/sprites`;

export type FxId =
  | 'slash'
  | 'beam'
  | 'rotor'
  | 'halo'
  | 'mine'
  | 'seeker'
  | 'singularity'
  | 'predator'
  | 'swarm'
  | 'vulcan'
  | 'spread'
  | 'homing'
  | 'laser'
  | 'railgun'
  | 'gatling'
  | 'nova'
  | 'mothership'
  | 'omega'
  | 'starfall'
  | 'genesis'
  | 'tempest'
  | 'rupture'
  | 'solance'
  | 'helix'
  | 'nebula'
  | 'shieldwall'
  | 'quantum'
  | 'altar'
  | 'shade'
  | 'lockbeam'
  | 'meteor'
  | 'emp'
  | 'gem'
  | 'ebullet'
  | 'warn'
  | 'drone'
  | 'pylon'
  | 'frontshield'
  | 'whip'
  | 'spider'
  | 'blood';

export const SPRITE_PATHS = {
  ships: {
    scout: `${base}/ship_scout.png`,
    fortress: `${base}/ship_fortress.png`,
    hunter: `${base}/ship_hunter.png`,
    bomber: `${base}/ship_bomber.png`,
    yaksha: `${base}/ship_yaksha.png`,
    overlord: `${base}/ship_overlord.png`,
    crimson: `${base}/ship_crimson.png`,
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
  terrain: {
    derelict: `${base}/spr_derelict_ship.png`,
  },
  fx: {
    slash: `${base}/fx_slash.png`,
    beam: `${base}/fx_beam.png`,
    rotor: `${base}/fx_rotor.png`,
    halo: `${base}/fx_halo.png`,
    mine: `${base}/fx_mine.png`,
    seeker: `${base}/fx_seeker.png`,
    singularity: `${base}/fx_singularity.png`,
    predator: `${base}/fx_predator.png`,
    swarm: `${base}/fx_swarm.png`,
    vulcan: `${base}/fx_vulcan.png`,
    spread: `${base}/fx_spread.png`,
    homing: `${base}/fx_homing.png`,
    laser: `${base}/fx_laser.png`,
    railgun: `${base}/fx_railgun.png`,
    gatling: `${base}/fx_gatling.png`,
    nova: `${base}/fx_nova.png`,
    mothership: `${base}/fx_mothership.png`,
    omega: `${base}/fx_omega.png`,
    starfall: `${base}/fx_starfall.png`,
    genesis: `${base}/fx_genesis.png`,
    tempest: `${base}/fx_tempest.png`,
    rupture: `${base}/fx_rupture.png`,
    solance: `${base}/fx_solance.png`,
    helix: `${base}/fx_helix.png`,
    nebula: `${base}/fx_nebula.png`,
    shieldwall: `${base}/fx_shieldwall.png`,
    quantum: `${base}/fx_quantum.png`,
    altar: `${base}/fx_altar.png`,
    shade: `${base}/fx_shade.png`,
    lockbeam: `${base}/fx_lockbeam.png`,
    meteor: `${base}/fx_meteor.png`,
    emp: `${base}/fx_emp.png`,
    gem: `${base}/fx_gem.png`,
    ebullet: `${base}/fx_ebullet.png`,
    warn: `${base}/fx_warn.png`,
    drone: `${base}/fx_drone.png`,
    pylon: `${base}/fx_pylon.png`,
    frontshield: `${base}/fx_frontshield.png`,
    whip: `${base}/fx_whip.png`,
    spider: `${base}/fx_spider.png`,
    blood: `${base}/fx_blood.png`,
  } satisfies Record<FxId, string>,
} as const;

export interface ProjFxDraw {
  fx: FxId;
  sizeMul: number;
  elong?: number;
  fps?: number;
  add?: boolean;
  tint?: boolean;
  trail?: boolean;
  anchorX?: number;
}

/** 무기 ID → 투사체 스프라이트. 없으면 Graphics 폴백 */
export const PROJ_FX: Partial<Record<WeaponId, ProjFxDraw>> = {
  vulcan: { fx: 'vulcan', sizeMul: 7.4, elong: 1.9, fps: 14, trail: true },
  spread: { fx: 'spread', sizeMul: 5.2, fps: 12, tint: true },
  homing: { fx: 'homing', sizeMul: 6.4, elong: 1.65, fps: 12, trail: true },
  laser: { fx: 'laser', sizeMul: 5.8, elong: 2.55, fps: 16, add: true, tint: true },
  railgun: { fx: 'railgun', sizeMul: 6.2, elong: 2.75, fps: 14, trail: true },
  swarm: { fx: 'swarm', sizeMul: 6.4, fps: 12 },
  gatling: { fx: 'gatling', sizeMul: 8.2, elong: 2.2, fps: 18, trail: true },
  nova: { fx: 'nova', sizeMul: 5.4, fps: 14, add: true, tint: true },
  mothership: { fx: 'mothership', sizeMul: 4.3, elong: 1.12, fps: 8 },
  omega: { fx: 'omega', sizeMul: 5.1, elong: 2.65, fps: 16, add: true, tint: true },
  starfall: { fx: 'starfall', sizeMul: 5.6, fps: 12, add: true, tint: true },
  genesis: { fx: 'genesis', sizeMul: 6.0, elong: 2.9, fps: 14, add: true, tint: true, trail: true },
  tempest: { fx: 'tempest', sizeMul: 6.2, fps: 18, add: true, tint: true },
  rupture: { fx: 'rupture', sizeMul: 4.9, elong: 1.4, fps: 10, trail: true },
  helix: { fx: 'helix', sizeMul: 5.4, fps: 10 },
  predator: { fx: 'swarm', sizeMul: 5.8, fps: 12 },
  seekingSlash: { fx: 'slash', sizeMul: 6.8, elong: 2.05, fps: 16, trail: true, tint: true },
  phantomBlade: { fx: 'slash', sizeMul: 6.2, elong: 1.95, fps: 18, trail: true, tint: true },
  spiderMine: { fx: 'spider', sizeMul: 5.6, fps: 10 },
  interceptorWing: { fx: 'swarm', sizeMul: 5.6, fps: 12, tint: true },
  doomsday: { fx: 'swarm', sizeMul: 6.2, fps: 14, tint: true },
  autoTurret: { fx: 'gatling', sizeMul: 7.4, elong: 2.0, fps: 16, trail: true },
  orbitalBattery: { fx: 'gatling', sizeMul: 8.0, elong: 2.2, fps: 16, trail: true },
  bloodSpike: { fx: 'blood', sizeMul: 6.4, elong: 1.8, fps: 14, trail: true, tint: true },
  bleedBurst: { fx: 'nova', sizeMul: 5.2, fps: 14, add: true, tint: true },
  bloodSeeker: { fx: 'homing', sizeMul: 6.0, elong: 1.5, fps: 12, trail: true, tint: true },
  bloodNova: { fx: 'nova', sizeMul: 5.8, fps: 14, add: true, tint: true },
  vampireBats: { fx: 'homing', sizeMul: 5.4, fps: 14, tint: true },
};

export interface SpriteAtlas {
  ships: Partial<Record<ShipId, Texture>>;
  enemies: Partial<Record<EnemyId, Texture>>;
  pickups: Partial<Record<PickupKind, Texture>>;
  terrain: { derelict?: Texture };
  fx: Partial<Record<FxId, Texture[]>>;
  ready: boolean;
}

/** 2×2 시트를 프레임 배열로 자른다 (좌→우, 상→하) */
export function sliceSheet(tex: Texture, cols = 2, rows = 2): Texture[] {
  const w = tex.width / cols;
  const h = tex.height / rows;
  const frames: Texture[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(Math.round(c * w), Math.round(r * h), Math.round(w), Math.round(h)),
      }));
    }
  }
  return frames;
}

export function fxFrame(
  frames: Texture[] | undefined,
  t: number,
  fps = 10,
  loop = true,
): Texture | undefined {
  if (!frames?.length) return undefined;
  const i = Math.floor(t * fps);
  const idx = loop
    ? ((i % frames.length) + frames.length) % frames.length
    : Math.min(frames.length - 1, Math.max(0, i));
  return frames[idx];
}

/** 0~1 진행도로 한 번만 재생 (참격) */
export function fxFrameOnce(frames: Texture[] | undefined, progress01: number): Texture | undefined {
  if (!frames?.length) return undefined;
  const p = Math.min(1, Math.max(0, progress01));
  return frames[Math.min(frames.length - 1, Math.floor(p * frames.length))];
}

/** 실패해도 빈 atlas 반환 (Graphics 폴백) */
export async function loadSpriteAtlas(): Promise<SpriteAtlas> {
  const atlas: SpriteAtlas = { ships: {}, enemies: {}, pickups: {}, terrain: {}, fx: {}, ready: false };
  const entries: { bucket: 'ships' | 'enemies' | 'pickups' | 'terrain' | 'fx'; id: string; url: string }[] = [];

  for (const [id, url] of Object.entries(SPRITE_PATHS.ships)) {
    entries.push({ bucket: 'ships', id, url });
  }
  for (const [id, url] of Object.entries(SPRITE_PATHS.enemies)) {
    entries.push({ bucket: 'enemies', id, url });
  }
  for (const [id, url] of Object.entries(SPRITE_PATHS.pickups)) {
    entries.push({ bucket: 'pickups', id, url });
  }
  for (const [id, url] of Object.entries(SPRITE_PATHS.terrain)) {
    entries.push({ bucket: 'terrain', id, url });
  }
  for (const [id, url] of Object.entries(SPRITE_PATHS.fx)) {
    entries.push({ bucket: 'fx', id, url });
  }

  let loaded = 0;
  await Promise.all(
    entries.map(async ({ bucket, id, url }) => {
      try {
        const tex = await Assets.load<Texture>(url);
        if (bucket === 'ships') atlas.ships[id as ShipId] = tex;
        else if (bucket === 'enemies') atlas.enemies[id as EnemyId] = tex;
        else if (bucket === 'pickups') atlas.pickups[id as PickupKind] = tex;
        else if (bucket === 'fx') atlas.fx[id as FxId] = sliceSheet(tex);
        else if (id === 'derelict') atlas.terrain.derelict = tex;
        loaded++;
      } catch (err) {
        console.warn('[sprites] load failed', url, err);
      }
    }),
  );

  atlas.ready = loaded > 0;
  return atlas;
}
