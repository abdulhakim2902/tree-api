import { Role } from 'src/enums/role.enum';
import { UserStatus } from 'src/enums/user-status.enum';

export interface UserInvitation {
  email: string;
  role: Role;
  status: UserStatus;
}
