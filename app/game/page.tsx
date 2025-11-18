"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { spriteUpgradeMap } from "../home/page";

const cogValueMap = {
  "-10": {
    file: "madars",
    price: 12,
    points: 5,
  },
  "-11": {
    file: "janka",
    price: 15,
    points: 6,
  },
  "-12": {
    file: "roberts",
    price: 20,
    points: 7,
  },
  "-13": {
    file: "ozols",
    price: 40,
    points: 10,
  },
  "1": {
    file: "cog",
    price: 10,
  },
  "-1": {
    file: "trigger",
    price: 0,
  },
};

const waveOptionMap = [
  [-10, 1, -11, -10],
  [1, 1, 1],
  [1, 1, 1, 1, -10, -11],
  [1, -10, -12, 1, -11, 1, 1],
  [1, -10, -13, -13, -12, 1, 1],
  [1, -10, 1, -11, -12, 1, 1],
  [1, -10, 1, -11, -12, 1, 1],
  [1, -10, 1, -11, -12, 1, 1],
  [1, -10, 1, -11, -12, 1, 1],
  [1, -10, 1, -11, -12, 1, 1],
];

// Map special negative codes to character names used in localStorage
const codeToCharacterName: Record<number, string> = {
  [-10]: "madars",
  [-11]: "janka",
  [-12]: "roberts",
  [-13]: "ozols",
};

const ratio = 640 / 2000;
const COLUMNS = 6;

const playerSpawnPosition = [(293 / 2) * ratio, 1550 * ratio];
const enemySpawnPosition = [100 * ratio, 200 * ratio];

const enemyMaxX = 100 * ratio;
const playerMaxX = 100 * ratio;

const playerSpriteStats = {
  madars: { speed: 15, hp: 9, damage: 3, reach: 30, atckSpeed: 1.5 },
  janka: { speed: 15, hp: 10, damage: 4, reach: 30, atckSpeed: 2 },
  roberts: { speed: 17, hp: 10, damage: 5, reach: 30, atckSpeed: 1 },
  ozols: { speed: 19, hp: 11, damage: 6, reach: 32, atckSpeed: 1 },
};

// Golden-ratio-based procedural enemy generator
const PHI = (1 + Math.sqrt(5)) / 2; // ~1.618
type EnemyType = "toms" | "zirnis" | "ansons" | "dzintars";
const enemyBaseStats: Record<EnemyType, { hp: number; damage: number; speed: number; reward: number }> = {
  toms: { hp: 2, damage: 1, speed: 10, reward: 1 },
  zirnis: { hp: 8, damage: 2, speed: 12, reward: 3 },
  ansons: { hp: 16, damage: 4, speed: 16, reward: 3 },
  dzintars: { hp: 24, damage: 5, speed: 17, reward: 6 },
};
const enemyBaseQuantity: Record<EnemyType, number> = {
  toms: 5,
  zirnis: 2,
  ansons: 1,
  dzintars: 1,
};
function permittedEnemiesForLevel(level: number): EnemyType[] {
  if (level <= 1) return ["toms"];
  if (level <= 3) return ["toms", "zirnis"]; // introduce zirnis at 2
  if (level <= 5) return ["toms", "zirnis", "ansons"]; // introduce ansons at 4
  return ["toms", "zirnis", "ansons", "dzintars"]; // introduce dzintars at 6+
}
function generateLevelEnemies(level: number): any[][] {
  const waves = level <= 4 ? 5 : level <= 6 ? 6 : 7; // first 4 => 5 waves, then up to max 7
  const types = permittedEnemiesForLevel(level);
  const result: any[][] = [];
  for (let w = 0; w < waves; w++) {
    const wave: any[] = [];
    // Difficulty scaling using PHI^x
    const levelFactor = Math.pow(PHI, Math.max(0, level - 1) * 0.35);
    const waveFactor = Math.pow(PHI, w * 0.22);
    const difficulty = levelFactor * waveFactor;
    // Compose wave: always include toms, and mix in others progressively
    const orderedTypes = types.slice().sort((a, b) => {
      const order: EnemyType[] = ["toms", "zirnis", "ansons", "dzintars"];
      return order.indexOf(a) - order.indexOf(b);
    });
    for (const t of orderedTypes) {
      const base = enemyBaseStats[t];
      const qtyBase = enemyBaseQuantity[t];
      const quantity = Math.max(1, Math.round(qtyBase * difficulty));
      const hp = Math.max(1, Math.round(base.hp * (1 + (difficulty - 1) * 1.1)));
      const damage = Math.max(1, Math.round(base.damage * (1 + (difficulty - 1) * 0.8)));
      const speed = Math.max(base.speed, Math.round(base.speed * (1 + (difficulty - 1) * 0.15)));
      const atckSpeed = difficulty > 2.2 ? 2 : 1; // modest step up
      const reward = base.reward; // keep rewards conservative (already reduced globally)
      // Minor composition control: for early waves, avoid spawning too many heavies
      if ((t === "ansons" || t === "dzintars") && w < 2) {
        if (quantity > 2) continue; // skip heavy types in first waves
      }
      wave.push({
        enemy: t,
        quantity,
        spawnDelay: 1,
        speed,
        hp,
        damage,
        reach: 30,
        atckSpeed,
        reward,
      });
    }
    result.push(wave);
  }
  return result;
}

function generateLevelRewards(level: number, waves: any[][]): {
  coins: number;
  gems: number;
  deposits: number;
} {
  // Sum total base enemy rewards across all waves
  let baseSum = 0;
  for (const wave of waves) {
    for (const entry of wave) {
      const qty = Number(entry?.quantity ?? 0);
      const rew = Number(entry?.reward ?? 0);
      baseSum += qty * rew;
    }
  }
  // Golden-ratio scaling with level; gentle ramp to avoid inflation
  const levelCoef = Math.pow(PHI, Math.max(0, level - 1) * 0.15);
  const coins = Math.max(0, Math.floor(baseSum * 0.5 * levelCoef));
  const gems = Math.max(0, Math.floor(coins * 0.12));
  const deposits = Math.max(0, Math.floor(coins * 0.28));
  return { coins, gems, deposits };
}

