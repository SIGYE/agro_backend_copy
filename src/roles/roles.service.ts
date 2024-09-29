import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DatabaseService } from 'src/database/database.service';
import { UsersService } from 'src/users/users.service';
import { Role } from '@prisma/client';


@Injectable()
export class RolesService {
  constructor(private readonly dataBaseService: DatabaseService, private readonly userService: UsersService) {

  }

  async initiateRoles(): Promise<boolean> {
    try {
        const sampleRoles: string[] = [
            "UMUFASHAMYUMVIRE",
            "AGRONOMIST",
            "VETERINARIAN",
            "FARMER"
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

}
