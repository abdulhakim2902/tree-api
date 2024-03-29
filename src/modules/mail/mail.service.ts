import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { getRegistrationHtml } from './template/registration';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmailTo(to: string) {
    return this.mailerService.sendMail({
      to,
      subject: 'Welcome to Family Tree',
      text: `Welcome to family tree, here is a link embed code ${''}`,
      html: getRegistrationHtml(to, 'google.com'),
    });
  }
}
