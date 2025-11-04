"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";

const cogValueMap = {
  "-10": {
    file: "madars",
    price: 12,
    points: 5,
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

const playerSpawnPosition = [(293 / 2) * ratio, 300 * ratio];
const enemySpawnPosition = [393 * ratio, 300 * ratio];

const waveEnemies = [
  [{ enemy: "toms", quantity: 3, spawnDelay: 3, speed: 1, hp: 3, damage: 1 }],
];

const playerSpriteStats = { madars: { speed: 1, hp: 5, damage: 2 } };

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
  const [triggerPhase, setTriggerPhase] = useState<number>(0); // 0: down, 1: left, 2: up, 3: right

  React.useEffect(() => {
    // Reset availability each wave (new round)
    setWaveOptionUse(Array(waveOptionMap[wave - 1].length).fill(false));
  }, [wave]);

  useEffect(() => {
    if (!started) return;
  }, [started]);

  // Advance trigger phase; on each phase, rotate triggers + impacted connected cogs by 90° clockwise
  useEffect(() => {
    if (!started) return;

    const total = cells.length;
    const rows = Math.floor((total - 1) / COLUMNS) + 1;
    const rowOf = (idx: number) => Math.floor(idx / COLUMNS);

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
      for (let i = 0; i < total; i++) if (cells[i] === -1) { triggers.push(i); toRotate.add(i); }

      // BFS from the impacted neighbor for each trigger
      for (const t of triggers) {
        const neighbor = getDirectionalNeighbor(t, phaseForStep);
        if (neighbor < 0) continue;
        if (cells[neighbor] === 0) continue;
        const visited = Array.from({ length: total }).map(() => false);
        const queue: number[] = [neighbor];
        visited[neighbor] = true;
        while (queue.length) {
          const cur = queue.shift() as number;
          toRotate.add(cur);
          const r = rowOf(cur);
          const c = cur % COLUMNS;
          const neighbors = [
            r > 0 ? cur - COLUMNS : -1,
            r < rows - 1 ? cur + COLUMNS : -1,
            c > 0 ? cur - 1 : -1,
            c < COLUMNS - 1 ? cur + 1 : -1,
          ].filter((n) => n >= 0 && cells[n] !== 0) as number[];
          for (const n of neighbors) if (!visited[n]) { visited[n] = true; queue.push(n); }
        }
      }

      if (toRotate.size === 0) return;
      setRotationAngles((prev) => {
        const next = [...prev];
        for (const idx of toRotate) next[idx] = next[idx] + 90; // accumulate to avoid wrap glitches
        return next;
      });
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
          {cells.map((value, i) => (
            <Cell
              key={i}
              value={value}
              index={i}
              rotationDeg={rotationAngles[i] || 0}
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
          ))}
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
  onDropCog,
}: {
  index: number;
  value: number;
  rotationDeg: number;
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
    </div>
  );
};
