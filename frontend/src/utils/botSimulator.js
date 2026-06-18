// ─────────────────────────────────────────────────────────────────────────────
// botSimulator.js  —  Human-like opponent typing engine
// Everything here is invisible to the user. Zero references to "bot".
// ─────────────────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Skill configs ─────────────────────────────────────────────────────────────
export const SKILL = {
  beginner: {
    charDelay:    [95, 180],   // ms per character [min, max]
    mistakeRate:  0.11,        // chance of typo per character
    thinkScale:   2.0,         // multiplier on thinking pauses
    randomPause:  0.05,        // chance of a random "stare at screen" pause
    pauseRange:   [1800, 5000],
    corrections:  0.35,        // chance of rewriting whole line after finishing it
  },
  intermediate: {
    charDelay:    [55, 100],
    mistakeRate:  0.06,
    thinkScale:   1.2,
    randomPause:  0.025,
    pauseRange:   [800, 2500],
    corrections:  0.15,
  },
  advanced: {
    charDelay:    [28, 60],
    mistakeRate:  0.025,
    thinkScale:   0.75,
    randomPause:  0.012,
    pauseRange:   [300, 1200],
    corrections:  0.05,
  },
};

// ── Keyboard-proximity typos ───────────────────────────────────────────────────
const ADJACENT = {
  a:['s','q','z'],  b:['v','n','g'],  c:['v','x','d'],  d:['s','f','e'],
  e:['r','w','d'],  f:['d','g','r'],  g:['f','h','t'],  h:['g','j','y'],
  i:['u','o','k'],  j:['h','k','u'],  k:['j','l','i'],  l:['k','o'],
  m:['n','j','k'],  n:['m','b','h'],  o:['i','p','l'],  p:['o','l'],
  r:['e','t','f'],  s:['a','d','w'],  t:['r','y','g'],  u:['y','i','h'],
  v:['c','b','f'],  w:['q','e','s'],  x:['z','c','s'],  y:['t','u','h'],
  z:['a','x','s'],
};

function nearbyKey(char) {
  const c = char.toLowerCase();
  const pool = ADJACENT[c];
  if (pool) return pool[Math.floor(Math.random() * pool.length)];
  return ['x','y','z'][Math.floor(Math.random() * 3)];
}

// Tokens that cause a human to pause and think
const THINK_BEFORE = ['for ', 'while ', 'if ', 'elif ', 'return ', 'def ', ':\n', 'in '];

// ── Core simulator ────────────────────────────────────────────────────────────
/**
 * simulateHumanTyping
 * @param {string}   targetCode    – final code we want to appear
 * @param {Function} setCode       – React state setter for opponent editor
 * @param {string}   skill         – 'beginner' | 'intermediate' | 'advanced'
 * @param {AbortSignal} signal     – cancel when battle ends
 */
export async function simulateHumanTyping(targetCode, setCode, skill = 'intermediate', signal) {
  const cfg = SKILL[skill] || SKILL.intermediate;

  const wait = async ms => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    await sleep(ms);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  };

  const charWait = () => {
    const [lo, hi] = cfg.charDelay;
    return lo + Math.random() * (hi - lo);
  };

  let text = '';

  // ── Opening think: reading the problem ────────────────────────────────────
  await wait(2500 + Math.random() * 3500 * cfg.thinkScale);

  const chars = [...targetCode]; // handle unicode safely
  let i = 0;

  while (i < chars.length) {
    if (signal?.aborted) return;

    const ch = chars[i];
    const upcoming = targetCode.slice(i);

    // ── Thinking pause before certain keywords ────────────────────────────
    for (const trigger of THINK_BEFORE) {
      if (upcoming.startsWith(trigger) && text.length > 0) {
        await wait((600 + Math.random() * 1800) * cfg.thinkScale);
        break;
      }
    }

    // ── Random "stare at screen" pause ────────────────────────────────────
    if (Math.random() < cfg.randomPause) {
      const [lo, hi] = cfg.pauseRange;
      await wait(lo + Math.random() * (hi - lo));
    }

    // ── Typo + correction ─────────────────────────────────────────────────
    if (ch !== '\n' && ch !== ' ' && ch !== '\t' && Math.random() < cfg.mistakeRate) {
      const extra = Math.random() < 0.25 ? 2 : 1; // sometimes two wrong chars
      const bad = [];

      for (let e = 0; e < extra; e++) {
        const wrong = nearbyKey(ch);
        text += wrong;
        bad.push(wrong);
        setCode(text);
        await wait(charWait());
      }

      // Pause — noticing the mistake
      await wait(180 + Math.random() * 450);

      // Backspace the mistakes
      for (let e = 0; e < bad.length; e++) {
        text = text.slice(0, -1);
        setCode(text);
        await wait(55 + Math.random() * 70);
      }

      await wait(80 + Math.random() * 180);
    }

    // ── Type correct character ────────────────────────────────────────────
    text += ch;
    setCode(text);

    let d = charWait();
    if (ch === ':')  d += 250 + Math.random() * 700;
    if (ch === '(')  d += 100 + Math.random() * 350;
    if (ch === '\n') d += 220 + Math.random() * 550;
    if (ch === ',')  d += 80  + Math.random() * 200;
    if (ch === '.')  d += 120 + Math.random() * 300;

    await wait(d);
    i++;

    // ── Occasional mid-line correction (rewrite last word) ────────────────
    if (ch === ' ' && text.length > 8 && Math.random() < cfg.corrections * 0.4) {
      // Delete back to last space
      const lastSpace = text.lastIndexOf(' ', text.length - 2);
      const rewindTo = lastSpace >= 0 ? lastSpace + 1 : 0;
      const deleted = text.length - rewindTo;

      for (let d2 = 0; d2 < deleted; d2++) {
        text = text.slice(0, -1);
        setCode(text);
        await wait(45 + Math.random() * 55);
      }

      await wait(300 + Math.random() * 700);

      // Retype the word correctly
      const correctWord = targetCode.slice(rewindTo, rewindTo + deleted);
      for (const wch of correctWord) {
        text += wch;
        setCode(text);
        await wait(charWait() * 0.85);
      }
    }
  }
}

