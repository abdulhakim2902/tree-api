import { capitalize } from 'lodash';

export function startCase(v: string) {
  const arr = v.split(' ').map((e) => capitalize(e));
  return arr.join(' ');
}
