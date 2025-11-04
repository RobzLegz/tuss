"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";

const cogValueMap = {
  "-10": {
    file: "madars",
    price: 12,
    points: 3,
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
  [-10, 1, -10],
  [1, 1, 1],
  [1, 1, 1],
  [1, -10, 1],
  [1, -10, 1],
];

const ratio = 640 / 2000;
const COLUMNS = 6;

const playerSpawnPosition = [(293 / 2) * ratio, 1550 * ratio];
const enemySpawnPosition = [100 * ratio, 200 * ratio];

const waveEnemies = [
  [
    {
      enemy: "janka",
      quantity: 3,
      spawnDelay: 3,
      speed: 30 * ratio,
      hp: 3,
      damage: 1,
      reach: 30,
      atckSpeed: 1,
      reward: 9,
    },
  ],
  [
    {
      enemy: "janka",
      quantity: 5,
      spawnDelay: 3,
      speed: 30 * ratio,
      hp: 3,
      damage: 2,
      reach: 30,
      atckSpeed: 1,
      reward: 9,
    },
    {
      enemy: "zirnis",
      quantity: 2,
      spawnDelay: 3,
      speed: 30 * ratio,
      hp: 10,
      damage: 2,
      reach: 30,
      atckSpeed: 1,
      reward: 15,
    },
  ],
];

const playerSpriteStats = {
  madars: { speed: 30 * ratio, hp: 5, damage: 2, reach: 30, atckSpeed: 1 },
};

const page = () => {
  const [wave, setWave] = useState<number>(1);
  const [coins, setCoins] = useState<number>(22);
  const [started, setStarted] = useState(false);
  const [cells, setCells] = useState<number[]>(
    Array.from({ length: 24 }).map((_, i) => (i === 9 ? -1 : 0))
  );
  const [draggingCogValue, setDraggingCogValue] = useState<number | null>(null);
  const [draggingShopIndex, setDraggingShopIndex] = useState<number | null>(
    null
  );
  const [waveOptionUse, setWaveOptionUse] = useState<boolean[]>([]);
  const [rotationAngles, setRotationAngles] = useState<number[]>(
    Array.from({ length: 24 }).map(() => 0)
  );
  const [specialSpinCounts, setSpecialSpinCounts] = useState<number[]>(
    Array.from({ length: 24 }).map(() => 0)
  );
  const spawnBufferRef = React.useRef<string[]>([]);
  const enemySpawnTimeoutsRef = React.useRef<number[]>([]);
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
      x: number;
      y: number;
      speed: number;
      hp: number;
      damage: number;
      reach: number;
      atckSpeed: number;
    }[]
  >([]);

  const playerIdRef = React.useRef(0);
  const enemyIdRef = React.useRef(0);

  React.useEffect(() => {
    // Reset availability each wave (new round)
    setWaveOptionUse(Array(waveOptionMap[wave - 1].length).fill(false));
  }, [wave]);

  useEffect(() => {
    if (!started) return;
    const MOVE_INTERVAL_MS = 100;

    const id = setInterval(() => {
      const nextActivePlayerSprites = activePlayerSprites.map((sprite) => {
        return { ...sprite };
      });
      // Clone enemies
      const nextActiveEnemies = activeEnemySprites.map((sprite) => ({
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

      const inReach = (
        ax: number,
        ay: number,
        bx: number,
        by: number,
        reach: number
      ) => {
        return Math.abs(ax - bx) <= reach && Math.abs(ay - by) <= reach;
      };

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
            p.nextAtkAt = now + 1000 / Math.max(0.001, p.atckSpeed);
          }
        } else {
          // no target: move using existing simple pathing
          if (p.y < 330 * ratio) {
            p.x = p.x - p.speed * ratio;
          } else if (p.x > 1600 * ratio) {
            p.y = p.y - p.speed * ratio;
          } else {
            p.x = p.x + p.speed * ratio;
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
            e.nextAtkAt = now + 1000 / Math.max(0.001, e.atckSpeed);
          }
        } else {
          // move
          if (e.y > 1650 * ratio) {
            e.x = e.x - e.speed * ratio;
          } else if (e.x > 1600 * ratio) {
            e.y = e.y + e.speed * ratio;
          } else {
            e.x = e.x + e.speed * ratio;
          }
        }
      }

      // Apply pending damage
      for (const [enemyId, dmg] of Object.entries(damageToEnemies)) {
        const e = enemiesById[enemyId];
        if (e) e.hp = Math.max(0, e.hp - dmg);
      }
      for (const [playerId, dmg] of Object.entries(damageToPlayers)) {
        const p = playersById[playerId];
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

      // Award coins for kills and progress wave
      if (deadEnemies.length) {
        const gained = deadEnemies.reduce(
          (sum: number, e: any) => sum + (e.reward ?? 0),
          0
        );
        if (gained) setCoins((prev) => prev + gained);
        setEnemiesRemaining((prev) => {
          const next = Math.max(0, prev - deadEnemies.length);
          if (next === 0) {
            setStarted(false);
            setActivePlayerSprites([]);
            setActiveEnemySprites([]);
            setWave((w) => w + 1);
          }
          return next;
        });
      }

      setActivePlayerSprites(alivePlayers);
      setActiveEnemySprites(aliveEnemies);
    }, MOVE_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };
  }, [started, activePlayerSprites, activeEnemySprites]);

  // Schedule enemy spawns for the current wave respecting per-enemy spawnDelay and quantity
  useEffect(() => {
    if (!started) return;
    // Clear any previous scheduled timeouts
    for (const tid of enemySpawnTimeoutsRef.current) clearTimeout(tid);
    enemySpawnTimeoutsRef.current = [];

    const enemies = waveEnemies[wave - 1] || [];
    let totalToSpawn = 0;
    for (const cfg of enemies) totalToSpawn += cfg.quantity ?? 0;
    setEnemiesRemaining(totalToSpawn);
    for (const cfg of enemies) {
      const delayMs = Math.max(0, (cfg.spawnDelay ?? 0) * 1000);
      for (let i = 0; i < (cfg.quantity ?? 0); i++) {
        const timeoutId = setTimeout(() => {
          setActiveEnemySprites((prev) => [
            ...prev,
            {
              id: `e-${++enemyIdRef.current}`,
              sprite: cfg.enemy,
              x: enemySpawnPosition[0],
              y: enemySpawnPosition[1],
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
        }, i * delayMs) as unknown as number;
        enemySpawnTimeoutsRef.current.push(timeoutId);
      }
    }

    return () => {
      for (const tid of enemySpawnTimeoutsRef.current) clearTimeout(tid);
      enemySpawnTimeoutsRef.current = [];
    };
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
        setActivePlayerSprites((prev) => [
          ...prev,
          ...toSpawn.map((sprite) => ({
            id: `p-${++playerIdRef.current}`,
            sprite,
            x: playerSpawnPosition[0],
            y: playerSpawnPosition[1],
            speed:
              playerSpriteStats[sprite as keyof typeof playerSpriteStats].speed,
            hp: playerSpriteStats[sprite as keyof typeof playerSpriteStats].hp,
            maxHp:
              playerSpriteStats[sprite as keyof typeof playerSpriteStats].hp,
            damage:
              playerSpriteStats[sprite as keyof typeof playerSpriteStats]
                .damage,
            reach:
              playerSpriteStats[sprite as keyof typeof playerSpriteStats].reach,
            atckSpeed:
              playerSpriteStats[sprite as keyof typeof playerSpriteStats]
                .atckSpeed,
            targetId: null,
            nextAtkAt: 0,
          })),
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
    }, PHASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [started, cells]);

  return (
    <div
      style={{
        backgroundImage: "url('/resources/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="w-full h-screen overflow-hidden flex items-center justify-start gap-8"
    >
      <div className="flex flex-col w-80 h-full p-4 gap-4">
        <div className="w-full flex justify-between">
          <div className="bg-black/60 rounded-2xl gap-2 px-4 py-2 flex items-center">
            <Image
              src="/resources/coin.png"
              alt="cog"
              width={20}
              height={20}
              className="w-6 h-6"
            />

            <strong>{coins}</strong>
          </div>

          {!started && (
            <button
              className="bg-green-500 rounded-2xl px-4 py-2 cursor-pointer disabled:opacity-80"
              onClick={() => setStarted(true)}
              disabled={wave === 1 && coins > 11}
            >
              Start
            </button>
          )}
        </div>
        {!started ? (
          <div className="w-full flex flex-col flex-1 bg-black/60 rounded-2xl p-4 gap-4">
            <strong>Shop</strong>
            <div className="grid grid-cols-3 gap-4">
              {waveOptionMap[wave - 1].map((value, i) => {
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
                      <Image
                        src={`/resources/cogs/${cog.file}.png`}
                        alt="cog"
                        width={50}
                        height={50}
                        draggable={false}
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <Image
                        src="/resources/coin.png"
                        alt="cog"
                        width={20}
                        height={20}
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

      <div
        className="w-160 h-160 relative"
        style={{
          backgroundImage: "url('/resources/map.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {activeEnemySprites.map((sprite, i) => (
          <Image
            key={`enemy-${i}`}
            src={`/resources/sprites/${sprite.sprite}.png`}
            alt="enemy"
            width={200}
            height={200}
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
        {activeEnemySprites.map((sprite, i) =>
          sprite.hp < (sprite as any).maxHp ? (
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
                }}
              />
            </div>
          ) : null
        )}
        {activePlayerSprites.map((sprite, i) => (
          <Image
            key={i}
            src={`/resources/sprites/${sprite.sprite}.png`}
            alt="sprite"
            width={200}
            height={200}
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
        {activePlayerSprites.map((sprite, i) =>
          (sprite as any).maxHp && sprite.hp < (sprite as any).maxHp ? (
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
                  backgroundColor: "#22c55e",
                }}
              />
            </div>
          ) : null
        )}
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
                    prev.map((v, idx) => (idx === cellIndex ? droppedValue : v))
                  );
                  setCoins((prev) => Math.max(0, prev - price));
                  if (draggingShopIndex !== null) {
                    setWaveOptionUse((prev) => {
                      const next = prev.length
                        ? [...prev]
                        : Array(waveOptionMap[wave - 1].length).fill(false);
                      next[draggingShopIndex] = true;
                      return next;
                    });
                  }
                  setDraggingCogValue(null);
                  setDraggingShopIndex(null);
                }}
              />
            );
          })}
        </div>
      </div>
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
}: {
  index: number;
  value: number;
  rotationDeg: number;
  tintRatio: number;
  onDropCog: (index: number) => void;
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
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        onDropCog(index);
      }}
    >
      {value ? (
        <Image
          src={`/resources/cogs/${
            (cogValueMap[value.toString() as keyof typeof cogValueMap] as any)
              .file
          }.png`}
          alt="cog"
          width={100}
          height={100}
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
