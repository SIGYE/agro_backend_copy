import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DatabaseService } from 'src/database/database.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UsersService } from 'src/users/users.service';
import { Role } from '@prisma/client';


@Injectable()
export class RolesService {
  constructor(private readonly dataBaseService: DatabaseService, private readonly userService: UsersService) {

  }

  async initiateRoles(): Promise<boolean> {
    try {
        const sampleRoles: string[] = [
            "DEV_ACCESS",
            "SUPER_ADMIN",
            "SURVEYOR"
        ];

        // Create an array of promises for role creation
        const rolePromises = sampleRoles.map(async (role: string) => {
            const persistedRole: Role | null = await this.findByName(role);
            if (persistedRole == null) {
                await this.dataBaseService.role.create({
                    data: {
                        name: role
                    }
                });
            }
        });

        // Wait for all promises to complete
        await Promise.all(rolePromises);

        return true;
    } catch (error) {
        console.error('Error initiating roles:', error);
        return false;
    }
}


  async create(createRoleDto: CreateRoleDto) {
    return this.dataBaseService.role.create({
      data: {
        name: createRoleDto.name
      }
    })
  }

  async findByName(name : string){
    return this.dataBaseService.role.findUnique({
      where : {
        name : name
      }
    })
  }

  async findAll() {
    return this.dataBaseService.role.findMany({})
  }

  async findOne(id: string) {
    return this.dataBaseService.role.findUnique({
      where: {
        id
      }
    })
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    return this.dataBaseService.role.update({
      where: { id },
      data: {
        name: updateRoleDto.name
      }
    })
  }

  async remove(id: string) {
    return this.dataBaseService.role.delete({
      where: { id }
    })
  }
  async assignRoles(assignRole: AssignRoleDto) {
    const { roleId, userIds } = assignRole;

    try {
      await this.dataBaseService.$transaction(async () => {
        for (const userId of userIds) {
          try {
            const user = await this.userService.findOne(userId)
            if (user) {
              if (!user.roles.some(role => role.id === roleId)) {
                await this.dataBaseService.user.update({
                  where: { id: userId },
                  data: {
                    roles: {
                      connect: { id: roleId }
                    }
                  }
                });
              }
            } else {
              throw new NotFoundException(`User with id ${userId} not found.`);
            }

          } catch (error) {
            if (error instanceof NotFoundException) {
              throw new NotFoundException(error.message);
            }
            throw error

          }

        }
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException(error.message);
    }
  }


}
