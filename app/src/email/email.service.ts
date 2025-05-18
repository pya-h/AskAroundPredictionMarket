import * as FormData from 'form-data';
import { Injectable, LoggerService } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '../config/config.service';

@Injectable()
export class EmailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {}

  async send(
    to: string,
    subject: string,
    data: Record<'title' | 'body', string>,
    template = 'default1',
  ) {
    const form = new FormData();
    form.append('from', this.configService.getOrThrow('email.from'));
    form.append('to', to);
    form.append('subject', subject);
    form.append('text', data.body);
    form.append('template', template);
    form.append('h:X-Mailgun-Variables', JSON.stringify(data));

    const domain = this.configService.getOrThrow('email.domain');

    try {
      await axios.post(
        `https://api.eu.mailgun.net/v3/${domain}/messages`,
        form.getBuffer(),
        {
          auth: {
            username: 'api',
            password: this.configService.getOrThrow('email.apiKey'),
          },
          headers: form.getHeaders(),
        },
      );
      return true;
    } catch (e) {
      this.loggerService.error('Email service failed', e, {
        data: { to, subject, data, template },
      });
      return false;
    }
  }

  sendEmailNotification(toEmail: string, title: string, body: string) {
    return this.send(toEmail, `PredMark: ${title}`, {
      title,
      body: `<p>${body}</p>`,
    });
  }
}
