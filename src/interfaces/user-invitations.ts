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

export type ConnectRequest = Status & {
  userId: string;
  nodeId: string;
};

export type Status = {
  status: UserStatus;
};

export type UserToken = Record<UserStatus, string>;
