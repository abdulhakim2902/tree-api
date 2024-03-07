import { Request as Req } from 'express';
import { UserProfile } from './user-profile.interface';

export interface Request extends Req {
  user?: UserProfile;
}
