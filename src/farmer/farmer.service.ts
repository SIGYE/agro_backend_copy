import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { DatabaseService } from 'src/database/database.service';
import { LocationService } from 'src/location/location.service';
import { Farmer, User } from '@prisma/client';
import { UsersService } from 'src/users/users.service';
import { AssignCropToFarmerDto } from './dto/assign-crop-to-farmerDto';
import * as XLSX from 'xlsx';
import { AssignAnimalToFarmerDto } from './dto/assign-animal-to-famer.dto';
import { UpdateCropFarmerDto } from './dto/update-crop-farmer.dto';
import { UpdateAnimalFarmerDto } from './dto/update-animal-farmer.dto';
import e from 'express';

@Injectable()
export class FarmerService {
  constructor(private readonly databaseService: DatabaseService, private readonly locationService: LocationService, private readonly userServcice: UsersService) { }
  async registerFarmer(CreateFarmerDto: CreateFarmerDto, loggedInUser?: User): Promise<Farmer> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "FARMER"
        }
      });
      let user = await this.userServcice.create({ roleId: role.id, ...CreateFarmerDto }, loggedInUser);

      let farmer = await this.databaseService.farmer.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          }
        }
      });

      // Assign crops to farmer if cropsId is present
      if (CreateFarmerDto.crops) {
        for (let crop of CreateFarmerDto.crops) {
          let cropFarmer = await this.databaseService.cropFarmerRegistration.create({
            data: {
              farmer: {
                connect: {
                  id: farmer.id
                }
              },

              cropType: {
                connect: {
                  id: crop.cropTypesId
                }
              }
            }
          })


        }
      }

      // Assign animals to farmer if animalIds is present
      if (CreateFarmerDto.animals) {
        for (let animal of CreateFarmerDto.animals) {
          await this.databaseService.animalFarmerRegistration.create({
            data: {
              farmer: {
                connect: {
                  id: farmer.id
                }
              },
              animal: {
                connect: {
                  id: animal.animalId
                }
              },
              totalNumber: animal.totalNumber,
              femaleNumber: animal.femaleNumber,
              maleNumber: animal.maleNumber


            }
          });
        }
      }

      return farmer;

    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
  async assignCropsToFarmers(assignCropsToFarmers: AssignCropToFarmerDto) {
    try {
      let farmer = await this.databaseService.farmer.findUnique({
        where: {
          id: assignCropsToFarmers.farmerId
        }
      })
      for (let crop of assignCropsToFarmers.crops) {
        let cropFarmer = await this.databaseService.cropFarmerRegistration.create({
          data: {
            farmer: {
              connect: {
                id: farmer.id
              }
            },
            cropType: {
              connect: {
                id: crop.cropTypesId
              }
            },
          }
        })

      }
      return farmer;

    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
  async assignAnimalsToFarmer(assignAnimalsToFarmer: AssignAnimalToFarmerDto) {
    try {
      let farmer = await this.databaseService.farmer.findUnique({
        where: {
          id: assignAnimalsToFarmer.farmerId
        }
      });
      for (let animal of assignAnimalsToFarmer.animals) {
        await this.databaseService.animalFarmerRegistration.create({
          data: {
            farmer: {
              connect: {
                id: farmer.id
              }
            },
            animal: {
              connect: {
                id: animal.animalId
              }
            },
            totalNumber: animal.totalNumber,
            femaleNumber: animal.femaleNumber,
            maleNumber: animal.maleNumber
          }
        });
      }
      return farmer;

    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async updateCropFarmerRegistration(cropFarmerRegistrationId: string, updateCropFarmerRegistrationDto: UpdateCropFarmerDto) {
    try {
      let cropFarmerRegistration = await this.databaseService.cropFarmerRegistration.findUnique({
        where: {
          id: cropFarmerRegistrationId
        }
      });
      if (!cropFarmerRegistration) {
        throw new NotFoundException(`Crop Farmer Registration with ID ${cropFarmerRegistrationId} not found`);
      }
      let cropFarmer = await this.databaseService.cropFarmerRegistration.update({
        where: {
          id: cropFarmerRegistrationId
        },
        data: {
          cropType: {
            connect: {
              id: updateCropFarmerRegistrationDto.cropTypesId
            }
          },

        }
      });
      return cropFarmer;

    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async updateAnimalFarmerRegistration(animalFarmerRegistrationId: string, updateAnimalFarmerRegistrationDto: UpdateAnimalFarmerDto) {
    try {
      let animalFarmerRegistration = await this.databaseService.animalFarmerRegistration.findUnique({
        where: {
          id: animalFarmerRegistrationId
        }
      });
      if (!animalFarmerRegistration) {
        throw new NotFoundException(`Animal Farmer Registration with ID ${animalFarmerRegistrationId} not found`);
      }
      let animalFarmer = await this.databaseService.animalFarmerRegistration.update({
        where: {
          id: animalFarmerRegistrationId
        },
        data: updateAnimalFarmerRegistrationDto
      });
      return animalFarmer;
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async findAll() {
    try {
      return await this.databaseService.farmer.findMany({
        include: {
          cropFarmerRegistrations: true,
          user: true
        }
      });
    } catch (e) {
      throw new BadRequestException(e.message)
    }

  }
  async getFarmersByCooperative(cooperativeId: string) {
    try {
      // Check if the cooperative exists
      const cooperative = await this.databaseService.cooperative.findUnique({
        where: { id: cooperativeId },
      });

      if (!cooperative) {
        throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
      }

      // Retrieve farmers associated with the cooperative
      const farmers = await this.databaseService.farmer.findMany({
        where: {
          cooperativeId: cooperativeId,
        },
        include: {
          user: true
        }
      });

      return farmers;
    } catch (error) {
      throw new BadRequestException('Error fetching farmers by cooperative');
    }
  }
  async getFarmersByLocation(locationId: number) {
    try {
      // Check if the cooperative exists
      const location = await this.databaseService.location.findUnique({
        where: { id: locationId },
        include: {
          childrenLocations: true
        }
      });

      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`);
      }
      let childrenLocations = await this.locationService.getAllChildrenLocations(locationId);
      console.log(childrenLocations)


      // Retrieve farmers associated with the cooperative
      const farmers = await this.databaseService.farmer.findMany({
        where: {
          user: {
            locationId: {
              in: childrenLocations
            }
          },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              telephone: true
            }
          }
        }
      });

      return farmers;
    } catch (error) {
      throw new BadRequestException('Error fetching farmers by location');
    }
  }
  async getCropFarmerRegistrationsByLocation(locationId: number) {
    try {
      // Check if the location exists
      const location = await this.databaseService.location.findUnique({
        where: { id: locationId }
      });

      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`);
      }
      let childrenLocations = await this.locationService.getAllChildrenLocationIds(locationId);

      // Retrieve cropFarmerRegistrations associated with the location
      const cropFarmerRegistrations = await this.databaseService.cropFarmerRegistration.findMany({
        where: {
          farmer: {
            user: {
              locationId: {
                in: childrenLocations
              }
            }
          }
        },
        include: {
          farmer: {
            include: {
              user: true
            }
          }
        }
      });

      return cropFarmerRegistrations;
    } catch (error) {
      throw new BadRequestException('Error fetching crop farmer registrations by location');
    }
  }
  async getCropsFarmerRegistrationsByFarmer(farmerId: string) {
    try {
      // Check if the farmer exists
      const farmer = await this.databaseService.farmer.findUnique({
        where: { id: farmerId }
      });

      if (!farmer) {
        throw new NotFoundException(`Farmer with ID ${farmerId} not found`);
      }

      // Retrieve cropFarmerRegistrations associated with the farmer
      const cropFarmerRegistrations = await this.databaseService.cropFarmerRegistration.findMany({
        where: {
          farmerId: farmerId
        },
        include: {
          cropType: {
            include: {
              crop: true
            }
          }
        }
      });

      return cropFarmerRegistrations;
    } catch (error) {
      throw new BadRequestException('Error fetching crop farmer registrations by farmer');
    }
  }

  async getAnimalFarmerRegistrationsByFarmer(farmerId: string) {
    try {
      // Check if the farmer exists
      const farmer = await this.databaseService.farmer.findUnique({
        where: { id: farmerId },
        include: {
          user: true
        }
      });

      if (!farmer) {
        throw new NotFoundException(`Farmer with ID ${farmerId} not found`);
      }

      // Retrieve animalFarmerRegistrations associated with the farmer
      const animalFarmerRegistrations = await this.databaseService.animalFarmerRegistration.findMany({
        where: {
          farmerId: farmerId
        },
        include: {
          animal: true
        }
      });

      return animalFarmerRegistrations;
    } catch (error) {
      throw new BadRequestException('Error fetching animal farmer registrations by farmer');
    }
  }
  async getAnimalFarmerRegistrationLivestock(animalFarmerRegistrationId: string) {
    try {
      return await this.databaseService.animalFarmerRegistration.findUnique({
        where: {
          id: animalFarmerRegistrationId
        }
      }).liveStockRegistrations({
        include: {
          breed: true
        }
      })
    }
    catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async getAnimalRegistrationsByLocation(locationId: number) {
    try {
      // Check if the location exists
      const location = await this.databaseService.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`);
      }
      let childrenLocations = await this.locationService.getAllChildrenLocationIds(locationId);

      // Retrieve animalRegistrations associated with the location
      const animalRegistrations = await this.databaseService.animalFarmerRegistration.findMany({
        where: {
          farmer: {
            user: {
              locationId: {
                in: childrenLocations
              }
            },
          },
        },
        include: {
          farmer: {
            include: {
              user: true
            }
          }
        }
      });

      return animalRegistrations;
    } catch (error) {
      throw new BadRequestException('Error fetching animal registrations by location');
    }
  }
  async getAllCropFarmerRegistrations() {
    try {
      // Retrieve all cropFarmerRegistrations
      const cropFarmerRegistrations = await this.databaseService.cropFarmerRegistration.findMany({
        include: {
          farmer: {
            include: {
              user: true
            }
          }
        }
      });
      return cropFarmerRegistrations;
    } catch (error) {
      throw new BadRequestException('Error fetching all crop farmer registrations');
    }
  }

  async getAllAnimalFarmerRegistrations() {
    try {
      // Retrieve all animalFarmerRegistrations
      const animalFarmerRegistrations = await this.databaseService.animalFarmerRegistration.findMany({
        include: {
          farmer: {
            include: {
              user: true
            }
          }
        }
      });
      return animalFarmerRegistrations;
    } catch (error) {
      throw new BadRequestException('Error fetching all animal farmer registrations');
    }
  }
  async getFarmerCooperativeStatistics(locationId?: number) {
    try {
      // Handle location filtering
      let locationIds = [];
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.databaseService.location.findUnique({
          where: {
            id: locationId
          }
        });
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`);
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId);
        }
      }

      // Build location query
      const locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {};

      // Fetch cooperatives with their farmers
      const cooperatives = await this.databaseService.cooperative.findMany({
        where: locationQuery,
        include: {
          farmers: true
        }
      });

      // Get total independent farmers (farmers without cooperatives)
      const independentFarmers = await this.databaseService.farmer.count({
        where: {
          cooperativeId: null,
          cooperative: locationQuery
        }
      });

      // Calculate statistics
      const totalCooperatives = cooperatives.length;
      const totalFarmersInCooperatives = cooperatives.reduce((sum, coop) =>
        sum + coop.farmers.length, 0);
      const totalFarmers = totalFarmersInCooperatives + independentFarmers;

      // Group cooperatives by type
      const cooperativesByType = cooperatives.reduce((acc, coop) => {
        if (!acc[coop.type]) {
          acc[coop.type] = {
            totalCooperatives: 0,
            totalFarmers: 0,
            avgFarmersPerCooperative: 0,
            totalMembersNumber: 0 // From cooperative.membersNumber
          };
        }

        acc[coop.type].totalCooperatives++;
        acc[coop.type].totalFarmers += coop.farmers.length;
        acc[coop.type].totalMembersNumber += coop.membersNumber;

        return acc;
      }, {});

      // Calculate averages for each type
      Object.values(cooperativesByType).forEach((stats: any) => {
        stats.avgFarmersPerCooperative = stats.totalCooperatives > 0
          ? Math.round(stats.totalFarmers / stats.totalCooperatives)
          : 0;
      });

      return {
        overview: {
          totalFarmers,
          totalCooperatives,
          totalFarmersInCooperatives,
          independentFarmers,
          cooperativeMembershipRate: totalFarmers > 0
            ? Math.round((totalFarmersInCooperatives / totalFarmers) * 100)
            : 0
        },
        cooperativeTypeStatistics: Object.entries(cooperativesByType).map(([type, stats]: any) => ({
          type,
          ...stats,
          membershipFillRate: stats.totalMembersNumber > 0
            ? Math.round((stats.totalFarmers / stats.totalMembersNumber) * 100)
            : 0
        }))
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  } async getFarmerDetailedInformation(locationId?: number, cooperativeId?: string) {
    try {
      // Handle location filtering
      let locationIds = [];
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.databaseService.location.findUnique({
          where: {
            id: locationId
          }
        });
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`);
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId);
        }
      }

      // Build query conditions
      const locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {};
      const cooperativeQuery = cooperativeId ? { cooperativeId } : {};

      // Fetch farmers with all related data
      const farmers = await this.databaseService.farmer.findMany({
        where: {
          cooperative: {
            ...locationQuery
          },
          ...cooperativeQuery
        },
        include: {
          user: true,
          cooperative: true,
          // Animal related data
          animalFarmerRegistrations: {
            include: {
              animal: true,
              liveStockRegistrations: {
                include: {
                  breed: true,
                  farmerAnimalRegistrationProduce: {
                    include: {
                      animalProduct: true
                    }
                  }
                }
              }
            }
          },
          // Crop related data
          cropFarmerRegistrations: {
            include: {
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          },
          // Seasons for harvest data
          seasons: {
            include: {
              croType: {
                include: {
                  crop: true
                }
              }
            }
          }
        }
      });

      // Transform and aggregate the data
      const result = farmers.map((farmer: any) => {
        // Aggregate animal data
        const animalStats = farmer.animalFarmerRegistrations.map(registration => {
          const productStats = registration.liveStockRegistrations
            .flatMap(livestock => livestock.farmerAnimalRegistrationProduce)
            .reduce((acc, produce) => {
              const key = produce.animalProduct.name;
              if (!acc[key]) {
                acc[key] = {
                  productName: key,
                  amounts: {}
                };
              }
              const measurement = produce.measurements;
              if (!acc[key].amounts[measurement]) {
                acc[key].amounts[measurement] = 0;
              }
              acc[key].amounts[measurement] += produce.amount;
              return acc;
            }, {});

          return {
            animalName: registration.animal.name,
            totalAnimals: registration.totalNumber,
            maleCount: registration.maleNumber,
            femaleCount: registration.femaleNumber,
            breeds: [...new Set(registration.liveStockRegistrations.map(ls => ls.breed.breedName))],
            products: Object.values(productStats).map((product: any) => ({
              productName: product.productName,
              amounts: Object.entries(product.amounts).map(([measurement, amount]) => ({
                measurement,
                amount
              }))
            }))
          };
        });

        // Aggregate crop data
        const cropStats = farmer.cropFarmerRegistrations.map(registration => ({
          cropName: registration.cropType.crop.name,
          cropType: registration.cropType.name
        }));

        // Aggregate harvest data by crop type
        const harvestStats = farmer.seasons.reduce((acc, season) => {
          const key = `${season.croType.crop.name}-${season.croType.name}`;
          if (!acc[key]) {
            acc[key] = {
              cropName: season.croType.crop.name,
              cropType: season.croType.name,
              totalHarvested: 0,
              totalArea: 0,
              totalSeeds: 0,
              seasons: []
            };
          }

          acc[key].totalHarvested += season.produceHarvested;
          acc[key].totalArea += season.plantationArea;
          acc[key].totalSeeds += season.seeds;
          acc[key].seasons.push({
            seasonName: season.name,
            startDate: season.startDate,
            endDate: season.endDate,
            status: season.seasonStatus,
            harvested: season.produceHarvested,
            area: season.plantationArea,
            seeds: season.seeds,
            expectedYield: season.expectedYield
          });

          return acc;
        }, {});

        return {
          personalInfo: {
            id: farmer.id,
            name: farmer.user.firstName + ' ' + farmer.user.lastName,
            phoneNumber: farmer.user.telephone,
            cooperative: farmer.cooperative ? {
              name: farmer.cooperative.name,
              type: farmer.cooperative.type
            } : null
          },
          statistics: {
            totalAnimals: animalStats.reduce((sum, stat) => sum + stat.totalAnimals, 0),
            totalCrops: cropStats.length,
            totalSeasons: farmer.seasons.length
          },
          animals: animalStats,
          crops: cropStats,
          harvests: Object.values(harvestStats)
        };
      });

      return result;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }
  async findOne(id: string) {
    try {
      return await this.databaseService.farmer.findUnique({
        where: {
          id: id
        },
        include: {
          user: true
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  // update(id: string, updateFarmerDto: UpdateFarmerDto) {
  //   try {
  //     return this.databaseService.farmer.update({
  //       where: {
  //         id: id
  //       },
  //       data: updateFarmerDto
  //     })
  //   }
  // }

  async remove(id: string) {

    try {
      // Delete cropFarmerRegistration entries
      await this.databaseService.cropFarmerRegistration.deleteMany({
        where: {
          farmerId: id
        }
      });

      // Delete farmer
      const result = await this.databaseService.farmer.delete({
        where: {
          id: id
        }
      });

      return result;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
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

        // await this.registerFarmer({ roleId: role.id, ...userDto }); // Register vet with the custom object
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
  async getFarmersWithoutCooperative(locationId?: number, page: number = 1, limit: number = 10) {
    try {
      // Build the where clause
      const whereClause: any = {
        // Farmer is not part of any cooperative
        cooperativeId: null
      };

      // If location is provided, filter by location
      if (locationId) {
        whereClause.user = {
          locationId: locationId
        };
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count for pagination info
      const totalCount = await this.databaseService.farmer.count({
        where: whereClause
      });

      // Get the farmers without cooperatives with pagination
      const farmers = await this.databaseService.farmer.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              telephone: true,
              email: true,
              gender: true,
              location: true
            }
          },
          cropFarmerRegistrations: {
            include: {
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          },
          animalFarmerRegistrations: {
            include: {
              animal: true
            }
          },
          seasons: {
            take: 5,
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Format the response with pagination info
      return {
        data: farmers,
        meta: {
          totalItems: totalCount,
          itemCount: farmers.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page
        }
      };
    } catch (e) {
      throw e;
    }
  }
  async getFarmerData(locationId?: number) {
    try {
      // Build the location filter
      const whereClause: any = {};

      if (locationId) {
        whereClause.user = {
          locationId: locationId
        };
      }

      // Get all individual farmers (not in any cooperative)
      const individualFarmers = await this.databaseService.farmer.findMany({
        where: {
          ...whereClause,
          cooperativeId: null
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              telephone: true,
              nationalId: true,
              gender: true,
              dob: true,
              email: true
            }
          },
          cropFarmerRegistrations: {
            include: {
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          }
        }
      });

      // Prepare individual farmers data with age calculations and crop details
      const processedIndividualFarmers = individualFarmers.map(farmer => {
        // Calculate age if DOB is available
        let age = null;
        let ageGroup = "Unknown";

        if (farmer.user.dob) {
          const today = new Date();
          const birthDate = new Date(farmer.user.dob);
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();

          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }

          // Determine age group based on specified ranges
          if (age < 18) ageGroup = "Under 18";
          else if (age <= 25) ageGroup = "18-25";
          else if (age <= 35) ageGroup = "26-35";
          else if (age <= 45) ageGroup = "36-45";
          else if (age <= 55) ageGroup = "46-55";
          else if (age <= 65) ageGroup = "56-65";
          else ageGroup = "66+";
        }

        // Extract crop data
        const crops = farmer.cropFarmerRegistrations.map(registration => ({
          cropId: registration.cropType.crop.id,
          cropName: registration.cropType.crop.name,
          cropTypeId: registration.cropType.id,
          cropTypeName: registration.cropType.name
        }));

        return {
          id: farmer.id,
          name: `${farmer.user.firstName} ${farmer.user.lastName}`,
          phoneNumber: farmer.user.telephone || "N/A",
          nationalId: farmer.user.nationalId || "N/A",
          email: farmer.user.email || "N/A",
          gender: farmer.user.gender || "UNKNOWN",
          age,
          ageGroup,
          crops
        };
      });

      // Get all cooperatives with their farmers
      const cooperatives = await this.databaseService.cooperative.findMany({
        where: locationId ? {
          locationId: locationId
        } : {},
        include: {
          cooperativeManager: {
            select: {
              firstName: true,
              lastName: true,
              telephone: true,
              email: true
            }
          },
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
            select: {
              id: true
            }
          }
        }
      });

      // Process cooperatives data
      const processedCooperatives = cooperatives.map(cooperative => {
        // Extract crop data
        const crops = cooperative.cooperativeCropRegistrations.map(registration => ({
          cropId: registration.cropType.crop.id,
          cropName: registration.cropType.crop.name,
          cropTypeId: registration.cropType.id,
          cropTypeName: registration.cropType.name
        }));

        return {
          id: cooperative.id,
          name: cooperative.name,
          registrationNumber: cooperative.registrationNumber || "N/A",
          phoneNumber: cooperative.telephone || "N/A",
          totalFarmers: cooperative.farmers.length,
          manager: {
            name: `${cooperative.cooperativeManager.firstName} ${cooperative.cooperativeManager.lastName}`,
            phoneNumber: cooperative.cooperativeManager.telephone || "N/A",
            email: cooperative.cooperativeManager.email || "N/A"
          },
          crops
        };
      });

      // Get location name if provided
      let locationName = "All Locations";
      if (locationId) {
        const location = await this.databaseService.location.findUnique({
          where: { id: locationId }
        });
        if (location) {
          locationName = location.name;
        }
      }

      // Return the grouped data
      return {
        location: {
          id: locationId || null,
          name: locationName
        },
        summary: {
          totalIndividualFarmers: processedIndividualFarmers.length,
          totalCooperatives: processedCooperatives.length,
          totalFarmersInCooperatives: processedCooperatives.reduce(
            (sum, coop) => sum + coop.totalFarmers, 0
          )
        },
        individualFarmers: processedIndividualFarmers,
        cooperatives: processedCooperatives
      };
    } catch (e) {
      throw e;
    }
  }
}
