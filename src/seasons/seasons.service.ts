import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { DatabaseService } from 'src/database/database.service';
import { Role_Enum } from 'src/enums/role.enum';

@Injectable()
export class SeasonsService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Helper method to check authorization
  private async checkSeasonAuthorization(
    seasonId: string,
    userId: string,
    userRole: string
  ) {
    const season = await this.databaseService.season.findUnique({
      where: { id: seasonId },
      include: {
        farmer: {
          include: {
            user: true,
            cooperative: {
              select: { id: true, cooperativeManagerId: true, collectiveType: true },
            },
          },
        },
        cooperative: {
          include: { cooperativeManager: { include: { role: true } } }
        }
      }
    });
    
    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }
    
    // UmufashaMyumvire has full access
    if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
      return season;
    }

    // Non-collective cooperative managers can manage member farmer seasons
    if (userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER && season.farmerId) {
      const coop = season.farmer?.cooperative;
      if (coop && coop.cooperativeManagerId === userId && coop.collectiveType === 'NON_COLLECTIVE') {
        return season;
      }
    }
    
    // Check if user is the farmer who owns the season
    if (season.farmerId) {
      if (season.farmer.user.id === userId) {
        return season;
      }
    }
    
    // Check if user is the cooperative manager of the cooperative that owns the season
    if (season.cooperativeId) {
      if (season.cooperative.cooperativeManagerId === userId) {
        // Check if user is a collective cooperative manager
        const managerRole = season.cooperative.cooperativeManager.role.name;
        if (managerRole !== Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
          throw new ForbiddenException('Only collective cooperative managers can manage seasons');
        }
        return season;
      }
    }
    
    throw new ForbiddenException('You are not authorized to access this season');
  }

  // Helper to check if cooperative is collective
  private async isCollectiveCooperative(cooperativeId: string): Promise<boolean> {
    const cooperative = await this.databaseService.cooperative.findUnique({
      where: { id: cooperativeId },
      select: { collectiveType: true }
    });
    
    return cooperative?.collectiveType === 'COLLECTIVE';
  }

  async create(createSeasonDto: CreateSeasonDto, userId?: string, userRole?: string) {
    try {
      // Validation: Either farmerId or cooperativeId must be provided, but not both
      if (!createSeasonDto.farmerId && !createSeasonDto.cooperativeId) {
        throw new BadRequestException(
          'Either farmerId or cooperativeId must be provided',
        );
      }

      if (createSeasonDto.farmerId && createSeasonDto.cooperativeId) {
        throw new BadRequestException(
          'Cannot specify both farmerId and cooperativeId',
        );
      }

      // Authorization checks
      if (createSeasonDto.farmerId) {
        // Farmers can create for themselves. Non-collective leaders can create for member farmers.
        if (
          userRole !== Role_Enum.FARMER &&
          userRole !== Role_Enum.UMUFASHAMYUMVIRE &&
          userRole !== Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
        ) {
          throw new ForbiddenException('Not allowed to create seasons for a farmer');
        }

        if (userRole === Role_Enum.FARMER) {
          const farmer = await this.databaseService.farmer.findFirst({
            where: { userId },
            select: { id: true },
          });

          if (!farmer || farmer.id !== createSeasonDto.farmerId) {
            throw new ForbiddenException('You can only create seasons for yourself');
          }
        } else if (userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
          const member = await this.databaseService.farmer.findUnique({
            where: { id: createSeasonDto.farmerId },
            select: {
              cooperative: { select: { cooperativeManagerId: true, collectiveType: true } },
            },
          });

          const coop = member?.cooperative;
          if (!coop || coop.cooperativeManagerId !== userId || coop.collectiveType !== 'NON_COLLECTIVE') {
            throw new ForbiddenException('You can only create seasons for farmers in your non-collective');
          }
        }
      }
      
      if (createSeasonDto.cooperativeId) {
        // Check if user is a collective cooperative manager or UmufashaMyumvire
        if (userRole !== Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER && 
            userRole !== Role_Enum.UMUFASHAMYUMVIRE) {
          throw new ForbiddenException('Only collective cooperative managers can create cooperative seasons');
        }
        
        // Check if cooperative is collective
        const isCollective = await this.isCollectiveCooperative(createSeasonDto.cooperativeId);
        if (!isCollective) {
          throw new BadRequestException('Only collective cooperatives can create seasons');
        }
        
        if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
          // Check if user is the manager of this cooperative
          const cooperative = await this.databaseService.cooperative.findUnique({
            where: { id: createSeasonDto.cooperativeId },
            select: { cooperativeManagerId: true }
          });
          
          if (!cooperative || cooperative.cooperativeManagerId !== userId) {
            throw new ForbiddenException('You can only create seasons for cooperatives you manage');
          }
        }
        
        // Validate they have registered this crop type
        const cooperativeCropReg = await this.databaseService.cooperativeCropRegistration.findFirst({
          where: {
            cooperativeId: createSeasonDto.cooperativeId,
            cropTypeId: createSeasonDto.cropTypeId,
          },
        });

        if (!cooperativeCropReg) {
          throw new BadRequestException(
            'This crop type is not registered with the cooperative',
          );
        }
      }

      // Build the data object conditionally
      const data: any = {
        name: createSeasonDto.name,
        plantationArea: createSeasonDto.plantationArea,
        seeds: createSeasonDto.seeds,
        produceHarvested: createSeasonDto.produceHarvested || 0,
        expectedYield: createSeasonDto.expectedYield,
        startDate: createSeasonDto.startDate,
        endDate: createSeasonDto.endDate,
        seasonStatus: createSeasonDto.status,
        cropType: {
          connect: {
            id: createSeasonDto.cropTypeId,
          },
        },
        metric: {
          connect: {
            id: createSeasonDto.metricId,
          },
        },
        seedStrain: {
          connect: {
            id: createSeasonDto.seedStrainId,
          },
        },
        harvestSeason: {
          connect: {
            id: createSeasonDto.harvestSeason,
          },
        },
      };

      // Connect either farmer or cooperative
      if (createSeasonDto.farmerId) {
        data.farmer = {
          connect: {
            id: createSeasonDto.farmerId,
          },
        };
      } else if (createSeasonDto.cooperativeId) {
        data.cooperative = {
          connect: {
            id: createSeasonDto.cooperativeId,
          },
        };
      }

      return await this.databaseService.season.create({
        data,
        include: {
          cropType: {
            include: {
              crop: true,
            },
          },
          farmer: createSeasonDto.farmerId
            ? {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      telephone: true,
                    },
                  },
                },
              }
            : false,
          cooperative: createSeasonDto.cooperativeId
            ? {
                select: {
                  name: true,
                  registrationNumber: true,
                },
              }
            : false,
          seedStrain: true,
          metric: true,
          harvestSeason: true,
        },
      });
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }

  async findAll(userId?: string, userRole?: string) {
    try {
      // UmufashaMyumvire can see all seasons
      if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
        return await this.databaseService.season.findMany({
          include: {
            cropType: {
              include: {
                crop: true,
              },
            },
            farmer: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            cooperative: {
              select: {
                name: true,
                registrationNumber: true,
              },
            },
            seedStrain: true,
            metric: true,
            harvestSeason: true,
          },
        });
      }
      
      // Farmers can only see their seasons
      if (userRole === Role_Enum.FARMER) {
        const farmer = await this.databaseService.farmer.findFirst({
          where: { userId },
          select: { id: true }
        });
        
        if (!farmer) {
          return [];
        }
        
        return await this.databaseService.season.findMany({
          where: {
            farmerId: farmer.id
          },
          include: {
            cropType: {
              include: {
                crop: true,
              },
            },
            seedStrain: true,
            metric: true,
            harvestSeason: true,
          },
        });
      }
      
      // Collective cooperative managers can see their cooperative's seasons
      if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
        // Find cooperative managed by this user
        const cooperative = await this.databaseService.cooperative.findFirst({
          where: { cooperativeManagerId: userId },
          select: { id: true }
        });
        
        if (!cooperative) {
          return [];
        }
        
        return await this.databaseService.season.findMany({
          where: {
            cooperativeId: cooperative.id
          },
          include: {
            cropType: {
              include: {
                crop: true,
              },
            },
            seedStrain: true,
            metric: true,
            harvestSeason: true,
          },
        });
      }
      
      // Non-collective cooperative managers cannot see seasons at cooperative level
      if (userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        return []; // Non-collective cooperatives don't have cooperative-level seasons
      }
      
      throw new ForbiddenException('Not authorized to view seasons');
      
    } catch (e) {
      if (e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }

  async findAllByCropTypeId(cropTypeId: string, userId?: string, userRole?: string) {
    try {
      // Apply role-based filtering
      let whereClause: any = { cropTypeId };
      
      if (userRole === Role_Enum.FARMER) {
        const farmer = await this.databaseService.farmer.findFirst({
          where: { userId },
          select: { id: true }
        });
        
        if (!farmer) {
          return [];
        }
        
        whereClause.farmerId = farmer.id;
      } else if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
        const cooperative = await this.databaseService.cooperative.findFirst({
          where: { cooperativeManagerId: userId },
          select: { id: true }
        });
        
        if (!cooperative) {
          return [];
        }
        
        whereClause.cooperativeId = cooperative.id;
      } else if (userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        return []; // Non-collective cooperatives don't have cooperative-level seasons
      }
      // UmufashaMyumvire can see all without additional filtering
      
      return await this.databaseService.season.findMany({
        where: whereClause,
        include: {
          cropType: true,
          farmer: true,
          cooperative: true,
        },
      });
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async findAllByFarmerId(farmerId: string, userId?: string, userRole?: string) {
    try {
      // Authorization: User can only view their own farmer seasons
      if (userRole === Role_Enum.FARMER) {
        const farmer = await this.databaseService.farmer.findFirst({
          where: { userId },
          select: { id: true }
        });
        
        if (!farmer || farmer.id !== farmerId) {
          throw new ForbiddenException('You can only view your own seasons');
        }
      } else if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
        // Cooperative managers can view seasons of farmers in their cooperative
        const farmerInCooperative = await this.databaseService.farmer.findFirst({
          where: { 
            id: farmerId,
            cooperative: {
              cooperativeManagerId: userId
            }
          }
        });
        
        if (!farmerInCooperative) {
          throw new ForbiddenException('You can only view seasons of farmers in your cooperative');
        }
      } else if (userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        // Non-collective cooperative managers can also view member farmer seasons
        const farmerInCooperative = await this.databaseService.farmer.findFirst({
          where: { 
            id: farmerId,
            cooperative: {
              cooperativeManagerId: userId
            }
          }
        });
        
        if (!farmerInCooperative) {
          throw new ForbiddenException('You can only view seasons of farmers in your cooperative');
        }
      }
      // UmufashaMyumvire can view any farmer's seasons
      
      return await this.databaseService.season.findMany({
        where: {
          farmerId,
        },
        include: {
          cropType: {
            include: {
              crop: true,
            },
          },
          seedStrain: true,
          metric: true,
          harvestSeason: true,
        },
      });
    } catch (e) {
      if (e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }

  async findAllByCooperativeId(cooperativeId: string, userId?: string, userRole?: string) {
    try {
      // Only collective cooperatives can have cooperative-level seasons
      const isCollective = await this.isCollectiveCooperative(cooperativeId);
      if (!isCollective) {
        throw new BadRequestException('Non-collective cooperatives do not have cooperative-level seasons');
      }
      
      // Authorization
      if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
        const cooperative = await this.databaseService.cooperative.findUnique({
          where: { id: cooperativeId },
          select: { cooperativeManagerId: true }
        });
        
        if (!cooperative || cooperative.cooperativeManagerId !== userId) {
          throw new ForbiddenException('You can only view seasons of cooperatives you manage');
        }
      } else if (userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        throw new ForbiddenException('Non-collective cooperative managers cannot view cooperative-level seasons');
      }
      // UmufashaMyumvire can view any cooperative's seasons
      
      return await this.databaseService.season.findMany({
        where: {
          cooperativeId,
        },
        include: {
          cropType: {
            include: {
              crop: true,
            },
          },
          seedStrain: true,
          metric: true,
          harvestSeason: true,
        },
      });
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }

  async findAllByCooperativeIdAndCropTypeId(
    cooperativeId: string,
    cropTypeId: string,
    userId?: string,
    userRole?: string
  ) {
    try {
      // Only collective cooperatives can have cooperative-level seasons
      const isCollective = await this.isCollectiveCooperative(cooperativeId);
      if (!isCollective) {
        throw new BadRequestException('Non-collective cooperatives do not have cooperative-level seasons');
      }
      
      // Authorization
      if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
        const cooperative = await this.databaseService.cooperative.findUnique({
          where: { id: cooperativeId },
          select: { cooperativeManagerId: true }
        });
        
        if (!cooperative || cooperative.cooperativeManagerId !== userId) {
          throw new ForbiddenException('You can only view seasons of cooperatives you manage');
        }
      } else if (userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        throw new ForbiddenException('Non-collective cooperative managers cannot view cooperative-level seasons');
      }
      
      return await this.databaseService.season.findMany({
        where: {
          cooperativeId,
          cropTypeId,
        },
        include: {
          cropType: {
            include: {
              crop: true,
            },
          },
        },
      });
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }

  async findAllByFarmerIdAndCropTypeId(
    farmerId: string,
    cropTypeId: string,
    userId?: string,
    userRole?: string
  ) {
    try {
      // Authorization
      if (userRole === Role_Enum.FARMER) {
        const farmer = await this.databaseService.farmer.findFirst({
          where: { userId },
          select: { id: true }
        });
        
        if (!farmer || farmer.id !== farmerId) {
          throw new ForbiddenException('You can only view your own seasons');
        }
      } else if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
                 userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        // Cooperative managers can view seasons of farmers in their cooperative
        const farmerInCooperative = await this.databaseService.farmer.findFirst({
          where: { 
            id: farmerId,
            cooperative: {
              cooperativeManagerId: userId
            }
          }
        });
        
        if (!farmerInCooperative) {
          throw new ForbiddenException('You can only view seasons of farmers in your cooperative');
        }
      }
      
      return await this.databaseService.season.findMany({
        where: {
          farmerId,
          cropTypeId,
        },
        include: {
          cropType: true,
        },
      });
    } catch (e) {
      if (e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    try {
      const season = await this.checkSeasonAuthorization(id, userId, userRole);
      
      return await this.databaseService.season.findUnique({
        where: {
          id,
        },
        include: {
          cropType: {
            include: {
              crop: true,
            },
          },
          seedStrain: true,
          metric: true,
          harvestSeason: true,
          farmer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  telephone: true,
                  email: true,
                },
              },
            },
          },
          cooperative: {
            select: {
              name: true,
              registrationNumber: true,
              telephone: true,
            },
          },
          cropFertilizerFarmerRegistrations: {
            include: {
              feterlizer: true,
              measurement: true,
            },
          },
        },
      });
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }

  async update(
    id: string,
    updateSeasonDto: UpdateSeasonDto,
    userId?: string,
    userRole?: string
  ) {
    try {
      // Check authorization
      await this.checkSeasonAuthorization(id, userId, userRole);
      
      return await this.databaseService.season.update({
        where: {
          id,
        },
        data: {
          name: updateSeasonDto.name,
          plantationArea: updateSeasonDto.plantationArea,
          seeds: updateSeasonDto.seeds,
          produceHarvested: updateSeasonDto.produceHarvested,
          expectedYield: updateSeasonDto.expectedYield,
          startDate: updateSeasonDto.startDate,
          endDate: updateSeasonDto.endDate,
          seasonStatus: updateSeasonDto.status,
        },
      });
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }

  async remove(id: string, userId?: string, userRole?: string) {
    try {
      // Check authorization
      await this.checkSeasonAuthorization(id, userId, userRole);
      
      return await this.databaseService.season.delete({
        where: {
          id,
        },
      });
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }
}
