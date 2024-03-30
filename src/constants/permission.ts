import { Role } from 'src/enums/role.enum';

export const UPDATE = [Role.EDITOR, Role.CONTRIBUTOR, Role.SUPERADMIN];
export const CREATE = [Role.EDITOR, Role.SUPERADMIN];
export const DELETE = CREATE;
export const READ = [
  Role.GUEST,
  Role.CONTRIBUTOR,
  Role.EDITOR,
  Role.SUPERADMIN,
];
