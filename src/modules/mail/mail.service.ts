import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { getRegistrationHtml } from './template/registration';
import { ConfigService } from '@nestjs/config';
import { Role } from 'src/enums/role.enum';
import { getInviteHtml } from './template/invite';

@Injectable()
export class MailService {
  private config: ConfigService;

  constructor(private readonly mailerService: MailerService) {
    this.config = new ConfigService();
  }

  async sendEmailTo(
    to: string,
    token: string,
    type: 'registration' | 'invites' | 'request',
    role = Role.GUEST,
  ) {
    const appURL = this.config.get<string>('APP_URL');
    const inviteLink = `${appURL}/?token=${token}`;
    const subject =
      type === 'registration'
        ? 'Welcome to Family Tree'
        : 'Admin has shared an family tree with you.';

    const text = `Here is a link embed code ${inviteLink}`;
    const permissionList = ['View tree'];

    switch (role) {
      case Role.CONTRIBUTOR:
        permissionList.push('Add and edit photos', 'Edit people');
        break;
      case Role.EDITOR:
        permissionList.push('Add and edit photos', 'Add and edit people');
        break;
    }

    const html =
      type === 'registration'
        ? getRegistrationHtml(to, inviteLink, appURL)
        : getInviteHtml(role, inviteLink, permissionList);

    return this.mailerService.sendMail({ to, subject, text, html });
  }
}
