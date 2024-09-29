import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Status, User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { AuthRequest } from 'src/types/auth-request.type';
import { UpdateUserDto } from './dto/update-user.dto';

type UserWithRoles = Prisma.UserGetPayload<{
  include: { 
    roles: true,
    organisationAdmins: {
      include: {
        organisation: true
      }
    },
    organisationSurveyers : {
      include : {
        organisation : true
      }
    }
  }
}>;

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {

  }
  async create(createUserDto: CreateUserDto) {
    createUserDto.password = await bcrypt.hash(createUserDto.password, 10)
    let usersnumber = await this.databaseService.user.count();
    const username = createUserDto.firstName.toLowerCase()  + usersnumber; 

    let userPresent = await this.databaseService.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { nationalId : createUserDto.nationalId}
        ]
      }
    });
    

  if(userPresent){
    throw new BadRequestException("The user with the national Id , telephone and email already exists")
  }

    return await this.databaseService.user.create({
      data: {
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        email: createUserDto.email,   
        password: createUserDto.password,
        nationalId : createUserDto.nationalId,
        status: createUserDto.status,
        username: username,
      }
    });
  }

  async findAll() {
    return this.databaseService.user.findMany({
      include: { roles: true }
    });
  }

  async findOne(id: string) {
    return await this.databaseService.user.findUnique({
      where: {
        id,
      },
      include: { 
        roles: true ,
        organisationAdmins : {
          include : {
            organisation : true,
            user : false
          }
        }
       }
    });
  }
  async findUserByEmail(email: string): Promise<UserWithRoles> {
    const user = await this.databaseService.user.findUnique({
      where: {
        email: email,
      },
      include: {
        roles: true,
        organisationAdmins: {
          include : {
            organisation : true
          }
        },
        organisationSurveyers : {
          include : {
            organisation : true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async findUserByUsername(username: string): Promise<UserWithRoles> {
    const user = await this.databaseService.user.findUnique({
      where: {
        username: username,
      },
      include: {
        roles: true,
        organisationAdmins: {
          include : {
            organisation : true
          }
        },
        organisationSurveyers : {
          include : {
            organisation : true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return user;
  }

  async findUserByTelephone(telephone: string): Promise<UserWithRoles> {
    const user = await this.databaseService.user.findUnique({
      where: {
        telephone: telephone,
      },
      include: {
        roles: true,
        organisationAdmins: {
          include : {
            organisation : true
          }
        },
        organisationSurveyers : {
          include : {
            organisation : true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`User with telephone ${telephone} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if(updateUserDto.email){
      // Check if the email already exists
      const user = await this.databaseService.user.findUnique({
        where: {
          email: updateUserDto.email
        }
      })

      if(user && user.id != id){
        throw new BadRequestException("The email already exists")
      }
    }
    return this.databaseService.user.update({
      data: {
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        email: updateUserDto.email,
      },
      where: { id }
    });
  }

  async remove(id: string) {
    return this.databaseService.user.delete({
      where: { id }
    });
  }

  // RESET PASSWORD
  async changeLoggedInPassword(request: AuthRequest , changePasswordDTO : ChangePasswordDTO): Promise<User> {
    // Fetch the user by ID
    const user = await this.databaseService.user.findUnique({
      where : {
        id : request.user.id
      }
    });
    if (!user) {
      throw new NotFoundException("The user was not found")
    }

    // Reset the password logic here
    if(!(changePasswordDTO.newPassword == changePasswordDTO.confirmNewPassword)){
        throw new BadRequestException("The password and confirmation passwords do not match")
    }
    // For example, you might generate a new password and update the user record
    const newPassword = await bcrypt.hash(changePasswordDTO.newPassword , 12); // Generate a secure password
    return await this.databaseService.user.update({
      where : {
        id : user.id
      },
      data : {
        password : newPassword,
        isDefaultPassword : false
      }
    }
    );
  }

  // deactivating the user 
  async changeUserAccountStatus(id: string , status : Status): Promise<User> {
    const user = await this.databaseService.user.findUnique({
      where : {
        id : id
      }
    });
    if (!user) {
      throw new NotFoundException("The user was not found")
    }
    return await this.databaseService.user.update({
      data : {
        status : status
      },
      where : {
        id : user.id
      }
    }
    );
  }
}