const page = () => {
  const router = useRouter();
  const [baseHp, setBaseHp] = useState<number>(12);
  const baseMaxHpRef = React.useRef<number>(12);
  const [wave, setWave] = useState<number>(1);
  const [coins, setCoins] = useState<number>(22);
  const [started, setStarted] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [waveEnemies, setWaveEnemies] = useState<any[][]>([]);
  const [rewards, setRewards] = useState<{
    coins: number;
    gems: number;
    deposits: number;
  } | null>(null);
  const [levelCompleted, setLevelCompleted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameOverRewards, setGameOverRewards] = useState<{
    coins: number;
    gems: number;
    deposits: number;
  }>({ coins: 0, gems: 0, deposits: 0 });
  const [cells, setCells] = useState<number[]>(
    Array.from({ length: 24 }).map((_, i) => (i === 9 ? -1 : 0))
  );
  const [draggingCogValue, setDraggingCogValue] = useState<number | null>(null);
  const [draggingShopIndex, setDraggingShopIndex] = useState<number | null>(
    null
  );
  const [draggingFromCellIndex, setDraggingFromCellIndex] = useState<
    number | null
  >(null);
  const [waveOptionUse, setWaveOptionUse] = useState<boolean[]>([]);
  const [currentShopItems, setCurrentShopItems] = useState<number[]>([]);
  const [rotationAngles, setRotationAngles] = useState<number[]>(
    Array.from({ length: 24 }).map(() => 0)
  );
  const [specialSpinCounts, setSpecialSpinCounts] = useState<number[]>(
    Array.from({ length: 24 }).map(() => 0)
  );
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 1x, 2x, 3x
  const baseHpRef = React.useRef<number>(baseHp);
  useEffect(() => {
    baseHpRef.current = baseHp;
  }, [baseHp]);
  const spawnBufferRef = React.useRef<string[]>([]);
  const enemySpawnTimeoutsRef = React.useRef<number[]>([]);
  const waveCompletedRef = React.useRef<boolean>(false);
  const [enemiesRemaining, setEnemiesRemaining] = useState<number>(0);
  const [activeEnemySprites, setActiveEnemySprites] = useState<
    {
      sprite: string;
      x: number;
      y: number;
      speed: number;
      hp: number;
      damage: number;
      reach: number;
      atckSpeed: number;
    }[]
  >([]);

  const [triggerPhase, setTriggerPhase] = useState<number>(0); // 0: down, 1: left, 2: up, 3: right

  const [activePlayerSprites, setActivePlayerSprites] = useState<
    {
      sprite: string;
      displaySprite?: string;
      x: number;
      y: number;
      speed: number;
      hp: number;
      damage: number;
      reach: number;
      atckSpeed: number;
    }[]
  >([]);

  // Keep refs in sync for smoother intervals without recreating
  const activePlayerSpritesRef = React.useRef<typeof activePlayerSprites>([]);
  const activeEnemySpritesRef = React.useRef<typeof activeEnemySprites>([]);
  useEffect(() => {
    activePlayerSpritesRef.current = activePlayerSprites;
  }, [activePlayerSprites]);
  useEffect(() => {
    activeEnemySpritesRef.current = activeEnemySprites;
  }, [activeEnemySprites]);

  const playerIdRef = React.useRef(0);
  const enemyIdRef = React.useRef(0);

  const getShopItems = React.useCallback((w: number) => {
    const idx = Math.max(0, Math.min(w - 1, waveOptionMap.length - 1));
    return waveOptionMap[idx] || [];
  }, []);

  React.useEffect(() => {
    // Reset availability each wave (new round) and pick 3 random items from availability
    const all = getShopItems(wave);

    // Filter out character items that the user hasn't unlocked (level >= 1)
    let unlockedNames = new Set<string>();
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("characters");
        if (raw) {
          const parsed = JSON.parse(raw) as { name: string; level: number }[];
          parsed.forEach((c) => {
            if ((c?.level || 0) >= 1 && c?.name) unlockedNames.add(c.name);
          });
        }
      }
    } catch {}

    const pool = all.filter((code) => {
      // Non-character items (e.g., cog=1, trigger=-1) always allowed
      if (code >= 0 || code === -1) return true;
      const name = (codeToCharacterName as any)[code];
      // If it's an unknown special code, exclude by default
      if (!name) return false;
      return unlockedNames.has(name);
    });
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    const picked = pool.slice(0, Math.min(3, pool.length));
    setCurrentShopItems(picked);
    setWaveOptionUse(Array(picked.length).fill(false));
  }, [wave]);

  // Load level from localStorage and fetch enemies/rewards JSON for that level
  useEffect(() => {
    const init = async () => {
      try {
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem("currentLevel")
            : null;
        const lvl = stored ? Math.max(1, parseInt(stored, 10) || 1) : 1;
        setCurrentLevel(lvl);
        // Generate waves procedurally using golden-ratio scaling
        const generated = generateLevelEnemies(lvl);
        setWaveEnemies(generated);
        // Generate rewards based on difficulty and composition
        const dynRewards = generateLevelRewards(lvl, generated);
        setRewards(dynRewards);
      } catch {}
    };
    init();
  }, []);

  useEffect(() => {
    if (!started) return;
    const MOVE_INTERVAL_MS = 100;

    const id = setInterval(() => {
      const nextActivePlayerSprites = activePlayerSpritesRef.current.map(
        (sprite) => {
          return { ...sprite };
        }
      );
      // Clone enemies
      const nextActiveEnemies = activeEnemySpritesRef.current.map((sprite) => ({
        ...sprite,
      }));

      // Build id maps (we'll synthesize ids if missing)
      const now = performance.now();

      // Ensure ids and maxHp exist
      nextActivePlayerSprites.forEach((p) => {
        // @ts-ignore
        if (!(p as any).id) (p as any).id = `p-${++playerIdRef.current}`;
        // @ts-ignore
        if (!(p as any).maxHp) (p as any).maxHp = p.hp;
        // @ts-ignore
        if ((p as any).targetId === undefined) (p as any).targetId = null;
        // @ts-ignore
        if ((p as any).nextAtkAt === undefined) (p as any).nextAtkAt = 0;
      });
      nextActiveEnemies.forEach((e) => {
        // @ts-ignore
        if (!(e as any).id) (e as any).id = `e-${++enemyIdRef.current}`;
        // @ts-ignore
        if (!(e as any).maxHp) (e as any).maxHp = e.hp;
        // @ts-ignore
        if ((e as any).targetId === undefined) (e as any).targetId = null;
        // @ts-ignore
        if ((e as any).nextAtkAt === undefined) (e as any).nextAtkAt = 0;
      });

      const playersById: Record<string, any> = Object.fromEntries(
        nextActivePlayerSprites.map((p: any) => [p.id, p])
      );
      const enemiesById: Record<string, any> = Object.fromEntries(
        nextActiveEnemies.map((e: any) => [e.id, e])
      );

      const damageToPlayers: Record<string, number> = {};
      const damageToEnemies: Record<string, number> = {};
      const crossedEnemyIds: string[] = [];
      let crossedEnemyDamageTotal = 0;
      const crossedPlayerIds: string[] = [];
      const Y_TOL = 1;

      const inReach = (
        ax: number,
        ay: number,
        bx: number,
        by: number,
        reach: number
      ) => {
        return Math.abs(ax - bx) <= reach && Math.abs(ay - by) <= reach;
      };

      let playerReachedEnemyBase = false;

      // Acquire targets and move/attack for players
      for (const p of nextActivePlayerSprites as any[]) {
        let targetId = p.targetId as string | null;
        let target = targetId ? enemiesById[targetId] : null;
        if (!target || !inReach(p.x, p.y, target.x, target.y, p.reach)) {
          // find a new target within reach
          target = null;
          for (const e of nextActiveEnemies as any[]) {
            if (inReach(p.x, p.y, e.x, e.y, p.reach)) {
              target = e;
              break;
            }
          }
          p.targetId = target ? target.id : null;
        }
        if (p.targetId && target) {
          // stop movement and attack if ready
          if (now >= (p.nextAtkAt as number)) {
            damageToEnemies[target.id] =
              (damageToEnemies[target.id] || 0) + p.damage;
            p.nextAtkAt =
              now + (1000 / Math.max(0.001, p.atckSpeed)) / Math.max(1, speedMultiplier);
          }
        } else {
          // no target: move using existing simple pathing
          const step = p.speed * ratio * Math.max(1, speedMultiplier);
          if (p.y < 230 * ratio) {
            p.x = p.x - step;
          } else if (p.x > 1600 * ratio) {
            p.y = p.y - step;
          } else {
            p.x = p.x + step;
          }
          // remove players that cross the map limit immediately
          if (
            (p as any).id &&
            p.x <= playerMaxX &&
            Math.abs(p.y - playerSpawnPosition[1]) > Y_TOL
          ) {
            crossedPlayerIds.push((p as any).id);
            playerReachedEnemyBase = true;
          }
        }
      }

      // Acquire targets and move/attack for enemies
      for (const e of nextActiveEnemies as any[]) {
        let targetId = e.targetId as string | null;
        let target = targetId ? playersById[targetId] : null;
        if (!target || !inReach(e.x, e.y, target.x, target.y, e.reach)) {
          target = null;
          for (const p of nextActivePlayerSprites as any[]) {
            if (inReach(e.x, e.y, p.x, p.y, e.reach)) {
              target = p;
              break;
            }
          }
          e.targetId = target ? target.id : null;
        }
        if (e.targetId && target) {
          if (now >= (e.nextAtkAt as number)) {
            damageToPlayers[target.id] =
              (damageToPlayers[target.id] || 0) + e.damage;
            e.nextAtkAt =
              now + (1000 / Math.max(0.001, e.atckSpeed)) / Math.max(1, speedMultiplier);
          }
        } else {
          // move
          const step = e.speed * ratio * Math.max(1, speedMultiplier);
          if (e.y > 1550 * ratio) {
            e.x = e.x - step;
          } else if (e.x > 1600 * ratio) {
            e.y = e.y + step;
          } else {
            e.x = e.x + step;
          }
          // if an enemy reaches the base boundary, damage base and remove
          if (
            (e as any).id &&
            e.x <= enemyMaxX &&
            Math.abs(e.y - enemySpawnPosition[1]) > Y_TOL
          ) {
            crossedEnemyIds.push((e as any).id);
            crossedEnemyDamageTotal += e.damage ?? 1;
          }
        }
      }

      // Apply base HP loss when any enemy crosses (only -1 regardless of count),
      // remove crossed enemies, and trigger game over if base HP hits 0
      if (crossedEnemyIds.length) {
        const nextHp = Math.max(0, baseHpRef.current - 1);
        setBaseHp(nextHp);
        for (let i = nextActiveEnemies.length - 1; i >= 0; i--) {
          const eid = (nextActiveEnemies[i] as any).id;
          if (eid && crossedEnemyIds.includes(eid)) {
            nextActiveEnemies.splice(i, 1);
          }
        }
        if (nextHp <= 0 && !waveCompletedRef.current) {
          waveCompletedRef.current = true;
          setStarted(false);
          setActivePlayerSprites([]);
          setActiveEnemySprites([]);
          spawnBufferRef.current = [];
          for (const tid of enemySpawnTimeoutsRef.current) clearTimeout(tid);
          enemySpawnTimeoutsRef.current = [];
          setEnemiesRemaining(0);
          try {
            const totalWaves = waveEnemies?.length || 0;
            const survived = Math.max(0, Math.min(totalWaves, wave - 1));
            const percent = totalWaves > 0 ? survived / totalWaves : 0;
            const rw = rewards || { coins: 0, gems: 0, deposits: 0 };
            const partial = {
              coins: Math.floor((rw.coins || 0) * percent),
              gems: Math.floor((rw.gems || 0) * percent),
              deposits: Math.floor((rw.deposits || 0) * percent),
            };
            // Persist rewards (keep earned coins plus partial end reward)
            if (typeof window !== "undefined") {
              const prevCoins =
                parseInt(window.localStorage.getItem("coins") || "0", 10) || 0;
              const prevGems =
                parseInt(window.localStorage.getItem("gems") || "0", 10) || 0;
              const prevDeposits =
                parseInt(window.localStorage.getItem("deposits") || "0", 10) ||
                0;
              window.localStorage.setItem(
                "coins",
                String(prevCoins + coins + (partial.coins || 0))
              );
              window.localStorage.setItem(
                "gems",
                String(prevGems + (partial.gems || 0))
              );
              window.localStorage.setItem(
                "deposits",
                String(prevDeposits + (partial.deposits || 0))
              );
            }
            setGameOverRewards(partial);
          } catch {}
          setGameOver(true);
        }
      }
      // Remove crossed players immediately
      if (crossedPlayerIds.length) {
        for (let i = nextActivePlayerSprites.length - 1; i >= 0; i--) {
          const pid = (nextActivePlayerSprites[i] as any).id;
          if (pid && crossedPlayerIds.includes(pid)) {
            nextActivePlayerSprites.splice(i, 1);
          }
        }
      }

      // If any player reached enemy base, finish the wave immediately
      if (playerReachedEnemyBase && !waveCompletedRef.current) {
        waveCompletedRef.current = true;
        setStarted(false);
        setActivePlayerSprites([]);
        setActiveEnemySprites([]);
        // Clear any buffered spawns from this round
        spawnBufferRef.current = [];
        for (const tid of enemySpawnTimeoutsRef.current) clearTimeout(tid);
        enemySpawnTimeoutsRef.current = [];
        setEnemiesRemaining(0);
        if (wave < (waveEnemies?.length || 0)) {
          setWave((w) => (w < (waveEnemies?.length || 0) ? w + 1 : w));
        } else {
          try {
            if (typeof window !== "undefined") {
              const prevCoins =
                parseInt(window.localStorage.getItem("coins") || "0", 10) || 0;
              const prevGems =
                parseInt(window.localStorage.getItem("gems") || "0", 10) || 0;
              const prevDeposits =
                parseInt(window.localStorage.getItem("deposits") || "0", 10) ||
                0;
              const rw = rewards || { coins: 0, gems: 0, deposits: 0 };
              window.localStorage.setItem(
                "coins",
                String(prevCoins + (rw.coins || 0))
              );
              window.localStorage.setItem(
                "gems",
                String(prevGems + (rw.gems || 0))
              );
              window.localStorage.setItem(
                "deposits",
                String(prevDeposits + (rw.deposits || 0))
              );
              window.localStorage.setItem(
                "currentLevel",
                String(currentLevel + 1)
              );
            }
          } catch {}
          setLevelCompleted(true);
        }
      }

      // Apply pending damage using updated rosters
      const enemiesByIdAfter: Record<string, any> = Object.fromEntries(
        nextActiveEnemies.map((e: any) => [e.id, e])
      );
      const playersByIdAfter: Record<string, any> = Object.fromEntries(
        nextActivePlayerSprites.map((p: any) => [p.id, p])
      );
      for (const [enemyId, dmg] of Object.entries(damageToEnemies)) {
        const e = enemiesByIdAfter[enemyId];
        if (e) e.hp = Math.max(0, e.hp - dmg);
      }
      for (const [playerId, dmg] of Object.entries(damageToPlayers)) {
        const p = playersByIdAfter[playerId];
        if (p) p.hp = Math.max(0, p.hp - dmg);
      }

      // Remove dead and clear target pointers to dead
      const deadEnemies = nextActiveEnemies.filter((e: any) => e.hp <= 0);
      const aliveEnemies = nextActiveEnemies.filter((e: any) => e.hp > 0);
      const aliveEnemyIds = new Set(aliveEnemies.map((e: any) => e.id));
      nextActivePlayerSprites.forEach((p: any) => {
        if (p.targetId && !aliveEnemyIds.has(p.targetId)) p.targetId = null;
      });
      const alivePlayers = nextActivePlayerSprites.filter((p: any) => p.hp > 0);
      const alivePlayerIds = new Set(alivePlayers.map((p: any) => p.id));
      aliveEnemies.forEach((e: any) => {
        if (e.targetId && !alivePlayerIds.has(e.targetId)) e.targetId = null;
      });

      // Award coins for kills
      const gained = deadEnemies.reduce(
        (sum: number, e: any) => sum + (e.reward ?? 0),
        0
      );
      if (gained) setCoins((prev) => prev + gained);

      // Progress wave by counting both kills and crossed
      const totalRemoved = deadEnemies.length + crossedEnemyIds.length;
      if (totalRemoved) {
        setEnemiesRemaining((prev) => {
          const next = Math.max(0, prev - totalRemoved);
          if (prev > 0 && next === 0 && !waveCompletedRef.current) {
            waveCompletedRef.current = true;
            setStarted(false);
            setActivePlayerSprites([]);
            setActiveEnemySprites([]);
            // clear any remaining scheduled spawns just in case
            for (const tid of enemySpawnTimeoutsRef.current) clearTimeout(tid);
            enemySpawnTimeoutsRef.current = [];
            // Progress wave or finish level
            if (wave < (waveEnemies?.length || 0)) {
              setWave((w) => (w < (waveEnemies?.length || 0) ? w + 1 : w));
            } else {
              // Final wave completed
              try {
                if (typeof window !== "undefined") {
                  const prevCoins =
                    parseInt(window.localStorage.getItem("coins") || "0", 10) ||
                    0;
                  const prevGems =
                    parseInt(window.localStorage.getItem("gems") || "0", 10) ||
                    0;
                  const prevDeposits =
                    parseInt(
                      window.localStorage.getItem("deposits") || "0",
                      10
                    ) || 0;
                  const rw = rewards || { coins: 0, gems: 0, deposits: 0 };
                  window.localStorage.setItem(
                    "coins",
                    String(prevCoins + coins + (rw.coins || 0))
                  );
                  window.localStorage.setItem(
                    "gems",
                    String(prevGems + (rw.gems || 0))
                  );
                  window.localStorage.setItem(
                    "deposits",
                    String(prevDeposits + (rw.deposits || 0))
                  );
                  window.localStorage.setItem(
                    "currentLevel",
                    String(currentLevel + 1)
                  );
                }
              } catch {}
              setLevelCompleted(true);
            }
          }
          return next;
        });
      }
      // Commit updated rosters (or clear if wave finished)
      if (waveCompletedRef.current) {
        setActivePlayerSprites([]);
        setActiveEnemySprites([]);
      } else {
        setActivePlayerSprites(alivePlayers);
        setActiveEnemySprites(aliveEnemies);
      }
    }, MOVE_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };
  }, [started]);

  const scheduleWaveSpawns = React.useCallback(() => {
    // Clear any previous scheduled timeouts and existing rosters before scheduling
    for (const tid of enemySpawnTimeoutsRef.current) clearTimeout(tid);
    enemySpawnTimeoutsRef.current = [];
    setActiveEnemySprites([]);
    setActivePlayerSprites([]);
    spawnBufferRef.current = [];
    waveCompletedRef.current = false;
    setGameOver(false);

    const totalWaves = waveEnemies?.length || 0;
    const waveIndex = Math.max(1, Math.min(wave, totalWaves)) - 1;
    const enemies = totalWaves > 0 ? waveEnemies[waveIndex] || [] : [];
    let totalToSpawn = 0;
    for (const cfg of enemies) totalToSpawn += cfg.quantity ?? 0;
    setEnemiesRemaining(totalToSpawn);

    let cumulativeDelayMs = 0;
    for (const cfg of enemies) {
      const stepMs = Math.max(
        1,
        Math.floor(((cfg.spawnDelay ?? 0) * 1000) / Math.max(1, speedMultiplier))
      );
      for (let i = 0; i < (cfg.quantity ?? 0); i++) {
        const scheduleAt = cumulativeDelayMs;
        const timeoutId = setTimeout(() => {
          const dx = Math.random() * 8; // nudge inside the map (avoid immediate boundary)
          const dy = Math.random() * 16 - 8;
          setActiveEnemySprites((prev) => [
            ...prev,
            {
              id: `e-${++enemyIdRef.current}`,
              sprite: cfg.enemy,
              x: enemySpawnPosition[0] + dx,
              y: enemySpawnPosition[1] + dy,
              speed: cfg.speed,
              hp: cfg.hp,
              maxHp: cfg.hp,
              damage: cfg.damage,
              reach: cfg.reach,
              atckSpeed: cfg.atckSpeed,
              reward: cfg.reward,
              targetId: null,
              nextAtkAt: 0,
            },
          ]);
        }, scheduleAt) as unknown as number;
        enemySpawnTimeoutsRef.current.push(timeoutId);
        cumulativeDelayMs += stepMs;
      }
    }
  }, [wave, waveEnemies]);

  // Reset trigger/cog animation state when not started or on wave change
  useEffect(() => {
    if (!started) {
      setRotationAngles(Array.from({ length: 24 }).map(() => 0));
      setSpecialSpinCounts(Array.from({ length: 24 }).map(() => 0));
      setTriggerPhase(0);
    }
  }, [started, wave]);

  // Advance trigger phase; on each phase, rotate triggers + impacted connected cogs by 90° clockwise
  useEffect(() => {
    if (!started) return;

    const total = cells.length;
    const rows = Math.floor((total - 1) / COLUMNS) + 1;
    const rowOf = (idx: number) => Math.floor(idx / COLUMNS);
    const isCogValue = (v: number) => v !== 0 && v !== -1; // any non-empty non-trigger piece is a cog

    const getDirectionalNeighbor = (idx: number, phase: number) => {
      const row = rowOf(idx);
      const col = idx % COLUMNS;
      if (phase === 0) return row < rows - 1 ? idx + COLUMNS : -1; // down
      if (phase === 1) return col > 0 ? idx - 1 : -1; // left
      if (phase === 2) return row > 0 ? idx - COLUMNS : -1; // up
      return col < COLUMNS - 1 ? idx + 1 : -1; // right
    };

    const rotateStep = (phaseForStep: number) => {
      const toRotate = new Set<number>();

      // Triggers always rotate
      const triggers: number[] = [];
      for (let i = 0; i < total; i++)
        if (cells[i] === -1) {
          triggers.push(i);
          toRotate.add(i);
        }

      // BFS from the impacted neighbor for each trigger
      for (const t of triggers) {
        const neighbor = getDirectionalNeighbor(t, phaseForStep);
        if (neighbor < 0) continue;
        if (!isCogValue(cells[neighbor])) continue; // start only from a cog
        const visited = Array.from({ length: total }).map(() => false);
        const queue: number[] = [neighbor];
        visited[neighbor] = true;
        while (queue.length) {
          const cur = queue.shift() as number;
          toRotate.add(cur); // cur is a cog by construction
          const r = rowOf(cur);
          const c = cur % COLUMNS;
          const neighbors = [
            r > 0 ? cur - COLUMNS : -1,
            r < rows - 1 ? cur + COLUMNS : -1,
            c > 0 ? cur - 1 : -1,
            c < COLUMNS - 1 ? cur + 1 : -1,
          ].filter((n) => n >= 0 && isCogValue(cells[n])) as number[]; // traverse only through cogs
          for (const n of neighbors)
            if (!visited[n]) {
              visited[n] = true;
              queue.push(n);
            }
        }
      }

      if (toRotate.size === 0) return;
      setRotationAngles((prev) => {
        const next = [...prev];
        for (const idx of toRotate) next[idx] = next[idx] + 90; // accumulate to avoid wrap glitches
        return next;
      });

      // update special cog spin counts and collect spawns using a ref buffer
      setSpecialSpinCounts((prev) => {
        const next = [...prev];
        const localSpawns: string[] = [];
        for (const idx of toRotate) {
          const v = cells[idx];
          const info = (cogValueMap as any)[
            v.toString() as keyof typeof cogValueMap
          ];
          const points = info?.points as number | undefined;
          if (points && points > 0) {
            const current = next[idx] || 0;
            const incremented = current + 1;
            next[idx] = incremented >= points ? 0 : incremented;
            if (incremented >= points) localSpawns.push(info.file);
          }
        }
        spawnBufferRef.current = localSpawns;
        return next;
      });

      const toSpawn = spawnBufferRef.current;
      if (toSpawn && toSpawn.length) {
        spawnBufferRef.current = [];
        // Read character levels and deposit upgrades once per spawn batch
        let levelByName = new Map<string, number>();
        let depositBoost = { hp: 0, damage: 0, speed: 0 } as {
          hp: number;
          damage: number;
          speed: number;
        };
        try {
          if (typeof window !== "undefined") {
            const rawChars = window.localStorage.getItem("characters");
            if (rawChars) {
              const parsed = JSON.parse(rawChars) as {
                name: string;
                level: number;
              }[];
              parsed.forEach((c) => {
                if (c?.name) levelByName.set(c.name, Math.max(1, c.level || 1));
              });
            }
            const rawDeposits = window.localStorage.getItem("depositUpgrades");
            if (rawDeposits) {
              const parsedD = JSON.parse(rawDeposits) as {
                name: string;
                boost?: { hp?: number; damage?: number; speed?: number };
              }[];
              parsedD.forEach((u) => {
                if (u?.boost?.hp) depositBoost.hp += Number(u.boost.hp) || 0;
                if (u?.boost?.damage)
                  depositBoost.damage += Number(u.boost.damage) || 0;
                if (u?.boost?.speed)
                  depositBoost.speed += Number(u.boost.speed) || 0;
              });
            }
          }
        } catch {}

        setActivePlayerSprites((prev) => [
          ...prev,
          ...toSpawn.map((sprite) => {
            const dx = Math.random() * 16 - 8;
            const dy = Math.random() * 16 - 8;
            const baseX = playerSpawnPosition[0] + dx;
            const safeX = Math.max(playerMaxX + 1, baseX);

            const baseStats =
              playerSpriteStats[sprite as keyof typeof playerSpriteStats];
            const level = levelByName.get(sprite) || 1;
            const hp = baseStats.hp + (level - 1) * 2 + depositBoost.hp;
            const damage = baseStats.damage + (level - 1) * 2 + depositBoost.damage;

            const upgrades = (spriteUpgradeMap as any)[sprite] as
              | string[]
              | undefined;
            const maxIdx = Math.max(0, (upgrades?.length || 1) - 1);
            const idx = Math.max(0, Math.min(level - 1, maxIdx));
            const displaySprite =
              upgrades && upgrades.length ? upgrades[idx] : sprite;

            return {
              id: `p-${++playerIdRef.current}`,
              sprite,
              displaySprite,
              x: safeX,
              y: playerSpawnPosition[1] + dy,
              speed: baseStats.speed + depositBoost.speed,
              hp,
              maxHp: hp,
              damage,
              reach: baseStats.reach,
              atckSpeed: baseStats.atckSpeed,
              targetId: null,
              nextAtkAt: 0,
            };
          }),
        ]);
      }
    };

    const PHASE_INTERVAL_MS = 600;
    let phase = 0; // start from 'down' consistently
    setTriggerPhase(phase);
    // initial step
    rotateStep(phase);
    const id = setInterval(() => {
      phase = (phase + 1) % 4;
      setTriggerPhase(phase);
      rotateStep(phase);
    }, Math.max(60, PHASE_INTERVAL_MS / Math.max(1, speedMultiplier)));
    return () => clearInterval(id);
  }, [started, cells, speedMultiplier]);

  return (
    <div
      style={{
        backgroundImage: "url('/resources/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="w-full h-screen overflow-hidden flex items-center justify-start gap-8 text-white"
    >
      <div className="flex flex-col w-80 h-full p-4 gap-4">
        <div className="w-full flex justify-between">
          <div className="bg-black/60 rounded-2xl gap-2 px-4 py-2 flex items-center">
            <img src="/resources/coin.png" alt="cog" className="w-6 h-6" />
            <strong>{coins}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="bg-indigo-500 rounded-2xl px-3 py-2 cursor-pointer"
              onClick={() =>
                setSpeedMultiplier((prev) => {
                  const next = (prev % 3) + 1;
                  return next;
                })
              }
              title="Toggle speed 1x/2x/3x"
            >
              {speedMultiplier}x
            </button>
            {!started && (
              <button
                className="bg-green-500 rounded-2xl px-4 py-2 cursor-pointer disabled:opacity-80"
                onClick={() => {
                  setStarted(true);
                  scheduleWaveSpawns();
                }}
                disabled={
                  (wave === 1 && coins > 11) || (waveEnemies?.length || 0) === 0
                }
              >
                Start
              </button>
            )}
          </div>
        </div>
        {!started ? (
          <div className="w-full flex flex-col flex-1 bg-black/60 rounded-2xl p-4 gap-4">
            <strong>Shop</strong>
            <div className="grid grid-cols-3 gap-4">
              {currentShopItems.map((value, i) => {
                const cog =
                  cogValueMap[value.toString() as keyof typeof cogValueMap];
                const used = !!waveOptionUse[i];
                const price = (cog as any).price ?? 0;
                const canAfford = coins >= price;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center gap-2"
                  >
                    <div
                      className={`${
                        used || !canAfford
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-grab active:cursor-grabbing"
                      } select-none`}
                      draggable={!used && canAfford}
                      onDragStart={(e) => {
                        if (used || !canAfford) {
                          e.preventDefault();
                          return;
                        }
                        setDraggingCogValue(value);
                        setDraggingShopIndex(i);
                        try {
                          e.dataTransfer.setData("text/plain", String(value));
                        } catch {}
                        try {
                          e.dataTransfer.effectAllowed = "copy";
                        } catch {}
                      }}
                      onDragEnd={() => {
                        setDraggingCogValue(null);
                        setDraggingShopIndex(null);
                      }}
                    >
                      <img
                        src={`/resources/cogs/${cog.file}.png`}
                        alt="cog"
                        draggable={false}
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <img
                        src="/resources/coin.png"
                        alt="cog"
                        className="w-4 h-4"
                      />
                      <strong>{cog.price}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 w-160">
        <div className="w-full relative border-2 rounded-2xl px-4 py-2 bg-black/60 text-white flex flex-col gap-2">
          <div className="w-full flex items-center justify-between">
            <span>
              Round {wave}/{Math.max(1, waveEnemies?.length || 0)}
            </span>
            <strong>
              HP {baseHp}/{baseMaxHpRef.current}
            </strong>
          </div>
          <div
            className="w-full"
            style={{
              height: 10,
              backgroundColor: "rgba(0,0,0,0.4)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width:
                  Math.max(0, Math.min(1, baseHp / baseMaxHpRef.current)) *
                    100 +
                  "%",
                height: 10,
                backgroundColor: "red",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>
        <div
          className="w-160 h-160 relative"
          style={{
            backgroundImage: "url('/resources/map.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {activeEnemySprites.map((sprite, i) => (
            <img
              key={`enemy-${i}`}
              src={`/resources/sprites/${sprite.sprite}.png`}
              alt="enemy"
              className="object-contain absolute"
              style={{
                width: 200 * ratio,
                height: 200 * ratio,
                top: sprite.y,
                right: sprite.x,
                zIndex: 18,
                pointerEvents: "none",
              }}
            />
          ))}
          {activeEnemySprites.map((sprite, i) => (
            <div
              key={`enemy-hp-${i}`}
              className="absolute"
              style={{
                width: 50 * ratio,
                height: 6,
                top: sprite.y - 8,
                right: sprite.x,
                zIndex: 19,
                backgroundColor: "rgba(0,0,0,0.4)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width:
                    Math.max(
                      0,
                      Math.min(1, sprite.hp / (sprite as any).maxHp)
                    ) *
                    (50 * ratio),
                  height: 6,
                  backgroundColor: "red",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          ))}
          {activePlayerSprites.map((sprite, i) => (
            <img
              key={i}
              src={`/resources/sprites/${
                (sprite as any).displaySprite || sprite.sprite
              }.png`}
              alt="sprite"
              className="object-contain absolute"
              style={{
                width: 200 * ratio,
                height: 200 * ratio,
                top: sprite.y,
                right: sprite.x,
                zIndex: 20,
                pointerEvents: "none",
              }}
            />
          ))}
          {activePlayerSprites.map((sprite, i) => (
            <div
              key={`player-hp-${i}`}
              className="absolute"
              style={{
                width: 50 * ratio,
                height: 6,
                top: sprite.y - 8,
                right: sprite.x,
                zIndex: 21,
                backgroundColor: "rgba(0,0,0,0.4)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width:
                    Math.max(
                      0,
                      Math.min(1, sprite.hp / (sprite as any).maxHp)
                    ) *
                    (50 * ratio),
                  height: 6,
                  backgroundColor: "red",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          ))}
          <div
            className="absolute bg-red-500/50 border-2 border-black grid grid-cols-6 overflow-hidden"
            style={{
              width: 1200 * ratio,
              height: 800 * ratio,
              right: 200 * ratio,
              bottom: 600 * ratio,
              borderRadius: 50 * ratio,
            }}
          >
            {cells.map((value, i) => {
              const info = (cogValueMap as any)[value.toString()];
              const points = info?.points as number | undefined;
              const count = specialSpinCounts[i] || 0;
              const tintRatio =
                points && points > 1 ? Math.min(1, count / (points - 1)) : 0;
              return (
                <Cell
                  key={i}
                  value={value}
                  index={i}
                  rotationDeg={rotationAngles[i] || 0}
                  tintRatio={tintRatio}
                  onDropCog={(cellIndex) => {
                    const droppedValue = draggingCogValue;
                    if (droppedValue === null) return;
                    // Disallow dropping on triggers (-1) or already occupied cells (non-zero)
                    if (cells[cellIndex] !== 0) {
                      setDraggingCogValue(null);
                      setDraggingShopIndex(null);
                      setDraggingFromCellIndex(null);
                      return;
                    }
                    // If dragging from another cell, move without cost
                    if (draggingFromCellIndex !== null) {
                      setCells((prev) =>
                        prev.map((v, idx) => {
                          if (idx === cellIndex) return droppedValue;
                          if (idx === draggingFromCellIndex) return 0;
                          return v;
                        })
                      );
                      setDraggingCogValue(null);
                      setDraggingShopIndex(null);
                      setDraggingFromCellIndex(null);
                      return;
                    }
                    const price =
                      (
                        cogValueMap[
                          droppedValue.toString() as keyof typeof cogValueMap
                        ] as any
                      ).price ?? 0;
                    if (coins < price) {
                      setDraggingCogValue(null);
                      setDraggingShopIndex(null);
                      return;
                    }
                    setCells((prev) =>
                      prev.map((v, idx) =>
                        idx === cellIndex ? droppedValue : v
                      )
                    );
                    setCoins((prev) => Math.max(0, prev - price));
                    if (draggingShopIndex !== null) {
                      setWaveOptionUse((prev) => {
                        const next = prev.length
                          ? [...prev]
                          : Array(currentShopItems.length).fill(false);
                        next[draggingShopIndex] = true;
                        return next;
                      });
                    }
                    setDraggingCogValue(null);
                    setDraggingShopIndex(null);
                  }}
                  canDrag={!started}
                  onDragStartFromCell={(idx, val) => {
                    setDraggingCogValue(val);
                    setDraggingFromCellIndex(idx);
                  }}
                  onDragEndFromCell={() => {
                    setDraggingCogValue(null);
                    setDraggingFromCellIndex(null);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      {levelCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto bg-black/80 text-white rounded-2xl p-6 shadow-xl border border-white/10">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">
                Level {currentLevel} Completed!
              </h2>
              <p className="text-white/80 mt-1">Rewards gained</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <img src="/resources/coin.png" alt="coin" className="w-7 h-7" />
                <div className="text-sm uppercase tracking-wide text-white/70">
                  Coins
                </div>
                <div className="text-xl font-semibold">
                  {rewards?.coins ?? 0}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img src="/resources/gem.png" alt="gem" className="w-7 h-7" />
                <div className="text-sm uppercase tracking-wide text-white/70">
                  Gems
                </div>
                <div className="text-xl font-semibold">
                  {rewards?.gems ?? 0}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img
                  src="/resources/deposit.png"
                  alt="deposit"
                  className="w-7 h-7"
                />
                <div className="text-sm uppercase tracking-wide text-white/70">
                  Deposits
                </div>
                <div className="text-xl font-semibold">
                  {rewards?.deposits ?? 0}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center">
              <button
                className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 transition-colors"
                onClick={() => router.replace("/home")}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto bg-black/80 text-white rounded-2xl p-6 shadow-xl border border-white/10">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">Game Over</h2>
              <p className="text-white/80 mt-1">Rewards gained</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <img src="/resources/coin.png" alt="coin" className="w-7 h-7" />
                <div className="text-sm uppercase tracking-wide text-white/70">
                  Coins
                </div>
                <div className="text-xl font-semibold">
                  {gameOverRewards.coins}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img src="/resources/gem.png" alt="gem" className="w-7 h-7" />

                <div className="text-sm uppercase tracking-wide text-white/70">
                  Gems
                </div>
                <div className="text-xl font-semibold">
                  {gameOverRewards.gems}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img
                  src="/resources/deposit.png"
                  alt="deposit"
                  className="w-7 h-7"
                />
                <div className="text-sm uppercase tracking-wide text-white/70">
                  Deposits
                </div>
                <div className="text-xl font-semibold">
                  {gameOverRewards.deposits}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center">
              <button
                className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 transition-colors"
                onClick={() => router.replace("/home")}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default page;

const Cell = ({
  index,
  value,
  rotationDeg,
  tintRatio,
  onDropCog,
  canDrag,
  onDragStartFromCell,
  onDragEndFromCell,
}: {
  index: number;
  value: number;
  rotationDeg: number;
  tintRatio: number;
  onDropCog: (index: number) => void;
  canDrag: boolean;
  onDragStartFromCell: (index: number, value: number) => void;
  onDragEndFromCell: () => void;
}) => {
  const [isOver, setIsOver] = React.useState(false);

  return (
    <div
      id={`cell-${index}`}
      className={`w-full h-full border flex items-center justify-center relative border-black ${
        isOver ? "bg-white/20 ring-4 ring-yellow-400" : ""
      }`}
      onDragOver={(e) => {
        // Necessary to allow dropping
        e.preventDefault();
        try {
          e.dataTransfer.dropEffect = "copy";
        } catch {}
      }}
      onDragEnter={() => setIsOver(true)}
      onDragLeave={() => setIsOver(false)}
      draggable={canDrag && value !== 0 && value !== -1}
      onDragStart={(e) => {
        if (!(canDrag && value !== 0 && value !== -1)) return;
        try {
          e.dataTransfer.setData("text/plain", String(value));
          e.dataTransfer.effectAllowed = "move";
        } catch {}
        onDragStartFromCell(index, value);
      }}
      onDragEnd={() => {
        onDragEndFromCell();
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        onDropCog(index);
      }}
    >
      {value ? (
        <img
          src={`/resources/cogs/${
            (cogValueMap[value.toString() as keyof typeof cogValueMap] as any)
              .file
          }.png`}
          alt="cog"
          className={"absolute top-1/2 left-1/2 pointer-events-none"}
          style={{
            width: 200 * ratio,
            height: 200 * ratio,
            transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
            transformOrigin: "50% 50%",
            transition: "transform 0.35s ease-in-out",
          }}
        />
      ) : null}
      {value &&
      (cogValueMap[value.toString() as keyof typeof cogValueMap] as any)
        ?.points ? (
        <div
          className={"absolute w-full h-full pointer-events-none"}
          style={{
            width: 200 * ratio,
            height: 200 * ratio,
            pointerEvents: "none",
            backgroundColor: `rgba(0, 255, 0, ${Math.max(
              0,
              Math.min(1, tintRatio)
            )})`,
            mixBlendMode: "color",
            transition:
              "background-color 0.35s ease-in-out, transform 0.35s ease-in-out",
          }}
        />
      ) : null}
    </div>
  );
};
