/**
 * Word pools categorized by difficulty and length for Type Fighter.
 */

export const WORDS_3_LETTER = [
  'hit', 'jab', 'kick', 'slam', 'dash', 'fast', 'fist', 'flow', 'fire', 'wind',
  'iron', 'rush', 'spin', 'drop', 'leap', 'claw', 'beat', 'rage', 'edge', 'duel',
  'bolt', 'fury', 'helm', 'lock', 'mark', 'grip', 'apex', 'bold', 'pace', 'flex'
];

export const WORDS_4_LETTER = [
  'kick', 'punch', 'dash', 'jump', 'fist', 'iron', 'slam', 'rush', 'claw', 'fury',
  'fire', 'wind', 'rage', 'duel', 'beat', 'drop', 'leap', 'edge', 'bolt', 'lock',
  'grip', 'apex', 'bold', 'pace', 'flex', 'strike', 'blade', 'clash', 'combo', 'brave',
  'guard', 'sweep', 'block', 'shove', 'parry', 'smash', 'swift', 'surge', 'spark'
];

export const WORDS_5_LETTER = [
  'blade', 'clash', 'combo', 'punch', 'strike', 'brave', 'guard', 'sweep', 'block',
  'shove', 'parry', 'smash', 'swift', 'surge', 'spark', 'force', 'ninja', 'viper',
  'tiger', 'brawl', 'round', 'heavy', 'focus', 'power', 'storm', 'ghost', 'armor',
  'flare', 'rapid', 'crush', 'fight', 'stand', 'slash', 'steel', 'venom', 'focal'
];

export const WORDS_6_LETTER = [
  'attack', 'flying', 'dragon', 'shadow', 'lethal', 'master', 'impact', 'reflex',
  'counter', 'battle', 'spirit', 'vortex', 'strike', 'charge', 'thrust', 'shield',
  'frenzy', 'combat', 'warrior', 'blades', 'stance', 'stride', 'assault', 'defend',
  'hybrid', 'crouch', 'ignite', 'torque', 'furious', 'brawler', 'glider', 'pounce'
];

export const WORDS_7_LETTER = [
  'whirlwind', 'tornado', 'champion', 'phantom', 'warrior', 'crusher', 'slasher',
  'tempest', 'piercing', 'onslaught', 'shredder', 'striker', 'guardian', 'cyclone',
  'supremacy', 'berserk', 'fighter', 'justice', 'punisher', 'dynamite', 'shockwave'
];

export const WORDS_8_PLUS_LETTER = [
  'whirlwind', 'devastation', 'supersonic', 'unstoppable', 'invincible', 'adrenaline',
  'execution', 'championship', 'annihilation', 'resilience', 'overpowered', 'demolition',
  'equilibrium', 'juggernaut', 'combustion', 'retribution', 'indomitable', 'relentless',
  'dragonpunch', 'counterstrike', 'shadowstrike', 'hurricanekick', 'lethalassault'
];

export type Difficulty = 'easy' | 'normal' | 'hard';

export function getRandomWord(difficulty: Difficulty, wave: number, enemyTier: 'grunt' | 'runner' | 'brawler' | 'boss'): string {
  let pool: string[] = [];

  if (enemyTier === 'runner') {
    // Runners always have fast, short snappy words (3-4 letters)
    pool = [...WORDS_3_LETTER, ...WORDS_4_LETTER];
  } else if (enemyTier === 'boss') {
    // Bosses have long, epic fighting words
    pool = WORDS_8_PLUS_LETTER;
  } else if (enemyTier === 'brawler') {
    // Bulky brawlers have 6-8 letter words
    pool = [...WORDS_6_LETTER, ...WORDS_7_LETTER];
  } else {
    // Grunts scale based on wave and difficulty
    const effectiveWave = wave + (difficulty === 'hard' ? 2 : difficulty === 'easy' ? -1 : 0);
    if (effectiveWave <= 1) {
      pool = WORDS_3_LETTER;
    } else if (effectiveWave <= 3) {
      pool = [...WORDS_3_LETTER, ...WORDS_4_LETTER];
    } else if (effectiveWave <= 6) {
      pool = [...WORDS_4_LETTER, ...WORDS_5_LETTER];
    } else if (effectiveWave <= 9) {
      pool = [...WORDS_5_LETTER, ...WORDS_6_LETTER];
    } else {
      pool = [...WORDS_6_LETTER, ...WORDS_7_LETTER, ...WORDS_8_PLUS_LETTER];
    }
  }

  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
