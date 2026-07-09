import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { env } from '@/config/env';

/**
 * Platform transactional mail — auth flows (sign-in codes), member
 * invitations, system notifications. A thin wrapper around AWS SES.
 *
 * Credentials come from the AWS SDK's default provider chain
 * (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`); the sending identity
 * (`SES_FROM_EMAIL`) and region are env-configured. The client + config are
 * resolved LAZILY on first send so the app boots without SES configured —
 * only code paths that actually send mail fail, with a clear error.
 *
 * In non-production the subject is prefixed with the deploy env (`[local] …`)
 * so it's obvious which instance sent a given email.
 */
@Injectable()
export class PlatformMailService {
  private client: SESClient | undefined;
  private readonly subjectPrefix = env.DEPLOY_ENV === 'production' ? '' : `[${env.DEPLOY_ENV}] `;

  constructor(@InjectPinoLogger(PlatformMailService.name) private readonly logger: PinoLogger) {}

  private resolve(): { client: SESClient; from: string } {
    const from = env.SES_FROM_EMAIL;
    if (!from) {
      throw new Error('SES_FROM_EMAIL is not set — cannot send platform mail.');
    }
    const region = env.SES_REGION ?? env.AWS_REGION;
    if (!region) {
      throw new Error('SES_REGION (or AWS_REGION) is not set — cannot send platform mail.');
    }
    this.client ??= new SESClient({ region });
    return { client: this.client, from };
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    /** Plain-text body (always sent for deliverability). */
    text: string;
    /** Optional HTML body. */
    html?: string;
    /** Flow tag for logs, e.g. `'auth.email_otp'`, `'invite'`. */
    reason?: string;
  }): Promise<{ messageId: string }> {
    const { client, from } = this.resolve();
    const subject = `${this.subjectPrefix}${params.subject}`;
    const reason = params.reason ?? 'platform_mail';

    const result = await client.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: params.text, Charset: 'UTF-8' },
            ...(params.html ? { Html: { Data: params.html, Charset: 'UTF-8' } } : {}),
          },
        },
        ...(env.SES_CONFIGURATION_SET ? { ConfigurationSetName: env.SES_CONFIGURATION_SET } : {}),
      }),
    );

    if (!result.MessageId) {
      throw new Error('SES SendEmail returned no MessageId');
    }

    this.logger.info({ reason, messageId: result.MessageId }, 'platform mail sent');
    return { messageId: result.MessageId };
  }
}
