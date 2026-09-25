/**
 * Data structures and types for Type Fighter.
 */

export type GameStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type AttackTier = 'NORMAL' | 'FIERCE' | 'CYCLONE' | 'DRAGON';

export type DefeatMoveType = 'spinning_kick' | 'jumping_punch' | 'dragon_uppercut' | 'flying_dropkick' | 'lightning_jab' | 'axe_kick';

export type EnemyTier = 'grunt' | 'runner' | 'brawler' | 'boss';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  fontSize: number;
  alpha: number;
  life: number;
  maxLife: number;
  bold?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  gravity?: number;
  isStickBone?: boolean;
  length?: number;
  angle?: number;
  vAngle?: number;
}

export interface StickmanPose {
  head: { x: number; y: number; radius: number };
  torsoStart: { x: number; y: number };
  torsoEnd: { x: number; y: number }; // hip
  // Left arm (back)
  armL: {
    elbow: { x: number; y: number };
    hand: { x: number; y: number };
  };
  // Right arm (front)
  armR: {
    elbow: { x: number; y: number };
    hand: { x: number; y: number };
  };
  // Left leg (back)
  legL: {
    knee: { x: number; y: number };
    foot: { x: number; y: number };
  };
  // Right leg (front)
  legR: {
    knee: { x: number; y: number };
    foot: { x: number; y: number };
  };
}

export interface AmbientPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  alpha: number;
}

export interface EnemyEntity {
  id: string;
  tier: EnemyTier;
  word: string;
  name?: string;
  isBoss?: boolean;
  bossPhase?: number;
  maxBossPhase?: number;
  typedIndex: number;
  errorFlashTimer: number; // visual error flash in seconds
  x: number;
  y: number;
  baseY: number;
  speed: number;
  health: number;
  maxHealth: number;
  color: string;
  walkCycle: number;
  attackCooldown: number;
  isHitTimer: number;
  defeated: boolean;
  defeatedTimer: number;
  defeatAnimType?: 'fly' | 'shatter' | 'dissolve';
  headbandColor?: string;
  weaponType?: 'none' | 'daggers' | 'shield' | 'spikes' | 'katana';
  scale: number;
}

export interface PlayerState {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  targetX: number;
  health: number;
  maxHealth: number;
  state: 'idle' | 'dash' | 'attack' | 'retreat' | 'hurt' | 'victory';
  animTime: number;
  animDuration: number;
  attackType: AttackTier;
  hurtTimer: number;
  attackVariant: number; // 0: jab, 1: high kick, 2: dropkick, 3: uppercut, 4: spinning kick, 5: jumping punch, 6: axe kick
  defeatMove?: DefeatMoveType;
  currentStreak: number;
  auraIntensity: number;
  rageMeter: number; // 0 to 100
  maxRage: number; // 100
  isDragonFuryActive: boolean;
  dragonFuryTimer: number;
}

export interface GameStats {
  score: number;
  enemiesDefeated: number;
  correctChars: number;
  wrongChars: number;
  totalKeystrokes: number;
  currentWpm: number;
  peakWpm: number;
  accuracy: number;
  currentCombo: number;
  maxCombo: number;
  wave: number;
  startTime: number;
  elapsedSeconds: number;
  fastestWord?: { word: string; wpm: number } | null;
  typoLetterCounts: Record<string, number>;
  dragonFuryUses: number;
}

export interface HighScoreRecord {
  score: number;
  wpm: number;
  accuracy: number;
  enemies: number;
  combo: number;
  date: string;
}
