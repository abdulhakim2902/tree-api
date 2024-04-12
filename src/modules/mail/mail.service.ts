import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable } from '@nestjs/common';
import { getRegistrationHtml } from './template/registration';
import { ConfigService } from '@nestjs/config';
import { Role } from 'src/enums/role.enum';
import { getInviteHtml } from './template/invite';
import { getEmailFoundHtml } from './template/email-found';
import { getRegistrationAcceptedHtml } from './template/registration-accepted';
import { getRegistrationRejectedHtml } from './template/registration-rejected';

type Type =
  | 'registration'
  | 'invites'
  | 'email-found'
  | 'registration-accepted';

@Injectable()
export class MailService {
  private config: ConfigService;

  constructor(private readonly mailerService: MailerService) {
    this.config = new ConfigService();
  }

  async sendEmailTo(to: string, data: any) {
    try {
      const subject = this.getSubject(data.type);
      const text = this.getText(data);
      const html = this.getHtml(data);

      await this.mailerService.sendMail({ to, subject, text, html });
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  private getText(data: any) {
    if (data.type === 'email-found') {
      return 'Your registration is rejected';
    }

    if (data.type === 'registration-accepted') {
      return 'Your registration is accepted';
    }

    const inviteLink = this.getInviteLink(data.token);
    return `Here is a link embed code ${inviteLink}`;
  }

  private getInviteLink(token: string) {
    const appURL = this.config.get<string>('APP_URL');
    return `${appURL}/?token=${token}`;
  }

  private getSubject(type: Type): string {
    if (type === 'registration' || type === 'registration-accepted') {
      return 'Welcome to Family Tree';
    }

    if (type === 'invites') {
      return 'Admin has shared a family tree with you.';
    }

    return 'Admin has rejected your registration';
  }

  private getPermissions(role: Role): string[] {
    const permissionList = ['View tree'];

    switch (role) {
      case Role.CONTRIBUTOR:
        permissionList.push('Add and edit photos', 'Edit people');
        break;
      case Role.EDITOR:
        permissionList.push('Add and edit photos', 'Add and edit people');
        break;
    }
    return permissionList;
  }

  private getHtml(data: any): string {
    const appURL = this.config.get<string>('APP_URL');
    const type = data.type;
    if (type === 'registration') {
      const inviteLink = `${appURL}/?token=${data.token}`;
      return getRegistrationHtml(data.email, inviteLink, appURL);
    }

    if (type === 'registration-accepted') {
      return getRegistrationAcceptedHtml(appURL);
    }

    if (type === 'registration-rejected') {
      return getRegistrationRejectedHtml(data.email, appURL);
    }

    if (type === 'email-found') {
      return getEmailFoundHtml(data.email, appURL);
    }

    const inviteLink = this.getInviteLink(data.token);
    const permissionList = this.getPermissions(data.role);
    return getInviteHtml(data.role, inviteLink, permissionList, appURL);
  }
}
