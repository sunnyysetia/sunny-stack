import { Module } from '@nestjs/common';

import { PlatformMailService } from './platform-mail.service';

// Transactional mail over SES. Depends on nothing but env + the AWS SDK, so
// it can be imported anywhere a send is needed (auth OTP, org invitations,
// ops alerts) without pulling a wider dependency graph.
@Module({
  providers: [PlatformMailService],
  exports: [PlatformMailService],
})
export class PlatformMailModule {}
