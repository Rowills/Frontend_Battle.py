// ─────────────────────────────────────────────────────────────────────────────
// botSimulator.js — Fully realistic opponent simulation engine
// The opponent is ALWAYS active. No idle periods. Every battle feels different.
// Zero user-facing references to "bot" anywhere.
// ─────────────────────────────────────────────────────────────────────────────

// ── Utilities ─────────────────────────────────────────────────────────────────
const rnd  = (lo, hi) => lo + Math.random() * (hi - lo);
const rndI = (lo, hi) => Math.floor(rnd(lo, hi + 1));

function pause(ms, signal) {
  return new Promise((res, rej) => {
    if (signal?.aborted) return rej(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
}

// ── Keyboard adjacency for realistic typos ────────────────────────────────────
const ADJ = {
  a:'sqz',b:'vng',c:'vxd',d:'sfe',e:'rwd',f:'dgr',g:'fht',h:'gjy',
  i:'uok',j:'hku',k:'jli',l:'ko', m:'njk',n:'mbh',o:'ipl',p:'ol',
  q:'wa', r:'etf',s:'adw',t:'ryg',u:'yih',v:'cbf',w:'qes',x:'zcs',
  y:'tuh',z:'axs',
};
const typo = c => {
  const pool = ADJ[c.toLowerCase()];
  return pool ? pool[rndI(0, pool.length - 1)] : ['x','y','z'][rndI(0,2)];
};

// ── Skill presets ─────────────────────────────────────────────────────────────
const SKILL = {
  beginner:     { lo: 700,  hi: 1600, mistakeRate: 0.12, thinkMult: 2.2 },
  intermediate: { lo: 300,  hi: 750,  mistakeRate: 0.06, thinkMult: 1.3 },
  advanced:     { lo: 90,   hi: 320,  mistakeRate: 0.02, thinkMult: 0.7 },
};

// ── Core: type a string char-by-char with human realism ──────────────────────
async function humanType(text, current, setCurrent, cfg, signal) {
  // `current` = what's in editor right now (string ref)
  // We type `text` into the editor, starting from `current`
  // Returns the new editor content

  // First: transition from current to text via char-level diff
  // Find longest common prefix
  let common = 0;
  const minLen = Math.min(current.length, text.length);
  while (common < minLen && current[common] === text[common]) common++;

  // Backspace from end of current down to common prefix
  let buf = current;
  const toDelete = buf.length - common;
  if (toDelete > 0) {
    // Pause before deleting (noticing the issue)
    await pause(rnd(400, 1200) * cfg.thinkMult, signal);
    for (let d = 0; d < toDelete; d++) {
      buf = buf.slice(0, -1);
      setCurrent(buf);
      await pause(rnd(60, 180), signal); // fast backspace
    }
    await pause(rnd(300, 800), signal); // pause after deletion
  }

  // Type the new suffix char by char
  const tail = text.slice(common);
  const THINK_BEFORE = ['for ', 'while ', 'if ', 'elif ', 'return ', 'def ', ':\n'];

  for (let i = 0; i < tail.length; i++) {
    const ch = tail[i];
    const upcoming = tail.slice(i);

    // Thinking pause before key constructs
    for (const t of THINK_BEFORE) {
      if (upcoming.startsWith(t) && buf.length > 0) {
        await pause(rnd(800, 2500) * cfg.thinkMult, signal);
        break;
      }
    }

    // Random stare-at-screen pause (varies by skill)
    if (Math.random() < 0.04 * cfg.thinkMult) {
      await pause(rnd(1500, 5000) * cfg.thinkMult, signal);
    }

    // Typo + correction
    if (ch !== '\n' && ch !== ' ' && ch !== '\t' && Math.random() < cfg.mistakeRate) {
      // Type wrong char(s)
      const nWrong = Math.random() < 0.2 ? 2 : 1;
      for (let w = 0; w < nWrong; w++) {
        buf += typo(ch);
        setCurrent(buf);
        await pause(rnd(cfg.lo, cfg.hi), signal);
      }
      // Notice mistake, pause
      await pause(rnd(200, 600), signal);
      // Backspace
      for (let w = 0; w < nWrong; w++) {
        buf = buf.slice(0, -1);
        setCurrent(buf);
        await pause(rnd(60, 120), signal);
      }
      await pause(rnd(100, 300), signal);
    }

    // Type correct char
    buf += ch;
    setCurrent(buf);

    // Per-char delay
    let d = rnd(cfg.lo, cfg.hi);
    if (ch === ':')  d += rnd(400, 1200);
    if (ch === '\n') d += rnd(600, 1800);
    if (ch === '(')  d += rnd(200, 600);
    if (ch === ',')  d += rnd(150, 400);
    if (ch === ' ')  d *= 0.5;
    await pause(d, signal);

    // Occasionally delete and retype the last word (second-guessing)
    if (ch === ' ' && buf.length > 12 && Math.random() < cfg.mistakeRate * 1.5) {
      const lastSp = buf.lastIndexOf(' ', buf.length - 2);
      const rewindTo = lastSp >= 0 ? lastSp + 1 : 0;
      const nDel = buf.length - rewindTo;
      await pause(rnd(300, 700), signal);
      for (let d2 = 0; d2 < nDel; d2++) { buf = buf.slice(0,-1); setCurrent(buf); await pause(rnd(60,120),signal); }
      await pause(rnd(400, 1000) * cfg.thinkMult, signal);
      const retype = text.slice(common + i - (nDel - 1), common + i + 1);
      for (const rc of retype) { buf += rc; setCurrent(buf); await pause(rnd(cfg.lo, cfg.hi) * 0.9, signal); }
    }
  }
  return buf;
}

// ── Micro-activities between attempts (keep editor looking alive) ─────────────
async function microActivity(currentCode, setCurrent, cfg, signal) {
  if (!currentCode || currentCode.length < 5) return;

  const action = rndI(0, 4);

  if (action === 0) {
    // Add a comment then delete it
    const comment = '\n    # hmm...';
    let buf = currentCode;
    for (const ch of comment) { buf += ch; setCurrent(buf); await pause(rnd(300,700),signal); }
    await pause(rnd(1000,2500)*cfg.thinkMult, signal);
    for (let d = 0; d < comment.length; d++) { buf = buf.slice(0,-1); setCurrent(buf); await pause(rnd(60,120),signal); }

  } else if (action === 1) {
    // Delete last line and retype it
    const lines = currentCode.split('\n');
    if (lines.length < 2) return;
    const lastLine = lines[lines.length - 1];
    let buf = currentCode;
    const toDel = lastLine.length + 1;
    for (let d = 0; d < toDel; d++) { buf = buf.slice(0,-1); setCurrent(buf); await pause(rnd(60,120),signal); }
    await pause(rnd(800,2000)*cfg.thinkMult, signal);
    const retype = '\n' + lastLine;
    for (const ch of retype) { buf += ch; setCurrent(buf); await pause(rnd(cfg.lo,cfg.hi)*0.8,signal); }

  } else if (action === 2) {
    // Pause and scroll (simulate by brief think pause — nothing visible)
    await pause(rnd(1000,3000)*cfg.thinkMult, signal);

  } else if (action === 3) {
    // Tweak a number or operator somewhere
    const toDel = rndI(1,3);
    let buf = currentCode;
    const snap = buf.slice(-toDel);
    for (let d = 0; d < toDel; d++) { buf = buf.slice(0,-1); setCurrent(buf); await pause(rnd(80,150),signal); }
    await pause(rnd(500,1500)*cfg.thinkMult, signal);
    for (const ch of snap) { buf += ch; setCurrent(buf); await pause(rnd(cfg.lo,cfg.hi),signal); }

  } else {
    // Just a long thinking pause
    await pause(rnd(2000,5000)*cfg.thinkMult, signal);
  }
}

// ── Attempt sequences per problem ────────────────────────────────────────────
// Each array goes from worst → correct. Skill level picks how many steps to skip.
const ATTEMPTS = {
  1: [ // Two Sum
    `def two_sum(nums, target):\n    for i in nums:\n        for j in nums:\n            if i + j == target:\n                return i, j`,
    `def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]`,
    `def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i`,
  ],
  2: [ // Reverse String
    `def reverse_string(s):\n    result = ''\n    i = len(s)\n    while i > 0:\n        i -= 1\n        result += s[i]\n    return result`,
    `def reverse_string(s):\n    return s[::-1]`,
  ],
  3: [ // FizzBuzz
    `def fizzbuzz(n):\n    if n % 3 == 0:\n        return 'Fizz'\n    if n % 5 == 0:\n        return 'Buzz'\n    return str(n)`,
    `def fizzbuzz(n):\n    if n % 3 == 0 and n % 5 == 0:\n        return 'FizzBuzz'\n    if n % 3 == 0:\n        return 'Fizz'\n    if n % 5 == 0:\n        return 'Buzz'\n    return str(n)`,
    `def fizzbuzz(n):\n    if n % 15 == 0:\n        return 'FizzBuzz'\n    elif n % 3 == 0:\n        return 'Fizz'\n    elif n % 5 == 0:\n        return 'Buzz'\n    else:\n        return str(n)`,
  ],
  4: [ // Palindrome
    `def is_palindrome(s):\n    rev = ''\n    for ch in s:\n        rev = ch + rev\n    return rev`,
    `def is_palindrome(s):\n    rev = ''\n    for ch in s:\n        rev = ch + rev\n    return s == rev`,
    `def is_palindrome(s):\n    return s == s[::-1]`,
  ],
  5: [ // Find Max
    `def find_max(nums):\n    max_val = 0\n    for num in nums:\n        if num > max_val:\n            max_val = num\n    return max_val`,
    `def find_max(nums):\n    maximum = nums[0]\n    for num in nums:\n        if num > maximum:\n            maximum = num\n    return maximum`,
  ],
  6: [ // Count Vowels
    `def count_vowels(s):\n    count = 0\n    vowels = 'aeiou'\n    for ch in s:\n        count += 1\n    return count`,
    `def count_vowels(s):\n    count = 0\n    for ch in s:\n        if ch in 'aeiou':\n            count += 1\n    return count`,
    `def count_vowels(s):\n    count = 0\n    for ch in s.lower():\n        if ch in 'aeiou':\n            count += 1\n    return count`,
  ],
  7: [ // Sum of List
    `def sum_list(nums):\n    total = 0\n    for num in nums:\n        total = total + num\n    return total`,
    `def sum_list(nums):\n    total = 0\n    for num in nums:\n        total += num\n    return total`,
  ],
  8: [ // Remove Duplicates
    `def remove_duplicates(nums):\n    result = []\n    for n in nums:\n        if n not in result:\n            result.append(n)\n    return result`,
    `def remove_duplicates(nums):\n    unique = list(set(nums))\n    return unique`,
    `def remove_duplicates(nums):\n    return list(set(nums))`,
  ],
};

// Fallback for unknown problems
const FALLBACK = [
  `def solution(x):\n    result = x\n    return result`,
  `def solution(x):\n    return x`,
];

function getAttempts(problem, skill) {
  const all = ATTEMPTS[problem?.id] || FALLBACK;
  if (skill === 'advanced')     return all.slice(-2);   // last 2 (fast)
  if (skill === 'intermediate') return all.slice(-Math.min(3, all.length)); // last 3
  return all;                                            // beginner: all attempts
}

// ── Human-sounding usernames ──────────────────────────────────────────────────
const NAMES = [
  'alex_07','rahul_py','sam_codes','dev_maya','arjun99','priya_dev',
  'vikash_c','code_karan','sai_py','rohan_dev','py_ninja','mahesh_x',
  'sneha_code','arun_dev','riya_07','coder_raj','python_sam','dev_aarav',
  'ishaan_py','neha_x','yash_codes','tanvi_dev','harsh_py','divya_c',
  'ankit_09','aditya_py','kiran_dev','nisha_c','suresh_07','meera_py',
];
export const randomHumanName = () => NAMES[rndI(0, NAMES.length - 1)];

export function pickSkill() {
  const r = Math.random();
  if (r < 0.35) return 'beginner';
  if (r < 0.72) return 'intermediate';
  return 'advanced';
}

// ── Main battle runner ────────────────────────────────────────────────────────
/**
 * runOpponentBattle
 *
 * Drives the opponent editor for the full battle duration.
 * The editor is ALWAYS visibly active — typing, deleting, refactoring.
 *
 * @param {object}   problem         – problem object from problems.js
 * @param {Function} setCode         – React state setter for opponent editor
 * @param {Function} onWrongSubmit   – called with () when opponent submits wrong
 * @param {Function} onCorrectSubmit – called with () when opponent submits correct
 * @param {AbortSignal} signal       – abort when battle ends / component unmounts
 */
export async function runOpponentBattle(problem, setCode, onWrongSubmit, onCorrectSubmit, signal) {
  const skill    = pickSkill();
  const cfg      = SKILL[skill];
  const attempts = getAttempts(problem, skill);
  let editorContent = '';

  // Opening think: reading problem statement
  await pause(rnd(2000, 4000) * cfg.thinkMult, signal);

  for (let idx = 0; idx < attempts.length; idx++) {
    const isLast = idx === attempts.length - 1;
    const target = attempts[idx];

    // ── Type this attempt (with full human realism) ──
    editorContent = await humanType(target, editorContent, setCode, cfg, signal);

    // ── Pause after finishing — reviewing code ──
    await pause(rnd(1500, 3500) * cfg.thinkMult, signal);

    // ── 1-3 micro-activities (looks like reviewing/tweaking) ──
    const microCount = isLast ? rndI(0, 1) : rndI(1, 3);
    for (let m = 0; m < microCount; m++) {
      await microActivity(editorContent, setCode, cfg, signal);
      // Sync editorContent after micro-activity (re-read from state via closure isn't possible,
      // so we pass by ref through a wrapper)
    }

    if (isLast) {
      // Final submission — correct
      await pause(rnd(800, 2000), signal);
      onCorrectSubmit();
    } else {
      // Wrong submission
      onWrongSubmit(idx + 1);

      // Pause after wrong — reads the error, thinks
      await pause(rnd(3000, 7000) * cfg.thinkMult, signal);

      // More micro-activity before next attempt (shows active editing)
      const extraMicro = rndI(1, 2);
      for (let m = 0; m < extraMicro; m++) {
        await microActivity(editorContent, setCode, cfg, signal);
      }
    }
  }
}
