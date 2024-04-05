import { Role } from 'src/enums/role.enum';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: Role;
  nodeId?: string;
}
