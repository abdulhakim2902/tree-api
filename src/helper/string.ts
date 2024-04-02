import { capitalize } from 'lodash';

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
