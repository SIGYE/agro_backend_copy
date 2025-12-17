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
              include: {
                cooperativeManager: true
              }
            }
          }
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
    
    // Check if user is the farmer who owns the season
    if (season.farmerId) {
      if (season.farmer.user.id === userId) {
        return season;
      }
      
      // Check if user is the cooperative manager of the farmer's cooperative
      if (season.farmer.cooperative?.cooperativeManagerId === userId) {
        return season;
      }
    }
    
    // Check if user is the cooperative manager of the cooperative that owns the season
    if (season.cooperativeId) {
      if (season.cooperative.cooperativeManagerId === userId) {
        const managerRole = season.cooperative.cooperativeManager.role.name;
        if (managerRole !== Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
          throw new ForbiddenException('Only collective cooperative managers can manage cooperative seasons');
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
        // Farmers can create their own seasons
        if (userRole === Role_Enum.FARMER) {
          const farmer = await this.databaseService.farmer.findFirst({
            where: { userId },
            include: { cooperative: true }
          });
          
          if (!farmer || farmer.id !== createSeasonDto.farmerId) {
            throw new ForbiddenException('You can only create seasons for yourself');
          }
          
          // Validate crop registration for farmer
          const farmerCropReg = await this.databaseService.cropFarmerRegistration.findFirst({
            where: {
              farmerId: createSeasonDto.farmerId,
              cropTypeId: createSeasonDto.cropTypeId,
            },
          });

          if (!farmerCropReg) {
            throw new BadRequestException(
              'You have not registered this crop type. Please register it first.',
            );
          }
          
          // Add context message
          let context = '';
          if (farmer.cooperative) {
            if (farmer.cooperative.collectiveType === 'COLLECTIVE') {
              context = 'Season created for mandatory collective crop.';
            } else {
              context = `Season created. Your harvest will contribute to ${farmer.cooperative.name}'s total.`;
            }
          }
          
        } else if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
                   userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
          // Cooperative managers can create seasons for farmers in their cooperative
          const farmer = await this.databaseService.farmer.findFirst({
            where: { 
              id: createSeasonDto.farmerId,
              cooperative: {
                cooperativeManagerId: userId
              }
            },
            include: { cooperative: true }
          });
          
          if (!farmer) {
            throw new ForbiddenException('You can only create seasons for farmers in your cooperative');
          }
          
        } else if (userRole !== Role_Enum.UMUFASHAMYUMVIRE) {
          throw new ForbiddenException('Not authorized to create farmer seasons');
        }
      }
      
      if (createSeasonDto.cooperativeId) {
        // Only collective cooperatives can have cooperative-level seasons
        const isCollective = await this.isCollectiveCooperative(createSeasonDto.cooperativeId);
        if (!isCollective) {
          throw new BadRequestException(
            'Only COLLECTIVE cooperatives can create cooperative-level seasons. Non-collective cooperative farmers create individual seasons.'
          );
        }
        
        // Check if user is a collective cooperative manager or UmufashaMyumvire
        if (userRole !== Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER && 
            userRole !== Role_Enum.UMUFASHAMYUMVIRE) {
          throw new ForbiddenException('Only collective cooperative managers can create cooperative seasons');
        }
        
        if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
          const cooperative = await this.databaseService.cooperative.findUnique({
            where: { id: createSeasonDto.cooperativeId },
            select: { cooperativeManagerId: true, name: true }
          });
          
          if (!cooperative || cooperative.cooperativeManagerId !== userId) {
            throw new ForbiddenException('You can only create seasons for cooperatives you manage');
          }
        }
        
        // Validate crop is registered with cooperative
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

      // Build the data object
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

      const season = await this.databaseService.season.create({
        data,
        include: {
          croType: {
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
                  telephone: true,
                },
              },
              cooperative: {
                select: {
                  id: true,
                  name: true,
                  collectiveType: true
                }
              }
            },
          },
          cooperative: {
            select: {
              id: true,
              name: true,
              registrationNumber: true,
              collectiveType: true
            },
          },
          seedStrain: true,
          metric: true,
          harvestSeason: true,
        },
      });
      
      // Add context message
      let message = '';
      if (season.cooperativeId) {
        message = 'Collective cooperative season created. All farmers will contribute to this season.';
      } else if (season.farmer?.cooperative) {
        if (season.farmer.cooperative.collectiveType === 'COLLECTIVE') {
          message = 'Individual season created for mandatory collective crop.';
        } else {
          message = `Individual season created. Harvests will contribute to ${season.farmer.cooperative.name}'s total.`;
        }
      } else {
        message = 'Individual farmer season created.';
      }
      
      return {
        season,
        message
      };
      
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
            croType: {
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
                cooperative: {
                  select: {
                    id: true,
                    name: true,
                    collectiveType: true
                  }
                }
              },
            },
            cooperative: {
              select: {
                id: true,
                name: true,
                registrationNumber: true,
                collectiveType: true
              },
            },
            seedStrain: true,
            metric: true,
            harvestSeason: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
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
            croType: {
              include: {
                crop: true,
              },
            },
            cooperative: {
              select: {
                name: true,
                collectiveType: true
              }
            },
            seedStrain: true,
            metric: true,
            harvestSeason: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
      
      // Collective cooperative managers see their cooperative's seasons
      if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER) {
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
            croType: {
              include: {
                crop: true,
              },
            },
            cooperative: {
              select: {
                name: true,
                collectiveType: true
              }
            },
            seedStrain: true,
            metric: true,
            harvestSeason: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
      
      // Non-collective cooperative managers see their member farmers' seasons
      if (userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        const cooperative = await this.databaseService.cooperative.findFirst({
          where: { cooperativeManagerId: userId },
          select: { id: true }
        });
        
        if (!cooperative) {
          return [];
        }
        
        return await this.databaseService.season.findMany({
          where: {
            farmer: {
              cooperativeId: cooperative.id
            }
          },
          include: {
            croType: {
              include: {
                crop: true,
              },
            },
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
            seedStrain: true,
            metric: true,
            harvestSeason: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
      
      throw new ForbiddenException('Not authorized to view seasons');
      
    } catch (e) {
      if (e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }

  // NEW: Get all seasons for a cooperative (both collective seasons + member farmer seasons)
  async findAllByCooperativeIdComprehensive(
    cooperativeId: string, 
    userId?: string, 
    userRole?: string
  ) {
    try {
      // Get cooperative details
      const cooperative = await this.databaseService.cooperative.findUnique({
        where: { id: cooperativeId },
        include: {
          cooperativeManager: true
        }
      });
      
      if (!cooperative) {
        throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
      }
      
      // Authorization
      if (userRole !== Role_Enum.UMUFASHAMYUMVIRE) {
        if (cooperative.cooperativeManagerId !== userId) {
          throw new ForbiddenException('You can only view seasons of cooperatives you manage');
        }
      }
      
      if (cooperative.collectiveType === 'COLLECTIVE') {
        // For COLLECTIVE: Get cooperative-level seasons only
        const seasons = await this.databaseService.season.findMany({
          where: {
            cooperativeId: cooperativeId
          },
          include: {
            croType: {
              include: {
                crop: true,
              },
            },
            seedStrain: true,
            metric: true,
            harvestSeason: true,
            harvests: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        return {
          cooperativeName: cooperative.name,
          collectiveType: 'COLLECTIVE',
          message: 'Collective cooperative seasons - all farmers contribute to these shared seasons',
          seasons
        };
      } else {
        // For NON_COLLECTIVE: Get all member farmers' individual seasons
        const seasons = await this.databaseService.season.findMany({
          where: {
            farmer: {
              cooperativeId: cooperativeId
            }
          },
          include: {
            croType: {
              include: {
                crop: true,
              },
            },
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
            seedStrain: true,
            metric: true,
            harvestSeason: true,
            harvests: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        return {
          cooperativeName: cooperative.name,
          collectiveType: 'NON_COLLECTIVE',
          message: 'Individual farmer seasons - each farmer manages their own seasons',
          seasons
        };
      }
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException(e.message);
    }
  }

  async findAllByCropTypeId(cropTypeId: string, userId?: string, userRole?: string) {
    try {
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
        const cooperative = await this.databaseService.cooperative.findFirst({
          where: { cooperativeManagerId: userId },
          select: { id: true }
        });
        
        if (!cooperative) {
          return [];
        }
        
        whereClause.farmer = {
          cooperativeId: cooperative.id
        };
      }
      
      return await this.databaseService.season.findMany({
        where: whereClause,
        include: {
          croType: {
            include: {
              crop: true
            }
          },
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
          cooperative: {
            select: {
              name: true,
              collectiveType: true
            }
          },
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async findAllByFarmerId(farmerId: string, userId?: string, userRole?: string) {
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
        },
        include: {
          croType: {
            include: {
              crop: true,
            },
          },
          cooperative: {
            select: {
              name: true,
              collectiveType: true
            }
          },
          seedStrain: true,
          metric: true,
          harvestSeason: true,
          harvests: true
        },
        orderBy: {
          createdAt: 'desc'
        }
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
      // Only collective cooperatives have cooperative-level seasons
      const isCollective = await this.isCollectiveCooperative(cooperativeId);
      if (!isCollective) {
        throw new BadRequestException(
          'Non-collective cooperatives do not have cooperative-level seasons. Use findAllByCooperativeIdComprehensive to see member farmer seasons.'
        );
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
        },
        include: {
          croType: {
            include: {
              crop: true,
            },
          },
          cooperative: {
            select: {
              name: true,
              collectiveType: true
            }
          },
          seedStrain: true,
          metric: true,
          harvestSeason: true,
          harvests: true
        },
        orderBy: {
          createdAt: 'desc'
        }
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
          croType: {
            include: {
              crop: true,
            },
          },
          cooperative: {
            select: {
              name: true,
              collectiveType: true
            }
          },
          harvests: true
        },
        orderBy: {
          createdAt: 'desc'
        }
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
          croType: {
            include: {
              crop: true
            }
          },
          harvests: true
        },
        orderBy: {
          createdAt: 'desc'
        }
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
      await this.checkSeasonAuthorization(id, userId, userRole);
      
      return await this.databaseService.season.findUnique({
        where: {
          id,
        },
        include: {
          croType: {
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
              cooperative: {
                select: {
                  id: true,
                  name: true,
                  collectiveType: true
                }
              }
            },
          },
          cooperative: {
            select: {
              id: true,
              name: true,
              registrationNumber: true,
              telephone: true,
              collectiveType: true
            },
          },
          cropFertilizerFarmerRegistrations: {
            include: {
              feterlizer: true,
              measurement: true,
            },
          },
          harvests: {
            orderBy: {
              harvestDate: 'desc'
            }
          }
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