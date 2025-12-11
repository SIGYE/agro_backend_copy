import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Agronomy, Farmer, Gender, Prisma, Status, User, Veterinary, Umufashamyumvire } from '@prisma/client';
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
  constructor(private readonly databaseService: DatabaseService, private readonly locationService: LocationService) {}

  async create(createUserDto: CreateUserDto, loggedInUser?: User): Promise<User> {
    try {
      if (createUserDto.password) {
        createUserDto.password = await bcrypt.hash(createUserDto.password, 10);
      } else {
        let password = "Test@12345";
        console.log("password: ", password);
        createUserDto.password = await bcrypt.hash(password, 10);
      }

      let usersnumber = await this.databaseService.user.count();
      const username = createUserDto.firstName.toLowerCase() + usersnumber;

      let userPresent = await this.databaseService.user.findFirst({
        where: {
          OR: [
            { email: createUserDto.email },
            { telephone: createUserDto.telephone },
            { nationalId: createUserDto.nationalId }
          ]
        }
      });

      if (userPresent) {
        throw new BadRequestException("The user with the national Id, telephone and email already exists");
      }

      // Validate role exists
      let role = await this.databaseService.role.findUnique({
        where: {
          id: createUserDto.roleId
        }
      });

      if (!role) {
        throw new NotFoundException("The role does not exist");
      }

      let locationId: number;
      
      // Case 1: User provided locationId in DTO
      if (createUserDto.locationId) {
        locationId = createUserDto.locationId;
      } 
      // Case 2: Use loggedInUser's location if no locationId provided
      else if (loggedInUser?.locationId) {
        locationId = loggedInUser.locationId;
      }
      // Case 3: No location provided at all
      else {
        throw new BadRequestException("Location is required. Please provide locationId");
      }

      // Validate location exists
      let location = await this.databaseService.location.findUnique({
        where: {
          id: locationId
        }
      });

      if (!location) {
        throw new BadRequestException(`Location with id ${locationId} does not exist`);
      }

      // Get children location IDs
      let childrenLocationsIds = await this.locationService.getAllChildrenLocations(location.id);

      // Create user
      let user = await this.databaseService.user.create({
        data: {
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          email: createUserDto.email,
          password: createUserDto.password,
          nationalId: createUserDto.nationalId,
          username: username,
          telephone: createUserDto.telephone,
          gender: createUserDto.gender,
          dob: createUserDto.dob ? new Date(createUserDto.dob) : null,
          locationChildrenIds: JSON.stringify(childrenLocationsIds),
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
        sendSms(user.telephone, { 
          id: randomUUID(), 
          content: `Hello ${user.firstName} ${user.lastName}, your account has been created successfully. Your username is ${user.username} and your password is Test@12345. Please change your password after logging in.` 
        });
        console.log(createUserDto.password);
        return user;
      }
    } catch (e) {
      throw e;
    }
  }

  async findAll(locationId?: number): Promise<User[]> {
    const whereClause: Record<string, any> = {};

    // Add location filter if locationId is provided
    if (locationId) {
      whereClause.locationId = locationId;
    }

    return this.databaseService.user.findMany({
      where: whereClause,
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

  async findUserByEmail(email: string): Promise<any> {
    const user = await this.databaseService.user.findUnique({
      where: {
        email: email,
      },
      include: {
        role: true,
        farmer: {
          select: {
            id: true,
            cooperative: {
              select: {
                id: true,
                name: true,
                registrationNumber: true,
                telephone: true,
                type: true
              }
            }
          }
        },
        cooperativeManager: {
          select: {
            name: true,
            id: true,
            type: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async findUserByUsername(username: string): Promise<any> {
    const user = await this.databaseService.user.findUnique({
      where: {
        username: username,
      },
      include: {
        role: true,
        farmer: {
          select: {
            id: true,
            cooperative: {
              select: {
                id: true,
                name: true,
                registrationNumber: true,
                telephone: true,
                type: true
              }
            }
          }
        },
        cooperativeManager: {
          select: {
            name: true,
            id: true,
            type: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return user;
  }

  async findUserByTelephone(telephone: string): Promise<any> {
    const user = await this.databaseService.user.findUnique({
      where: {
        telephone: telephone,
      },
      include: {
        role: true,
        farmer: {
          select: {
            id: true,
            cooperative: {
              select: {
                id: true,
                name: true,
                registrationNumber: true,
                telephone: true,
                type: true
              }
            }
          }
        },
        cooperativeManager: {
          select: {
            name: true,
            id: true,
            type: true
          }
        }
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
      });

      if (user && user.id != id) {
        throw new BadRequestException("The email already exists");
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
      throw new NotFoundException("The user was not found");
    }

    // Reset the password logic here
    if (!(changePasswordDTO.newPassword == changePasswordDTO.confirmNewPassword)) {
      throw new BadRequestException("The password and confirmation passwords do not match");
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
    });
  }

  // deactivating the user 
  async changeUserAccountStatus(id: string, status: Status): Promise<User> {
    const user = await this.databaseService.user.findUnique({
      where: {
        id: id
      }
    });
    if (!user) {
      throw new NotFoundException("The user was not found");
    }
    return await this.databaseService.user.update({
      data: {
        status: status
      },
      where: {
        id: user.id
      }
    });
  }

  async registerAgronomist(createUserDto: CreateUserDto, loggedInUser?: User): Promise<Agronomy> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "AGRONOMIST"
        }
      });

      if (!role) {
        throw new NotFoundException("AGRONOMIST role not found");
      }

      let user = await this.create({ roleId: role.id, ...createUserDto }, loggedInUser);
      
      let location = await this.databaseService.location.findUnique({
        where: {
          id: user.locationId
        }
      });

      let locationLevel = await this.databaseService.locationLevel.findUnique({
        where: {
          id: location.locationLevelId
        }
      });

      return await this.databaseService.agronomy.create({
        data: {
          userId: user.id,
          locationLevel: locationLevel.order_number,
          locationName: location.name,
        }
      });
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async registerFarmer(createUserDto: CreateUserDto, cooperativeId?: string, loggedInUser?: User): Promise<Farmer> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "FARMER"
        }
      });

      if (!role) {
        throw new NotFoundException("FARMER role not found");
      }

      let user = await this.create({ roleId: role.id, ...createUserDto }, loggedInUser);

      let farmer = await this.databaseService.farmer.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          }
        }
      });

      if (cooperativeId) {
        let cooperative = await this.databaseService.cooperative.findUnique({
          where: {
            id: cooperativeId
          }
        });

        if (!cooperative) {
          throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
        }

        await this.databaseService.cooperative.update({
          where: { id: cooperativeId },
          data: {
            farmers: {
              connect: {
                id: farmer.id
              },
            },
          },
        });
      }
      return farmer;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async registerVet(createUserDto: CreateUserDto, loggedInUser?: User): Promise<Veterinary> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "VETERINARIAN"
        }
      });

      if (!role) {
        throw new NotFoundException("VETERINARIAN role not found");
      }

      let user = await this.create({ roleId: role.id, ...createUserDto }, loggedInUser);

      return await this.databaseService.veterinary.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          }
        }
      });
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async registerCooperativeManager(createUserDto: CreateUserDto, loggedInUser?: User): Promise<User> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "COOPERATIVE_MANAGER"
        }
      });

      if (!role) {
        throw new NotFoundException("COOPERATIVE_MANAGER role not found");
      }

      let user = await this.create({ roleId: role.id, ...createUserDto }, loggedInUser);
      return user;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async registerUmufashaMyumvire(createUserDto: CreateUserDto, loggedInUser?: User): Promise<Umufashamyumvire> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "UMUFASHAMYUMVIRE"
        }
      });

      if (!role) {
        throw new NotFoundException("UMUFASHAMYUMVIRE role not found");
      }

      let user = await this.create({ roleId: role.id, ...createUserDto }, loggedInUser);

      return await this.databaseService.umufashamyumvire.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          }
        }
      });
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async registerMultipleVets(file: Express.Multer.File, loggedInUser?: User): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        let userDto = {
          firstName: row[0],
          lastName: row[1],
          nationalId: row[2],
          telephone: row[3],
          email: row[4],
          locationId: 0,
          gender: row[5],
          dob: row[6],
          country: row[7],
        };
        
        let location = await this.locationService.getLocationByName(row[7]);
        userDto.locationId = location.id;
        userDto.country = location.id;

        await this.registerVet(userDto as any, loggedInUser);
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

  async registerMultipleBafashaMyumvire(file: Express.Multer.File, loggedInUser?: User): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        let userDto = {
          firstName: row[0],
          lastName: row[1],
          nationalId: row[2],
          telephone: row[3],
          email: row[4],
          locationId: 0,
          gender: row[5],
          dob: row[6],
          country: row[7],
        };
        
        let location = await this.locationService.getLocationByName(row[7]);
        userDto.country = location.id;
        userDto.locationId = location.id;

        await this.registerUmufashaMyumvire(userDto as any, loggedInUser);
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

  async registerMultipleFarmers(file: Express.Multer.File, loggedInUser?: User): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        let userDto = {
          firstName: row[0],
          lastName: row[1],
          nationalId: row[2],
          telephone: row[3],
          email: row[4],
          locationId: 0,
          gender: row[5],
          dob: row[6],
          country: row[7],
        };
        
        let location = await this.locationService.getLocationByName(row[7]);
        userDto.locationId = location.id;
        userDto.country = location.id;

        await this.registerFarmer(userDto as any, null, loggedInUser);
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

  async registerMultipleFarmersIntoCooperative(file: Express.Multer.File, cooperativeId: string, loggedInUser?: User): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        let userDto = {
          firstName: row[0],
          lastName: row[1],
          nationalId: row[2],
          telephone: row[3],
          email: row[4],
          locationId: 0,
          gender: row[5],
          dob: row[6],
        };
        
        let location = await this.locationService.getLocationByName(row[9]);
        userDto.locationId = location.id;

        await this.registerFarmer(userDto as any, cooperativeId, loggedInUser);
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

  async registerMultipleAgronomists(file: Express.Multer.File, loggedInUser?: User): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        let userDto = {
          firstName: row[0],
          lastName: row[1],
          nationalId: row[2],
          telephone: row[3],
          email: row[4],
          locationId: 0,
          gender: row[5],
          dob: row[6],
        };
        
        let location = await this.locationService.getLocationByName(row[9]);
        userDto.locationId = location.id;

        await this.registerAgronomist(userDto as any, loggedInUser);
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