import { capitalize } from 'lodash';
import * as crypto from 'crypto';

export function startCase(v: string) {
  return v
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((e) => capitalize(e))
    .join(' ');
}

export function parse<T>(data: string): T | null {
  try {
    const result = JSON.parse(data);
    return result as T;
  } catch {
    return null;
  }
}

export function generateRandomString(size = 20): string {
  return crypto.randomBytes(size).toString('hex');
}

export function isVowel(str: string): string {
  return ['a', 'i', 'u', 'e', 'o'].includes(str[0].toLowerCase()) ? 'an' : 'a';
}
