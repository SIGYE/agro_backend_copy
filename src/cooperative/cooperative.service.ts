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

      // BOTH collective and non-collective cooperatives MUST specify crops at registration
      if (!createCooperativeDto.crops?.length) {
        throw new BadRequestException(
          'Cooperatives must specify at least one crop during registration.'
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

        // Register crops to the cooperative (for BOTH collective and non-collective)
        for (const crop of createCooperativeDto.crops) {
          await prisma.cooperativeCropRegistration.create({
            data: { 
              cooperativeId: cooperative.id, 
              cropTypeId: crop.cropTypesId 
            },
          });
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
          },
          message: createCooperativeDto.collectiveType === CollectiveType.COLLECTIVE
            ? 'Collective cooperative created. Farmers joining this cooperative must plant these crops.'
            : 'Non-collective cooperative created. Farmers will contribute their individual crop quantities to the cooperative total.'
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
        data: prismaData,
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
        
        // For COLLECTIVE cooperatives, farmers MUST plant the cooperative's crops
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
            results.push({ 
              farmerId, 
              mandatoryCrops: inherited,
              note: 'Farmer must plant these cooperative crops'
            });
          }
        } else {
          // For NON_COLLECTIVE, farmers add their own crops which contribute to cooperative total
          results.push({ 
            message: 'NON_COLLECTIVE cooperative: Farmers can add their own crops. Their contributions will be totaled at the cooperative level.', 
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
          results 
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

          const mandatoryCrops = [];
          
          // For COLLECTIVE: inherit mandatory crops
          if (cooperativeWithCrops.collectiveType === 'COLLECTIVE') {
            for (const coopCrop of cooperativeWithCrops.cooperativeCropRegistrations) {
              await prisma.cropFarmerRegistration.create({ 
                data: { 
                  farmerId: createdFarmer.id, 
                  cropTypeId: coopCrop.cropTypeId 
                } 
              });
              
              mandatoryCrops.push({ 
                cropTypeId: coopCrop.cropTypeId, 
                cropTypeName: coopCrop.cropType.name, 
                cropName: coopCrop.cropType.crop.name 
              });
            }
          }

          results.push({ 
            farmer: createdFarmer, 
            mandatoryCrops, 
            cooperativeType: cooperativeWithCrops.collectiveType,
            note: cooperativeWithCrops.collectiveType === 'COLLECTIVE' 
              ? 'Farmer must plant these cooperative crops'
              : 'Farmer can add their own crops which will contribute to cooperative total'
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

      return await this.databaseService.$transaction(async (prisma) => {
        // Check if crop type exists
        const cropType = await prisma.cropType.findUnique({
          where: { id: cropTypeId },
          include: { crop: true }
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
            collectiveType: cooperative.collectiveType,
            message: 'Crop already registered to this cooperative'
          };
        }

        // Register crop to cooperative
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

        let farmersUpdated = 0;
        let message = '';

        // For COLLECTIVE: Add mandatory crop to all existing farmers
        if (cooperative.collectiveType === 'COLLECTIVE') {
          const farmers = await prisma.farmer.findMany({ 
            where: { cooperativeId } 
          });
          
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
          message = `Crop added as mandatory for all ${farmersUpdated} farmers in this collective cooperative`;
        } else {
          // For NON_COLLECTIVE: Crop is added to cooperative registry, farmers can choose to plant it
          message = 'Crop added to cooperative registry. Farmers can plant this crop and contribute to cooperative total.';
        }

        return { 
          registration, 
          newlyRegistered: true, 
          farmersUpdated, 
          collectiveType: cooperative.collectiveType,
          cropName: cropType.crop.name,
          cropTypeName: cropType.name,
          message 
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

      return await this.databaseService.$transaction(async (prisma) => {
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
        let message = '';

        // For COLLECTIVE: Always remove from farmers (mandatory crops)
        if (cooperative.collectiveType === 'COLLECTIVE') {
          const result = await prisma.cropFarmerRegistration.deleteMany({ 
            where: { 
              cropTypeId, 
              farmer: { cooperativeId } 
            } 
          });
          farmersAffected = result.count;
          message = `Mandatory crop removed from cooperative and ${farmersAffected} farmers`;
        } else if (cascadeToFarmers) {
          // For NON_COLLECTIVE: Only remove from farmers if cascade is explicitly requested
          const result = await prisma.cropFarmerRegistration.deleteMany({ 
            where: { 
              cropTypeId, 
              farmer: { cooperativeId } 
            } 
          });
          farmersAffected = result.count;
          message = `Crop removed from cooperative registry and ${farmersAffected} farmers (cascade applied)`;
        } else {
          message = 'Crop removed from cooperative registry. Farmers who planted this crop still retain it.';
        }

        return { 
          removed: true, 
          farmersAffected, 
          collectiveType: cooperative.collectiveType,
          message 
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

  // ---------------- COOPERATIVE CROPS & SUMMARY ----------------
  async findAllCooperativeCrops(cooperativeId: string, userId?: string, userRole?: string) {
    try {
      await this.checkCooperativeAuthorization(cooperativeId, userId, userRole);
      
      const cooperative = await this.databaseService.cooperative.findUnique({ 
        where: { id: cooperativeId } 
      });
      
      if (!cooperative) {
        throw new NotFoundException(`Cooperative ${cooperativeId} not found`);
      }

      // Get cooperative registered crops
      const cooperativeCrops = await this.databaseService.cooperativeCropRegistration.findMany({
        where: { cooperativeId },
        include: { 
          cropType: { 
            include: { 
              crop: true 
            } 
          } 
        },
      });

      if (cooperative.collectiveType === 'COLLECTIVE') {
        return {
          collectiveType: 'COLLECTIVE',
          message: 'These are the mandatory crops that all farmers must plant',
          crops: cooperativeCrops.map(reg => ({
            cropId: reg.cropType.crop.id,
            cropName: reg.cropType.crop.name,
            cropTypeId: reg.cropType.id,
            cropTypeName: reg.cropType.name,
            mandatory: true
          }))
        };
      } else {
        // For NON_COLLECTIVE: Show cooperative crops and individual farmer contributions
        const farmerCrops = await this.databaseService.cropFarmerRegistration.findMany({
          where: {
            farmer: { cooperativeId },
            cropTypeId: { in: cooperativeCrops.map(c => c.cropTypeId) }
          },
          include: {
            farmer: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            cropType: {
              include: {
                crop: true
              }
            }
          }
        });

        // Group by crop type
        const cropMap = new Map();
        farmerCrops.forEach(fc => {
          const key = fc.cropTypeId;
          if (!cropMap.has(key)) {
            cropMap.set(key, {
              cropId: fc.cropType.crop.id,
              cropName: fc.cropType.crop.name,
              cropTypeId: fc.cropType.id,
              cropTypeName: fc.cropType.name,
              farmers: []
            });
          }
          cropMap.get(key).farmers.push({
            farmerId: fc.farmer.id,
            farmerName: `${fc.farmer.user.firstName} ${fc.farmer.user.lastName}`
          });
        });

        return {
          collectiveType: 'NON_COLLECTIVE',
          message: 'These are the cooperative crops. Farmers plant individually and contribute to the total.',
          crops: Array.from(cropMap.values())
        };
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error fetching cooperative crops');
    }
  }

  async findAllCooperativeAnimals(cooperativeId: string, userId?: string, userRole?: string) {
    try {
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

  // ---------------- PRODUCE & AREA SUMMARY ----------------
  async findAllCooperativeCropsProduceAndArea(cooperativeId: string, userId?: string, userRole?: string) {
    try {
      await this.checkCooperativeAuthorization(cooperativeId, userId, userRole);
      
      const cooperative = await this.databaseService.cooperative.findUnique({ 
        where: { id: cooperativeId } 
      });

      if (!cooperative) {
        throw new NotFoundException(`Cooperative ${cooperativeId} not found`);
      }

      // Get only the cooperative's registered crops
      const cooperativeCrops = await this.databaseService.cooperativeCropRegistration.findMany({
        where: { cooperativeId },
        select: { cropTypeId: true }
      });

      const cropTypeIds = cooperativeCrops.map(cc => cc.cropTypeId);

      if (cropTypeIds.length === 0) {
        return {
          cooperativeName: cooperative.name,
          collectiveType: cooperative.collectiveType,
          crops: [],
          message: 'No crops registered to this cooperative'
        };
      }

      const croptypesData = await this.databaseService.cropType.findMany({
        where: { 
          id: { in: cropTypeIds },
          seasons: { 
            some: { 
              farmer: { cooperativeId }
            } 
          } 
        },
        select: {
          id: true,
          crop: { select: { name: true } },
          name: true,
          seasons: {
            where: { 
              farmer: { cooperativeId }
            },
            select: {
              produceHarvested: true,
              plantationArea: true,
              farmerId: true,
              seeds: true,
              farmer: {
                select: {
                  id: true,
                  user: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              },
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
        },
      });

      const summary = croptypesData.map((croptype) => {
        const totalProduce = croptype.seasons.reduce(
          (sum, s) => sum + (Number(s.produceHarvested) || 0), 
          0
        );
        
        const totalArea = croptype.seasons.reduce(
          (sum, s) => sum + (Number(s.plantationArea) || 0), 
          0
        );
        
        const totalSeeds = croptype.seasons.reduce(
          (sum, s) => sum + (Number(s.seeds) || 0), 
          0
        );

        // Get unique farmers for this crop type
        const farmerMap = new Map();
        croptype.seasons.forEach((season) => {
          if (season.farmer && !farmerMap.has(season.farmerId)) {
            farmerMap.set(season.farmerId, {
              farmerId: season.farmer.id,
              farmerName: `${season.farmer.user.firstName} ${season.farmer.user.lastName}`,
              produce: 0,
              area: 0,
              seeds: 0
            });
          }
          if (season.farmer) {
            const farmer = farmerMap.get(season.farmerId);
            farmer.produce += Number(season.produceHarvested) || 0;
            farmer.area += Number(season.plantationArea) || 0;
            farmer.seeds += Number(season.seeds) || 0;
          }
        });

        // Fertilizer aggregation
        const fertilizerUsage = new Map();
        const fertilizerFarmers = new Map();

        croptype.seasons.forEach((season) => {
          season.cropFertilizerFarmerRegistrations.forEach((fertReg) => {
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
            if (season.farmerId) {
              fertilizerFarmers.get(fertilizerId).add(season.farmerId);
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

        const result: any = {
          cropName: croptype.crop.name,
          cropTypeName: croptype.name,
          totalProduce,
          plantationArea: totalArea,
          totalInputSeeds: totalSeeds,
          totalFarmers: farmerMap.size,
          fertilizers,
        };

        // For NON_COLLECTIVE: Include breakdown by farmer
        if (cooperative.collectiveType === 'NON_COLLECTIVE') {
          result.farmerContributions = Array.from(farmerMap.values());
          result.note = 'Individual farmer contributions aggregated to cooperative total';
        }

        return result;
      });

      return {
        cooperativeName: cooperative.name,
        collectiveType: cooperative.collectiveType,
        message: cooperative.collectiveType === 'COLLECTIVE' 
          ? 'All farmers plant these mandatory crops collectively'
          : 'Individual farmer contributions totaled at cooperative level',
        crops: summary
      };
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