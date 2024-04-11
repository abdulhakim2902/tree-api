import { Role } from 'src/enums/role.enum';
import { UserStatus } from 'src/enums/user-status.enum';

export interface UserInvitation {
  email: string;
  role: Role;
  status: UserStatus;

  name?: string;
  username?: string;
  password?: string;
  token?: string;

  verified?: Verified;
}

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
