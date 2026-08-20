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
  | 'blood'
  | 'seekingSlash'
  | 'phantomBlade';

export const SPRITE_PATHS = {
  ships: {
    scout: `${base}/ship_scout.webp`,
    fortress: `${base}/ship_fortress.webp`,
    hunter: `${base}/ship_hunter.webp`,
    bomber: `${base}/ship_bomber.webp`,
    yaksha: `${base}/ship_yaksha.webp`,
    overlord: `${base}/ship_overlord.webp`,
    crimson: `${base}/ship_crimson.webp`,
  } satisfies Record<ShipId, string>,
  enemies: {
    drone: `${base}/enemy_drone.webp`,
    zigzag: `${base}/enemy_zigzag.webp`,
    dasher: `${base}/enemy_dasher.webp`,
    rusher: `${base}/enemy_rusher.webp`,
    tank: `${base}/enemy_tank.webp`,
    shielder: `${base}/enemy_shielder.webp`,
    teleporter: `${base}/enemy_teleporter.webp`,
    splinter: `${base}/enemy_splinter.webp`,
    mirage: `${base}/enemy_mirage.webp`,
    guardian: `${base}/enemy_guardian.webp`,
    trapper: `${base}/enemy_trapper.webp`,
    vortex: `${base}/enemy_vortex.webp`,
    warden: `${base}/enemy_warden.webp`,
    herald: `${base}/enemy_herald.webp`,
    architect: `${base}/enemy_architect.webp`,
    boss: `${base}/boss_boss.webp`,
    bossSeraph: `${base}/boss_bossSeraph.webp`,
  } satisfies Record<EnemyId, string>,
  pickups: {
    heal: `${base}/pickup_heal.webp`,
    magnet: `${base}/pickup_magnet.webp`,
    bomb: `${base}/pickup_bomb.webp`,
    cube: `${base}/pickup_cube.webp`,
    goldCube: `${base}/pickup_goldCube.webp`,
  } satisfies Record<PickupKind, string>,
  terrain: {
    derelict: `${base}/spr_derelict_ship.webp`,
  },
  fx: {
    slash: `${base}/fx_slash.webp`,
    beam: `${base}/fx_beam.webp`,
    rotor: `${base}/fx_rotor.webp`,
    halo: `${base}/fx_halo.webp`,
    mine: `${base}/fx_mine.webp`,
    seeker: `${base}/fx_seeker.webp`,
    singularity: `${base}/fx_singularity.webp`,
    predator: `${base}/fx_predator.webp`,
    swarm: `${base}/fx_swarm.webp`,
    vulcan: `${base}/fx_vulcan.webp`,
    spread: `${base}/fx_spread.webp`,
    homing: `${base}/fx_homing.webp`,
    laser: `${base}/fx_laser.webp`,
    railgun: `${base}/fx_railgun.webp`,
    gatling: `${base}/fx_gatling.webp`,
    nova: `${base}/fx_nova.webp`,
    mothership: `${base}/fx_mothership.webp`,
    omega: `${base}/fx_omega.webp`,
    starfall: `${base}/fx_starfall.webp`,
    genesis: `${base}/fx_genesis.webp`,
    tempest: `${base}/fx_tempest.webp`,
    rupture: `${base}/fx_rupture.webp`,
    solance: `${base}/fx_solance.webp`,
    helix: `${base}/fx_helix.webp`,
    nebula: `${base}/fx_nebula.webp`,
    shieldwall: `${base}/fx_shieldwall.webp`,
    quantum: `${base}/fx_quantum.webp`,
    altar: `${base}/fx_altar.webp`,
    shade: `${base}/fx_shade.webp`,
    lockbeam: `${base}/fx_lockbeam.webp`,
    meteor: `${base}/fx_meteor.webp`,
    emp: `${base}/fx_emp.webp`,
    gem: `${base}/fx_gem.webp`,
    ebullet: `${base}/fx_ebullet.webp`,
    warn: `${base}/fx_warn.webp`,
    drone: `${base}/fx_drone.webp`,
    pylon: `${base}/fx_pylon.webp`,
    frontshield: `${base}/fx_frontshield.webp`,
    whip: `${base}/fx_whip.webp`,
    spider: `${base}/fx_spider.webp`,
    blood: `${base}/fx_blood.webp`,
    seekingSlash: `${base}/fx_seekingSlash.webp`,
    phantomBlade: `${base}/fx_phantomBlade.webp`,
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
  seekingSlash: { fx: 'seekingSlash', sizeMul: 7.4, elong: 1.55, fps: 16, trail: true, tint: true },
  phantomBlade: { fx: 'phantomBlade', sizeMul: 6.6, elong: 1.48, fps: 20, trail: true, tint: true, add: true },
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
