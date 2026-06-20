// ─────────────────────────────────────────────────────────────────────────────
// botSimulator.js — Realistic human programmer simulation
// Natural rhythm: variable speed, real hesitation, genuine corrections.
// Easy: ~5-15s  |  Medium: ~15-40s  |  Hard: ~30-90s
// ─────────────────────────────────────────────────────────────────────────────

const rnd  = (lo, hi) => lo + Math.random() * (hi - lo);
const rndI = (lo, hi) => Math.floor(rnd(lo, hi + 1));

function pause(ms, signal) {
  return new Promise((res, rej) => {
    if (signal?.aborted) return rej(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      rej(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

// ── Keyboard adjacency map for realistic typos ────────────────────────────────
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

// ── Lines that trigger a genuine thinking pause before them ──────────────────
const HARD_LINES = [
  'for ', 'while ', 'if ', 'elif ', 'else:', 'return ',
  'def ', 'enumerate', 'range(', 'complement', 'seen[',
];

// ── Speed bursts: humans naturally speed up mid-word then slow again ──────────
function charDelay(ch, burstMode) {
  if (ch === '\n')  return rnd(150, 350);          // newline — pause to think
  if (ch === ' ')   return rnd(40, 80);             // space — quick
  if (ch === ':')   return rnd(100, 200);           // colon — end of statement
  if (ch === '(')   return rnd(60, 130);
  if (ch === ',')   return rnd(50, 100);
  if (burstMode)    return rnd(35, 65);             // mid-word burst
  return rnd(60, 120);                              // normal char
}

// ── Core typing engine ────────────────────────────────────────────────────────
async function humanType(text, current, setCode, signal) {
  // Find longest common prefix (don't retype what's already there)
  let common = 0;
  const minLen = Math.min(current.length, text.length);
  while (common < minLen && current[common] === text[common]) common++;

  let buf = current;

  // ── Backspace back to divergence point ──
  const toDelete = buf.length - common;
  if (toDelete > 0) {
    await pause(rnd(300, 600), signal); // notice the mistake
    for (let d = 0; d < toDelete; d++) {
      buf = buf.slice(0, -1);
      setCode(buf);
      await pause(rnd(50, 100), signal); // backspace delay
    }
    await pause(rnd(200, 500), signal); // settle before retyping
  }

  // ── Type the new suffix ──
  const tail = text.slice(common);
  let burstMode  = false;
  let burstCount = 0;

  for (let i = 0; i < tail.length; i++) {
    const ch      = tail[i];
    const lineAhead = tail.slice(i);

    // ── Thinking pause before important constructs ──
    if (ch !== ' ' && ch !== '\t') {
      for (const kw of HARD_LINES) {
        if (lineAhead.startsWith(kw) && buf.length > 0) {
          await pause(rnd(400, 1200), signal);
          break;
        }
      }
    }

    // ── Random "staring at screen" pause (rare, feels very human) ──
    if (Math.random() < 0.015) {
      await pause(rnd(1000, 3000), signal);
    }

    // ── Speed bursts: type a few chars fast, then return to normal ──
    if (!burstMode && Math.random() < 0.12) {
      burstMode  = true;
      burstCount = rndI(4, 10);
    }
    if (burstMode) {
      burstCount--;
      if (burstCount <= 0) burstMode = false;
    }

    // ── Typo + correction ──
    if (ch !== '\n' && ch !== ' ' && ch !== '\t' && Math.random() < 0.04) {
      // Type wrong char
      buf += typo(ch);
      setCode(buf);
      await pause(rnd(60, 130), signal);

      // Notice the mistake — pause
      await pause(rnd(800, 1800), signal);

      // Backspace it
      buf = buf.slice(0, -1);
      setCode(buf);
      await pause(rnd(50, 100), signal);
      await pause(rnd(100, 300), signal); // re-focus
    }

    // ── Type the correct character ──
    buf += ch;
    setCode(buf);
    await pause(charDelay(ch, burstMode), signal);
  }

  return buf;
}

// ── Realistic edit between wrong and correct attempt ─────────────────────────
// Deletes the last line and retypes it — looks like genuine refactoring
async function rewriteLastLine(currentCode, setCode, signal) {
  if (!currentCode || currentCode.length < 10) return currentCode;

  const lines = currentCode.split('\n');
  if (lines.length < 2) return currentCode;

  const lastLine = lines[lines.length - 1];
  let buf = currentCode;

  // Think about what went wrong
  await pause(rnd(600, 1500), signal);

  // Delete last line
  const toDel = lastLine.length + 1;
  for (let d = 0; d < toDel; d++) {
    buf = buf.slice(0, -1);
    setCode(buf);
    await pause(rnd(50, 90), signal);
  }

  // Brief pause — planning the fix
  await pause(rnd(400, 900), signal);

  // Retype
  const retype = '\n' + lastLine;
  for (const ch of retype) {
    buf += ch;
    setCode(buf);
    await pause(charDelay(ch, false), signal);
  }

  return buf;
}

// ── Attempt sequences: wrong draft(s) then correct ───────────────────────────
const ATTEMPTS = {
  1: [ // Two Sum — medium difficulty, 2 attempts
    `def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]`,
    `def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i`,
  ],
  2: [ // Reverse String — easy, 1 attempt
    `def reverse_string(s):\n    return s[::-1]`,
  ],
  3: [ // FizzBuzz — medium, 2 attempts
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
  8: [ // Remove Duplicates — medium, 2 attempts
    `def remove_duplicates(nums):\n    seen = []\n    for n in nums:\n        if n not in seen:\n            seen.append(n)\n    return seen`,
    `def remove_duplicates(nums):\n    return list(set(nums))`,
  ],
};

const FALLBACK = [
  `def solution(x):\n    result = x\n    return result`,
];

// ── Bot names ─────────────────────────────────────────────────────────────────
const BOT_NAMES = [
  'CodeNinja','PythonKid','DebugMaster','ByteHunter','AlgoRider',
  'LoopWizard','ScriptRunner','CodeStorm','PyRacer','BitCrusher',
  'NullPointer','StackHero','ByteBlitz','CodePulse','PySniper',
  'LogicBomb','ArrayAce','SyntaxPro','PyFlash','CodeSurge',
  'PyVortex','IndexError','RecurseKing','DevSprint','CodeBlaze',
];

export const randomHumanName = () =>
  BOT_NAMES[rndI(0, BOT_NAMES.length - 1)];

export function pickSkill() { return 'intermediate'; }

// ── Main battle runner ────────────────────────────────────────────────────────
/**
 * runOpponentBattle
 *
 * Realistic human programmer pace.
 * Easy ~5-15s, Medium ~15-40s, Hard ~30-90s.
 * Variable speed, real hesitation, genuine corrections.
 */
export async function runOpponentBattle(problem, setCode, onWrongSubmit, onCorrectSubmit, signal) {
  const attempts = ATTEMPTS[problem?.id] || FALLBACK;
  let editorContent = '';

  // Initial thinking — reads the problem statement
  await pause(rnd(300, 800), signal);

  for (let idx = 0; idx < attempts.length; idx++) {
    const isLast = idx === attempts.length - 1;

    // Type this attempt with full human realism
    editorContent = await humanType(attempts[idx], editorContent, setCode, signal);

    // Read over own code before submitting
    await pause(rnd(1000, 3000), signal);

    if (isLast) {
      onCorrectSubmit();
    } else {
      // Submit wrong answer
      onWrongSubmit(idx + 1);

      // Process the failure — then start editing
      await pause(rnd(1500, 3000), signal);
      editorContent = await rewriteLastLine(editorContent, setCode, signal);
    }
  }
}
