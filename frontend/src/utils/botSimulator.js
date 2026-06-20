// ─────────────────────────────────────────────────────────────────────────────
// botSimulator.js — Human programmer simulation engine
// Reads first. Thinks. Then codes naturally. Every battle feels different.
// ─────────────────────────────────────────────────────────────────────────────

const rnd  = (lo, hi) => lo + Math.random() * (hi - lo);
const rndI = (lo, hi) => Math.floor(rnd(lo, hi + 1));
const pick = arr => arr[rndI(0, arr.length - 1)];

function pause(ms, signal) {
  return new Promise((res, rej) => {
    if (signal?.aborted) return rej(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(res, Math.max(0, ms));
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      rej(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

// ── Keyboard adjacency map ────────────────────────────────────────────────────
const ADJ = {
  a:'sqz', b:'vng', c:'vxd', d:'sfe', e:'rwd', f:'dgr', g:'fht', h:'gjy',
  i:'uok', j:'hku', k:'jli', l:'ko',  m:'njk', n:'mbh', o:'ipl', p:'ol',
  q:'wa',  r:'etf', s:'adw', t:'ryg', u:'yih', v:'cbf', w:'qes', x:'zcs',
  y:'tuh', z:'axs',
};
const typo = c => {
  const pool = ADJ[c.toLowerCase()];
  return pool ? pool[rndI(0, pool.length - 1)] : 'x';
};

// ── Programmer personality: generated fresh each battle ───────────────────────
function createPersonality() {
  const speedMult  = rnd(0.7, 1.4);   // 0.7 = faster, 1.4 = slower
  const mistakeRate = rnd(0.02, 0.07); // how typo-prone
  const thinkiness  = rnd(0.6, 1.5);  // how often they pause to think
  const revisioner  = Math.random() < 0.4; // do they delete and rewrite often?

  return { speedMult, mistakeRate, thinkiness, revisioner };
}

// ── Per-character delay with personality + ±30% random variation ──────────────
function charDelay(ch, personality, burstMode) {
  const { speedMult } = personality;
  let base;

  if (ch === '\n')      base = rnd(250, 500);
  else if (ch === ' ')  base = rnd(60, 120);
  else if (ch === ':')  base = rnd(140, 280);
  else if (ch === '(')  base = rnd(80, 160);
  else if (ch === ',')  base = rnd(70, 140);
  else if (burstMode)   base = rnd(45, 85);
  else                  base = rnd(90, 180);

  // ±30% random humanisation
  const variation = base * rnd(-0.3, 0.3);
  return Math.max(20, (base + variation) * speedMult);
}

// ── Lines that trigger a thinking pause before them ───────────────────────────
const THINK_BEFORE = [
  'for ', 'while ', 'if ', 'elif ', 'else:', 'return ',
  'def ', 'enumerate', 'range(', 'complement', 'seen[',
  'result', 'maximum', 'minimum', 'count',
];

// ── Core typing engine ────────────────────────────────────────────────────────
async function humanType(text, current, setCode, personality, signal) {
  // Find longest common prefix
  let common = 0;
  const minLen = Math.min(current.length, text.length);
  while (common < minLen && current[common] === text[common]) common++;

  let buf = current;

  // Backspace to divergence
  const toDelete = buf.length - common;
  if (toDelete > 0) {
    await pause(rnd(400, 900) * personality.thinkiness, signal);
    for (let d = 0; d < toDelete; d++) {
      buf = buf.slice(0, -1);
      setCode(buf);
      await pause(rnd(70, 150) * personality.speedMult, signal);
    }
    await pause(rnd(300, 700), signal);
  }

  const tail = text.slice(common);
  let burstMode  = false;
  let burstCount = 0;

  for (let i = 0; i < tail.length; i++) {
    const ch        = tail[i];
    const lineAhead = tail.slice(i);

    // ── Thinking pause before important keywords ──
    if (ch !== ' ' && ch !== '\t') {
      for (const kw of THINK_BEFORE) {
        if (lineAhead.startsWith(kw) && buf.length > 0) {
          await pause(rnd(600, 1800) * personality.thinkiness, signal);
          break;
        }
      }
    }

    // ── Rare "staring at screen" long pause ──
    if (Math.random() < 0.014 * personality.thinkiness) {
      await pause(rnd(3000, 6000) * personality.thinkiness, signal);
    }

    // ── Mid-sentence micro-pause (type a few chars, stop, continue) ──
    if (Math.random() < 0.055 * personality.thinkiness) {
      await pause(rnd(400, 1000) * personality.thinkiness, signal);
    }

    // ── Speed burst: find a flow for 4-12 chars ──
    if (!burstMode && Math.random() < 0.10) {
      burstMode  = true;
      burstCount = rndI(4, 12);
    }
    if (burstMode && --burstCount <= 0) burstMode = false;

    // ── Revisionists sometimes delete and retype a recent word ──
    if (personality.revisioner && ch === ' ' && buf.length > 15 && Math.random() < 0.06) {
      const lastSpace = buf.lastIndexOf(' ', buf.length - 2);
      if (lastSpace > 0) {
        const word = buf.slice(lastSpace + 1);
        const nDel = word.length;
        await pause(rnd(300, 700), signal);
        for (let d = 0; d < nDel; d++) {
          buf = buf.slice(0, -1);
          setCode(buf);
          await pause(rnd(60, 110) * personality.speedMult, signal);
        }
        await pause(rnd(500, 1200) * personality.thinkiness, signal);
        for (const rc of word) {
          buf += rc;
          setCode(buf);
          await pause(charDelay(rc, personality, false), signal);
        }
      }
    }

    // ── Typo + correction ──
    if (ch !== '\n' && ch !== ' ' && ch !== '\t' && Math.random() < personality.mistakeRate) {
      buf += typo(ch);
      setCode(buf);
      await pause(rnd(90, 180) * personality.speedMult, signal);
      await pause(rnd(1200, 2500), signal); // stares at the mistake
      buf = buf.slice(0, -1);
      setCode(buf);
      await pause(rnd(70, 150) * personality.speedMult, signal);
      await pause(rnd(200, 500), signal);
    }

    // ── Type the correct character ──
    buf += ch;
    setCode(buf);
    await pause(charDelay(ch, personality, burstMode), signal);
  }

  return buf;
}

// ── Rewrite last line: looks like genuine mid-attempt refactoring ─────────────
async function rewriteLastLine(currentCode, setCode, personality, signal) {
  if (!currentCode || currentCode.length < 10) return currentCode;
  const lines = currentCode.split('\n');
  if (lines.length < 2) return currentCode;

  const lastLine = lines[lines.length - 1];
  let buf = currentCode;

  await pause(rnd(1200, 2800) * personality.thinkiness, signal);

  const toDel = lastLine.length + 1;
  for (let d = 0; d < toDel; d++) {
    buf = buf.slice(0, -1);
    setCode(buf);
    await pause(rnd(70, 140) * personality.speedMult, signal);
  }
  await pause(rnd(600, 1400) * personality.thinkiness, signal);

  const retype = '\n' + lastLine;
  for (const ch of retype) {
    buf += ch;
    setCode(buf);
    await pause(charDelay(ch, personality, false), signal);
  }

  return buf;
}

// ── Problem difficulty classification ─────────────────────────────────────────
const DIFFICULTY = {
  1: 'medium', 2: 'easy',   3: 'medium',
  4: 'easy',   5: 'easy',   6: 'easy',
  7: 'easy',   8: 'medium',
};

// Reading time by difficulty before first keystroke (~10s base wait)
const READING_TIME = {
  easy:   [8000,  12000],
  medium: [10000, 15000],
  hard:   [13000, 20000],
};

// ── Attempt sequences per problem ────────────────────────────────────────────
// Multiple styles so different "people" submit different-looking code
const ATTEMPTS = {
  1: [ // Two Sum — medium
    // First attempt: brute force (some programmers start here)
    `def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]`,
    // Second attempt: optimal hash map solution
    `def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i`,
  ],
  2: [ // Reverse String — easy
    `def reverse_string(s):\n    return s[::-1]`,
  ],
  3: [ // FizzBuzz — medium (2 attempts: missing FizzBuzz check first)
    `def fizzbuzz(n):\n    if n % 3 == 0 and n % 5 == 0:\n        return 'FizzBuzz'\n    if n % 3 == 0:\n        return 'Fizz'\n    if n % 5 == 0:\n        return 'Buzz'\n    return str(n)`,
    `def fizzbuzz(n):\n    if n % 15 == 0:\n        return 'FizzBuzz'\n    elif n % 3 == 0:\n        return 'Fizz'\n    elif n % 5 == 0:\n        return 'Buzz'\n    else:\n        return str(n)`,
  ],
  4: [ // Palindrome — easy
    `def is_palindrome(s):\n    return s == s[::-1]`,
  ],
  5: [ // Find Max — easy
    `def find_max(nums):\n    maximum = nums[0]\n    for num in nums:\n        if num > maximum:\n            maximum = num\n    return maximum`,
  ],
  6: [ // Count Vowels — easy
    `def count_vowels(s):\n    count = 0\n    for ch in s.lower():\n        if ch in 'aeiou':\n            count += 1\n    return count`,
  ],
  7: [ // Sum of List — easy
    `def sum_list(nums):\n    total = 0\n    for num in nums:\n        total += num\n    return total`,
  ],
  8: [ // Remove Duplicates — medium (2 attempts)
    `def remove_duplicates(nums):\n    seen = []\n    for n in nums:\n        if n not in seen:\n            seen.append(n)\n    return seen`,
    `def remove_duplicates(nums):\n    return list(set(nums))`,
  ],
};

const FALLBACK = [`def solution(x):\n    return x`];

// ── Bot names ─────────────────────────────────────────────────────────────────
// 70% Indian/South Asian names, 30% Western
const NAMES_COMMON = [
  'priya_07','divya_c','arjun99','arish_dev','karthik_py',
  'rahul_codes','sanjay_x','nisha_dev','kavya_07','ananya_py',
  'vikram_c','rohan_dev','akash_09','deepak_py','sneha_code',
  'harini_x','surya_dev','abhishek07','pranav_py','meera_codes',
];
const NAMES_WESTERN = [
  'ethan_dev','alex_07','emma_codes','olivia_py','noah_x',
  'sophia_dev','mason_09','liam_code','chloe_py','daniel_dev',
];

export const randomHumanName = () => {
  const pool = Math.random() < 0.70 ? NAMES_COMMON : NAMES_WESTERN;
  return pick(pool);
};

export function pickSkill() { return 'intermediate'; }

// ── Main battle runner ────────────────────────────────────────────────────────
/**
 * runOpponentBattle
 *
 * Phase 1 — READING: wait 2–15s based on difficulty (no visible typing)
 * Phase 2 — CODING:  type with human personality, corrections, thinking pauses
 * Phase 3 — REVIEW:  read own code before submitting
 * Phase 4 — SUBMIT:  correct or wrong, then continue fixing
 */
export async function runOpponentBattle(problem, setCode, onWrongSubmit, onCorrectSubmit, signal) {
  const attempts   = ATTEMPTS[problem?.id] || FALLBACK;
  const difficulty = DIFFICULTY[problem?.id] || 'easy';
  const [readLo, readHi] = READING_TIME[difficulty];
  const personality = createPersonality();
  let editorContent = '';

  // ── PHASE 1: Reading the problem (~10s silence) ──
  await pause(rnd(readLo, readHi), signal);

  // ── PHASE 2 + 3 + 4: Code, review, submit ──
  for (let idx = 0; idx < attempts.length; idx++) {
    const isLast = idx === attempts.length - 1;

    // Small action delay before first keystroke (feels intentional)
    await pause(rnd(20, 80), signal);

    // Type this attempt
    editorContent = await humanType(attempts[idx], editorContent, setCode, personality, signal);

    // ── Code review phase: read it over ──
    await pause(rnd(1500, 4000) * personality.thinkiness, signal);

    if (isLast) {
      // Correct submission
      onCorrectSubmit();
    } else {
      // Wrong submission — digest the error, then start fixing
      onWrongSubmit(idx + 1);
      await pause(rnd(2000, 4500) * personality.thinkiness, signal);
      editorContent = await rewriteLastLine(editorContent, setCode, personality, signal);
    }
  }
}
