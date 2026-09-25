/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Play,
  RotateCcw,
  Trophy,
  Download,
  Pause,
  Flame,
  Award,
  Swords,
  Heart,
  Target,
  Zap
} from 'lucide-react';
import { GameEngine } from './game/engine';
import { Difficulty } from './game/words';
import { GameStatus, HighScoreRecord } from './game/types';
import { downloadStandaloneHtml } from './game/standaloneHtml';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Synced UI state from GameEngine
  const [gameStatus, setGameStatus] = useState<GameStatus>('MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(false);
  const [highScores, setHighScores] = useState<HighScoreRecord[]>([]);
  const [showHighScores, setShowHighScores] = useState<boolean>(false);

  // Live HUD stats
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [maxHp, setMaxHp] = useState<number>(100);
  const [wpm, setWpm] = useState<number>(0);
  const [peakWpm, setPeakWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [enemiesDefeated, setEnemiesDefeated] = useState<number>(0);
  const [rageMeter, setRageMeter] = useState<number>(0);
  const [isDragonFuryActive, setIsDragonFuryActive] = useState<boolean>(false);
  const [dragonFuryTimer, setDragonFuryTimer] = useState<number>(0);
  const [fastestWord, setFastestWord] = useState<{ word: string; wpm: number } | null>(null);
  const [dragonFuryUses, setDragonFuryUses] = useState<number>(0);
  const [mostMissedLetter, setMostMissedLetter] = useState<string | null>(null);
  const [activeWordInfo, setActiveWordInfo] = useState<{ word: string; typed: number } | null>(null);

  // Load high scores on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('type_fighter_high_scores');
      if (raw) {
        setHighScores(JSON.parse(raw));
      }
    } catch {
      // safe fallback
    }
  }, [gameStatus]);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, () => {
      // Sync engine state to React
      setGameStatus(engine.status);
      setPlayerHp(engine.player.health);
      setMaxHp(engine.player.maxHealth);
      setWpm(engine.stats.currentWpm);
      setPeakWpm(engine.stats.peakWpm);
      setAccuracy(engine.stats.accuracy);
      setScore(engine.stats.score);
      setCombo(engine.stats.currentCombo);
      setWave(engine.stats.wave);
      setEnemiesDefeated(engine.stats.enemiesDefeated);
      setRageMeter(engine.player.rageMeter);
      setIsDragonFuryActive(engine.player.isDragonFuryActive);
      setDragonFuryTimer(engine.player.dragonFuryTimer);
      setDragonFuryUses(engine.stats.dragonFuryUses);
      if (engine.stats.fastestWord) {
        setFastestWord(engine.stats.fastestWord);
      }

      // Compute most missed letter
      const typos = engine.stats.typoLetterCounts;
      let topChar: string | null = null;
      let topCount = 0;
      for (const [ch, cnt] of Object.entries(typos)) {
        if (cnt > topCount) {
          topCount = cnt;
          topChar = ch.toUpperCase();
        }
      }
      setMostMissedLetter(topChar);

      if (engine.activeEnemyId) {
        const active = engine.enemies.find((e) => e.id === engine.activeEnemyId);
        if (active) {
          setActiveWordInfo({ word: active.word, typed: active.typedIndex });
        } else {
          setActiveWordInfo(null);
        }
      } else {
        setActiveWordInfo(null);
      }
    });

    engine.setDifficulty(difficulty);
    engine.setSoundEnabled(soundEnabled);
    engine.setBgmEnabled(bgmEnabled);
    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, []);

  const handleStartGame = (diff?: Difficulty) => {
    if (engineRef.current) {
      const selected = diff || difficulty;
      setDifficulty(selected);
      engineRef.current.start(selected);
      setShowHighScores(false);
    }
  };

  const handleTogglePause = () => {
    if (engineRef.current) {
      engineRef.current.togglePause();
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (engineRef.current) {
      engineRef.current.setSoundEnabled(next);
    }
  };

  const handleToggleBgm = () => {
    const next = !bgmEnabled;
    setBgmEnabled(next);
    if (engineRef.current) {
      engineRef.current.setBgmEnabled(next);
    }
  };

  const handleActivateDragonFury = () => {
    if (engineRef.current) {
      engineRef.current.activateDragonFury();
    }
  };

  // Rank calculator based on WPM and accuracy
  const calculateRank = (finalWpm: number, finalAcc: number) => {
    if (finalWpm >= 85 && finalAcc >= 93) return { grade: 'RANK S', title: 'Grandmaster' };
    if (finalWpm >= 65 && finalAcc >= 88) return { grade: 'RANK A', title: 'Black Belt' };
    if (finalWpm >= 45 && finalAcc >= 80) return { grade: 'RANK B', title: 'Street Brawler' };
    if (finalWpm >= 28) return { grade: 'RANK C', title: 'Martial Apprentice' };
    return { grade: 'RANK D', title: 'Novice Fighter' };
  };

  const rankInfo = calculateRank(wpm, accuracy);
  const hpPercent = Math.max(0, (playerHp / maxHp) * 100);

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden font-sans">
      {/* 3-Zone Top Navigation Contract */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-lg tracking-wider text-sky-400 font-['Chakra_Petch'] uppercase flex items-center gap-2">
            <Swords className="w-5 h-5 text-sky-400" />
            Type Fighter
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline">· Martial Arts Canvas Combat</span>
        </div>

        {/* Zone 2: Navigation & High-Score link */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-medium">
          <button
            onClick={() => setShowHighScores(!showHighScores)}
            className="hover:text-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Hall of Fame
          </button>
          <span>·</span>
          <span>WPM Multipliers: 35+ Fierce / 65+ Cyclone / 95+ Dragon</span>
        </nav>

        {/* Zone 3: Primary Actions (Sound, Export HTML, Restart) */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSound}
            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
            className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">SFX: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">SFX: OFF</span>
              </>
            )}
          </button>

          <button
            onClick={handleToggleBgm}
            title={bgmEnabled ? 'Mute Battle Beat (BGM)' : 'Play Synth Battle Beat (BGM)'}
            className={`px-2.5 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
              bgmEnabled
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Music className={`w-3.5 h-3.5 ${bgmEnabled ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">BGM: {bgmEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={downloadStandaloneHtml}
            title="Download single self-contained TypeFighter.html to run offline"
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Export Single HTML</span>
          </button>

          {gameStatus === 'PLAYING' && (
            <button
              onClick={handleTogglePause}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause [Esc]
            </button>
          )}
        </div>
      </header>

      {/* Main Interactive Combat Arena */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950">
        {/* Canvas Engine */}
        <canvas ref={canvasRef} className="w-full h-full block cursor-default" />

        {/* In-Game Live HUD (Visible while playing) */}
        {gameStatus === 'PLAYING' && (
          <div className="absolute top-4 left-6 right-6 flex items-start justify-between pointer-events-none z-10">
            {/* Player Health Bar */}
            <div className="flex flex-col gap-1.5 pointer-events-auto bg-slate-900/80 backdrop-blur-sm border border-slate-800/80 p-3 rounded-lg shadow-lg min-w-[240px]">
              {/* Stickman Health Bar */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider font-['Chakra_Petch']">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                  STICKMAN HP
                </span>
                <span className="font-mono tabular-nums text-slate-200">{playerHp} / {maxHp}</span>
              </div>
              <div className="w-full h-3 bg-slate-950 border border-slate-800 rounded-sm overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-xs transition-all duration-150 ${
                    hpPercent < 25
                      ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]'
                      : hpPercent < 55
                      ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                      : 'bg-gradient-to-r from-emerald-500 to-sky-400'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>

              {/* Dragon Fury Rage Meter */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] font-bold tracking-wider font-['Chakra_Petch']">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    RAGE METER
                  </span>
                  <span className="font-mono text-xs text-amber-300">
                    {isDragonFuryActive ? `${dragonFuryTimer.toFixed(1)}s ACTIVE` : `${Math.round(rageMeter)}%`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 border border-slate-800 rounded-sm overflow-hidden p-0.5 mt-1">
                  <div
                    className={`h-full rounded-xs transition-all duration-150 ${
                      isDragonFuryActive
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-red-500 shadow-[0_0_12px_rgba(245,158,11,0.9)] animate-pulse'
                        : rageMeter >= 100
                        ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                        : 'bg-gradient-to-r from-amber-600 to-yellow-500'
                    }`}
                    style={{ width: isDragonFuryActive ? `${(dragonFuryTimer / 6) * 100}%` : `${rageMeter}%` }}
                  />
                </div>

                {rageMeter >= 100 && !isDragonFuryActive && (
                  <button
                    onClick={handleActivateDragonFury}
                    className="mt-2 w-full py-1 px-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded transition-all shadow-[0_0_12px_rgba(245,158,11,0.7)] animate-bounce cursor-pointer flex items-center justify-center gap-1 font-['Chakra_Petch']"
                  >
                    <Flame className="w-3.5 h-3.5 fill-slate-950" />
                    [SPACE] UNLEASH DRAGON FURY!
                  </button>
                )}
              </div>

              {/* Combo Banner */}
              {combo >= 2 && (
                <div className="mt-1 flex items-center gap-1.5 text-amber-400 font-extrabold text-xs font-['Chakra_Petch'] tracking-wide">
                  <Flame className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                  <span>{combo}x COMBO ACTIVE (+{Math.round(combo * 5)}% DMG)</span>
                </div>
              )}
            </div>

            {/* Center: Active Target Lock Indicator */}
            {activeWordInfo && (
              <div className="hidden lg:flex flex-col items-center bg-slate-900/85 backdrop-blur-md border border-sky-500/40 px-5 py-2 rounded-lg shadow-lg">
                <div className="flex items-center justify-between w-full gap-4 mb-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400 uppercase tracking-widest font-['Chakra_Petch']">
                    <Target className="w-3 h-3 text-sky-400 animate-spin" />
                    Target Locked
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">[Backspace] Clear</span>
                </div>
                <div className="font-mono text-xl tracking-wider">
                  <span className="text-emerald-400 font-extrabold">
                    {activeWordInfo.word.slice(0, activeWordInfo.typed)}
                  </span>
                  <span className="text-white underline decoration-sky-400 decoration-2 font-bold">
                    {activeWordInfo.word.slice(activeWordInfo.typed, activeWordInfo.typed + 1)}
                  </span>
                  <span className="text-slate-500 font-normal">
                    {activeWordInfo.word.slice(activeWordInfo.typed + 1)}
                  </span>
                </div>
              </div>
            )}

            {/* Combat Metrics (WPM, Accuracy, Wave, Score) */}
            <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-sm border border-slate-800/80 p-2.5 px-4 rounded-lg shadow-lg pointer-events-auto">
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-['Chakra_Petch']">WPM</div>
                <div className="text-2xl font-black font-mono tabular-nums text-sky-400">{wpm}</div>
              </div>

              <div className="h-7 w-[1px] bg-slate-800" />

              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-['Chakra_Petch']">Accuracy</div>
                <div className="text-2xl font-black font-mono tabular-nums text-emerald-400">{accuracy}%</div>
              </div>

              <div className="h-7 w-[1px] bg-slate-800" />

              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-['Chakra_Petch']">Wave</div>
                <div className="text-2xl font-black font-mono tabular-nums text-amber-400">{wave}</div>
              </div>

              <div className="h-7 w-[1px] bg-slate-800" />

              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-['Chakra_Petch']">Score</div>
                <div className="text-2xl font-black font-mono tabular-nums text-slate-100">{score}</div>
              </div>
            </div>
          </div>
        )}

        {/* Start Menu Modal */}
        {gameStatus === 'MENU' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-30">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-lg w-full text-center shadow-2xl relative">
              <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-center justify-center mx-auto mb-4 text-sky-400">
                <Swords className="w-8 h-8" />
              </div>

              <h1 className="text-4xl font-black italic tracking-tight font-['Chakra_Petch'] text-white uppercase mb-2">
                Type Fighter
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Defend the cyber-dojo using martial arts typing combos. Enemies advance from the right — type their words to unleash lightning strikes before they breach your defense!
              </p>

              {/* Combat Rules breakdown */}
              <div className="grid grid-cols-2 gap-3 text-left bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg mb-6 text-xs text-slate-300">
                <div>
                  <div className="font-semibold text-sky-400 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Auto-Lock Target
                  </div>
                  Type the first letter of any approaching enemy to lock on.
                </div>
                <div>
                  <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Finish Animations
                  </div>
                  Defeats trigger dynamic moves: Spinning Kicks, Jumping Superman Punches, and Dragon Uppercuts based on word length & difficulty!
                </div>
                <div>
                  <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Combo Multiplier
                  </div>
                  Maintain keystroke accuracy to stack huge damage bonuses.
                </div>
                <div>
                  <div className="font-semibold text-red-400 mb-1 flex items-center gap-1">
                    <Heart className="w-3 h-3" /> Guard Defense
                  </div>
                  If an enemy reaches your stance, you take direct damage!
                </div>
              </div>

              {/* Difficulty Preset Selector */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-['Chakra_Petch']">
                  Select Difficulty
                </div>
                <div className="flex justify-center gap-2">
                  {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-4 py-2 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer font-['Chakra_Petch'] ${
                        difficulty === d
                          ? 'bg-sky-600 border-sky-400 text-white shadow-[0_0_12px_rgba(2,132,199,0.5)]'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={() => handleStartGame()}
                className="w-full py-3.5 px-6 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-base uppercase tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2 cursor-pointer font-['Chakra_Petch']"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                Start Fight [Press Space]
              </button>
            </div>
          </div>
        )}

        {/* Pause Modal */}
        {gameStatus === 'PAUSED' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-30">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
              <h2 className="text-3xl font-black italic tracking-tight font-['Chakra_Petch'] text-white uppercase mb-2">
                Fight Paused
              </h2>
              <p className="text-sm text-slate-400 mb-6">Take a breath. Press Resume or ESC to jump back in.</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleTogglePause}
                  className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm uppercase rounded-lg transition-colors cursor-pointer font-['Chakra_Petch']"
                >
                  Resume Combat [Esc]
                </button>
                <button
                  onClick={() => handleStartGame()}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Restart Battle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {gameStatus === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-30">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
              <div className="text-red-500 font-mono text-xs uppercase tracking-widest font-bold mb-1">
                Health Depleted
              </div>
              <h2 className="text-4xl font-black italic tracking-tight font-['Chakra_Petch'] text-red-400 uppercase mb-2">
                Knocked Out
              </h2>

              {/* Combat Rank Badge */}
              <div className="my-4 py-3 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="text-3xl font-black font-['Chakra_Petch'] text-amber-400">
                  {rankInfo.grade}
                </div>
                <div className="text-xs text-slate-400 font-medium">{rankInfo.title}</div>
              </div>

              {/* Battle Stats Breakdown */}
              <div className="space-y-2 text-left bg-slate-950/60 p-4 rounded-lg border border-slate-800 text-xs mb-6">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Final WPM</span>
                  <span className="font-mono font-bold text-sky-400">{wpm} WPM</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Peak WPM</span>
                  <span className="font-mono font-bold text-sky-400">{peakWpm} WPM</span>
                </div>
                {fastestWord && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Fastest Word Cleared</span>
                    <span className="font-mono font-bold text-amber-400">{fastestWord.word.toUpperCase()} ({fastestWord.wpm} WPM)</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Keystroke Accuracy</span>
                  <span className="font-mono font-bold text-emerald-400">{accuracy}%</span>
                </div>
                {mostMissedLetter && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Most Missed Key</span>
                    <span className="font-mono font-bold text-red-400">Key '{mostMissedLetter}'</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Enemies Defeated</span>
                  <span className="font-mono font-bold text-slate-200">{enemiesDefeated}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Dragon Fury Unleashed</span>
                  <span className="font-mono font-bold text-amber-400">{dragonFuryUses}x</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Longest Combo</span>
                  <span className="font-mono font-bold text-amber-400">{engineRef.current?.stats.maxCombo || combo}x</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Final Score</span>
                  <span className="font-mono font-extrabold text-white text-sm">{score} PTS</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => handleStartGame()}
                  className="w-full py-3.5 px-6 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-lg transition-all shadow-[0_0_16px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2 cursor-pointer font-['Chakra_Petch']"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Again [Press Enter]
                </button>
                <button
                  onClick={downloadStandaloneHtml}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  Download Standalone HTML (.html)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* High Scores Modal */}
        {showHighScores && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-40">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base font-['Chakra_Petch'] uppercase">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Hall of Fame (High Scores)
                </div>
                <button
                  onClick={() => setShowHighScores(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer px-2 py-1 bg-slate-800 rounded"
                >
                  Close
                </button>
              </div>

              {highScores.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No battle records yet. Complete a battle to record your score!
                </div>
              ) : (
                <div className="space-y-2">
                  {highScores.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-bold text-sm ${i === 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                          #{i + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white font-mono">{rec.score} PTS</div>
                          <div className="text-[11px] text-slate-500">{rec.date} · {rec.enemies} defeated</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sky-400 font-bold">{rec.wpm} WPM</div>
                        <div className="text-[11px] text-emerald-400 font-mono">{rec.accuracy}% ACC</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Keyboard Controls Hint Bar */}
      <footer className="h-9 border-t border-slate-800/80 bg-slate-950 px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <div className="flex items-center gap-3">
          <span>Type to strike enemies</span>
          <span>·</span>
          <span className="text-amber-400/90 font-medium">[Space] Dragon Fury (when full)</span>
          <span>·</span>
          <span>[Backspace] Clear target</span>
          <span>·</span>
          <span>[Esc] Pause</span>
        </div>
        <div className="font-mono text-slate-400">
          WPM = (Chars / 5) / Elapsed Min
        </div>
      </footer>
    </div>
  );
}
