"use client";

import Image from "next/image";
import React, { useState } from "react";

const cogValueMap = {
  "-10": {
    file: "madars",
  },
  "1": {
    file: "cog",
  },
  "-1": {
    file: "trigger",
  },
};

const waveOptionMap = [
  [-10, 1, -10],
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
];

const ratio = 640 / 2000;

const page = () => {
  const [wave, setWave] = useState<number>(1);
  const [cells, setCells] = useState<number[]>(
    Array.from({ length: 24 }).map((_, i) => (i === 9 ? -1 : 0))
  );

  return (
    <div
      style={{
        backgroundImage: "url('/resources/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="w-full h-screen overflow-hidden flex items-center justify-start gap-8"
    >
      <div className="flex flex-col w-80 h-full p-4">
        <div className="w-full flex flex-col h-full bg-black/60 rounded-2xl"></div>
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
            <Cell key={i} value={value} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default page;

const Cell = ({ index, value }: { index: number; value: number }) => {
  return (
    <div
      id={`cell-${index}`}
      className="w-full h-full border flex items-center justify-center relative border-black"
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 200 * ratio,
            height: 200 * ratio,
          }}
        />
      ) : null}
    </div>
  );
};
