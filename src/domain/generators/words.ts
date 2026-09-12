import type { RandomSource } from '../ports';

export const LOREM_WORDS: readonly string[] = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'in',
  'reprehenderit',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'eu',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
];

export const FIRST_NAMES: readonly string[] = [
  'Alice',
  'Bob',
  'Carol',
  'David',
  'Emma',
  'Frank',
  'Grace',
  'Henry',
  'Ivy',
  'Jack',
  'Kate',
  'Liam',
  'Mia',
  'Noah',
  'Olivia',
  'Peter',
  'Quinn',
  'Rachel',
  'Sam',
  'Tina',
  'Uma',
  'Victor',
  'Wendy',
  'Xavier',
  'Yara',
  'Zach',
  'Anna',
  'Ben',
  'Chloe',
  'Daniel',
  'Ella',
  'Felix',
  'Gina',
  'Hugo',
  'Irene',
  'Julia',
  'Kevin',
  'Laura',
  'Marco',
  'Nina',
  'Oscar',
  'Paula',
  'Ryan',
  'Sofia',
  'Tom',
  'Ursula',
  'Vera',
  'William',
  'Xena',
  'Yvonne',
  'Zoe',
  'Michael',
  'James',
  'John',
  'Sarah',
  'Emily',
  'Daniela',
  'Lucas',
  'Sophie',
  'Adam',
];

export const LAST_NAMES: readonly string[] = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
  'Phillips',
  'Evans',
  'Turner',
  'Diaz',
  'Parker',
  'Cruz',
  'Edwards',
  'Collins',
  'Reyes',
  'Stewart',
];

export const COMPANY_SUFFIXES: readonly string[] = [
  'Inc',
  'Plc',
  'LLC',
  'Traders',
  'Associates',
  'Trading',
  'Co',
];

export const TLDS: readonly string[] = [
  '.com',
  '.net',
  '.org',
  '.info',
  '.biz',
  '.co.uk',
  '.io',
  '.dev',
];

export const CONSONANTS: readonly string[] = [
  'b',
  'c',
  'd',
  'f',
  'g',
  'h',
  'j',
  'k',
  'l',
  'm',
  'n',
  'p',
  'q',
  'r',
  's',
  't',
  'v',
  'w',
  'x',
  'y',
  'z',
];

export const VOWELS: readonly string[] = ['a', 'e', 'i', 'o', 'u'];

export const LETTERS: readonly string[] = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
];

/** Builds a pronounceable gibberish word alternating consonants and vowels. */
export function scrambledWord(random: RandomSource, minLength = 3, maxLength = 15): string {
  const lower = Math.max(0, Math.min(minLength, maxLength));
  const upper = Math.max(lower, minLength, maxLength);
  const length = random.int(lower, upper);
  let word = '';
  for (let index = 0; index < length; index += 1) {
    word += random.pick(index % 2 === 0 ? CONSONANTS : VOWELS);
  }
  return word;
}

/** Joins `count` lorem words into a sentence, capitalizing sentence starts. */
export function loremWords(random: RandomSource, count: number, maxLength?: number): string {
  const total = Math.max(0, Math.floor(count));
  const words: string[] = [];
  let capitalizeNext = true;
  for (let index = 0; index < total; index += 1) {
    const word = random.pick(LOREM_WORDS);
    const text = capitalizeNext ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    capitalizeNext = /[.?!]$/.test(text);
    words.push(text);
  }
  const result = words.join(' ');
  if (maxLength !== undefined && maxLength > 0 && result.length > maxLength) {
    return result.slice(0, maxLength);
  }
  return result;
}

/** Builds a lorem paragraph within the given word range, ending in a period. */
export function paragraph(
  random: RandomSource,
  minWords: number,
  maxWords: number,
  maxLength?: number,
): string {
  const lower = Math.min(minWords, maxWords);
  const upper = Math.max(minWords, maxWords);
  let text = loremWords(random, random.int(lower, upper));
  if (maxLength !== undefined && maxLength > 0) {
    if (text.length > maxLength) {
      text = text.slice(0, maxLength);
    }
    if (!text.endsWith('.') && text.length < maxLength) {
      text += '.';
    }
    return text;
  }
  return text.endsWith('.') ? text : `${text}.`;
}
