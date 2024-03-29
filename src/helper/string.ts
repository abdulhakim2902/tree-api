import { capitalize } from 'lodash';

export function startCase(v: string) {
  return v
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((e) => capitalize(e))
    .join(' ');
}
