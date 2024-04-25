import { Role } from 'src/enums/role.enum';
import { UserStatus } from 'src/enums/user-status.enum';

export type UserInvitation = Status & {
  email: string;
  role: Role;

  name?: string;
  username?: string;
  password?: string;
  token?: string;

  verified?: Verified;
};

export type Verified = {
  user: boolean;
  admin: boolean;
};

export type UpdateUser = Status & {
  currentEmail: string;
  updatedEmail: string;
};

export type Status = {
  status: UserStatus;
};

export type UserToken = Record<UserStatus, string>;

export type DeleteRequest = {
  userIds: string[];
  nodeId: string;
  reason: string;
};