// ── Human-sounding usernames ──────────────────────────────────────────────────
const HUMAN_NAMES = [
  'alex_07', 'rahul_py', 'sam_codes', 'dev_maya', 'arjun99',
  'priya_dev', 'vikash_c', 'code_karan', 'sai_py', 'rohan_dev',
  'py_ninja', 'mahesh_x', 'sneha_code', 'arun_dev', 'riya_07',
  'coder_raj', 'python_sam', 'dev_aarav', 'ishaan_py', 'neha_x',
  'yash_codes', 'tanvi_dev', 'harsh_py', 'divya_c', 'ankit_09',
];

export function randomHumanName() {
  return HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];
}

// ── Skill level picker (determines solve time + win chance) ──────────────────
export function pickSkillLevel() {
  const r = Math.random();
  if (r < 0.30) return 'beginner';
  if (r < 0.70) return 'intermediate';
  return 'advanced';
}

// ── Solve time in seconds ─────────────────────────────────────────────────────
const SOLVE_RANGES = {
  easy: {
    beginner:     [70,  120],
    intermediate: [35,  70],
    advanced:     [15,  40],
  },
  medium: {
    beginner:     [140, 220],
    intermediate: [80,  150],
    advanced:     [40,  90],
  },
  hard: {
    beginner:     [230, 295],
    intermediate: [160, 230],
    advanced:     [90,  170],
  },
};

export function getSolveTime(difficulty, skillLevel) {
  const key = (difficulty || 'Easy').toLowerCase();
  const d   = key === 'easy' ? 'easy' : key === 'medium' ? 'medium' : 'hard';
  const [lo, hi] = SOLVE_RANGES[d][skillLevel];
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

// ── Win probability (if opponent submits before user) ────────────────────────
export function winChance(skillLevel) {
  return { beginner: 0.20, intermediate: 0.50, advanced: 0.78 }[skillLevel] ?? 0.45;
}

// ── Human-like solutions per problem ID ──────────────────────────────────────
export const BOT_SOLUTIONS = {
  1: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i`,

  2: `def reverse_string(s):
    return s[::-1]`,

  3: `def fizzbuzz(n):
    if n % 15 == 0:
        return 'FizzBuzz'
    elif n % 3 == 0:
        return 'Fizz'
    elif n % 5 == 0:
        return 'Buzz'
    else:
        return str(n)`,

  4: `def is_palindrome(s):
    return s == s[::-1]`,

  5: `def find_max(nums):
    maximum = nums[0]
    for num in nums[1:]:
        if num > maximum:
            maximum = num
    return maximum`,

  6: `def count_vowels(s):
    count = 0
    for ch in s.lower():
        if ch in 'aeiou':
            count += 1
    return count`,

  7: `def sum_list(nums):
    total = 0
    for num in nums:
        total += num
    return total`,

  8: `def remove_duplicates(nums):
    return list(set(nums))`,
};

export function getBotSolution(problem) {
  return BOT_SOLUTIONS[problem?.id] || `def solution():\n    pass`;
}
