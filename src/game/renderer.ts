/**
 * Canvas 2D Renderer for Type Fighter.
 * Handles procedural stickman kinematics, combat animations, particles, and arena effects.
 */

import { PlayerState, EnemyEntity, Particle, FloatingText, AttackTier, AmbientPetal } from './types';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 1000;
  private height: number = 600;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  // Draw background arena: Cyber-Dojo with floor perspective, lanterns, and floor line
  public drawArena(time: number, shakeX: number, shakeY: number, isDragonFuryActive: boolean = false) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Deep gradient background (shifts to burning golden red during Dragon Fury)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (isDragonFuryActive) {
      bgGrad.addColorStop(0, '#2a0808');
      bgGrad.addColorStop(0.65, '#3b0712');
      bgGrad.addColorStop(1, '#1a0307');
    } else {
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.65, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const floorY = h * 0.76;

    // Distant background silhouettes (mountains & pagoda / dojo pillars)
    ctx.fillStyle = isDragonFuryActive ? 'rgba(76, 5, 25, 0.45)' : 'rgba(30, 41, 59, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w * 0.15, floorY - 90);
    ctx.lineTo(w * 0.35, floorY - 50);
    ctx.lineTo(w * 0.55, floorY - 110);
    ctx.lineTo(w * 0.75, floorY - 60);
    ctx.lineTo(w, floorY - 80);
    ctx.lineTo(w, floorY);
    ctx.closePath();
    ctx.fill();

    // Subtle moon / spotlight in upper background
    const moonGrad = ctx.createRadialGradient(w * 0.25, h * 0.25, 10, w * 0.25, h * 0.25, 180);
    if (isDragonFuryActive) {
      moonGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
      moonGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.08)');
      moonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      moonGrad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
      moonGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.03)');
      moonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(w * 0.25, h * 0.25, 180, 0, Math.PI * 2);
    ctx.fill();

    // Perspective floor lines (Cyber Dojo Tatami grid)
    ctx.strokeStyle = isDragonFuryActive ? 'rgba(239, 68, 68, 0.35)' : 'rgba(51, 65, 85, 0.45)';
    ctx.lineWidth = 1;
    const numGridLines = 14;
    for (let i = 0; i <= numGridLines; i++) {
      const topX = (w / numGridLines) * i;
      const bottomX = (w / numGridLines) * i + (i - numGridLines / 2) * 50;
      ctx.beginPath();
      ctx.moveTo(topX, floorY);
      ctx.lineTo(bottomX, h);
      ctx.stroke();
    }

    // Horizontal floor depth lines
    for (let py = floorY; py < h; py += 18 + (py - floorY) * 0.25) {
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }

    // Main floor baseline
    const floorGlow = ctx.createLinearGradient(0, floorY, 0, floorY + 4);
    floorGlow.addColorStop(0, isDragonFuryActive ? '#f59e0b' : '#38bdf8');
    floorGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(0, floorY, w, 3);

    // Defense boundary line (where stickman stands)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(220, floorY - 50);
    ctx.lineTo(220, h);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  // Draw gentle floating cherry blossom sakura petals in the dojo
  public drawAmbientPetals(petals: AmbientPetal[]) {
    const ctx = this.ctx;
    ctx.save();
    for (const p of petals) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#f472b6'; // soft cherry pink
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // Draw Boss Warning Siren banner
  public drawBossWarning(time: number, bossName: string = 'SHADOW OVERLORD') {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const flash = Math.sin(time * 12) > 0;

    ctx.save();
    // Dark letterbox band
    const bandH = 72;
    const bandY = h * 0.28;
    ctx.fillStyle = flash ? 'rgba(220, 38, 38, 0.85)' : 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, bandY, w, bandH);

    // Hazard stripes
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    for (let x = -50; x < w + 50; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, bandY);
      ctx.lineTo(x + 18, bandY + bandH);
      ctx.stroke();
    }

    ctx.font = '800 24px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillText(`⚠ WARNING: BOSS APPROACHING · ${bossName} ⚠`, w / 2, bandY + 44);
    ctx.restore();
  }

  // Draw Top Boss Health Bar
  public drawBossHealthBar(boss: EnemyEntity) {
    const ctx = this.ctx;
    const w = this.width;
    const barW = Math.min(480, w * 0.55);
    const barH = 18;
    const x = (w - barW) / 2;
    const y = 58;

    const hpPercent = Math.max(0, boss.health / boss.maxHealth);

    ctx.save();
    // Background card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - 14, y - 26, barW + 28, barH + 42, 8);
    ctx.fill();
    ctx.stroke();

    // Boss Name & Phase
    ctx.font = '800 13px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'left';
    ctx.fillText(`💀 BOSS: ${boss.name || 'SHADOW OVERLORD'}`, x, y - 8);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`PHASE ${boss.bossPhase || 1} / ${boss.maxBossPhase || 3}`, x + barW, y - 8);

    // Health bar track
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, barW, barH);

    // Health fill
    const fillGrad = ctx.createLinearGradient(x, 0, x + barW, 0);
    fillGrad.addColorStop(0, '#f59e0b');
    fillGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(x, y, barW * hpPercent, barH);

    // Health numbers
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(boss.health)} / ${boss.maxHealth} HP`, x + barW / 2, y + 13);

    ctx.restore();
  }

  // Draw procedural stickman
  public drawStickman(
    x: number,
    y: number,
    facing: 1 | -1, // 1 for right, -1 for left
    pose: {
      headOffset: { x: number; y: number };
      torsoTilt: number; // angle in radians
      shoulder: { x: number; y: number };
      hip: { x: number; y: number };
      armL: { elbow: { x: number; y: number }; hand: { x: number; y: number } };
      armR: { elbow: { x: number; y: number }; hand: { x: number; y: number } };
      legL: { knee: { x: number; y: number }; foot: { x: number; y: number } };
      legR: { knee: { x: number; y: number }; foot: { x: number; y: number } };
    },
    options: {
      color: string;
      lineWidth: number;
      headRadius?: number;
      headband?: string; // color
      headbandTail?: boolean;
      auraColor?: string;
      auraIntensity?: number;
      glow?: boolean;
      glowingEyes?: string;
      weapon?: 'none' | 'daggers' | 'shield' | 'spikes' | 'katana';
    }
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    // Shadow on the ground
    const shadowY = 70; // ground offset
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, shadowY, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aura / Speed trail
    if (options.auraIntensity && options.auraIntensity > 0) {
      ctx.save();
      ctx.shadowColor = options.auraColor || '#38bdf8';
      ctx.shadowBlur = 15 * options.auraIntensity;
      ctx.strokeStyle = options.auraColor || '#38bdf8';
      ctx.lineWidth = options.lineWidth + 2;
      ctx.globalAlpha = 0.5 * options.auraIntensity;
      // Draw ghost outline
      this.renderBones(ctx, facing, pose, options);
      ctx.restore();
    }

    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (options.glow) {
      ctx.shadowColor = options.color;
      ctx.shadowBlur = 8;
    }

    this.renderBones(ctx, facing, pose, options);

    ctx.restore();
  }

  private renderBones(
    ctx: CanvasRenderingContext2D,
    facing: 1 | -1,
    pose: any,
    options: any
  ) {
    const headR = options.headRadius || 12;

    // 1. Back leg (legL)
    ctx.beginPath();
    ctx.moveTo(pose.hip.x * facing, pose.hip.y);
    ctx.lineTo(pose.legL.knee.x * facing, pose.legL.knee.y);
    ctx.lineTo(pose.legL.foot.x * facing, pose.legL.foot.y);
    ctx.stroke();

    // 2. Back arm (armL)
    ctx.beginPath();
    ctx.moveTo(pose.shoulder.x * facing, pose.shoulder.y);
    ctx.lineTo(pose.armL.elbow.x * facing, pose.armL.elbow.y);
    ctx.lineTo(pose.armL.hand.x * facing, pose.armL.hand.y);
    ctx.stroke();

    // 3. Torso
    ctx.beginPath();
    ctx.moveTo(pose.shoulder.x * facing, pose.shoulder.y);
    ctx.lineTo(pose.hip.x * facing, pose.hip.y);
    ctx.stroke();

    // 4. Front leg (legR)
    ctx.beginPath();
    ctx.moveTo(pose.hip.x * facing, pose.hip.y);
    ctx.lineTo(pose.legR.knee.x * facing, pose.legR.knee.y);
    ctx.lineTo(pose.legR.foot.x * facing, pose.legR.foot.y);
    ctx.stroke();

    // 5. Front arm (armR)
    ctx.beginPath();
    ctx.moveTo(pose.shoulder.x * facing, pose.shoulder.y);
    ctx.lineTo(pose.armR.elbow.x * facing, pose.armR.elbow.y);
    ctx.lineTo(pose.armR.hand.x * facing, pose.armR.hand.y);
    ctx.stroke();

    // 6. Head
    const headX = (pose.shoulder.x + pose.headOffset.x) * facing;
    const headY = pose.shoulder.y - headR - 4 + pose.headOffset.y;
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.stroke();

    // Headband
    if (options.headband) {
      ctx.save();
      ctx.strokeStyle = options.headband;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(headX, headY, headR + 1, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();

      if (options.headbandTail) {
        ctx.beginPath();
        const tailOriginX = headX - headR * facing;
        const tailOriginY = headY - 1;
        ctx.moveTo(tailOriginX, tailOriginY);
        ctx.quadraticCurveTo(
          tailOriginX - 14 * facing,
          tailOriginY + 6,
          tailOriginX - 22 * facing,
          tailOriginY + 3
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    // Glowing menacing eyes for bosses or super stickman
    if (options.glowingEyes) {
      ctx.save();
      ctx.fillStyle = options.glowingEyes;
      ctx.shadowColor = options.glowingEyes;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(headX + 4 * facing, headY - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Weapons (Katana, Spikes)
    if (options.weapon === 'katana') {
      ctx.save();
      ctx.strokeStyle = '#f43f5e'; // glowing crimson katana
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2.5;
      const hx = pose.armR.hand.x * facing;
      const hy = pose.armR.hand.y;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + 38 * facing, hy - 22);
      ctx.stroke();
      // Guard / Tsuba
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hx + 5 * facing, hy - 2);
      ctx.lineTo(hx + 3 * facing, hy - 8);
      ctx.stroke();
      ctx.restore();
    } else if (options.weapon === 'spikes') {
      ctx.save();
      ctx.fillStyle = '#a855f7';
      const hx = pose.armR.hand.x * facing;
      const hy = pose.armR.hand.y;
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + 8 * facing, hy - 4);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Calculate player pose based on current animation state & timer
  public getPlayerPose(player: PlayerState, time: number) {
    const defaultShoulder = { x: 0, y: -22 };
    const defaultHip = { x: 0, y: 15 };

    if (player.state === 'hurt') {
      // Recoil flinch
      return {
        headOffset: { x: -8, y: -4 },
        torsoTilt: -0.3,
        shoulder: { x: -6, y: -20 },
        hip: { x: 0, y: 18 },
        armL: { elbow: { x: -18, y: -10 }, hand: { x: -14, y: 5 } },
        armR: { elbow: { x: -12, y: -25 }, hand: { x: 0, y: -30 } },
        legL: { knee: { x: -16, y: 40 }, foot: { x: -25, y: 68 } },
        legR: { knee: { x: 8, y: 38 }, foot: { x: 5, y: 68 } }
      };
    }

    if (player.state === 'dash') {
      // Forward charging dash
      return {
        headOffset: { x: 8, y: 2 },
        torsoTilt: 0.4,
        shoulder: { x: 8, y: -18 },
        hip: { x: -6, y: 14 },
        armL: { elbow: { x: -15, y: -8 }, hand: { x: -25, y: 2 } },
        armR: { elbow: { x: 18, y: -10 }, hand: { x: 28, y: -12 } },
        legL: { knee: { x: -20, y: 35 }, foot: { x: -30, y: 65 } },
        legR: { knee: { x: 14, y: 36 }, foot: { x: 22, y: 68 } }
      };
    }

    if (player.state === 'attack') {
      const progress = Math.min(1, player.animTime / player.animDuration);
      const variant = player.attackVariant;

      // 4: Spinning Kick (360 whirlwind spinning crescent roundhouse)
      if (variant === 4 || player.defeatMove === 'spinning_kick') {
        const spinAngle = progress * Math.PI * 2; // full rotation
        const hopY = -Math.sin(progress * Math.PI) * 22; // airborne hop
        const legReach = Math.sin(progress * Math.PI) * 44;
        const kickLead = Math.cos(spinAngle);
        return {
          headOffset: { x: kickLead * 8, y: -2 + hopY },
          torsoTilt: kickLead * 0.35,
          shoulder: { x: kickLead * 6, y: -22 + hopY },
          hip: { x: -kickLead * 4, y: 14 + hopY },
          armL: {
            elbow: { x: -kickLead * 18, y: -16 + hopY },
            hand: { x: -kickLead * 28, y: -8 + hopY }
          },
          armR: {
            elbow: { x: kickLead * 18, y: -22 + hopY },
            hand: { x: kickLead * 28, y: -14 + hopY }
          },
          legL: {
            knee: { x: -kickLead * 10, y: 34 + hopY },
            foot: { x: -kickLead * 16, y: 56 + hopY }
          },
          legR: {
            knee: { x: kickLead * 24, y: 16 - Math.abs(kickLead) * 18 + hopY },
            foot: { x: kickLead * legReach + 18, y: -6 - Math.abs(kickLead) * 24 + hopY }
          }
        };
      }

      // 5: Jumping Punch (Superman leap punch driving forward and down into enemy)
      if (variant === 5 || player.defeatMove === 'jumping_punch') {
        const jumpArc = Math.sin(progress * Math.PI);
        const leapY = -jumpArc * 34;
        const punchForward = jumpArc * 46;
        return {
          headOffset: { x: 8, y: leapY - 2 },
          torsoTilt: 0.55,
          shoulder: { x: 12, y: -20 + leapY },
          hip: { x: -10, y: 12 + leapY },
          armL: {
            elbow: { x: -16, y: -6 + leapY },
            hand: { x: -28, y: 4 + leapY } // cocked back for balance
          },
          armR: {
            elbow: { x: 20 + punchForward * 0.4, y: -14 + leapY },
            hand: { x: 34 + punchForward, y: -4 + leapY } // lunging forward strike
          },
          legL: {
            knee: { x: -22, y: 28 + leapY },
            foot: { x: -36, y: 45 + leapY } // trailing leg extended
          },
          legR: {
            knee: { x: 4, y: 36 + leapY },
            foot: { x: -6, y: 58 + leapY } // bent front knee
          }
        };
      }

      // 6: Axe Kick (High leg raise followed by crushing downward heel slam)
      if (variant === 6 || player.defeatMove === 'axe_kick') {
        const liftPhase = progress < 0.45 ? progress / 0.45 : 1 - (progress - 0.45) / 0.55;
        const slamPhase = progress >= 0.45 ? (progress - 0.45) / 0.55 : 0;
        return {
          headOffset: { x: -6 * liftPhase, y: -4 * liftPhase },
          torsoTilt: -0.35 * liftPhase + 0.25 * slamPhase,
          shoulder: { x: -6 * liftPhase, y: -22 },
          hip: { x: 2, y: 14 },
          armL: { elbow: { x: -16, y: -14 }, hand: { x: -22, y: -4 } },
          armR: { elbow: { x: 10, y: -26 }, hand: { x: 16, y: -18 } },
          legL: { knee: { x: -6, y: 40 }, foot: { x: -8, y: 68 } },
          legR: {
            knee: { x: 14 + 10 * liftPhase, y: 10 - 32 * liftPhase + slamPhase * 20 },
            foot: { x: 30 + 16 * liftPhase, y: -38 * liftPhase + slamPhase * 55 }
          }
        };
      }

      if (variant === 0) {
        // Fast Straight Punch / Jab
        const punchReach = Math.sin(progress * Math.PI) * 38;
        return {
          headOffset: { x: 4, y: 0 },
          torsoTilt: 0.2,
          shoulder: { x: 4, y: -22 },
          hip: { x: -2, y: 15 },
          armL: { elbow: { x: -6, y: -18 }, hand: { x: -2, y: -24 } }, // guard hand
          armR: {
            elbow: { x: 14 + punchReach * 0.45, y: -22 },
            hand: { x: 26 + punchReach, y: -22 }
          },
          legL: { knee: { x: -14, y: 38 }, foot: { x: -20, y: 68 } },
          legR: { knee: { x: 12, y: 38 }, foot: { x: 18, y: 68 } }
        };
      } else if (variant === 1) {
        // High Roundhouse Kick
        const kickAngle = Math.sin(progress * Math.PI);
        return {
          headOffset: { x: -10 * kickAngle, y: 2 * kickAngle },
          torsoTilt: -0.4 * kickAngle,
          shoulder: { x: -10 * kickAngle, y: -20 },
          hip: { x: 0, y: 15 },
          armL: { elbow: { x: -18, y: -10 }, hand: { x: -24, y: 4 } },
          armR: { elbow: { x: 2, y: -26 }, hand: { x: 10, y: -15 } },
          legL: { knee: { x: -4, y: 40 }, foot: { x: -6, y: 68 } }, // standing leg
          legR: {
            knee: { x: 18 * kickAngle, y: 10 - 25 * kickAngle },
            foot: { x: 42 * kickAngle, y: -12 - 20 * kickAngle }
          }
        };
      } else if (variant === 2) {
        // Flying Dropkick (Airborne)
        const peak = Math.sin(progress * Math.PI);
        return {
          headOffset: { x: -8, y: -10 * peak },
          torsoTilt: -0.6,
          shoulder: { x: -10, y: -22 - 25 * peak },
          hip: { x: 2, y: 10 - 25 * peak },
          armL: { elbow: { x: -22, y: -18 - 25 * peak }, hand: { x: -30, y: -10 - 25 * peak } },
          armR: { elbow: { x: 6, y: -28 - 25 * peak }, hand: { x: 16, y: -22 - 25 * peak } },
          legL: { knee: { x: 20, y: 5 - 25 * peak }, foot: { x: 45, y: -8 - 25 * peak } },
          legR: { knee: { x: 24, y: 10 - 25 * peak }, foot: { x: 48, y: 0 - 25 * peak } }
        };
      } else {
        // Dragon Uppercut (Rising Fist with flame aura)
        const peak = Math.sin(progress * Math.PI);
        return {
          headOffset: { x: 4, y: -8 * peak },
          torsoTilt: 0.1,
          shoulder: { x: 2, y: -24 - 35 * peak },
          hip: { x: -4, y: 12 - 35 * peak },
          armL: { elbow: { x: -14, y: -10 - 35 * peak }, hand: { x: -10, y: 6 - 35 * peak } },
          armR: {
            elbow: { x: 8, y: -38 - 35 * peak },
            hand: { x: 12, y: -58 - 35 * peak } // Sky-punching fist!
          },
          legL: { knee: { x: -8, y: 35 - 35 * peak }, foot: { x: -12, y: 60 - 35 * peak } },
          legR: { knee: { x: 12, y: 28 - 35 * peak }, foot: { x: 6, y: 52 - 35 * peak } }
        };
      }
    }

    // Default: Martial Arts Idle Bobbing Stance
    const bob = Math.sin(time * 6) * 3;
    const breathe = Math.sin(time * 3) * 1.5;
    return {
      headOffset: { x: 2, y: bob },
      torsoTilt: 0.08,
      shoulder: { x: defaultShoulder.x + 2, y: defaultShoulder.y + bob },
      hip: { x: defaultHip.x, y: defaultHip.y + bob * 0.5 },
      // Guard stance arms (boxing / wing chun guard)
      armL: { elbow: { x: -10, y: -14 + bob }, hand: { x: 2, y: -24 + bob } },
      armR: { elbow: { x: 8, y: -16 + bob + breathe }, hand: { x: 18, y: -22 + bob } },
      // Ready legs
      legL: { knee: { x: -12, y: 40 }, foot: { x: -16, y: 68 } },
      legR: { knee: { x: 10, y: 40 }, foot: { x: 14, y: 68 } }
    };
  }

  // Calculate enemy walking pose
  public getEnemyPose(enemy: EnemyEntity, time: number) {
    const walkPhase = enemy.walkCycle;
    const legSwing = Math.sin(walkPhase) * 18;
    const armSwing = Math.cos(walkPhase) * 16;
    const bob = Math.abs(Math.sin(walkPhase)) * 4;

    const shoulderY = -22 + bob;
    const hipY = 15 + bob * 0.5;

    if (enemy.isHitTimer > 0) {
      // Hit flinch backwards
      return {
        headOffset: { x: -6, y: -2 },
        torsoTilt: -0.3,
        shoulder: { x: -5, y: -20 },
        hip: { x: 2, y: 16 },
        armL: { elbow: { x: -16, y: -15 }, hand: { x: -20, y: -5 } },
        armR: { elbow: { x: 4, y: -20 }, hand: { x: 12, y: -10 } },
        legL: { knee: { x: -14, y: 40 }, foot: { x: -20, y: 68 } },
        legR: { knee: { x: 8, y: 40 }, foot: { x: 12, y: 68 } }
      };
    }

    if (enemy.tier === 'runner') {
      // Low forward sprint
      return {
        headOffset: { x: 6, y: 4 },
        torsoTilt: 0.35,
        shoulder: { x: 6, y: -16 + bob },
        hip: { x: -4, y: 16 + bob },
        armL: { elbow: { x: -armSwing * 0.8, y: -10 }, hand: { x: -armSwing * 1.3, y: -6 } },
        armR: { elbow: { x: armSwing * 0.8, y: -10 }, hand: { x: armSwing * 1.3, y: -6 } },
        legL: { knee: { x: -legSwing * 0.6, y: 38 }, foot: { x: -legSwing, y: 68 } },
        legR: { knee: { x: legSwing * 0.6, y: 38 }, foot: { x: legSwing, y: 68 } }
      };
    }

    // Standard marching brawler
    return {
      headOffset: { x: 0, y: bob },
      torsoTilt: 0.05,
      shoulder: { x: 0, y: shoulderY },
      hip: { x: 0, y: hipY },
      armL: { elbow: { x: -armSwing * 0.6, y: -14 + bob }, hand: { x: -armSwing, y: -8 + bob } },
      armR: { elbow: { x: armSwing * 0.6, y: -14 + bob }, hand: { x: armSwing, y: -8 + bob } },
      legL: { knee: { x: -legSwing * 0.5, y: 40 }, foot: { x: -legSwing, y: 68 } },
      legR: { knee: { x: legSwing * 0.5, y: 40 }, foot: { x: legSwing, y: 68 } }
    };
  }

  // Draw floating word with typing highlights above enemy head
  public drawEnemyWord(
    enemy: EnemyEntity,
    isActiveTarget: boolean,
    isClosest: boolean
  ) {
    const ctx = this.ctx;
    const x = enemy.x;
    const y = enemy.y - 58 * enemy.scale;

    ctx.save();

    const word = enemy.word;
    const typed = enemy.typedIndex;
    const isError = enemy.errorFlashTimer > 0;

    ctx.font = '700 19px "JetBrains Mono", monospace';
    const totalWidth = ctx.measureText(word).width;
    const paddingX = 14;
    const paddingY = 6;
    const boxWidth = totalWidth + paddingX * 2;
    const boxHeight = 32;

    // Background pill/tag
    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight / 2;

    // Glow border for active target or error
    if (isError) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.strokeStyle = '#ef4444';
    } else if (isActiveTarget) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#38bdf8';
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = isClosest ? 'rgba(148, 163, 184, 0.6)' : 'rgba(71, 85, 105, 0.4)';
    }

    ctx.lineWidth = isActiveTarget ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
    ctx.fill();
    ctx.stroke();

    // Active target indicator reticle / pointer
    if (isActiveTarget) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(x, boxY + boxHeight + 6);
      ctx.lineTo(x - 5, boxY + boxHeight);
      ctx.lineTo(x + 5, boxY + boxHeight);
      ctx.closePath();
      ctx.fill();
    }

    // Render characters: matched in glowing green/cyan, unmatched in bright white/gray
    let currentX = boxX + paddingX;
    const textY = y + 6;

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const charWidth = ctx.measureText(char).width;

      if (i < typed) {
        // Matched character
        ctx.fillStyle = '#10b981'; // vibrant emerald green
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 6;
      } else if (i === typed && isActiveTarget) {
        // Next expected character cursor
        ctx.fillStyle = isError ? '#ef4444' : '#f8fafc';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = isError ? 10 : 8;

        // Subtle underline cursor
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentX, textY + 3);
        ctx.lineTo(currentX + charWidth, textY + 3);
        ctx.stroke();
      } else {
        // Remaining unmatched characters
        ctx.fillStyle = '#cbd5e1';
        ctx.shadowBlur = 0;
      }

      ctx.fillText(char, currentX, textY);
      currentX += charWidth;
    }

    ctx.restore();
  }

  // Draw particles (hit sparks, embers, exploding stick bones)
  public drawParticles(particles: Particle[]) {
    const ctx = this.ctx;
    ctx.save();

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.isStickBone && p.length && p.angle !== undefined) {
        // Render tumbling bone limb
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(-p.length / 2, 0);
        ctx.lineTo(p.length / 2, 0);
        ctx.stroke();
        ctx.restore();
      } else {
        // Glowing circular energy particle / hit spark
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Draw floating combat text (e.g. +100, CRITICAL, 5x COMBO)
  public drawFloatingTexts(texts: FloatingText[]) {
    const ctx = this.ctx;
    ctx.save();

    for (const t of texts) {
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.font = `${t.bold ? '800' : '700'} ${t.fontSize}px "Chakra Petch", sans-serif`;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }

    ctx.restore();
  }

  // Draw impact slash / shockwave on attack contact
  public drawHitSlash(x: number, y: number, tier: AttackTier, progress: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    const radius = 25 + progress * 55;
    const alpha = Math.max(0, 1 - progress);

    let slashColor = '#38bdf8';
    if (tier === 'FIERCE') slashColor = '#f59e0b';
    if (tier === 'CYCLONE') slashColor = '#a855f7';
    if (tier === 'DRAGON') slashColor = '#ef4444';

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = slashColor;
    ctx.shadowColor = slashColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4 * (1 - progress);

    // Dynamic martial arts arc slash
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();

    // Additional cross slash for heavy tiers
    if (tier === 'CYCLONE' || tier === 'DRAGON') {
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.8, Math.PI * 0.6, Math.PI * 1.4);
      ctx.stroke();
    }

    ctx.restore();
  }
}
