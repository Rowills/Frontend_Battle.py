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

  if (ch === '\n')      base = rnd(265, 515);
  else if (ch === ' ')  base = rnd(75, 135);
  else if (ch === ':')  base = rnd(155, 295);
  else if (ch === '(')  base = rnd(95, 175);
  else if (ch === ',')  base = rnd(85, 155);
  else if (burstMode)   base = rnd(60, 100);
  else                  base = rnd(105, 195);

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
    await pause(rnd(515, 1215) * personality.thinkiness, signal);
    for (let d = 0; d < toDelete; d++) {
      buf = buf.slice(0, -1);
      setCode(buf);
      await pause(rnd(85, 165) * personality.speedMult, signal);
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
          await pause(rnd(515, 1215) * personality.thinkiness, signal);
          break;
        }
      }
    }

    // ── Rare "staring at screen" long pause ──
    if (Math.random() < 0.014 * personality.thinkiness) {
      await pause(rnd(3015, 6015) * personality.thinkiness, signal);
    }

    // ── Mid-sentence micro-pause (type a few chars, stop, continue) ──
    if (Math.random() < 0.055 * personality.thinkiness) {
      await pause(rnd(415, 1015) * personality.thinkiness, signal);
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
      await pause(rnd(105, 195) * personality.speedMult, signal);
      await pause(rnd(1215, 2515), signal); // stares at the mistake
      buf = buf.slice(0, -1);
      setCode(buf);
      await pause(rnd(85, 165) * personality.speedMult, signal);
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

  await pause(rnd(1215, 2515) * personality.thinkiness, signal);

  const toDel = lastLine.length + 1;
  for (let d = 0; d < toDel; d++) {
    buf = buf.slice(0, -1);
    setCode(buf);
    await pause(rnd(85, 165) * personality.speedMult, signal);
  }
  await pause(rnd(615, 1415) * personality.thinkiness, signal);

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
  1: 'medium', 2: 'easy',   3: 'medium', 4: 'easy',
  5: 'easy',   6: 'easy',   7: 'easy',   8: 'medium',
  9: 'easy',   10: 'easy',  11: 'easy',  12: 'easy',
  13: 'easy',  14: 'easy',  15: 'easy',  16: 'easy',
  17: 'easy',  18: 'easy',  19: 'medium',20: 'medium',
  21: 'medium',22: 'medium',23: 'medium',24: 'medium',
  25: 'medium',26: 'easy',  27: 'easy',  28: 'easy',
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
  8: [ // Remove Duplicates — medium
    `def remove_duplicates(nums):\n    seen = []\n    for n in nums:\n        if n not in seen:\n            seen.append(n)\n    return seen`,
    `def remove_duplicates(nums):\n    return list(set(nums))`,
  ],
  9: [ // Even or Odd
    `def even_or_odd(n):\n    if n % 2 == 0:\n        return 'Even'\n    else:\n        return 'Odd'`,
  ],
  10: [ // Celsius to Fahrenheit
    `def celsius_to_fahrenheit(c):\n    return (c * 9/5) + 32`,
  ],
  11: [ // Count Words
    `def count_words(sentence):\n    return len(sentence.split())`,
  ],
  12: [ // Square Numbers
    `def square_numbers(nums):\n    return [num ** 2 for num in nums]`,
  ],
  13: [ // Largest of Three
    `def largest_of_three(a, b, c):\n    if a >= b and a >= c:\n        return a\n    elif b >= a and b >= c:\n        return b\n    else:\n        return c`,
  ],
  14: [ // Reverse a List
    `def reverse_list(lst):\n    return lst[::-1]`,
  ],
  15: [ // Factorial
    `def factorial(n):\n    result = 1\n    for i in range(1, n + 1):\n        result *= i\n    return result`,
  ],
  16: [ // Is Prime
    `def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True`,
  ],
  17: [ // Sum of Digits
    `def sum_of_digits(n):\n    total = 0\n    for d in str(n):\n        total += int(d)\n    return total`,
  ],
  18: [ // List Average
    `def list_average(nums):\n    return sum(nums) / len(nums)`,
  ],
  19: [ // Anagram Check — medium
    `def is_anagram(s1, s2):\n    return sorted(s1.lower()) == sorted(s2.lower())`,
  ],
  20: [ // Fibonacci — medium
    `def fibonacci(n):\n    fib = [0, 1]\n    for i in range(2, n):\n        fib.append(fib[-1] + fib[-2])\n    return fib[:n]`,
  ],
  21: [ // Second Largest — medium
    `def second_largest(nums):\n    unique = sorted(set(nums), reverse=True)\n    return unique[1]`,
  ],
  22: [ // Flatten — medium
    `def flatten(lst):\n    result = []\n    for sublist in lst:\n        result.extend(sublist)\n    return result`,
  ],
  23: [ // Word Frequency — medium
    `def word_frequency(sentence):\n    freq = {}\n    for word in sentence.split():\n        freq[word] = freq.get(word, 0) + 1\n    return freq`,
  ],
  24: [ // Missing Number — medium
    `def missing_number(nums, n):\n    return n*(n+1)//2 - sum(nums)`,
  ],
  25: [ // Longest Word — medium
    `def longest_word(sentence):\n    words = sentence.split()\n    return max(words, key=len)`,
  ],
  26: [ // Capitalize Words
    `def capitalize_words(s):\n    return s.title()`,
  ],
  27: [ // Count Occurrences
    `def count_occurrences(lst, target):\n    return lst.count(target)`,
  ],
  28: [ // Power Function
    `def power(base, exp):\n    result = 1\n    for _ in range(exp):\n        result *= base\n    return result`,
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
    await pause(rnd(1515, 4015) * personality.thinkiness, signal);

    if (isLast) {
      // Correct submission
      onCorrectSubmit();
    } else {
      // Wrong submission — digest the error, then start fixing
      onWrongSubmit(idx + 1);
      await pause(rnd(1215, 2515) * personality.thinkiness, signal);
      editorContent = await rewriteLastLine(editorContent, setCode, personality, signal);
    }
  }
}
