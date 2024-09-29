import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  providers: [MailService , ConfigService],
  exports: [MailService],
})
export class MailModule {}
