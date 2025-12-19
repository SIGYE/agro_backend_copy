import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService, private readonly userService: UsersService, private reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isAllowed = this.reflector.getAllAndOverride<any>('isAllowed', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isAllowed)
            return true
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException("Please Login");
        }
        try {
            const payload: any = await this.jwtService.verify(token, { secret: process.env.SECRET_KEY })
            if (payload?.tokenType === 'ONBOARDING') {
                throw new UnauthorizedException("Complete onboarding to continue");
            }

            const user = await this.userService.findOne(payload.id);
            if (!user) {
                throw new UnauthorizedException("Invalid token");
            }

            const baseRole = user?.role?.name ?? user?.role;
            const activeRole = user?.activeRole ?? payload?.activeRole;

            const allowedRoles =
                baseRole === 'UMUFASHAMYUMVIRE'
                    ? ['UMUFASHAMYUMVIRE', 'FARMER']
                    : [baseRole];

            const effectiveRole = allowedRoles.includes(activeRole) ? activeRole : baseRole;

            // Set both activeRole and effectiveRole for consistency
            (user as any).activeRole = effectiveRole;
            (user as any).effectiveRole = effectiveRole;
            request.user = user;
            
            // Debug log for troubleshooting authorization issues
            console.log(`Auth: User ${user.id} - baseRole: ${baseRole}, activeRole from JWT: ${payload?.activeRole}, effectiveRole: ${effectiveRole}`);
        } catch (error) {
            throw new UnauthorizedException(error.message);
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
