import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { 
  CreateCooperativeDto, 
  CollectiveType 
} from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { DatabaseService } from '../database/database.service';
import { AssignFarmersTOCooperative } from './dto/assign-farmers-to-cooperative';
import { LocationService } from 'src/location/location.service';
import { UsersService } from 'src/users/users.service';
import { CooperativeType } from '@prisma/client';
import { CreateCooperativeFarmerDto } from './dto/create-farmer-cooperative';
import { FarmerService } from 'src/farmer/farmer.service';
import { Role_Enum } from 'src/enums/role.enum';

@Injectable()
export class CooperativeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly locationService: LocationService,
    private readonly userService: UsersService,
    private readonly farmerService: FarmerService,
  ) {}

  // ---------------- CREATE ----------------
  async create(createCooperativeDto: CreateCooperativeDto, userId?: string, userRole?: string) {
    try {
      if (userRole !== Role_Enum.UMUFASHAMYUMVIRE) {
        throw new ForbiddenException('Only UmufashaMyumvire can create cooperatives');
      }

      this.validateCooperativeType(createCooperativeDto);

      if (
        createCooperativeDto.collectiveType === CollectiveType.NON_COLLECTIVE &&
        createCooperativeDto.crops?.length
      ) {
        throw new BadRequestException(
          'NON_COLLECTIVE cooperatives cannot have cooperative-level crops.',
        );
      }

      if (
        createCooperativeDto.collectiveType === CollectiveType.COLLECTIVE &&
        !createCooperativeDto.crops?.length
      ) {
        console.log(
          'Note: COLLECTIVE cooperative created without initial crops. Crops can be added later.',
        );
      }

      return await this.databaseService.$transaction(async (prisma) => {

        const role = await prisma.role.findUnique({ 
          where: { id: createCooperativeDto.managerDto.roleId } 
        });
        
        if (!role) {
          throw new BadRequestException(
            `Role with ID ${createCooperativeDto.managerDto.roleId} not found`
          );
        }

        if (createCooperativeDto.collectiveType === CollectiveType.COLLECTIVE) {
          if (role.name !== Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
            throw new BadRequestException(
              'Collective cooperatives must be managed by COLLECTIVE_COOPERATIVE_MANAGER'
            );
          }
        } else {
          if (role.name !== Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
            throw new BadRequestException(
              'Non-collective cooperatives must be managed by NON_COLLECTIVE_COOPERATIVE_MANAGER'
            );
          }
        }

        const user = await this.userService.create(
          createCooperativeDto.managerDto,
          null,
        );

        const cooperative = await prisma.cooperative.create({
          data: {
            name: createCooperativeDto.name,
            registrationNumber: createCooperativeDto.registrationNumber,
            telephone: createCooperativeDto.telephone,
            membersNumber: createCooperativeDto.membersNumber,
            type: createCooperativeDto.cooperativeType,
            collectiveType: createCooperativeDto.collectiveType,
            locationId: createCooperativeDto.locationId,
            cooperativeManagerId: user.id,
          },
        });

        if (
          createCooperativeDto.collectiveType === CollectiveType.COLLECTIVE &&
          createCooperativeDto.crops?.length
        ) {
          for (const crop of createCooperativeDto.crops) {
            await prisma.cooperativeCropRegistration.create({
              data: { 
                cooperativeId: cooperative.id, 
                cropTypeId: crop.cropTypesId 
              },
            });
          }
        }

        return {
          ...cooperative,
          manager: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            telephone: user.telephone,
            role: role.name,
          }
        };
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error creating cooperative: ' + (error?.message ?? String(error)),
      );
    }
  }

  private validateCooperativeType(dto: CreateCooperativeDto) {
    const { cooperativeType, membersNumber } = dto;
    
    if (cooperativeType === CooperativeType.ITSINDA) {
      if (membersNumber > 15) {
        throw new BadRequestException(
          'Itsinda cooperative must have 15 or fewer members.'
        );
      }
    } else if (cooperativeType === CooperativeType.COOPERATIVE) {
      if (membersNumber < 15) {
        throw new BadRequestException(
          'Cooperative must have 15 or more members.'
        );
      }
    }
  }

  // Helper method to check authorization based on cooperative type
  private async checkCooperativeAuthorization(
    cooperativeId: string, 
    userId: string, 
    userRole: string
  ) {
    const cooperative = await this.databaseService.cooperative.findUnique({
      where: { id: cooperativeId },
      include: { cooperativeManager: { include: { role: true } } },
    });
    
    if (!cooperative) {
      throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
    }

    if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
      return cooperative;
    }

    if (cooperative.cooperativeManagerId !== userId) {
      throw new ForbiddenException('You can only manage cooperatives assigned to you');
    }

    const managerRoleName = cooperative.cooperativeManager.role.name;
    
    if (cooperative.collectiveType === 'COLLECTIVE') {
      if (managerRoleName !== Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
        throw new ForbiddenException('This cooperative requires a collective cooperative manager');
      }
    } else {
      if (managerRoleName !== Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        throw new ForbiddenException('This cooperative requires a non-collective cooperative manager');
      }
    }
    
    return cooperative;
  }

  // ---------------- FETCH ----------------
  async findAll(userId?: string, userRole?: string) {
    try {
      if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
        return await this.databaseService.cooperative.findMany({
          include: {
            cooperativeCropRegistrations: { 
              include: { 
                cropType: { 
                  include: { 
                    crop: true 
                  } 
                } 
              } 
            },
            Location: true,
            cooperativeManager: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                email: true, 
                telephone: true,
                role: {
                  select: {
                    name: true
                  }
                }
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
      
      // Cooperative Managers can only see their cooperative
      if ((userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
           userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) && userId) {
        return await this.databaseService.cooperative.findMany({
          where: {
            cooperativeManagerId: userId,
          },
          include: {
            cooperativeCropRegistrations: { 
              include: { 
                cropType: { 
                  include: { 
                    crop: true 
                  } 
                } 
              } 
            },
            Location: true,
            cooperativeManager: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                email: true, 
                telephone: true 
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
      
      throw new ForbiddenException('Not authorized to view cooperatives');
      
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching cooperatives');
    }
  }

  async findAllCooperativesByLocation(locationId: number, userId?: string, userRole?: string) {
    try {
      // UmufashaMyumvire can see all cooperatives
      if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
        const childLocations = await this.locationService.getAllChildrenLocations(locationId);
        
        return await this.databaseService.cooperative.findMany({
          where: {
            locationId: { in: childLocations },
          },
          include: {
            cooperativeManager: { 
              select: { 
                firstName: true, 
                lastName: true, 
                telephone: true 
              } 
            },
          },
          orderBy: { name: 'asc' },
        });
      }
      
      // Cooperative Managers can only see their cooperative in the location
      if ((userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
           userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) && userId) {
        
        const childLocations = await this.locationService.getAllChildrenLocations(locationId);
        
        return await this.databaseService.cooperative.findMany({
          where: {
            cooperativeManagerId: userId,
            locationId: { in: childLocations },
          },
          include: {
            cooperativeManager: { 
              select: { 
                firstName: true, 
                lastName: true, 
                telephone: true 
              } 
            },
          },
          orderBy: { name: 'asc' },
        });
      }
      
      throw new ForbiddenException('Not authorized to view cooperatives by location');
      
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching cooperatives by location');
    }
  }

  async findAllBySType(cooperativeType: CooperativeType, userId?: string, userRole?: string) {
    try {
      // UmufashaMyumvire can see all cooperatives by type
      if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
        return await this.databaseService.cooperative.findMany({
          where: { type: cooperativeType },
          include: { 
            cooperativeManager: { 
              select: { 
                firstName: true, 
                lastName: true 
              } 
            } 
          },
          orderBy: { membersNumber: 'desc' },
        });
      }
      
      // Cooperative Managers can only see their cooperative by type
      if ((userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
           userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) && userId) {
        return await this.databaseService.cooperative.findMany({
          where: { 
            type: cooperativeType,
            cooperativeManagerId: userId 
          },
          include: { 
            cooperativeManager: { 
              select: { 
                firstName: true, 
                lastName: true 
              } 
            } 
          },
          orderBy: { membersNumber: 'desc' },
        });
      }
      
      throw new ForbiddenException('Not authorized to view cooperatives by type');
      
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching cooperatives by type');
    }
  }

  async findAllCooperativesByLocationAndType(
    locationId: number, 
    type: CooperativeType, 
    userId?: string, 
    userRole?: string
  ) {
    try {
      // UmufashaMyumvire can see all cooperatives
      if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
        const childLocations = await this.locationService.getAllChildrenLocations(locationId);
        
        return await this.databaseService.cooperative.findMany({
          where: {
            locationId: { in: childLocations },
            type,
          },
          include: {
            cooperativeManager: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
      }
      
      // Cooperative Managers can only see their cooperative
      if ((userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
           userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) && userId) {
        
        const childLocations = await this.locationService.getAllChildrenLocations(locationId);
        
        return await this.databaseService.cooperative.findMany({
          where: {
            locationId: { in: childLocations },
            type,
            cooperativeManagerId: userId,
          },
          include: {
            cooperativeManager: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
      }
      
      throw new ForbiddenException('Not authorized to view cooperatives by location and type');
      
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching cooperatives by location and type');
    }
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    try {
      // Check authorization
      await this.checkCooperativeAuthorization(id, userId, userRole);
      
      const cooperative = await this.databaseService.cooperative.findUnique({
        where: { id },
        include: {
          cooperativeCropRegistrations: { 
            include: { 
              cropType: { 
                include: { 
                  crop: true 
                } 
              } 
            } 
          },
          farmers: {
            take: 10,
            include: { 
              user: { 
                select: { 
                  firstName: true, 
                  lastName: true, 
                  telephone: true 
                } 
              } 
            },
          },
          Location: true,
          cooperativeManager: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              email: true, 
              telephone: true,
              role: {
                select: {
                  name: true
                }
              }
            } 
          },
        },
      });

      if (!cooperative) {
        throw new NotFoundException(`Cooperative with ID ${id} not found`);
      }
      
      return cooperative;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching cooperative');
    }
  }

  // ---------------- UPDATE ----------------
async update(
  id: string, 
  updateCooperativeDto: UpdateCooperativeDto,
  userId?: string, 
  userRole?: string
) {
  try {
    const cooperative = await this.checkCooperativeAuthorization(id, userId, userRole);
    
    // Additional validation for cooperative managers
    if (userRole !== Role_Enum.UMUFASHAMYUMVIRE) {
      // Cooperative managers cannot change certain fields
      const restrictedFields = ['cooperativeType', 'collectiveType', 'registrationNumber'];
      for (const field of restrictedFields) {
        if (updateCooperativeDto[field] !== undefined) {
          throw new ForbiddenException(`You cannot change the ${field} field`);
        }
      }
    }

    // Validate member number if being updated
    if (updateCooperativeDto.membersNumber !== undefined || 
        updateCooperativeDto.cooperativeType !== undefined) {
      
      const validationDto = {
        ...cooperative,
        ...updateCooperativeDto,
        collectiveType: cooperative.collectiveType as CollectiveType,
      } as CreateCooperativeDto;
      
      this.validateCooperativeType(validationDto);
    }

    // Validate crops if being updated
    if (updateCooperativeDto.crops?.length && 
        cooperative.collectiveType === 'NON_COLLECTIVE') {
      throw new BadRequestException(
        'NON_COLLECTIVE cooperatives cannot have cooperative-level crops.'
      );
    }

    // Transform the data for Prisma
    const { locationId, crops, ...restData } = updateCooperativeDto;
    
    const prismaData: any = { ...restData };
    
    // Handle location connection if provided
    if (locationId !== undefined) {
      prismaData.location = {
        connect: { id: locationId }
      };
    }
    
    // Handle crops connection if provided
    if (crops !== undefined) {
      if (crops.length === 0) {
        // If crops array is empty, disconnect all crops
        prismaData.crops = {
          set: []
        };
      } else {
        // Connect specific crops
        prismaData.crops = {
          connect: crops.map(cropId => ({ id: cropId }))
        };
      }
    }

    return await this.databaseService.cooperative.update({
      where: { id },
      data: prismaData, // Use transformed data
    });
  } catch (error) {
    if (error instanceof BadRequestException || 
        error instanceof NotFoundException ||
        error instanceof ForbiddenException) {
      throw error;
    }
    throw new InternalServerErrorException('Error updating cooperative');
  }
}

  // ---------------- ASSIGN FARMERS ----------------
  async assignFarmersToCooperative(
    assignDto: AssignFarmersTOCooperative,
    userId?: string, 
    userRole?: string
  ) {
    const { cooperativeId, farmers } = assignDto;
    
    try {
      const cooperative = await this.checkCooperativeAuthorization(cooperativeId, userId, userRole);
      
      return await this.databaseService.$transaction(async (prisma) => {
        const cooperativeWithCrops = await prisma.cooperative.findUnique({
          where: { id: cooperativeId },
          include: { cooperativeCropRegistrations: true },
        });
        
        // Connect farmers to cooperative
        await prisma.cooperative.update({
          where: { id: cooperativeId },
          data: { farmers: { connect: farmers.map(id => ({ id })) } },
        });

        const results = [];
        
        // For collective cooperatives, inherit crops to farmers
        if (cooperativeWithCrops.collectiveType === 'COLLECTIVE') {
          for (const farmerId of farmers) {
            const inherited = [];
            
            for (const coopCrop of cooperativeWithCrops.cooperativeCropRegistrations) {
              const exists = await prisma.cropFarmerRegistration.findFirst({
                where: { farmerId, cropTypeId: coopCrop.cropTypeId },
              });
              
              if (!exists) {
                await prisma.cropFarmerRegistration.create({ 
                  data: { 
                    farmerId, 
                    cropTypeId: coopCrop.cropTypeId 
                  } 
                });
                
                const cropType = await prisma.cropType.findUnique({ 
                  where: { id: coopCrop.cropTypeId }, 
                  include: { crop: true } 
                });
                
                if (cropType) {
                  inherited.push({ 
                    cropTypeId: cropType.id, 
                    cropTypeName: cropType.name, 
                    cropName: cropType.crop.name 
                  });
                }
              }
            }
            results.push({ farmerId, inheritedCrops: inherited });
          }
        } else {
          results.push({ 
            message: 'NON_COLLECTIVE cooperative: Farmers manage their individual crops', 
            farmersAssigned: farmers.length 
          });
        }

        return { 
          cooperative: { 
            id: cooperativeWithCrops.id, 
            name: cooperativeWithCrops.name, 
            type: cooperativeWithCrops.type, 
            collectiveType: cooperativeWithCrops.collectiveType 
          }, 
          farmersInheritedCrops: results 
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error assigning farmers: ' + (error?.message ?? String(error)));
    }
  }

  async assignCreateFarmerToCooperative(
    assignDto: CreateCooperativeFarmerDto,
    userId?: string, 
    userRole?: string
  ) {
    try {
      const cooperative = await this.checkCooperativeAuthorization(assignDto.cooperativeId, userId, userRole);
      
      return await this.databaseService.$transaction(async (prisma) => {
        const cooperativeWithCrops = await prisma.cooperative.findUnique({
          where: { id: assignDto.cooperativeId },
          include: { 
            cooperativeCropRegistrations: { 
              include: { 
                cropType: { 
                  include: { 
                    crop: true 
                  } 
                } 
              } 
            } 
          },
        });
        
        if (!cooperativeWithCrops) {
          throw new NotFoundException(`Cooperative with ID ${assignDto.cooperativeId} not found`);
        }

        const results = [];
        for (const farmerDto of assignDto.farmers) {
          const createdFarmer = await this.farmerService.registerFarmer(farmerDto);
          
          await prisma.farmer.update({ 
            where: { id: createdFarmer.id }, 
            data: { 
              cooperative: { 
                connect: { 
                  id: assignDto.cooperativeId 
                } 
              } 
            } 
          });

          const inherited = [];
          
          // Inherit crops for collective cooperatives
          if (cooperativeWithCrops.collectiveType === 'COLLECTIVE') {
            for (const coopCrop of cooperativeWithCrops.cooperativeCropRegistrations) {
              await prisma.cropFarmerRegistration.create({ 
                data: { 
                  farmerId: createdFarmer.id, 
                  cropTypeId: coopCrop.cropTypeId 
                } 
              });
              
              inherited.push({ 
                cropTypeId: coopCrop.cropTypeId, 
                cropTypeName: coopCrop.cropType.name, 
                cropName: coopCrop.cropType.crop.name 
              });
            }
          }

          results.push({ 
            farmer: createdFarmer, 
            inheritedCrops: inherited, 
            cooperativeType: cooperativeWithCrops.collectiveType 
          });
        }

        return results;
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error creating and assigning farmers');
    }
  }

  // ---------------- CROPS ----------------
  async addCropToCooperative(
    cooperativeId: string, 
    cropTypeId: string,
    userId?: string, 
    userRole?: string
  ) {
    try {
      const cooperative = await this.checkCooperativeAuthorization(cooperativeId, userId, userRole);
      
      // Additional check for non-collective cooperatives
      if (cooperative.collectiveType === 'NON_COLLECTIVE') {
        throw new BadRequestException('Cannot add crops for NON_COLLECTIVE cooperatives');
      }
      
      // Check if user is collective cooperative manager or UmufashaMyumvire
      if (cooperative.collectiveType === 'COLLECTIVE') {
        const managerRole = cooperative.cooperativeManager.role.name;
        if (managerRole !== Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER && 
            userRole !== Role_Enum.UMUFASHAMYUMVIRE) {
          throw new ForbiddenException('Only collective cooperative managers can add crops');
        }
      }

      return await this.databaseService.$transaction(async (prisma) => {
        const cooperativeCheck = await prisma.cooperative.findUnique({ 
          where: { id: cooperativeId } 
        });
        
        if (cooperativeCheck.collectiveType === 'NON_COLLECTIVE') {
          throw new BadRequestException('Cannot add crops for NON_COLLECTIVE cooperatives');
        }

        // Check if crop type exists
        const cropType = await prisma.cropType.findUnique({
          where: { id: cropTypeId },
        });
        
        if (!cropType) {
          throw new NotFoundException(`Crop type ${cropTypeId} not found`);
        }

        // Check if already registered
        const existing = await prisma.cooperativeCropRegistration.findFirst({ 
          where: { cooperativeId, cropTypeId } 
        });
        
        if (existing) {
          return { 
            registration: existing, 
            newlyRegistered: false, 
            farmersUpdated: 0, 
            collectiveType: cooperativeCheck.collectiveType 
          };
        }

        // Register crop
        const registration = await prisma.cooperativeCropRegistration.create({
          data: { cooperativeId, cropTypeId },
          include: { 
            cropType: { 
              include: { 
                crop: true 
              } 
            } 
          },
        });

        // Inherit to farmers
        const farmers = await prisma.farmer.findMany({ 
          where: { cooperativeId } 
        });
        
        let farmersUpdated = 0;
        for (const farmer of farmers) {
          const exists = await prisma.cropFarmerRegistration.findFirst({ 
            where: { farmerId: farmer.id, cropTypeId } 
          });
          
          if (!exists) {
            await prisma.cropFarmerRegistration.create({ 
              data: { 
                farmerId: farmer.id, 
                cropTypeId 
              } 
            });
            farmersUpdated++;
          }
        }

        return { 
          registration, 
          newlyRegistered: true, 
          farmersUpdated, 
          collectiveType: cooperativeCheck.collectiveType 
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException ||
          error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error adding crop');
    }
  }

  async removeCropFromCooperative(
    cooperativeId: string, 
    cropTypeId: string, 
    cascadeToFarmers: boolean = false,
    userId?: string, 
    userRole?: string
  ) {
    try {
      const cooperative = await this.checkCooperativeAuthorization(cooperativeId, userId, userRole);
      
      if (cooperative.collectiveType === 'NON_COLLECTIVE') {
        throw new BadRequestException(
          'NON_COLLECTIVE cooperatives do not have cooperative-level crops to remove'
        );
      }
      
      // Check if user is collective cooperative manager or UmufashaMyumvire
      if (cooperative.collectiveType === 'COLLECTIVE') {
        const managerRole = cooperative.cooperativeManager.role.name;
        if (managerRole !== Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER && 
            userRole !== Role_Enum.UMUFASHAMYUMVIRE) {
          throw new ForbiddenException('Only collective cooperative managers can remove crops');
        }
      }

      return await this.databaseService.$transaction(async (prisma) => {
        const cooperativeCheck = await prisma.cooperative.findUnique({ 
          where: { id: cooperativeId } 
        });
        
        if (cooperativeCheck.collectiveType === 'NON_COLLECTIVE') {
          throw new BadRequestException(
            'NON_COLLECTIVE cooperatives do not have cooperative-level crops to remove'
          );
        }

        const existing = await prisma.cooperativeCropRegistration.findFirst({ 
          where: { cooperativeId, cropTypeId } 
        });
        
        if (!existing) {
          throw new NotFoundException(
            `Crop type ${cropTypeId} not registered with cooperative ${cooperativeId}`
          );
        }

        await prisma.cooperativeCropRegistration.delete({ 
          where: { id: existing.id } 
        });

        let farmersAffected = 0;
        if (cooperativeCheck.collectiveType === 'COLLECTIVE' || cascadeToFarmers) {
          const result = await prisma.cropFarmerRegistration.deleteMany({ 
            where: { 
              cropTypeId, 
              farmer: { cooperativeId } 
            } 
          });
          farmersAffected = result.count;
        }

        return { 
          removed: true, 
          farmersAffected, 
          collectiveType: cooperativeCheck.collectiveType 
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException ||
          error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error removing crop');
    }
  }

  // ---------------- COOPERATIVE CROPS & ANIMALS ----------------
  async findAllCooperativeCrops(cooperativeId: string, userId?: string, userRole?: string) {
    try {
      // Check authorization first
      await this.checkCooperativeAuthorization(cooperativeId, userId, userRole);
      
      const cooperative = await this.databaseService.cooperative.findUnique({ 
        where: { id: cooperativeId } 
      });
      
      if (!cooperative) {
        throw new NotFoundException(`Cooperative ${cooperativeId} not found`);
      }

      if (cooperative.collectiveType === 'COLLECTIVE') {
        const direct = await this.databaseService.cooperativeCropRegistration.findMany({
          where: { cooperativeId },
          include: { 
            cropType: { 
              include: { 
                crop: true 
              } 
            } 
          },
        });
        
        if (direct.length) {
          return await this.databaseService.crop.findMany({
            where: { 
              cropType: { 
                some: { 
                  id: { 
                    in: direct.map(r => r.cropTypeId) 
                  } 
                } 
              } 
            },
            include: { 
              cropType: { 
                where: { 
                  id: { 
                    in: direct.map(r => r.cropTypeId) 
                  } 
                } 
              } 
            },
          });
        }
      }

      return await this.databaseService.crop.findMany({
        where: { 
          cropType: { 
            some: { 
              cropFarmerRegistrations: { 
                some: { 
                  farmer: { cooperativeId } 
                } 
              } 
            } 
          } 
        },
        include: { cropType: true },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error fetching cooperative crops');
    }
  }

  async findAllCooperativeAnimals(cooperativeId: string, userId?: string, userRole?: string) {
    try {
      // Check authorization first
      await this.checkCooperativeAuthorization(cooperativeId, userId, userRole);
      
      const cooperative = await this.databaseService.cooperative.findUnique({ 
        where: { id: cooperativeId } 
      });
      
      if (!cooperative) {
        throw new NotFoundException(`Cooperative ${cooperativeId} not found`);
      }

      return await this.databaseService.animal.findMany({
        where: { 
          animalFarmerRegistrations: { 
            some: { 
              farmer: { cooperativeId } 
            } 
          } 
        },
        include: { breeds: true },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error fetching cooperative animals');
    }
  }

  // ---------------- PRODUCE & AREA ----------------
  async findAllCooperativeCropsProduceAndArea(cooperativeId: string, userId?: string, userRole?: string) {
    try {
      // Check authorization first
      await this.checkCooperativeAuthorization(cooperativeId, userId, userRole);
      
      const croptypesData = await this.databaseService.cropType.findMany({
        where: { 
          seasons: { 
            some: { 
              OR: [
                { farmer: { cooperativeId } }, 
                { cooperativeId }]
            } 
          } 
        },
        select: {
          crop: { select: { name: true } },
          name: true,
          seasons: {
            where: { 
              OR: [
                { farmer: { cooperativeId } }, 
                { cooperativeId }
              ] 
            },
            select: {
              produceHarvested: true,
              plantationArea: true,
              farmerId: true,
              cooperativeId: true,
              seeds: true,
              cropFertilizerFarmerRegistrations: { 
                select: { 
                  amount: true, 
                  measurement: true, 
                  feterlizer: { 
                    select: { 
                      id: true, 
                      name: true 
                    } 
                  } 
                } 
              },
            },
          },
          cropFarmerRegistrations: { 
            where: { farmer: { cooperativeId } }, 
            select: { farmerId: true } 
          },
        },
      });

      return croptypesData.map((croptype) => {
        const produce = croptype.seasons.reduce(
          (sum, s) => sum + (Number(s.produceHarvested) || 0), 
          0
        );
        
        const area = croptype.seasons.reduce(
          (sum, s) => sum + (Number(s.plantationArea) || 0), 
          0
        );
        
        const seeds = croptype.seasons.reduce(
          (sum, s) => sum + (Number(s.seeds) || 0), 
          0
        );

        const uniqueFarmers = new Set(
          croptype.seasons.map((s) => s.farmerId).filter(Boolean)
        );

        const fertilizerUsage = new Map();
        const fertilizerFarmers = new Map();

        croptype.seasons.forEach((registration) => {
          registration.cropFertilizerFarmerRegistrations.forEach((fertReg) => {
            const fertilizerId = fertReg.feterlizer.id;
            if (!fertilizerUsage.has(fertilizerId)) {
              fertilizerUsage.set(fertilizerId, { 
                name: fertReg.feterlizer.name, 
                totalAmount: 0, 
                measurement: fertReg.measurement 
              });
            }
            fertilizerUsage.get(fertilizerId).totalAmount += Number(fertReg.amount) || 0;
            
            if (!fertilizerFarmers.has(fertilizerId)) {
              fertilizerFarmers.set(fertilizerId, new Set());
            }
            if (registration.farmerId) {
              fertilizerFarmers.get(fertilizerId).add(registration.farmerId);
            }
          });
        });

        const fertilizers = Array.from(fertilizerUsage.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          totalAmount: data.totalAmount,
          measurement: data.measurement,
          farmersCount: fertilizerFarmers.get(id).size,
        }));

        return {
          cropName: croptype.crop.name,
          cropTypeName: croptype.name,
          totalProduce: produce,
          plantationArea: area,
          totalFarmers: uniqueFarmers.size,
          totalInputSeeds: seeds,
          fertilizers,
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error fetching cooperative crops produce and area');
    }
  }

  // ---------------- DELETE ----------------
  async remove(id: string, userId?: string, userRole?: string) {
    try {
      if (userRole !== Role_Enum.UMUFASHAMYUMVIRE) {
        throw new ForbiddenException('Only UmufashaMyumvire can delete cooperatives');
      }
      
      const cooperative = await this.databaseService.cooperative.findUnique({
        where: { id },
      });
      
      if (!cooperative) {
        throw new NotFoundException(`Cooperative with ID ${id} not found`);
      }

      return await this.databaseService.cooperative.delete({ where: { id } });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error deleting cooperative');
    }
  }
}