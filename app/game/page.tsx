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
  const [spinning, setSpinning] = useState<boolean[]>(
    Array.from({ length: 24 }).map(() => false)
  );

  React.useEffect(() => {
    // Reset availability each wave (new round)
    setWaveOptionUse(Array(waveOptionMap[wave - 1].length).fill(false));
  }, [wave]);

  useEffect(() => {
    if (!started) return;
  }, [started]);

  useEffect(() => {
    if (!started) {
      setSpinning(Array.from({ length: cells.length }).map(() => false));
      return;
    }
    const total = cells.length;
    const getNeighbors = (idx: number) => {
      const neighbors: number[] = [];
      const row = Math.floor(idx / COLUMNS);
      const col = idx % COLUMNS;
      if (row > 0) neighbors.push(idx - COLUMNS); // up
      if (row < Math.floor((total - 1) / COLUMNS)) neighbors.push(idx + COLUMNS); // down
      if (col > 0) neighbors.push(idx - 1); // left
      if (col < COLUMNS - 1) neighbors.push(idx + 1); // right
      return neighbors;
    };

    const starts: number[] = [];
    for (let i = 0; i < total; i++) {
      if (cells[i] === -1) starts.push(i);
    }

    if (starts.length === 0) {
      setSpinning(Array.from({ length: total }).map(() => false));
      return;
    }

    const visited = Array.from({ length: total }).map(() => false);
    const queue: number[] = [];
    for (const s of starts) {
      visited[s] = true;
      queue.push(s);
    }

    while (queue.length) {
      const current = queue.shift() as number;
      const neighbors = getNeighbors(current);
      for (const n of neighbors) {
        if (!visited[n] && cells[n] !== 0) {
          visited[n] = true;
          queue.push(n);
        }
      }
    }

    setSpinning(visited);
  }, [cells, started]);

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
              isSpinning={!!spinning[i]}
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
  isSpinning,
  onDropCog,
}: {
  index: number;
  value: number;
  isSpinning: boolean;
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
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none ${
            isSpinning ? "animate-spin" : ""
          }`}
          style={{
            width: 200 * ratio,
            height: 200 * ratio,
          }}
        />
      ) : null}
    </div>
  );
};
