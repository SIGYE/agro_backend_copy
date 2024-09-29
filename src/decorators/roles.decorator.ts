import { SetMetadata } from "@nestjs/common"
import { Role_Enum } from 'src/enums/role.enum';

export const ROLES_KEY = 'roles'
export const Roles = (...roles: Role_Enum[]) => SetMetadata(ROLES_KEY, roles)