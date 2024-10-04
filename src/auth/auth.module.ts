import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [MailModule, JwtModule.register({
    secret: process.env.SECRET_KEY,
    signOptions: { expiresIn: '2d' }
  }), UsersModule, DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService]
})
export class AuthModule { }
