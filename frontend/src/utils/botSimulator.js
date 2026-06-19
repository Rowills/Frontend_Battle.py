// ─────────────────────────────────────────────────────────────────────────────
// botSimulator.js — Human-like opponent typing engine
// Zero references to "bot" anywhere visible to the user.
// ─────────────────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

const check = (signal, ms) => new Promise((res, rej) => {
  if (signal?.aborted) return rej(new DOMException('Aborted', 'AbortError'));
  const t = setTimeout(() => {
    if (signal?.aborted) return rej(new DOMException('Aborted', 'AbortError'));
    res();
  }, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted','AbortError')); }, { once: true });
});

// ── Keyboard-proximity typos ──────────────────────────────────────────────────
const ADJACENT = {
  a:['s','q','z'], b:['v','n','g'], c:['v','x','d'], d:['s','f','e'],
  e:['r','w','d'], f:['d','g','r'], g:['f','h','t'], h:['g','j','y'],
  i:['u','o','k'], j:['h','k','u'], k:['j','l','i'], l:['k','o'],
  m:['n','j','k'], n:['m','b','h'], o:['i','p','l'], p:['o','l'],
  r:['e','t','f'], s:['a','d','w'], t:['r','y','g'], u:['y','i','h'],
  v:['c','b','f'], w:['q','e','s'], x:['z','c','s'], y:['t','u','h'],
  z:['a','x','s'],
};
const nearbyKey = c => {
  const pool = ADJACENT[c.toLowerCase()];
  return pool ? pool[Math.floor(Math.random() * pool.length)] : 'x';
};

// Pause-before triggers
const THINK_TRIGGERS = ['for ', 'while ', 'if ', 'elif ', 'return ', 'def '];

// ── Phase 1: initial typing — moderate beginner speed (600–1400ms/char) ──────
// Looks slow enough to feel human; fast enough to finish within ~60-90s
export async function typeInitialCode(targetCode, setCode, signal) {
  let text = '';

  // Thinking pause before starting (reading the problem)
  await check(signal, 3000 + Math.random() * 4000);

  for (let i = 0; i < targetCode.length; i++) {
    if (signal?.aborted) return text;
    const ch = targetCode[i];
    const upcoming = targetCode.slice(i);

    // Thinking pause before key constructs
    for (const t of THINK_TRIGGERS) {
      if (upcoming.startsWith(t) && text.length > 0) {
        await check(signal, 1500 + Math.random() * 3000);
        break;
      }
    }

    // Random "stare at screen" pause (6% chance)
    if (Math.random() < 0.06) await check(signal, 2000 + Math.random() * 4000);

    // Typo (8% chance on real chars)
    if (ch !== '\n' && ch !== ' ' && ch !== '\t' && Math.random() < 0.08) {
      const wrong = nearbyKey(ch);
      text += wrong; setCode(text);
      await check(signal, 600 + Math.random() * 800);

      // Notice mistake and backspace
      await check(signal, 400 + Math.random() * 600);
      text = text.slice(0, -1); setCode(text);
      await check(signal, 300 + Math.random() * 400);
    }

    // Type correct char
    text += ch; setCode(text);

    // Per-char delay — slow beginner pace
    let d = 600 + Math.random() * 800; // base 600–1400ms
    if (ch === ':')  d += 800  + Math.random() * 1200;
    if (ch === '\n') d += 1000 + Math.random() * 2000;
    if (ch === '(')  d += 500  + Math.random() * 800;
    if (ch === ',')  d += 300  + Math.random() * 600;
    await check(signal, d);
  }
  return text;
}

// ── Phase 2: slow careful re-edit (1500–3500ms/char) ─────────────────────────
// Opponent carefully fixes their code after getting wrong answer.
// Deletes the last portion, then retypes character by character very slowly.
export async function typeCarefulFix(currentCode, correctCode, setCode, signal) {
  // Pause — reading their wrong answer, figuring out the bug
  await check(signal, 3000 + Math.random() * 4000);

  // Find divergence point between wrong and correct
  let commonLen = 0;
  const minLen = Math.min(currentCode.length, correctCode.length);
  while (commonLen < minLen && currentCode[commonLen] === correctCode[commonLen]) commonLen++;

  // Delete back to divergence — slow, deliberate backspacing
  let text = currentCode;
  const toDelete = text.length - commonLen;
  for (let d = 0; d < toDelete; d++) {
    text = text.slice(0, -1);
    setCode(text);
    await check(signal, 1200 + Math.random() * 1800); // 1.2–3.0s per backspace
  }

  // Pause — thinking about the correct logic
  await check(signal, 2500 + Math.random() * 4000);

  // Retype the fix — very slow, one char at a time
  const tail = correctCode.slice(commonLen);
  for (const ch of tail) {
    text += ch; setCode(text);

    // Very slow: 1.5–3.5s per real char, faster for spaces/newlines
    let d = ch === ' '  ? 500  + Math.random() * 800
           : ch === '\n' ? 1200 + Math.random() * 1800
           : 1500 + Math.random() * 2000; // 1.5–3.5s per letter

    // Occasional long pause (thinking mid-fix)
    if (Math.random() < 0.15) d += 3000 + Math.random() * 4000;

    await check(signal, d);
  }

  // Final review pause before submitting
  await check(signal, 2000 + Math.random() * 3000);
}

// ── Human-sounding usernames ──────────────────────────────────────────────────
const HUMAN_NAMES = [
  'alex_07','rahul_py','sam_codes','dev_maya','arjun99',
  'priya_dev','vikash_c','code_karan','sai_py','rohan_dev',
  'py_ninja','mahesh_x','sneha_code','arun_dev','riya_07',
  'coder_raj','python_sam','dev_aarav','ishaan_py','neha_x',
  'yash_codes','tanvi_dev','harsh_py','divya_c','ankit_09',
  'aditya_py','kiran_dev','nisha_c','suresh_07','meera_py',
];
export const randomHumanName = () =>
  HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];

// ── Correct solutions per problem ─────────────────────────────────────────────
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

// Wrong first draft — missing the last key line (looks incomplete/wrong)
export const BOT_WRONG_DRAFTS = {
  1: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return complement
        seen[num] = i`,

  2: `def reverse_string(s):
    result = ''
    for ch in s:
        result = ch + result
    return reslt`,

  3: `def fizzbuzz(n):
    if n % 3 == 0:
        return 'Fizz'
    elif n % 5 == 0:
        return 'Buzz'
    else:
        return str(n)`,

  4: `def is_palindrome(s):
    rev = ''
    for ch in s:
        rev = ch + rev
    return s == rev`,

  5: `def find_max(nums):
    maximum = 0
    for num in nums:
        if num > maximum:
            maximum = num
    return maximum`,

  6: `def count_vowels(s):
    count = 0
    for ch in s:
        if ch in 'aeiou':
            count += 1
    return count`,

  7: `def sum_list(nums):
    total = 0
    for num in nums:
        total = total + n
    return total`,

  8: `def remove_duplicates(nums):
    result = []
    for n in nums:
        if n not in result:
            result.append(n)
    return reslt`,
};

export const getBotSolution  = problem => BOT_SOLUTIONS[problem?.id]   || `def solution():\n    pass`;
export const getBotWrongDraft = problem => BOT_WRONG_DRAFTS[problem?.id] || getBotSolution(problem);
