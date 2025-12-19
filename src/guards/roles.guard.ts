import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from 'src/decorators/roles.decorator';
import { Role_Enum } from 'src/enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role_Enum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    // Support Umufasha mode switching - check activeRole first, then effectiveRole, then role.name
    const roleName = user?.activeRole ?? user?.effectiveRole ?? user?.role?.name ?? user?.role;
    
    // Check if the roleName matches any of the requiredRoles
    const isAllowed = requiredRoles.includes(roleName);
    
    if (!isAllowed) {
      console.log(`RolesGuard DENIED: User role "${roleName}" not in required roles [${requiredRoles.join(', ')}]`);
    }
    
    return isAllowed;
  }
}
