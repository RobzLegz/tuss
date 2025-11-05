"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

export const spriteUpgradeMap = {
  madars: ["madars", "madars-2"],
  janka: ["janka", "janka-2"],
  roberts: ["roberts", "roberts-2"],
  ozols: ["ozols"],
};

const page = () => {
  const [coins, setCoins] = useState(0);
  const [gems, setGems] = useState(0);
  const [deposits, setDeposits] = useState(0);
  const [level, setLevel] = useState(1);
  const [characters, setCharacters] = useState<
    {
      name: string;
      level: number;
      xp: number;
    }[]
  >([]);
  const [depositUpgrades, setDepositUpgrades] = useState<
    {
      name: string;
      boost:
        | {
            speed?: number;
            damage?: number;
            hp?: number;
          }
        | undefined;
    }[]
  >([]);

  const depositUpgradesTree = [
    {
      name: "beehive",
      price: 10,
      max: 3,
      lvText: "Bišu strops",
      boost: {
        speed: 1,
      },
      lvl: 1,
    },
    {
      name: "dog",
      price: 15,
      max: 2,
      lvText: "Suns",
      boost: {
        damage: 0.5,
      },
      lvl: 1,
    },
    {
      name: "chest",
      price: 12,
      max: 3,
      lvText: "Grudaks",
      boost: {
        damage: 0.5,
      },
      lvl: 1,
    },
    {
      name: "nuts",
      price: 20,
      max: 3,
      lvText: "Rieksti",
      boost: {
        damage: 1,
      },
      lvl: 2,
    },
    {
      name: "potion",
      price: 15,
      max: 3,
      lvText: "Ķiršu brūža",
      boost: {
        hp: 1,
      },
      lvl: 3,
    },
    {
      name: "bandage",
      price: 20,
      max: 3,
      lvText: "Plāksteris",
      boost: {
        hp: 1,
      },
      lvl: 3,
    },
    {
      name: "apple",
      price: 40,
      max: 2,
      lvText: "Ābols",
      boost: {
        hp: 1,
        damage: 1,
      },
      lvl: 4,
    },
  ];

  useEffect(() => {
    const coins = localStorage.getItem("coins");
    const gems = localStorage.getItem("gems");
    const deposits = localStorage.getItem("deposits");
    const level = localStorage.getItem("currentLevel");
    const characters = localStorage.getItem("characters");
    const depositUpgrades = localStorage.getItem("depositUpgrades");
    if (depositUpgrades) {
      setDepositUpgrades(JSON.parse(depositUpgrades));
    }
    if (coins) {
      setCoins(parseInt(coins));
    }
    if (gems) {
      setGems(parseInt(gems));
    }
    if (deposits) {
      setDeposits(parseInt(deposits));
    }
    if (level) {
      setLevel(parseInt(level));
    }
    if (characters) {
      setCharacters(JSON.parse(characters));
    } else {
      const defaultCharacters = [
        {
          name: "madars",
          level: 1,
          xp: 0,
        },
      ];
      setCharacters(defaultCharacters);
      localStorage.setItem("characters", JSON.stringify(defaultCharacters));
    }
  }, []);

  const getMaxDepositLevel = () => {
    for (const deposit of depositUpgradesTree) {
      let upgradedLevel = 0;
      for (const upgrade of depositUpgrades) {
        if (upgrade.name === deposit.name) {
          upgradedLevel++;
        }
      }

      if (deposit.max > upgradedLevel) {
        return deposit.lvl;
      }
    }
    return 1;
  };

  const maxDepositLevel = getMaxDepositLevel();

  const shopCharacters = ["madars", "janka", "roberts", "ozols"];
  const upgradeCharacter = (character: string, price: number) => {
    if (coins < price) {
      return;
    }
    if (characters.some((c) => c.name === character)) {
      const newCharacters = characters?.map((c) =>
        c.name === character
          ? {
              ...c,
              xp: c.level * 4 - (c.xp + 1) <= 0 ? 0 : c.xp + 1,
              level: c.level * 4 - (c.xp + 1) <= 0 ? c.level + 1 : c.level,
            }
          : c
      );
      setCharacters(newCharacters);
      localStorage.setItem("characters", JSON.stringify(newCharacters));
    } else {
      const newCharacters = [
        ...characters,
        { name: character, level: 1, xp: 0 },
      ];
      setCharacters(newCharacters);
      localStorage.setItem("characters", JSON.stringify(newCharacters));
    }

    setCoins(coins - price);
    localStorage.setItem("coins", String(coins - price));
  };

  const upgradeDeposit = (name: string, price: number) => {
    if (deposits < price) {
      return;
    }
    const deposit = depositUpgradesTree.find((d) => d.name === name);
    const newDepositUpgrades = [
      ...depositUpgrades,
      { name, boost: deposit?.boost || undefined },
    ];
    setDepositUpgrades(newDepositUpgrades);
    setDeposits(deposits - price);
    localStorage.setItem("deposits", String(deposits - price));
    localStorage.setItem("depositUpgrades", JSON.stringify(newDepositUpgrades));
  };

  return (
    <div
      className="w-full h-screen flex flex-col p-4 items-center gap-4"
      style={{
        backgroundImage: "url('/resources/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-5xl flex items-center justify-center gap-4">
        <div className="px-4 py-2 bg-black/50 rounded-2xl flex items-center gap-2">
          <img src="/resources/coin.png" alt="coin" className="w-6 h-6" />
          <strong>{coins}</strong>
        </div>
        <div className="px-4 py-2 bg-black/50 rounded-2xl flex items-center gap-2">
          <img src="/resources/gem.png" alt="gem" className="w-6 h-6" />
          <strong>{gems}</strong>
        </div>
        <div className="px-4 py-2 bg-black/50 rounded-2xl flex items-center gap-2">
          <img src="/resources/deposit.png" alt="deposit" className="w-6 h-6" />
          <strong>{deposits}</strong>
        </div>
      </div>

      <div className="flex-1 h-full w-full max-w-5xl grid grid-cols-3 gap-4">
        <div className="w-full h-full flex flex-col gap-4">
          <div className="flex-1 bg-black/50 rounded-2xl flex flex-col items-center p-4 gap-2">
            <strong>Shop</strong>
            <div className="grid grid-cols-3 gap-4 w-full">
              {shopCharacters.map((character, i) => {
                const characterData = characters?.find(
                  (c) => c.name === character
                );

                const price = (characterData?.xp || 1) * 8 + 8 * (i + 1);

                const nextLevelXp = (characterData?.level || 0) * 4;

                return (
                  <div
                    key={character}
                    className="bg-white rounded-lg border gap-2 flex flex-col items-center justify-end p-2 w-full h-full"
                  >
                    {(() => {
                      const upgrades = (spriteUpgradeMap as any)[character] as
                        | string[]
                        | undefined;
                      const level = characterData?.level || 1;
                      const maxIdx = Math.max(0, (upgrades?.length || 1) - 1);
                      const idx = Math.max(0, Math.min(level - 1, maxIdx));
                      const spriteName =
                        upgrades && upgrades.length ? upgrades[idx] : null;
                      return spriteName ? (
                        <img
                          src={`/resources/sprites/${spriteName}.png`}
                          alt={character}
                          className={`h-20 object-contain ${
                            (characterData?.level || 0) < 1 ? "grayscale" : ""
                          }`}
                        />
                      ) : null;
                    })()}

                    <small className="text-xs -my-1 text-gray-500 first-letter:uppercase">
                      {character} {`(${characterData?.level || 0})`}
                    </small>
                    {characterData ? (
                      <div className="w-full h-2 rounded border border-black/50 bg-gray-200 overflow-hidden relative">
                        <div
                          className="h-full bg-amber-400"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                ((characterData?.xp || 0) /
                                  Math.max(1, nextLevelXp)) *
                                  100
                              )
                            )}%`,
                            transition: "width 0.2s ease",
                          }}
                        />
                        <div className="absolute inset-0 flex pointer-events-none">
                          {Array.from({ length: Math.max(1, nextLevelXp) }).map(
                            (_, idx) => (
                              <div
                                key={idx}
                                className={`flex-1 ${
                                  idx < Math.max(1, nextLevelXp) - 1
                                    ? "border-r border-black/50"
                                    : ""
                                }`}
                              />
                            )
                          )}
                        </div>
                      </div>
                    ) : null}

                    <button
                      className="w-full p-2 rounded-lg cursor-pointer disabled:opacity-80 text-black bg-amber-300 flex items-center justify-center gap-1"
                      onClick={() => upgradeCharacter(character, price)}
                      disabled={coins < price}
                    >
                      <img
                        src="/resources/coin.png"
                        alt="coin"
                        className="w-4 h-4"
                      />
                      <strong>{price}</strong>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          {/* <div className="flex-1 bg-black/50 rounded-2xl flex flex-col items-center p-4">
            <strong>Gem shop</strong>
          </div> */}
        </div>
        <div className="w-full h-full flex flex-col items-center justify-center">
          <div className="w-full flex flex-col items-center gap-4">
            <strong className="text-2xl font-bold">Ansona hata</strong>
            <img
              src="/resources/quests/ansons.png"
              alt="ansons"
              className="w-full max-w-60 rounded-2xl h-full object-cover"
            />
            <strong className="text-2xl font-bold">Level: {level}</strong>

            <Link
              href="/game"
              className="text-lg w-full shadow-lg text-center underline bg-green-600 rounded-2xl px-4 py-2"
            >
              Play
            </Link>
          </div>
        </div>
        <div className="w-full h-full flex flex-col bg-black/50 rounded-2xl gap-4 items-center p-4">
          <strong>Depozītu upgrades</strong>

          <div className="flex flex-col w-full gap-4">
            {Array.from(new Set(depositUpgradesTree.map((d) => d.lvl))).map(
              (index) => {
                return (
                  <div className="w-full flex items-center justify-center gap-4">
                    {depositUpgradesTree
                      .filter((d) => d.lvl === index)
                      .map((d) => {
                        const upgrades = depositUpgrades.filter(
                          (dep) => dep.name === d.name
                        );
                        const price = d.price * (upgrades.length + 1);
                        return (
                          <div className="w-full flex flex-col items-center justify-center gap-2 p-2">
                            <img
                              src={`/resources/deposits/${d.name}.png`}
                              alt={d.name}
                              className={`w-10 h-10 ${
                                d.lvl > maxDepositLevel ? "grayscale" : ""
                              }`}
                            />
                            <strong
                              className={`text-center text-xs ${
                                d.lvl > maxDepositLevel ? "text-gray-500" : ""
                              }`}
                            >
                              {d.lvText}
                            </strong>
                            {(() => {
                              const current = upgrades.length;
                              if (!current) return null;
                              const total = Math.max(1, d.max);
                              const pct = Math.min(
                                100,
                                Math.max(0, (current / total) * 100)
                              );
                              const locked = d.lvl > maxDepositLevel;

                              return (
                                <div className="w-full h-2 rounded border border-black/50 bg-gray-200 overflow-hidden relative">
                                  <div
                                    className={`h-full ${
                                      locked ? "bg-gray-400" : "bg-amber-400"
                                    }`}
                                    style={{
                                      width: `${pct}%`,
                                      transition: "width 0.2s ease",
                                    }}
                                  />
                                  <div className="absolute inset-0 flex pointer-events-none">
                                    {Array.from({ length: total }).map(
                                      (_, idx) => (
                                        <div
                                          key={idx}
                                          className={`flex-1 ${
                                            idx < total - 1
                                              ? "border-r border-black/50"
                                              : ""
                                          }`}
                                        />
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                            {d.lvl <= maxDepositLevel &&
                            upgrades.length < d.max ? (
                              <button
                                className="w-full p-2 rounded-lg cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed text-black bg-pink-200 flex items-center justify-center gap-1"
                                onClick={() => upgradeDeposit(d.name, price)}
                                disabled={deposits < price}
                              >
                                <img
                                  src="/resources/deposit.png"
                                  alt="deposit"
                                  className="w-4 h-4"
                                />
                                <strong>{price}</strong>
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
