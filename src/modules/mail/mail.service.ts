import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { getRegistrationHtml } from './template/registration';
import { ConfigService } from '@nestjs/config';
import { Role } from 'src/enums/role.enum';
import { getInviteHtml } from './template/invite';
import { getRequestHtml } from './template/request';

@Injectable()
export class MailService {
  private config: ConfigService;

  constructor(private readonly mailerService: MailerService) {
    this.config = new ConfigService();
  }

  async sendEmailTo(to: string, data: any) {
    const subject = this.getSubject(data.type);
    const text = this.getText(data);
    const html = this.getHtml(data);

    return this.mailerService.sendMail({ to, subject, text, html });
  }

  private getText(data: any) {
    if (data.type === 'request') {
      return 'Request role changed';
    }

    const inviteLink = this.getInviteLink(data.token);
    return `Here is a link embed code ${inviteLink}`;
  }

  private getInviteLink(token: string) {
    const appURL = this.config.get<string>('APP_URL');
    return `${appURL}/?token=${token}`;
  }

  private getSubject(type: 'registration' | 'invites' | 'request'): string {
    if (type === 'registration') {
      return 'Welcome to Family Tree';
    }

    if (type === 'invites') {
      return 'Admin has shared a family tree with you.';
    }

    return 'Role request';
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
    const type = data.type;
    if (type === 'registration') {
      const appURL = this.config.get<string>('APP_URL');
      const inviteLink = `${appURL}/?token=${data.token}`;
      return getRegistrationHtml(data.to, inviteLink, appURL);
    }

    if (type === 'invites') {
      const inviteLink = this.getInviteLink(data.token);
      const permissionList = this.getPermissions(data.role);
      return getInviteHtml(data.role, inviteLink, permissionList);
    }

    return getRequestHtml(data.role, data.email, data.additionalRole);
  }
}
