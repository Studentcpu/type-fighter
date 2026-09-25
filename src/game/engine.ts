/**
 * Type Fighter Main Game Engine.
 * Manages game loop, physics, typing state machine, combat mechanics, and statistics.
 */

import { getRandomWord, Difficulty } from './words';
import { sounds } from './audio';
import { GameRenderer } from './renderer';
import {
  GameStatus,
  PlayerState,
  EnemyEntity,
  EnemyTier,
  Particle,
  FloatingText,
  GameStats,
  AttackTier,
  DefeatMoveType,
  HighScoreRecord,
  AmbientPetal
} from './types';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;

  public status: GameStatus = 'MENU';
  public difficulty: Difficulty = 'normal';
  public soundEnabled: boolean = true;

  // Game state
  public player: PlayerState;
  public enemies: EnemyEntity[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public ambientPetals: AmbientPetal[] = [];

  // Active target enemy ID
  public activeEnemyId: string | null = null;
  public bossAlertTimer: number = 0;
  public activeBossName: string = '';
  private wordStartTimeMap: Map<string, number> = new Map();

  // Stats
  public stats: GameStats = {
    score: 0,
    enemiesDefeated: 0,
    correctChars: 0,
    wrongChars: 0,
    totalKeystrokes: 0,
    currentWpm: 0,
    peakWpm: 0,
    accuracy: 100,
    currentCombo: 0,
    maxCombo: 0,
    wave: 1,
    startTime: 0,
    elapsedSeconds: 0,
    fastestWord: null,
    typoLetterCounts: {},
    dragonFuryUses: 0
  };

  // Screen shake
  public shakeAmount: number = 0;
  private shakeX: number = 0;
  private shakeY: number = 0;

  // Spawning controls
  private spawnTimer: number = 0;
  private spawnInterval: number = 3.2; // seconds
  private lastFrameTime: number = 0;
  private animFrameId: number = 0;
  private enemyIdCounter: number = 0;

  // Callback for React state sync
  private onStateChange?: () => void;

  constructor(canvas: HTMLCanvasElement, onStateChange?: () => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    this.renderer = new GameRenderer(this.ctx);
    this.onStateChange = onStateChange;

    this.player = this.createInitialPlayer();
    this.initAmbientPetals();
    this.setupResize();
    this.setupInputListener();
  }

  private initAmbientPetals() {
    this.ambientPetals = [];
    for (let i = 0; i < 22; i++) {
      this.ambientPetals.push({
        x: Math.random() * (this.canvas.width || 1000),
        y: Math.random() * (this.canvas.height || 600),
        vx: 0.6 + Math.random() * 1.4,
        vy: 0.4 + Math.random() * 0.9,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 2,
        size: 5 + Math.random() * 4,
        alpha: 0.3 + Math.random() * 0.45
      });
    }
  }

  private createInitialPlayer(): PlayerState {
    const baseY = this.canvas.height * 0.76 - 68;
    return {
      x: 140,
      y: baseY,
      baseX: 140,
      baseY: baseY,
      targetX: 140,
      health: 100,
      maxHealth: 100,
      state: 'idle',
      animTime: 0,
      animDuration: 0.35,
      attackType: 'NORMAL',
      hurtTimer: 0,
      attackVariant: 0,
      currentStreak: 0,
      auraIntensity: 0,
      rageMeter: 0,
      maxRage: 100,
      isDragonFuryActive: false,
      dragonFuryTimer: 0
    };
  }

  private setupResize() {
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      const displayWidth = Math.floor(rect.width || 1000);
      const displayHeight = Math.floor(rect.height || 600);

      this.canvas.width = displayWidth * dpr;
      this.canvas.height = displayHeight * dpr;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);

      this.renderer.setSize(displayWidth, displayHeight);
      this.player.baseY = displayHeight * 0.76 - 68;
      if (this.player.state === 'idle') {
        this.player.y = this.player.baseY;
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial call
    setTimeout(handleResize, 10);
  }

  private setupInputListener() {
    window.addEventListener('keydown', (e) => {
      if (this.status !== 'PLAYING') return;

      // Handle pause via Escape only (never single letter keys like 'p' as they are needed for typing words)
      if (e.key === 'Escape' || e.key === 'Pause') {
        this.togglePause();
        return;
      }

      // Dragon Fury activation via Spacebar
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.activateDragonFury();
        return;
      }

      // Target Cancel / Unpin via Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (this.activeEnemyId) {
          const prev = this.enemies.find((en) => en.id === this.activeEnemyId);
          if (prev) prev.typedIndex = 0;
          this.activeEnemyId = null;
          this.addFloatingText('LOCK CLEARED', this.player.x + 40, this.player.y - 20, '#94a3b8', 14);
          this.notifyUI();
        }
        return;
      }

      // Ignore modifier keys, functional keys
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) {
        return;
      }

      e.preventDefault();
      this.handleTypingKey(e.key.toLowerCase());
    });
  }

  // Activate Dragon Fury Ultimate
  public activateDragonFury() {
    if (this.player.rageMeter < 100 || this.status !== 'PLAYING') return;

    this.player.rageMeter = 0;
    this.player.isDragonFuryActive = true;
    this.player.dragonFuryTimer = 6.0; // 6 seconds of devastating power!
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 30); // heal 30 HP
    this.stats.dragonFuryUses++;

    sounds.playDragonFury();
    this.triggerShake(20);

    // Splash pushback and blast on approaching enemies
    for (const enemy of this.enemies) {
      if (!enemy.defeated) {
        enemy.x += 80;
        enemy.health -= 60;
        this.createHitSparks(enemy.x, enemy.y, 'DRAGON');
        if (enemy.health <= 0) {
          enemy.defeated = true;
          this.stats.enemiesDefeated++;
          this.createDefeatBurst(enemy.x, enemy.y, enemy.color);
        }
      }
    }

    const displayW = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    this.addFloatingText('🔥 DRAGON FURY ACTIVATED! 🔥', displayW / 2, 170, '#f59e0b', 26, true);
    this.notifyUI();
  }

  public setDifficulty(diff: Difficulty) {
    this.difficulty = diff;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    sounds.setEnabled(enabled);
  }

  public setBgmEnabled(enabled: boolean) {
    sounds.setBgmEnabled(enabled);
  }

  // Start / Restart game
  public start(diff?: Difficulty) {
    if (diff) this.difficulty = diff;

    const displayHeight = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
    const baseY = displayHeight * 0.76 - 68;

    this.player = {
      x: 140,
      y: baseY,
      baseX: 140,
      baseY: baseY,
      targetX: 140,
      health: 100,
      maxHealth: 100,
      state: 'idle',
      animTime: 0,
      animDuration: 0.35,
      attackType: 'NORMAL',
      hurtTimer: 0,
      attackVariant: 0,
      currentStreak: 0,
      auraIntensity: 0,
      rageMeter: 0,
      maxRage: 100,
      isDragonFuryActive: false,
      dragonFuryTimer: 0
    };

    this.enemies = [];
    this.particles = [];
    this.floatingTexts = [];
    this.activeEnemyId = null;
    this.bossAlertTimer = 0;
    this.wordStartTimeMap.clear();

    this.stats = {
      score: 0,
      enemiesDefeated: 0,
      correctChars: 0,
      wrongChars: 0,
      totalKeystrokes: 0,
      currentWpm: 0,
      peakWpm: 0,
      accuracy: 100,
      currentCombo: 0,
      maxCombo: 0,
      wave: 1,
      startTime: Date.now(),
      elapsedSeconds: 0,
      fastestWord: null,
      typoLetterCounts: {},
      dragonFuryUses: 0
    };

    this.spawnTimer = 1.0; // spawn first enemy shortly
    this.spawnInterval = this.difficulty === 'easy' ? 3.8 : this.difficulty === 'hard' ? 2.4 : 3.0;
    this.status = 'PLAYING';
    this.lastFrameTime = performance.now();

    if (sounds.bgmEnabled) {
      sounds.startBgmLoop();
    }

    cancelAnimationFrame(this.animFrameId);
    this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    this.notifyUI();
  }

  public togglePause() {
    if (this.status === 'PLAYING') {
      this.status = 'PAUSED';
    } else if (this.status === 'PAUSED') {
      this.status = 'PLAYING';
      this.lastFrameTime = performance.now();
      this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
    this.notifyUI();
  }

  // Handle incoming typed character
  private handleTypingKey(char: string) {
    this.stats.totalKeystrokes++;

    // 1. If no active enemy is locked, find an enemy whose word starts with this letter
    if (!this.activeEnemyId) {
      // Find candidate enemies starting with `char`
      const candidates = this.enemies.filter(
        (e) => !e.defeated && e.word[0].toLowerCase() === char
      );

      if (candidates.length > 0) {
        // Pick the one closest to the player (smallest x)
        candidates.sort((a, b) => a.x - b.x);
        this.activeEnemyId = candidates[0].id;
        this.wordStartTimeMap.set(candidates[0].id, Date.now());
      }
    }

    const activeEnemy = this.enemies.find((e) => e.id === this.activeEnemyId && !e.defeated);

    if (activeEnemy) {
      const expectedChar = activeEnemy.word[activeEnemy.typedIndex]?.toLowerCase();

      if (char === expectedChar) {
        // Correct character typed!
        if (activeEnemy.typedIndex === 0 && !this.wordStartTimeMap.has(activeEnemy.id)) {
          this.wordStartTimeMap.set(activeEnemy.id, Date.now());
        }

        activeEnemy.typedIndex++;
        this.stats.correctChars++;
        sounds.playKeyType();

        // Charge rage meter
        this.player.rageMeter = Math.min(this.player.maxRage, this.player.rageMeter + (this.player.isDragonFuryActive ? 0 : 2.5));

        // Check if word is completed!
        if (activeEnemy.typedIndex >= activeEnemy.word.length) {
          this.executeWordAttack(activeEnemy);
        }
      } else {
        // Wrong character typed! Typo penalty
        this.handleTypo(activeEnemy, char);
      }
    } else {
      // Pressed a key that matches no approaching enemy
      this.stats.wrongChars++;
      this.stats.typoLetterCounts[char] = (this.stats.typoLetterCounts[char] || 0) + 1;
      sounds.playTypo();
      this.stats.currentCombo = 0;
      this.triggerShake(4);
      this.addFloatingText('MISS!', this.player.x + 40, this.player.y - 20, '#ef4444', 16);
    }

    this.calculateStats();
    this.notifyUI();
  }

  // Word correctly completed: stickman unleashes combat animation
  private executeWordAttack(enemy: EnemyEntity) {
    const elapsedMinutes = Math.max(0.05, (Date.now() - this.stats.startTime) / 60000);
    const liveWpm = Math.round((this.stats.correctChars / 5) / elapsedMinutes);

    // Calculate individual word typing speed
    const startT = this.wordStartTimeMap.get(enemy.id);
    if (startT) {
      const wordMin = Math.max(0.005, (Date.now() - startT) / 60000);
      const wordWpm = Math.round((enemy.word.length / 5) / wordMin);
      if (!this.stats.fastestWord || wordWpm > this.stats.fastestWord.wpm) {
        this.stats.fastestWord = { word: enemy.word, wpm: wordWpm };
      }
      this.wordStartTimeMap.delete(enemy.id);
    }

    // Determine attack tier based on WPM or Dragon Fury
    let tier: AttackTier = 'NORMAL';
    let baseDamage = 60;
    let auraColor = '#38bdf8';

    if (this.player.isDragonFuryActive) {
      tier = 'DRAGON';
      baseDamage = 220;
      auraColor = '#f59e0b';
      sounds.playDragonHit();
    } else if (liveWpm >= 95) {
      tier = 'DRAGON';
      baseDamage = 180;
      auraColor = '#ef4444';
      sounds.playDragonHit();
    } else if (liveWpm >= 65) {
      tier = 'CYCLONE';
      baseDamage = 130;
      auraColor = '#a855f7';
      sounds.playKick();
    } else if (liveWpm >= 35) {
      tier = 'FIERCE';
      baseDamage = 95;
      auraColor = '#f59e0b';
      sounds.playKick();
    } else {
      tier = 'NORMAL';
      baseDamage = 65;
      sounds.playPunch();
    }

    // Apply accuracy, combo, and Dragon Fury multipliers
    const accuracyMult = Math.max(0.6, this.stats.accuracy / 100);
    const comboMult = 1 + Math.min(2.5, this.stats.currentCombo * 0.08);
    const furyMult = this.player.isDragonFuryActive ? 2.0 : 1.0;
    let totalDamage = Math.round(baseDamage * accuracyMult * comboMult * furyMult);

    // Additional rage charge on word completion
    this.player.rageMeter = Math.min(this.player.maxRage, this.player.rageMeter + (this.player.isDragonFuryActive ? 0 : 8));

    // Life leech during Dragon Fury
    if (this.player.isDragonFuryActive) {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 5);
      this.addFloatingText('+5 HP', this.player.x, this.player.y - 30, '#10b981', 14);
    }

    // Check if this attack will defeat the enemy
    const willDefeat = (enemy.health - totalDamage) <= 0;
    let defeatMove: DefeatMoveType | undefined;
    let moveVariant = (this.player.attackVariant + 1) % 4;
    let moveLabel = '';

    if (willDefeat) {
      const len = enemy.word.length;
      if (this.difficulty === 'hard') {
        if (len >= 7) {
          defeatMove = 'spinning_kick';
          moveVariant = 4;
          moveLabel = 'SPINNING KICK!';
        } else if (len >= 5) {
          defeatMove = 'jumping_punch';
          moveVariant = 5;
          moveLabel = 'JUMPING PUNCH!';
        } else {
          defeatMove = 'spinning_kick';
          moveVariant = 4;
          moveLabel = 'SPINNING KICK!';
        }
      } else if (this.difficulty === 'normal') {
        if (len >= 7) {
          defeatMove = 'dragon_uppercut';
          moveVariant = 3;
          moveLabel = 'DRAGON UPPERCUT!';
        } else if (len >= 5) {
          defeatMove = 'spinning_kick';
          moveVariant = 4;
          moveLabel = 'SPINNING KICK!';
        } else {
          defeatMove = 'jumping_punch';
          moveVariant = 5;
          moveLabel = 'JUMPING PUNCH!';
        }
      } else {
        // Easy difficulty
        if (len >= 6) {
          defeatMove = 'jumping_punch';
          moveVariant = 5;
          moveLabel = 'JUMPING PUNCH!';
        } else if (len >= 4) {
          defeatMove = 'spinning_kick';
          moveVariant = 4;
          moveLabel = 'SPINNING KICK!';
        } else {
          defeatMove = 'jumping_punch';
          moveVariant = 5;
          moveLabel = 'JUMPING PUNCH!';
        }
      }
    }

    // Player attack animation setup
    this.player.state = 'dash';
    this.player.animTime = 0;
    this.player.animDuration = willDefeat ? 0.38 : 0.28;
    this.player.targetX = Math.min(enemy.x - 35, 450);
    this.player.attackType = tier;
    this.player.defeatMove = defeatMove;
    this.player.attackVariant = moveVariant;
    this.player.auraIntensity = this.player.isDragonFuryActive ? 1.0 : tier === 'DRAGON' || defeatMove === 'dragon_uppercut' ? 1.0 : tier === 'CYCLONE' || defeatMove === 'spinning_kick' ? 0.85 : tier === 'FIERCE' || defeatMove === 'jumping_punch' ? 0.6 : 0;

    // Apply damage to enemy
    enemy.health -= totalDamage;
    enemy.isHitTimer = 0.22;

    // Combo progression
    this.stats.currentCombo++;
    if (this.stats.currentCombo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.currentCombo;
    }

    if (this.stats.currentCombo >= 3) {
      sounds.playComboChime(this.stats.currentCombo);
    }

    // Calculate score
    const wordBonus = enemy.word.length * 15;
    const tierBonus = tier === 'DRAGON' ? 150 : tier === 'CYCLONE' ? 80 : tier === 'FIERCE' ? 40 : 10;
    const finishBonus = willDefeat ? 50 : 0;
    const gainedScore = Math.round((wordBonus + tierBonus + finishBonus) * comboMult * furyMult);
    this.stats.score += gainedScore;

    // Hit effects
    this.triggerShake(tier === 'DRAGON' || defeatMove ? 12 : tier === 'CYCLONE' ? 8 : 5);
    this.createHitSparks(enemy.x, enemy.y, tier);

    // Combat floaters
    this.addFloatingText(`+${gainedScore}`, enemy.x, enemy.y - 45, '#38bdf8', 18, true);
    if (moveLabel) {
      this.addFloatingText(moveLabel, enemy.x, enemy.y - 95, '#fbbf24', 18, true);
    } else if (tier !== 'NORMAL') {
      this.addFloatingText(`${tier}!`, enemy.x, enemy.y - 75, auraColor, 16, true);
    }
    if (this.stats.currentCombo >= 4) {
      this.addFloatingText(`${this.stats.currentCombo}x COMBO!`, this.player.x + 30, this.player.y - 50, '#f59e0b', 16, true);
    }

    // Check Boss Phase Progression or Enemy Defeat
    if (enemy.health <= 0) {
      if (enemy.isBoss && (enemy.bossPhase || 1) < (enemy.maxBossPhase || 3)) {
        // Boss advances to next phase!
        enemy.bossPhase = (enemy.bossPhase || 1) + 1;
        enemy.health = enemy.maxHealth;
        enemy.word = getRandomWord(this.difficulty, this.stats.wave, 'boss');
        enemy.typedIndex = 0;
        enemy.isHitTimer = 0.4;
        this.addFloatingText(`PHASE ${enemy.bossPhase}!`, enemy.x, enemy.y - 70, '#ef4444', 22, true);
        sounds.playDragonHit();
        this.triggerShake(16);
      } else {
        // Enemy or Boss fully defeated!
        enemy.defeated = true;
        enemy.defeatedTimer = 0;
        this.stats.enemiesDefeated++;
        sounds.playEnemyDefeat();
        this.createDefeatBurst(enemy.x, enemy.y, enemy.color);

        if (enemy.isBoss) {
          this.stats.score += 1000;
          this.addFloatingText('BOSS SLAIN! +1000', enemy.x, enemy.y - 80, '#fbbf24', 24, true);
        }

        // Wave progression: Every 8 enemies defeated
        if (this.stats.enemiesDefeated % 8 === 0) {
          this.stats.wave++;
          this.addFloatingText(`WAVE ${this.stats.wave}!`, this.canvas.width / 2 / (window.devicePixelRatio || 1), 160, '#38bdf8', 26, true);
          this.spawnInterval = Math.max(1.3, this.spawnInterval * 0.88);
        }
      }
    } else {
      // Enemy survived (brawler) -> assign next word
      enemy.word = getRandomWord(this.difficulty, this.stats.wave, enemy.tier);
      enemy.typedIndex = 0;
      this.addFloatingText(`CRITICAL HIT!`, enemy.x, enemy.y - 45, '#eab308', 15);
    }

    // Reset active enemy target
    this.activeEnemyId = null;
  }

  // Handle typo / mistake
  private handleTypo(enemy: EnemyEntity, char?: string) {
    this.stats.wrongChars++;
    if (char) {
      this.stats.typoLetterCounts[char] = (this.stats.typoLetterCounts[char] || 0) + 1;
    }
    enemy.errorFlashTimer = 0.28;
    sounds.playTypo();
    this.stats.currentCombo = 0; // combo resets on mistake
    this.triggerShake(5);
    this.addFloatingText('TYPO!', enemy.x, enemy.y - 50, '#ef4444', 16, true);
  }

  private triggerShake(amount: number) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  private createHitSparks(x: number, y: number, tier: AttackTier) {
    const count = tier === 'DRAGON' ? 24 : tier === 'CYCLONE' ? 16 : 10;
    const colors =
      tier === 'DRAGON'
        ? ['#ef4444', '#f97316', '#fbbf24', '#ffffff']
        : tier === 'CYCLONE'
        ? ['#a855f7', '#38bdf8', '#c084fc', '#ffffff']
        : ['#38bdf8', '#67e8f9', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      this.particles.push({
        x,
        y: y - 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: 2 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
        gravity: 12
      });
    }
  }

  private createDefeatBurst(x: number, y: number, baseColor: string) {
    // 1. Flying stickman limbs / bones
    const numLimbs = 6;
    for (let i = 0; i < numLimbs; i++) {
      const angle = (Math.PI * 2 * i) / numLimbs + (Math.random() - 0.5) * 0.4;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x,
        y: y + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed + (Math.random() * 2),
        vy: Math.sin(angle) * speed - 4,
        color: baseColor,
        radius: 3,
        alpha: 1,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
        gravity: 16,
        isStickBone: true,
        length: 16 + Math.random() * 12,
        angle: Math.random() * Math.PI,
        vAngle: (Math.random() - 0.5) * 12
      });
    }

    // 2. High-energy burst sparks
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        color: Math.random() > 0.4 ? '#38bdf8' : '#f8fafc',
        radius: 2 + Math.random() * 3.5,
        alpha: 1,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
        gravity: 14
      });
    }
  }

  private addFloatingText(
    text: string,
    x: number,
    y: number,
    color: string,
    fontSize: number = 16,
    bold: boolean = false
  ) {
    this.floatingTexts.push({
      id: Math.random().toString(36).substring(2, 9),
      text,
      x,
      y,
      vx: (Math.random() - 0.5) * 1,
      vy: -1.8,
      color,
      fontSize,
      alpha: 1,
      life: 0,
      maxLife: 0.85,
      bold
    });
  }

  // Spawn an enemy
  private spawnEnemy() {
    const displayWidth = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    const displayHeight = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
    const baseY = displayHeight * 0.76 - 68;

    this.enemyIdCounter++;

    // Determine enemy tier
    let tier: EnemyTier = 'grunt';
    const wave = this.stats.wave;
    let isBoss = false;
    let bossPhase = 1;
    let maxBossPhase = 3;
    let name = 'NINJA GRUNT';
    let weaponType: 'none' | 'daggers' | 'shield' | 'spikes' | 'katana' = 'none';

    if (wave >= 3 && Math.random() < 0.25) {
      tier = 'runner';
      name = 'SWIFT SHINOBI';
      weaponType = 'daggers';
    } else if (wave >= 4 && Math.random() < 0.22) {
      tier = 'brawler';
      name = 'TITAN BRAWLER';
      weaponType = 'spikes';
    } else if (wave % 5 === 0 && this.enemies.filter((e) => e.tier === 'boss' && !e.defeated).length === 0) {
      tier = 'boss';
      isBoss = true;
      const bossNames = ['SHADOW OVERLORD', 'DEMON RONIN', 'CYBER TITAN', 'VOID DRAGON'];
      name = bossNames[Math.floor(((wave / 5) - 1)) % bossNames.length];
      this.activeBossName = name;
      this.bossAlertTimer = 2.8;
      sounds.playBossAlert();
      weaponType = 'katana';
    }

    // Difficulty base speed
    const baseSpeed =
      this.difficulty === 'easy' ? 24 : this.difficulty === 'hard' ? 42 : 32;
    const waveSpeedFactor = 1 + wave * 0.08;

    let speed = baseSpeed * waveSpeedFactor;
    let maxHealth = 60;
    let color = '#f87171'; // red stickman grunt
    let headbandColor = '#ef4444';
    let scale = 1.0;

    if (tier === 'runner') {
      speed *= 1.45;
      maxHealth = 45;
      color = '#fbbf24'; // amber swift ninja
      headbandColor = '#d97706';
      scale = 0.92;
    } else if (tier === 'brawler') {
      speed *= 0.72;
      maxHealth = 130;
      color = '#a855f7'; // purple heavy
      headbandColor = '#7e22ce';
      scale = 1.18;
    } else if (tier === 'boss') {
      speed *= 0.52;
      maxHealth = 280;
      color = '#e11d48'; // crimson boss
      headbandColor = '#fbbf24';
      scale = 1.38;
    }

    const word = getRandomWord(this.difficulty, wave, tier);

    // Stagger spawn x so multiple incoming enemies don't overlap directly
    const lastEnemy = this.enemies[this.enemies.length - 1];
    const spawnX = Math.max(displayWidth + 40, (lastEnemy ? lastEnemy.x + 90 : displayWidth + 50));

    const enemy: EnemyEntity = {
      id: `enemy_${this.enemyIdCounter}`,
      tier,
      word,
      name,
      isBoss,
      bossPhase,
      maxBossPhase,
      weaponType,
      typedIndex: 0,
      errorFlashTimer: 0,
      x: spawnX,
      y: baseY,
      baseY,
      speed,
      health: maxHealth,
      maxHealth,
      color,
      walkCycle: 0,
      attackCooldown: 0,
      isHitTimer: 0,
      defeated: false,
      defeatedTimer: 0,
      headbandColor,
      scale
    };

    this.enemies.push(enemy);
  }

  // Update physics and state
  private update(dt: number) {
    if (this.status !== 'PLAYING') return;

    this.stats.elapsedSeconds = (Date.now() - this.stats.startTime) / 1000;

    // Boss warning timer
    if (this.bossAlertTimer > 0) {
      this.bossAlertTimer -= dt;
    }

    // Dragon Fury timer
    if (this.player.isDragonFuryActive) {
      this.player.dragonFuryTimer -= dt;
      if (this.player.dragonFuryTimer <= 0) {
        this.player.isDragonFuryActive = false;
        this.player.dragonFuryTimer = 0;
      }
    }

    // 1. Spawning
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer = this.spawnInterval * (0.85 + Math.random() * 0.35);
    }

    // 2. Player animation and states
    if (this.player.state === 'dash') {
      this.player.animTime += dt;
      // Dash towards target
      this.player.x += (this.player.targetX - this.player.x) * 16 * dt;
      if (this.player.animTime >= this.player.animDuration * 0.4) {
        this.player.state = 'attack';
      }
    } else if (this.player.state === 'attack') {
      this.player.animTime += dt;
      if (this.player.animTime >= this.player.animDuration) {
        this.player.state = 'retreat';
      }
    } else if (this.player.state === 'retreat') {
      this.player.x += (this.player.baseX - this.player.x) * 12 * dt;
      if (Math.abs(this.player.x - this.player.baseX) < 4) {
        this.player.x = this.player.baseX;
        this.player.state = 'idle';
        this.player.auraIntensity = 0;
        this.player.defeatMove = undefined;
      }
    } else if (this.player.state === 'hurt') {
      this.player.hurtTimer -= dt;
      if (this.player.hurtTimer <= 0) {
        this.player.state = 'idle';
      }
    }

    // 3. Enemies movement and interaction
    const defenseThreshold = 185;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Flash timers
      if (enemy.errorFlashTimer > 0) enemy.errorFlashTimer -= dt;
      if (enemy.isHitTimer > 0) enemy.isHitTimer -= dt;
      if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;

      if (enemy.defeated) {
        enemy.defeatedTimer += dt;
        if (enemy.defeatedTimer > 0.4) {
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // March left towards stickman
      enemy.walkCycle += dt * (enemy.speed * 0.16);
      enemy.x -= enemy.speed * dt;

      // Enemy reaches stickman defense boundary!
      if (enemy.x <= defenseThreshold && enemy.attackCooldown <= 0) {
        // Enemy attacks stickman!
        const damage = enemy.tier === 'boss' ? 30 : enemy.tier === 'brawler' ? 22 : 14;
        this.player.health -= damage;
        this.player.state = 'hurt';
        this.player.hurtTimer = 0.32;
        this.stats.currentCombo = 0; // combo broken!
        sounds.playPlayerHurt();
        this.triggerShake(12);

        this.addFloatingText(`-${damage} HP!`, this.player.x, this.player.y - 45, '#ef4444', 20, true);

        // Enemy recoils back slightly to give player reaction window
        enemy.x = defenseThreshold + 40;
        enemy.attackCooldown = 1.35;

        // Check player death
        if (this.player.health <= 0) {
          this.player.health = 0;
          this.handleGameOver();
          return;
        }
      }
    }

    // 4. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.isStickBone && p.vAngle) {
        p.angle = (p.angle || 0) + p.vAngle * dt;
      }
      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // 5. Update floating combat texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life += dt;
      t.x += t.vx;
      t.y += t.vy;
      t.alpha = 1 - t.life / t.maxLife;
      if (t.life >= t.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 6. Update ambient petals
    const displayW = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    const displayH = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
    for (const petal of this.ambientPetals) {
      petal.x += petal.vx;
      petal.y += petal.vy;
      petal.rot += petal.vRot * dt;
      if (petal.x > displayW + 20) petal.x = -20;
      if (petal.y > displayH + 20) petal.y = -20;
    }

    // 7. Screen shake decay
    if (this.shakeAmount > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeAmount * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeAmount * 2;
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 25);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    this.calculateStats();
  }

  // Calculate live WPM & accuracy
  private calculateStats() {
    const elapsedMinutes = Math.max(0.02, (Date.now() - this.stats.startTime) / 60000);
    // Standard WPM formula: (correct characters / 5) / (time elapsed in minutes)
    this.stats.currentWpm = Math.round((this.stats.correctChars / 5) / elapsedMinutes);
    if (this.stats.currentWpm > this.stats.peakWpm) {
      this.stats.peakWpm = this.stats.currentWpm;
    }

    const totalKeyAttempts = this.stats.correctChars + this.stats.wrongChars;
    this.stats.accuracy =
      totalKeyAttempts > 0
        ? Math.round((this.stats.correctChars / totalKeyAttempts) * 100)
        : 100;
  }

  // Game over handler
  private handleGameOver() {
    this.status = 'GAMEOVER';
    sounds.playGameOver();
    sounds.stopBgmLoop();
    this.triggerShake(16);
    this.saveHighScore();
    this.notifyUI();
  }

  // Save record in localStorage
  private saveHighScore() {
    try {
      const recordsKey = 'type_fighter_high_scores';
      const raw = localStorage.getItem(recordsKey);
      const list: HighScoreRecord[] = raw ? JSON.parse(raw) : [];

      const newRecord: HighScoreRecord = {
        score: this.stats.score,
        wpm: this.stats.currentWpm,
        accuracy: this.stats.accuracy,
        enemies: this.stats.enemiesDefeated,
        combo: this.stats.maxCombo,
        date: new Date().toLocaleDateString()
      };

      list.push(newRecord);
      list.sort((a, b) => b.score - a.score);
      const top5 = list.slice(0, 5);
      localStorage.setItem(recordsKey, JSON.stringify(top5));
    } catch {
      // localStorage fallback
    }
  }

  // Render loop
  private render(time: number) {
    const seconds = time / 1000;

    // Draw background arena with Dragon Fury coloring
    this.renderer.drawArena(seconds, this.shakeX, this.shakeY, this.player.isDragonFuryActive);

    // Draw ambient cherry blossom petals
    this.renderer.drawAmbientPetals(this.ambientPetals);

    // Draw Boss Warning Siren if active
    if (this.bossAlertTimer > 0) {
      this.renderer.drawBossWarning(seconds, this.activeBossName);
    }

    // Draw active Boss Health Bar at top center
    const activeBoss = this.enemies.find((e) => e.isBoss && !e.defeated);
    if (activeBoss) {
      this.renderer.drawBossHealthBar(activeBoss);
    }

    // Draw Player Stickman
    const playerPose = this.renderer.getPlayerPose(this.player, seconds);
    const playerColor = this.player.isDragonFuryActive
      ? '#f59e0b'
      : this.player.state === 'hurt'
      ? '#ef4444'
      : '#38bdf8';

    this.renderer.drawStickman(
      this.player.x + this.shakeX,
      this.player.y + this.shakeY,
      1,
      playerPose,
      {
        color: playerColor,
        lineWidth: this.player.isDragonFuryActive ? 4.5 : 3.5,
        headRadius: 13,
        headband: this.player.isDragonFuryActive ? '#fef08a' : '#38bdf8',
        headbandTail: true,
        glowingEyes: this.player.isDragonFuryActive ? '#fef08a' : undefined,
        auraColor:
          this.player.isDragonFuryActive
            ? '#f59e0b'
            : this.player.defeatMove === 'spinning_kick'
            ? '#a855f7'
            : this.player.defeatMove === 'jumping_punch'
            ? '#06b6d4'
            : this.player.defeatMove === 'dragon_uppercut' || this.player.attackType === 'DRAGON'
            ? '#ef4444'
            : this.player.attackType === 'CYCLONE'
            ? '#a855f7'
            : this.player.attackType === 'FIERCE'
            ? '#f59e0b'
            : '#38bdf8',
        auraIntensity: this.player.isDragonFuryActive ? 1.0 : this.player.auraIntensity,
        glow: true
      }
    );

    // Draw Enemies
    const aliveEnemies = this.enemies.filter((e) => !e.defeated);
    aliveEnemies.sort((a, b) => a.x - b.x);
    const closestEnemyId = aliveEnemies[0]?.id;

    for (const enemy of this.enemies) {
      if (enemy.defeated) continue;

      const enemyPose = this.renderer.getEnemyPose(enemy, seconds);
      this.renderer.drawStickman(
        enemy.x + this.shakeX,
        enemy.y + this.shakeY,
        -1, // facing left towards player
        enemyPose,
        {
          color: enemy.isHitTimer > 0 ? '#ffffff' : enemy.color,
          lineWidth: enemy.tier === 'boss' ? 4.5 : enemy.tier === 'brawler' ? 4.0 : 3.0,
          headRadius: (enemy.tier === 'boss' ? 16 : enemy.tier === 'brawler' ? 14 : 11) * enemy.scale,
          headband: enemy.headbandColor,
          headbandTail: true,
          weapon: enemy.weaponType,
          glowingEyes: enemy.isBoss ? '#ef4444' : undefined
        }
      );

      // Draw target word above head
      this.renderer.drawEnemyWord(
        enemy,
        enemy.id === this.activeEnemyId,
        enemy.id === closestEnemyId
      );
    }

    // Draw hit particles & flying bones
    this.renderer.drawParticles(this.particles);

    // Draw floating texts
    this.renderer.drawFloatingTexts(this.floatingTexts);
  }

  // Main animation loop
  private loop(currentTime: number) {
    if (this.status === 'PLAYING') {
      const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = currentTime;

      this.update(dt);
      this.render(currentTime);

      this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
  }

  private notifyUI() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  public destroy() {
    cancelAnimationFrame(this.animFrameId);
  }
}
