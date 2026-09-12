import { CONSONANTS, LETTERS, VOWELS } from './generators/words';
import type { RandomSource } from './ports';

const UPPERCASE_CONSONANTS: readonly string[] = CONSONANTS.map((letter) => letter.toUpperCase());
const UPPERCASE_VOWELS: readonly string[] = VOWELS.map((letter) => letter.toUpperCase());

function tokenValue(random: RandomSource, token: string): string | undefined {
  switch (token) {
    case 'X':
      return String(random.int(1, 9));
    case 'x':
      return String(random.int(0, 9));
    case 'L':
      return random.pick(LETTERS).toUpperCase();
    case 'l':
      return random.pick(LETTERS);
    case 'D': {
      const letter = random.pick(LETTERS);
      return random.bool() ? letter.toUpperCase() : letter;
    }
    case 'C':
      return random.pick(UPPERCASE_CONSONANTS);
    case 'c':
      return random.pick(CONSONANTS);
    case 'V':
      return random.pick(UPPERCASE_VOWELS);
    case 'v':
      return random.pick(VOWELS);
    default:
      return undefined;
  }
}

/**
 * Expands a template into random text. Tokens: `X` 1-9, `x` 0-9, `L` A-Z,
 * `l` a-z, `D` any-case letter, `C`/`V` uppercase consonant/vowel, `c`/`v`
 * lowercase. `[` (or `]`) escapes the next character; a lone `[` stays literal.
 */
export function expandTemplate(random: RandomSource, template: string): string {
  let output = '';
  let index = 0;
  while (index < template.length) {
    const char = template[index];
    if (char === undefined) {
      break;
    }

    if (char === '[' || char === ']') {
      const escaped = template[index + 1];
      if (escaped === undefined) {
        output += char;
        index += 1;
        continue;
      }
      output += escaped;
      index += 2;
      if (template[index] === ']') {
        index += 1;
      }
      continue;
    }

    output += tokenValue(random, char) ?? char;
    index += 1;
  }
  return output;
}
