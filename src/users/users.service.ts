import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Agronomy, Farmer, Prisma, Status, User, Veterinary } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { AuthRequest } from 'src/types/auth-request.type';
import { UpdateUserDto } from './dto/update-user.dto';
import * as XLSX from 'xlsx';
import { LocationService } from 'src/location/location.service';
import { generatePassword } from 'src/utils/data.util';
import { sendSms } from 'src/utils/sms.util';
import { randomUUID } from 'crypto';

export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    role: true
  }
}>;

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService, private readonly locationService: LocationService) {

  }
  async create(createUserDto: CreateUserDto): Promise<User> {
    if (createUserDto.password) {
      createUserDto.password = await bcrypt.hash(createUserDto.password, 10)
    } else {
      let password = generatePassword()
      console.log("password: ", password)
      createUserDto.password = await bcrypt.hash(password, 10)
    }
    let usersnumber = await this.databaseService.user.count();
    const username = createUserDto.firstName.toLowerCase() + usersnumber;

    let userPresent = await this.databaseService.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { nationalId: createUserDto.nationalId }
        ]
      }
    });


    if (userPresent) {
      throw new BadRequestException("The user with the national Id , telephone and email already exists")
    }

    let role = await this.databaseService.role.findUnique({
      where: {
        id: createUserDto.roleId
      }
    })

    if (!role) {
      throw new NotFoundException("The role does not exist")
    }

    let location = await this.databaseService.location.findUnique({
      where: {
        id: createUserDto.locationId
      }
    })

    if (!location) {
      throw new NotFoundException("The location does not exist")
    }

    let user = await this.databaseService.user.create({
      data: {
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        email: createUserDto.email,
        password: createUserDto.password,
        nationalId: createUserDto.nationalId,
        username: username,
        role: {
          connect: {
            id: role.id
          }
        },
        location: {
          connect: {
            id: location.id
          }
        }
      }
    });
    if (user) {
      sendSms(user.telephone, { id: randomUUID(), content: `Hello ${user.firstName} ${user.lastName}, your account has been created successfully. Your username is ${user.username} and your password is ${createUserDto.password}. Please change your password after logging in.` })
      console.log(createUserDto.password)
      return user
    } else {
      return null
    }

  }

  async findAll(): Promise<User[]> {
    return this.databaseService.user.findMany({
      include: {
        role: true,
        location: true
      }
    });
  }

  async findOne(id: string): Promise<UserWithRoles> {
    return await this.databaseService.user.findUnique({
      where: {
        id,
      },
      include: {
        role: true,
        location: true
      }
    });
  }
  async findUserByEmail(email: string): Promise<UserWithRoles> {
    const user = await this.databaseService.user.findUnique({
      where: {
        email: email,
      },
      include: {
        role: true,
        location: true
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
        role: true,
        location: true
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
        role: true,
        location: true
      }
    });

    if (!user) {
      throw new NotFoundException(`User with telephone ${telephone} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.email) {
      // Check if the email already exists
      const user = await this.databaseService.user.findUnique({
        where: {
          email: updateUserDto.email
        }
      })

      if (user && user.id != id) {
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

  async remove(id: string): Promise<User> {

    return this.databaseService.user.delete({
      where: { id }
    });
  }

  // RESET PASSWORD
  async changeLoggedInPassword(request: AuthRequest, changePasswordDTO: ChangePasswordDTO): Promise<User> {
    // Fetch the user by ID
    const user = await this.databaseService.user.findUnique({
      where: {
        id: request.user.id
      }
    });
    if (!user) {
      throw new NotFoundException("The user was not found")
    }

    // Reset the password logic here
    if (!(changePasswordDTO.newPassword == changePasswordDTO.confirmNewPassword)) {
      throw new BadRequestException("The password and confirmation passwords do not match")
    }
    // For example, you might generate a new password and update the user record
    const newPassword = await bcrypt.hash(changePasswordDTO.newPassword, 12); // Generate a secure password
    return await this.databaseService.user.update({
      where: {
        id: user.id
      },
      data: {
        password: newPassword,
        isDefaultPassword: false
      }
    }
    );
  }

  // deactivating the user 
  async changeUserAccountStatus(id: string, status: Status): Promise<User> {
    const user = await this.databaseService.user.findUnique({
      where: {
        id: id
      }
    });
    if (!user) {
      throw new NotFoundException("The user was not found")
    }
    return await this.databaseService.user.update({
      data: {
        status: status
      },
      where: {
        id: user.id
      }
    }
    );
  }

  async registerAgronomist(createUserDto: CreateUserDto): Promise<Agronomy> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "AGRONOMIST"
        }
      })
      let user = await this.create({ roleId: role.id, ...createUserDto });
      let location = await this.databaseService.location.findUnique({
        where: {
          id: user.locationId
        }
      })
      let locationLevel = await this.databaseService.locationLevel.findUnique({
        where: {
          id: location.locationLevelId
        }
      })
      return await this.databaseService.agronomy.create({
        data: {
          userId: user.id,
          locationLevel: locationLevel.order_number,
          locationName: location.name,

        }

      })

    }
    catch (e) {
      throw new BadRequestException(e.message)
    }

  }

  async registerFarmer(createUserDto: CreateUserDto): Promise<Farmer> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "FARMER"
        }
      })
      let user = await this.create({ roleId: role.id, ...createUserDto });

      return await this.databaseService.farmer.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          }

        }

      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
  async registerVet(createUserDto: CreateUserDto): Promise<Veterinary> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "VETERINARIAN"
        }
      })
      let user = await this.create({ roleId: role.id, ...createUserDto });

      return await this.databaseService.veterinary.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          }

        }

      })
    }
    catch (e) {
      throw new BadRequestException(e.message)
    }
  }
  async registerUmufashaMyumvire(createUserDto: CreateUserDto): Promise<Veterinary> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "UMUFASHAMYUMVIRE"
        }
      })
      let user = await this.create({ roleId: role.id, ...createUserDto });

      return await this.databaseService.veterinary.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          }

        }

      })
    }
    catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async registerMultipleVets(file: Express.Multer.File): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip the first row (assuming it's the header row)
    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        // Map the row to a userDto-like object based on the cell index
        let userDto = {
          firstName: row[0],
          lastName: row[1],
          nationalId: row[2],
          telephone: row[3],
          email: row[4],
          locationId: 0,


        };
        let location = await this.locationService.getLocationByName(row[9]);
        userDto.locationId = location.id;
        let role = await this.databaseService.role.findFirst({
          where: {
            name: "VETERINARIAN"
          }
        })

        await this.registerVet({ roleId: role.id, ...userDto }); // Register vet with the custom object
        success++;
      } catch (error) {
        failed++;
        errors.push({
          row: row,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return { success, failed, errors };
  }
  async registerMultipleBafashaMyumvire(file: Express.Multer.File): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip the first row (assuming it's the header row)
    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        // Map the row to a userDto-like object based on the cell index
        let userDto = {
          firstName: row[0],
          lastName: row[1],
          nationalId: row[2],
          telephone: row[3],
          email: row[4],
          locationId: 0,


        };
        let location = await this.locationService.getLocationByName(row[9]);
        userDto.locationId = location.id;
        let role = await this.databaseService.role.findFirst({
          where: {
            name: "UMUFASHAMYUMVIRE"
          }
        })

        await this.registerVet({ roleId: role.id, ...userDto }); // Register vet with the custom object
        success++;
      } catch (error) {
        failed++;
        errors.push({
          row: row,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return { success, failed, errors };
  }

  async registerMultipleFarmers(file: Express.Multer.File): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip the first row (assuming it's the header row)
    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        // Map the row to a userDto-like object based on the cell index
        let userDto = {
          firstName: row[0],
          lastName: row[1],
          nationalId: row[2],
          telephone: row[3],
          email: row[4],
          locationId: 0,


        };
        let location = await this.locationService.getLocationByName(row[9]);
        userDto.locationId = location.id;
        let role = await this.databaseService.role.findFirst({
          where: {
            name: "FARMER"
          }
        })

        await this.registerFarmer({ roleId: role.id, ...userDto }); // Register vet with the custom object
        success++;
      } catch (error) {
        failed++;
        errors.push({
          row: row,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return { success, failed, errors };
  }

  async registerMultipleAgronomists(file: Express.Multer.File): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip the first row (assuming it's the header row)
    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        // Map the row to a userDto-like object based on the cell index
        let userDto = {
          firstName: row[0],
          lastName: row[1],
          nationalId: row[2],
          telephone: row[3],
          email: row[4],
          locationId: 0,


        };
        let location = await this.locationService.getLocationByName(row[9]);
        userDto.locationId = location.id;
        let role = await this.databaseService.role.findFirst({
          where: {
            name: "AGRONOMIST"
          }
        })

        await this.registerVet({ roleId: role.id, ...userDto }); // Register vet with the custom object
        success++;
      } catch (error) {
        failed++;
        errors.push({
          row: row,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return { success, failed, errors };
  }



}
