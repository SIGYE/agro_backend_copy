import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { DatabaseService } from 'src/database/database.service';
import * as XLSX from 'xlsx';
import { LocationService } from 'src/location/location.service';
import { User } from '@prisma/client';
import { BulkPestDto } from './dto/bulk-pest.dto';
import { BulkDiseaseDto } from './dto/bulk-disease.dto';
import { BulkCreateCropDto } from './dto/bulk-create-crop.dto';
import { BulkCropDto } from './dto/bulk-crop.dto';

@Injectable()
export class CropService {
  constructor(private readonly dataBaseService: DatabaseService, private readonly locationService: LocationService) { }
  async create(createCropDto: CreateCropDto, user: User) {

    try {
      let crop = await this.dataBaseService.crop.create({
        data: {
          name: createCropDto.name,
          createdBy: user.id,
          country: user.country

        }
      })
      if (createCropDto.cropTypes && createCropDto.cropTypes.length > 0) {
        for (let cropType of createCropDto.cropTypes) {
          await this.dataBaseService.cropType.create({
            data: {
              name: cropType.name,
              cropId: crop.id
            }
          })
        }
      } else {
        await this.dataBaseService.cropType.create({
          data: {
            name: createCropDto.name,
            cropId: crop.id
          }
        })
      }
      return await this.dataBaseService.crop.findUnique({
        where: {
          id: crop.id
        },
        include: {
          cropType: true
        }
      })
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async bulkCreate(bulkCreateCropDto: BulkCreateCropDto, user: User) {
    try {
      const results = [];

      for (const cropDto of bulkCreateCropDto.crops) {
        const result = await this.createSingleCropWithDetails(cropDto, user);
        results.push(result);
      }

      return results;
    } catch (error) {
      throw new BadRequestException(`Bulk create failed: ${error.message}`);
    }
  }

  private async createSingleCropWithDetails(cropDto: BulkCropDto, user: User) {
    return await this.dataBaseService.$transaction(async (prisma) => {
      // 1. Create or get existing crop
      let crop = await prisma.crop.findFirst({
        where: {
          name: cropDto.name,
          country: user.country
        }
      });

      if (!crop) {
        crop = await prisma.crop.create({
          data: {
            name: cropDto.name,
            createdBy: user.id,
            country: user.country
          }
        });
      }

      // 2. Handle fertilizers
      if (cropDto.fertilizers && cropDto.fertilizers.length > 0) {
        await this.handleFertilizers(prisma, crop.id, cropDto.fertilizers, user);
      }

      // 3. Handle diseases
      if (cropDto.diseases && cropDto.diseases.length > 0) {
        await this.handleDiseases(prisma, crop.id, cropDto.diseases, user);
      }

      // 4. Handle pests
      if (cropDto.pests && cropDto.pests.length > 0) {
        await this.handlePests(prisma, crop.id, cropDto.pests, user);
      }

      // 5. Handle medicines
      if (cropDto.medicines && cropDto.medicines.length > 0) {
        await this.handleMedicines(prisma, crop.id, cropDto.medicines);
      }

      // 6. Handle crop types and seed strains
      if (cropDto.cropTypes && cropDto.cropTypes.length > 0) {
        await this.handleCropTypesAndSeedStrains(prisma, crop.id, cropDto.cropTypes);
      } else {
        // Create default crop type if none provided
        await this.createDefaultCropType(prisma, crop.id, cropDto.name);
      }

      // Return the complete crop with all relations
      return await prisma.crop.findUnique({
        where: { id: crop.id },
        include: {
          cropType: {
            include: {
              seedStrains: true
            }
          },
          fertilisers: true,
          diseases: true,
          pests: true,
          cropMedicines: {
            include: {
              medicine: true
            }
          }
        }
      });
    });
  }

  private async handleFertilizers(prisma: any, cropId: string, fertilizerNames: string[], user: User) {
    for (const fertilizerName of fertilizerNames) {
      // Check if fertilizer exists
      let fertilizer = await prisma.feterlizer.findFirst({
        where: { name: fertilizerName }
      });

      if (!fertilizer) {
        // Create new fertilizer
        fertilizer = await prisma.feterlizer.create({
          data: {
            name: fertilizerName,
            createdBy: user.id
          }
        });
      }

      // Check if crop-fertilizer relation exists
      const existingRelation = await prisma.crop.findFirst({
        where: {
          id: cropId,
          fertilisers: {
            some: { id: fertilizer.id }
          }
        }
      });

      if (!existingRelation) {
        // Connect fertilizer to crop
        await prisma.crop.update({
          where: { id: cropId },
          data: {
            fertilisers: {
              connect: { id: fertilizer.id }
            }
          }
        });
      }
    }
  }

  private async handleDiseases(prisma: any, cropId: string, diseases: BulkDiseaseDto[], user: User) {
    for (const diseaseDto of diseases) {
      // Check if disease exists
      let disease = await prisma.disease.findFirst({
        where: {
          name: diseaseDto.name,
          type: diseaseDto.type
        }
      });

      if (!disease) {
        // Create new disease
        disease = await prisma.disease.create({
          data: {
            name: diseaseDto.name,
            type: diseaseDto.type,
            medication: diseaseDto.medication,
            createdBy: user.id
          }
        });
      }

      // Check if crop-disease relation exists
      const existingRelation = await prisma.crop.findFirst({
        where: {
          id: cropId,
          diseases: {
            some: { id: disease.id }
          }
        }
      });

      if (!existingRelation) {
        // Connect disease to crop
        await prisma.crop.update({
          where: { id: cropId },
          data: {
            diseases: {
              connect: { id: disease.id }
            }
          }
        });
      }
    }
  }

  private async handlePests(prisma: any, cropId: string, pests: BulkPestDto[], user: User) {
    for (const pestDto of pests) {
      // Check if pest exists
      let pest = await prisma.pest.findFirst({
        where: {
          name: pestDto.name,
          type: pestDto.type
        }
      });

      if (!pest) {
        // Create new pest
        pest = await prisma.pest.create({
          data: {
            name: pestDto.name,
            type: pestDto.type,
            medication: pestDto.medication,
            createdBy: user.id
          }
        });
      }

      // Check if crop-pest relation exists
      const existingRelation = await prisma.crop.findFirst({
        where: {
          id: cropId,
          pests: {
            some: { id: pest.id }
          }
        }
      });

      if (!existingRelation) {
        // Connect pest to crop
        await prisma.crop.update({
          where: { id: cropId },
          data: {
            pests: {
              connect: { id: pest.id }
            }
          }
        });
      }
    }
  }

  private async handleMedicines(prisma: any, cropId: string, medicineNames: string[]) {
    for (const medicineName of medicineNames) {
      // Check if medicine exists
      let medicine = await prisma.medicine.findFirst({
        where: { name: medicineName }
      });

      if (!medicine) {
        // Create new medicine
        medicine = await prisma.medicine.create({
          data: {
            name: medicineName
          }
        });
      }

      // Check if crop-medicine relation exists
      const existingRelation = await prisma.cropMedicine.findFirst({
        where: {
          cropId: cropId,
          medicineId: medicine.id
        }
      });

      if (!existingRelation) {
        // Create crop-medicine relation
        await prisma.cropMedicine.create({
          data: {
            cropId: cropId,
            medicineId: medicine.id
          }
        });
      }
    }
  }

  private async handleCropTypesAndSeedStrains(prisma: any, cropId: string, cropTypes: BulkCropTypeDto[]) {
    for (const cropTypeDto of cropTypes) {
      // Check if crop type exists for this crop
      let cropType = await prisma.cropType.findFirst({
        where: {
          name: cropTypeDto.name,
          cropId: cropId
        }
      });

      if (!cropType) {
        // Create new crop type
        cropType = await prisma.cropType.create({
          data: {
            name: cropTypeDto.name,
            cropId: cropId
          }
        });
      }

      // Handle seed strains
      if (cropTypeDto.seedStrains && cropTypeDto.seedStrains.length > 0) {
        for (const seedStrainDto of cropTypeDto.seedStrains) {
          // Check if seed strain exists for this crop type
          const existingSeedStrain = await prisma.seedStrain.findFirst({
            where: {
              name: seedStrainDto.name,
              cropTypeId: cropType.id
            }
          });

          if (!existingSeedStrain) {
            // Create new seed strain
            await prisma.seedStrain.create({
              data: {
                name: seedStrainDto.name,
                cropTypeId: cropType.id
              }
            });
          }
        }
      }
    }
  }

  private async createDefaultCropType(prisma: any, cropId: string, cropName: string) {
    const existingCropType = await prisma.cropType.findFirst({
      where: {
        name: cropName,
        cropId: cropId
      }
    });

    if (!existingCropType) {
      await prisma.cropType.create({
        data: {
          name: cropName,
          cropId: cropId
        }
      });
    }
  }

  async findAll(user: User) {
    try {
      const countryQuery = user.country ? {
        country: user.country
      } : {}

      return await this.dataBaseService.crop.findMany({
        where: {
          ...countryQuery
        },
        include: {
          cropType: true
        }

      });
    }
    catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAllCropFarmerRegistration(locationId: number) {
    try {
      // Check if the location exists
      const location = await this.dataBaseService.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`);
      }
      let locations = await this.locationService.getAllChildrenLocationIds(locationId);
      return await this.dataBaseService.cropFarmerRegistration.findMany({
        where: {
          farmer: {
            user: {
              location: {
                id: {
                  in: locations
                }

              }
            }
          }
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findOne(id: string) {
    try {
      return await this.dataBaseService.crop.findUnique({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async cropsCardData(locationId?: number, cooperativeId?: string) {
    try {
      // Handle location query
      let locationIds = [];
      if (locationId != null && locationId != undefined && locationId >= 0 && !(Number.isNaN(locationId))) {
        const location = await this.dataBaseService.location.findUnique({
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

      // Build location and cooperative queries
      const locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {};
      const cooperativeQuery = cooperativeId
        ? {
          cropType: {
            some: {
              cropFarmerRegistrations: {
                some: {
                  farmer: {
                    cooperativeId
                  }
                }
              }
            }
          }
        }
        : {};

      // Get total crops with optional filters
      const totalCrops = await this.dataBaseService.crop.count({
        where: {
          creator: {
            ...locationQuery
          },
          ...cooperativeQuery
        }
      });

      // Get total crop types with optional filters
      const totalCropTypes = await this.dataBaseService.cropType.count({
        where: {
          crop: {
            creator: {
              ...locationQuery
            }
          },
          ...(cooperativeId ? {
            cropFarmerRegistrations: {
              some: {
                farmer: {
                  cooperativeId
                }
              }
            }
          } : {})
        }
      });

      // Get seasons with optional filters
      const seasons = await this.dataBaseService.season.findMany({
        where: {
          farmer: {
            user: {
              ...locationQuery
            },
            ...(cooperativeId ? { cooperativeId } : {})
          }
        },
        select: {
          plantationArea: true
        }
      });

      // Calculate total area
      const totalArea = seasons.reduce((sum, season) => {
        return sum + Number(season.plantationArea);
      }, 0);

      return {
        totalCrops,
        totalCropTypes,
        totalArea
      };

    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(id: string, updateCropDto: UpdateCropDto) {
    try {
      return await this.dataBaseService.crop.update({
        where: {
          id: id
        },
        data: {
          name: updateCropDto.name
        }
      });
    }
    catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: string) {
    try {
      return await this.dataBaseService.crop.delete({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async importCrops(file: Express.Multer.File, user: User): Promise<{ success: number; failed: number; errors: any[] }> {
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
        let cropDto = {
          name: row[0],
          cropTypes: []

        };


        await this.create(cropDto, user) // Register vet with the custom object
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
  async getCropTypeStatistics(
    cropTypeId: string,
    locationId?: number
  ) {
    try {
      // Handle location filtering
      let locationIds = [];
      if (locationId != null && locationId !== undefined && locationId >= 0 && !Number.isNaN(locationId)) {
        const location = await this.dataBaseService.location.findUnique({
          where: { id: locationId }
        });
        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`);
        } else {
          locationIds = await this.locationService.getAllChildrenLocations(locationId);
        }
      }

      // Validate cropTypeId
      const cropType = await this.dataBaseService.cropType.findUnique({
        where: { id: cropTypeId },
        include: { crop: true }
      });

      if (!cropType) {
        throw new NotFoundException(`Crop type with ID ${cropTypeId} not found`);
      }

      // Build query conditions for location
      const locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {};

      // Fetch all farmers with the specified crop type
      const farmers = await this.dataBaseService.farmer.findMany({
        where: {
          cooperative: {
            ...locationQuery
          },
          OR: [
            {
              cropFarmerRegistrations: {
                some: {
                  cropTypeId: cropTypeId
                }
              }
            },
            {
              seasons: {
                some: {
                  cropTypeId: cropTypeId
                }
              }
            }
          ]
        },
        include: {
          user: true,
          cooperative: {
            include: {
              cooperativeManager: true
            }
          },
          cropFarmerRegistrations: {
            where: {
              cropTypeId: cropTypeId
            },
            include: {
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          },
          seasons: {
            where: {
              cropTypeId: cropTypeId
            },
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

      // Process individual farmer data
      const processedFarmers = farmers.map(farmer => {
        // Process harvest statistics for this specific crop type
        const seasonStats = farmer.seasons.map(season => ({
          seasonName: season.name,
          startDate: season.startDate,
          endDate: season.endDate,
          status: season.seasonStatus,
          harvested: season.produceHarvested,
          area: season.plantationArea,
          seeds: season.seeds,
          expectedYield: season.expectedYield,
          efficiency: season.expectedYield > 0
            ? Math.round((season.produceHarvested / season.expectedYield) * 100)
            : 0
        }));

        // Calculate totals
        const totalHarvested = seasonStats.reduce((sum, season) => sum + season.harvested, 0);
        const totalArea = seasonStats.reduce((sum, season) => sum + season.area, 0);
        const totalSeeds = seasonStats.reduce((sum, season) => sum + season.seeds, 0);
        const totalExpectedYield = seasonStats.reduce((sum, season) => sum + season.expectedYield, 0);
        const overallEfficiency = totalExpectedYield > 0
          ? Math.round((totalHarvested / totalExpectedYield) * 100)
          : 0;

        return {
          personalInfo: {
            id: farmer.id,
            name: farmer.user.firstName + ' ' + farmer.user.lastName,
            phoneNumber: farmer.user.telephone,
            cooperative: farmer.cooperative ? {
              id: farmer.cooperative.id,
              name: farmer.cooperative.name,
              type: farmer.cooperative.type,
              cooperativeManagerInfo: {
                name: farmer.cooperative.cooperativeManager.firstName + ' ' + farmer.cooperative.cooperativeManager.lastName,
                phoneNumber: farmer.cooperative.cooperativeManager.telephone,
                email: farmer.cooperative.cooperativeManager.email
              }
            } : null
          },
          cropInfo: {
            id: cropType.id,
            name: cropType.name,
            cropName: cropType.crop.name
          },
          statistics: {
            totalHarvested,
            totalArea,
            totalSeeds,
            totalExpectedYield,
            overallEfficiency,
            activeSeasonsCount: farmer.seasons.filter(s => s.seasonStatus === 'ON_GOING').length,
            completedSeasonsCount: farmer.seasons.filter(s => s.seasonStatus === 'ENDED').length
          },
          seasons: seasonStats
        };
      });

      // Group by cooperative for cooperative view
      const cooperativeStats = processedFarmers.reduce((acc, farmer) => {
        if (!farmer.personalInfo.cooperative) {
          if (!acc['unaffiliated']) {
            acc['unaffiliated'] = {
              id: 'unaffiliated',
              name: 'Unaffiliated Farmers',
              type: null,
              memberCount: 0,
              cropInfo: {
                id: cropType.id,
                name: cropType.name,
                cropName: cropType.crop.name
              },
              statistics: {
                totalHarvested: 0,
                totalArea: 0,
                totalSeeds: 0,
                totalExpectedYield: 0,
                overallEfficiency: 0,
                activeSeasonsCount: 0,
                completedSeasonsCount: 0
              },
              seasonStats: {}
            };
          }
          acc['unaffiliated'].memberCount++;
        } else {
          const coopId = farmer.personalInfo.cooperative.id;
          if (!acc[coopId]) {
            acc[coopId] = {
              id: farmer.personalInfo.cooperative.id,
              name: farmer.personalInfo.cooperative.name,
              type: farmer.personalInfo.cooperative.type,
              cooperativeManagerInfo: farmer.personalInfo.cooperative.cooperativeManagerInfo,
              memberCount: 0,
              cropInfo: {
                id: cropType.id,
                name: cropType.name,
                cropName: cropType.crop.name
              },
              statistics: {
                totalHarvested: 0,
                totalArea: 0,
                totalSeeds: 0,
                totalExpectedYield: 0,
                overallEfficiency: 0,
                activeSeasonsCount: 0,
                completedSeasonsCount: 0
              },
              seasonStats: {}
            };
          }
          acc[coopId].memberCount++;
        }

        const coopKey = farmer.personalInfo.cooperative?.id || 'unaffiliated';
        const coop = acc[coopKey];

        // Aggregate statistics
        coop.statistics.totalHarvested += farmer.statistics.totalHarvested;
        coop.statistics.totalArea += farmer.statistics.totalArea;
        coop.statistics.totalSeeds += farmer.statistics.totalSeeds;
        coop.statistics.totalExpectedYield += farmer.statistics.totalExpectedYield;
        coop.statistics.activeSeasonsCount += farmer.statistics.activeSeasonsCount;
        coop.statistics.completedSeasonsCount += farmer.statistics.completedSeasonsCount;

        // Process season stats by cooperative
        farmer.seasons.forEach(season => {
          if (!coop.seasonStats[season.seasonName]) {
            coop.seasonStats[season.seasonName] = {
              seasonName: season.seasonName,
              startDate: season.startDate,
              endDate: season.endDate,
              status: season.status,
              harvested: 0,
              area: 0,
              seeds: 0,
              expectedYield: 0,
              efficiency: 0,
              farmerCount: 0
            };
          }

          const seasonStat = coop.seasonStats[season.seasonName];
          seasonStat.harvested += season.harvested;
          seasonStat.area += season.area;
          seasonStat.seeds += season.seeds;
          seasonStat.expectedYield += season.expectedYield;
          seasonStat.farmerCount++;

          // Recalculate efficiency
          seasonStat.efficiency = seasonStat.expectedYield > 0
            ? Math.round((seasonStat.harvested / seasonStat.expectedYield) * 100)
            : 0;
        });

        return acc;
      }, {});

      // Calculate overall efficiency for each cooperative
      Object.values(cooperativeStats).forEach((coop: any) => {
        coop.statistics.overallEfficiency = coop.statistics.totalExpectedYield > 0
          ? Math.round((coop.statistics.totalHarvested / coop.statistics.totalExpectedYield) * 100)
          : 0;

        // Convert seasonStats from object to array
        coop.seasonStats = Object.values(coop.seasonStats);
      });

      // Prepare the final response
      const result = {
        cropTypeInfo: {
          id: cropType.id,
          name: cropType.name,
          cropName: cropType.crop.name
        },
        overallStatistics: {
          totalCooperatives: Object.keys(cooperativeStats).filter(key => key !== 'unaffiliated').length,
          totalFarmers: processedFarmers.length,
          totalHarvested: processedFarmers.reduce((sum, farmer) => sum + farmer.statistics.totalHarvested, 0),
          totalArea: processedFarmers.reduce((sum, farmer) => sum + farmer.statistics.totalArea, 0),
          totalSeeds: processedFarmers.reduce((sum, farmer) => sum + farmer.statistics.totalSeeds, 0),
          totalExpectedYield: processedFarmers.reduce((sum, farmer) => sum + farmer.statistics.totalExpectedYield, 0),
          overallEfficiency: 0, // Will calculate below
          activeSeasonsCount: processedFarmers.reduce((sum, farmer) => sum + farmer.statistics.activeSeasonsCount, 0),
          completedSeasonsCount: processedFarmers.reduce((sum, farmer) => sum + farmer.statistics.completedSeasonsCount, 0),
        },
        cooperativeStats: Object.values(cooperativeStats),
        individualFarmers: processedFarmers
      };

      // Calculate overall efficiency
      result.overallStatistics.overallEfficiency = result.overallStatistics.totalExpectedYield > 0
        ? Math.round((result.overallStatistics.totalHarvested / result.overallStatistics.totalExpectedYield) * 100)
        : 0;

      return result;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }
  async getCropTypesByCrop(cropId) {
    try {
      return this.dataBaseService.cropType.findMany({
        where: {
          cropId: cropId
        }
      })
    } catch (e) {
      throw e
    }
  }
}
