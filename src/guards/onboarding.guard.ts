import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Status } from '@prisma/client';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException("Missing onboarding token");
    }

    try {
      const payload: any = await this.jwtService.verify(token, { secret: process.env.SECRET_KEY });
      if (payload?.tokenType !== 'ONBOARDING') {
        throw new UnauthorizedException("Invalid onboarding token");
      }

      const user = await this.usersService.findOne(payload.id);
      if (!user) {
        throw new UnauthorizedException("Invalid onboarding token");
      }
      if (user.status === Status.INACTIVE) {
        throw new UnauthorizedException("User account not active");
      }
      if (user.role?.name !== 'FARMER') {
        throw new UnauthorizedException("Onboarding is only available for farmers");
      }
      if (!user.isDefaultPassword) {
        throw new UnauthorizedException("Onboarding already completed");
      }

      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
