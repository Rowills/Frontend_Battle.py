// ─────────────────────────────────────────────────────────────────────────────
// botSimulator.js — Competitive intermediate bot
// Fast, focused, always active. Feels like a real motivated Python student.
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

// ── Keyboard adjacency for realistic (rare) typos ─────────────────────────────
const ADJ = {
  a:'sqz',b:'vng',c:'vxd',d:'sfe',e:'rwd',f:'dgr',g:'fht',h:'gjy',
  i:'uok',j:'hku',k:'jli',l:'ko', m:'njk',n:'mbh',o:'ipl',p:'ol',
  q:'wa', r:'etf',s:'adw',t:'ryg',u:'yih',v:'cbf',w:'qes',x:'zcs',
  y:'tuh',z:'axs',
};
const typo = c => {
  const pool = ADJ[c.toLowerCase()];
  return pool ? pool[rndI(0, pool.length - 1)] : 'x';
};

// ── Single speed profile: fast intermediate ───────────────────────────────────
const CFG = {
  lo: 50,
  hi: 110,
  mistakeRate: 0.025,
};

// ── Core: type from `current` to `text` via diff ─────────────────────────────
async function humanType(text, current, setCode, signal) {
  let common = 0;
  const minLen = Math.min(current.length, text.length);
  while (common < minLen && current[common] === text[common]) common++;

  let buf = current;

  // Backspace to divergence point
  const toDelete = buf.length - common;
  if (toDelete > 0) {
    await pause(rnd(150, 350), signal);
    for (let d = 0; d < toDelete; d++) {
      buf = buf.slice(0, -1);
      setCode(buf);
      await pause(rnd(40, 80), signal);
    }
    await pause(rnd(80, 200), signal);
  }

  // Type new suffix
  const tail = text.slice(common);
  const THINK_AT = ['for ', 'while ', 'if ', 'elif ', 'return ', 'def '];

  for (let i = 0; i < tail.length; i++) {
    const ch = tail[i];
    const upcoming = tail.slice(i);

    // Micro-think before structural keywords
    for (const kw of THINK_AT) {
      if (upcoming.startsWith(kw) && buf.length > 0) {
        await pause(rnd(120, 300), signal);
        break;
      }
    }

    // Rare typo + instant correction
    if (ch !== '\n' && ch !== ' ' && ch !== '\t' && Math.random() < CFG.mistakeRate) {
      buf += typo(ch);
      setCode(buf);
      await pause(rnd(CFG.lo, CFG.hi), signal);
      buf = buf.slice(0, -1);
      setCode(buf);
      await pause(rnd(40, 80), signal);
    }

    buf += ch;
    setCode(buf);

    let d = rnd(CFG.lo, CFG.hi);
    if (ch === ':')  d += rnd(80, 200);
    if (ch === '\n') d += rnd(100, 250);
    if (ch === ' ')  d *= 0.6;
    await pause(d, signal);
  }

  return buf;
}

// ── Quick active edit between attempts (visible refactoring, no filler) ───────
async function quickEdit(currentCode, setCode, signal) {
  if (!currentCode || currentCode.length < 10) return currentCode;

  const lines = currentCode.split('\n');
  if (lines.length < 2) return currentCode;

  const lastLine = lines[lines.length - 1];
  let buf = currentCode;

  // Delete last line fast
  const toDel = lastLine.length + 1;
  for (let d = 0; d < toDel; d++) {
    buf = buf.slice(0, -1);
    setCode(buf);
    await pause(rnd(40, 70), signal);
  }

  await pause(rnd(100, 250), signal);

  // Retype it immediately
  const retype = '\n' + lastLine;
  for (const ch of retype) {
    buf += ch;
    setCode(buf);
    await pause(rnd(CFG.lo, CFG.hi) * 0.8, signal);
  }

  return buf;
}

// ── Attempt sequences per problem: wrong first (if any), then correct ─────────
const ATTEMPTS = {
  1: [ // Two Sum
    `def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]`,
    `def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i`,
  ],
  2: [ // Reverse String
    `def reverse_string(s):\n    return s[::-1]`,
  ],
  3: [ // FizzBuzz
    `def fizzbuzz(n):\n    if n % 3 == 0 and n % 5 == 0:\n        return 'FizzBuzz'\n    if n % 3 == 0:\n        return 'Fizz'\n    if n % 5 == 0:\n        return 'Buzz'\n    return str(n)`,
    `def fizzbuzz(n):\n    if n % 15 == 0:\n        return 'FizzBuzz'\n    elif n % 3 == 0:\n        return 'Fizz'\n    elif n % 5 == 0:\n        return 'Buzz'\n    else:\n        return str(n)`,
  ],
  4: [ // Palindrome
    `def is_palindrome(s):\n    return s == s[::-1]`,
  ],
  5: [ // Find Max
    `def find_max(nums):\n    maximum = nums[0]\n    for num in nums:\n        if num > maximum:\n            maximum = num\n    return maximum`,
  ],
  6: [ // Count Vowels
    `def count_vowels(s):\n    count = 0\n    for ch in s.lower():\n        if ch in 'aeiou':\n            count += 1\n    return count`,
  ],
  7: [ // Sum of List
    `def sum_list(nums):\n    total = 0\n    for num in nums:\n        total += num\n    return total`,
  ],
  8: [ // Remove Duplicates
    `def remove_duplicates(nums):\n    seen = []\n    for n in nums:\n        if n not in seen:\n            seen.append(n)\n    return seen`,
    `def remove_duplicates(nums):\n    return list(set(nums))`,
  ],
};

const FALLBACK = [`def solution(x):\n    return x`];

// ── Bot names: competitive, energetic ─────────────────────────────────────────
const BOT_NAMES = [
  'CodeNinja','PythonKid','DebugMaster','ByteHunter','AlgoRider',
  'LoopWizard','ScriptRunner','CodeStorm','PyRacer','BitCrusher',
  'NullPointer','StackHero','ByteBlitz','CodePulse','PySniper',
  'LogicBomb','ArrayAce','SyntaxPro','PyFlash','CodeSurge',
  'PyVortex','IndexError','RecurseKing','DevSprint','CodeBlaze',
];

export const randomHumanName = () =>
  BOT_NAMES[rndI(0, BOT_NAMES.length - 1)];

// kept for any legacy import
export function pickSkill() { return 'intermediate'; }

// ── Main battle runner ────────────────────────────────────────────────────────
/**
 * runOpponentBattle
 *
 * Fast intermediate opponent. Starts within 200ms. Always typing.
 * No filler. Creates urgency. Realistic corrections only.
 */
export async function runOpponentBattle(problem, setCode, onWrongSubmit, onCorrectSubmit, signal) {
  const attempts = ATTEMPTS[problem?.id] || FALLBACK;
  let editorContent = '';

  // Read problem — very short, then go
  await pause(rnd(150, 300), signal);

  for (let idx = 0; idx < attempts.length; idx++) {
    const isLast = idx === attempts.length - 1;

    // Type this attempt
    editorContent = await humanType(attempts[idx], editorContent, setCode, signal);

    // Quick review of own code
    await pause(rnd(300, 700), signal);

    if (isLast) {
      await pause(rnd(150, 400), signal);
      onCorrectSubmit();
    } else {
      // Submit wrong — saw the error, immediately fix
      onWrongSubmit(idx + 1);
      await pause(rnd(600, 1400), signal);
      editorContent = await quickEdit(editorContent, setCode, signal);
      await pause(rnd(150, 400), signal);
    }
  }
}
