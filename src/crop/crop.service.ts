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
import { BulkCropTypeDto } from './dto/bulk-cropType.dto';

@Injectable()
export class CropService {
  constructor(private readonly dataBaseService: DatabaseService, private readonly locationService: LocationService) { } async create(createCropDto: CreateCropDto, user: User) {
    try {
      return await this.dataBaseService.$transaction(async (prisma) => {
        // Check if crop already exists by checking if any of the provided names exist in the same languages
        let existingCrop = null;

        if (createCropDto.names && createCropDto.names.length > 0) {
          // Build conditions to check for existing names in same languages
          const nameLanguagePairs = createCropDto.names.map(nameDto => ({
            name: nameDto.name,
            languageCode: nameDto.languageCode
          }));

          existingCrop = await prisma.crop.findFirst({
            where: {
              country: user.country,
              names: {
                some: {
                  OR: nameLanguagePairs
                }
              }
            },
            include: {
              names: true,
              cropType: true
            }
          });
        }

        if (existingCrop) {
          // Crop exists, add any missing names (different languages)
          const existingLanguages = existingCrop.names.map(n => n.languageCode);
          const newNames = createCropDto.names.filter(
            nameDto => !existingLanguages.includes(nameDto.languageCode)
          );

          if (newNames.length > 0) {
            await prisma.cropNames.createMany({
              data: newNames.map(nameDto => ({
                name: nameDto.name,
                languageName: nameDto.languageName,
                languageCode: nameDto.languageCode,
                cropId: existingCrop.id
              }))
            });
          }

          // Handle additional crop types if provided
          if (createCropDto.cropTypes && createCropDto.cropTypes.length > 0) {
            const existingCropTypeNames = existingCrop.cropType.map(ct => ct.name);
            const newCropTypes = createCropDto.cropTypes.filter(
              ct => !existingCropTypeNames.includes(ct.name)
            );

            for (let cropType of newCropTypes) {
              await prisma.cropType.create({
                data: {
                  name: cropType.name,
                  cropId: existingCrop.id
                }
              });
            }
          }

          // Return updated crop
          return await prisma.crop.findUnique({
            where: { id: existingCrop.id },
            include: {
              names: true,
              cropType: true
            }
          });
        } else {
          // Create new crop
          let crop = await prisma.crop.create({
            data: {
              createdBy: user.id,
              country: user.country
            }
          });

          // Create crop names
          if (createCropDto.names && createCropDto.names.length > 0) {
            await prisma.cropNames.createMany({
              data: createCropDto.names.map(nameDto => ({
                name: nameDto.name,
                languageName: nameDto.languageName,
                languageCode: nameDto.languageCode,
                cropId: crop.id
              }))
            });
          }

          // Handle crop types
          if (createCropDto.cropTypes && createCropDto.cropTypes.length > 0) {
            for (let cropType of createCropDto.cropTypes) {
              await prisma.cropType.create({
                data: {
                  name: cropType.name,
                  cropId: crop.id
                }
              });
            }
          }

          // Return the created crop with all relations
          return await prisma.crop.findUnique({
            where: { id: crop.id },
            include: {
              names: true,
              cropType: true
            }
          });
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async bulkCreate(bulkCreateCropDto: BulkCreateCropDto, user: User) {
    try {
      const results = [];

      // Process crops in smaller batches to avoid transaction timeouts
      const BATCH_SIZE = 3; // Reduce batch size for complex operations

      for (let i = 0; i < bulkCreateCropDto.crops.length; i += BATCH_SIZE) {
        const batch = bulkCreateCropDto.crops.slice(i, i + BATCH_SIZE);

        // Process batch in parallel with individual transactions
        const batchPromises = batch.map(cropDto =>
          this.createSingleCropWithDetails(cropDto, user)
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      return results;
    } catch (error) {
      throw new BadRequestException(`Bulk create failed: ${error.message}`);
    }
  }

  private async createSingleCropWithDetails(cropDto: BulkCropDto, user: User) {
    return await this.dataBaseService.$transaction(async (prisma) => {
      try {
        // 1. Check if crop exists by looking for any matching name in any language
        let crop = await prisma.crop.findFirst({
          where: {
            names: {
              some: {
                name: {
                  in: cropDto.names?.map(n => n.name)
                }
              }
            },
            country: user.country
          },
          include: {
            names: true
          }
        });

        if (!crop) {
          // Create new crop
          crop = await prisma.crop.create({
            data: {
              createdBy: user.id,
              country: user.country
            },
            include: {
              names: true
            }
          });

          // Create all provided names
          if (cropDto.names && cropDto.names.length > 0) {
            await prisma.cropNames.createMany({
              data: cropDto.names.map(nameDto => ({
                name: nameDto.name,
                languageName: nameDto.languageName,
                languageCode: nameDto.languageCode,
                cropId: crop.id
              }))
            });
          }
        } else {
          // Crop exists, check for missing names and add them
          if (cropDto.names && cropDto.names.length > 0) {
            const existingLanguages = crop.names.map(n => n.languageCode);

            for (const nameDto of cropDto.names) {
              if (!existingLanguages.includes(nameDto.languageCode)) {
                await prisma.cropNames.create({
                  data: {
                    name: nameDto.name,
                    languageName: nameDto.languageName,
                    languageCode: nameDto.languageCode,
                    cropId: crop.id
                  }
                });
              }
            }
          }
        }

        // 2. Handle all related data in parallel where possible
        const promises = [];
        if (cropDto.fertilizers && cropDto.fertilizers.length > 0) {
          promises.push(this.handleFertilizers(prisma, crop.id, cropDto.fertilizers, user));
        }
        if (cropDto.diseases && cropDto.diseases.length > 0) {
          promises.push(this.handleDiseases(prisma, crop.id, cropDto.diseases, user));
        }
        if (cropDto.pests && cropDto.pests.length > 0) {
          promises.push(this.handlePests(prisma, crop.id, cropDto.pests, user));
        }
        if (cropDto.medicines && cropDto.medicines.length > 0) {
          promises.push(this.handleMedicines(prisma, crop.id, cropDto.medicines));
        }

        // Wait for all related data to be processed
        await Promise.all(promises);

        // 3. Handle crop types and seed strains - OPTIMIZED VERSION
        if (cropDto.cropTypes && cropDto.cropTypes.length > 0) {
          await this.handleCropTypesAndSeedStrainsBatch(prisma, crop.id, cropDto.cropTypes);
        } else {
          // Create default crop type using first available name
          const defaultName = crop.names?.[0]?.name
          await this.createDefaultCropType(prisma, crop.id, defaultName);
        }

        // Return the complete crop with all relations
        return await prisma.crop.findUnique({
          where: { id: crop.id },
          include: {
            names: true,
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
      } catch (error) {
        console.error('Transaction error:', error);
        throw error;
      }
    }, {
      timeout: 60000, // Increase timeout to 60 seconds
      maxWait: 10000   // Increase max wait time
    });
  }

  // OPTIMIZED: Handle crop types and seed strains in batch operations
  private async handleCropTypesAndSeedStrainsBatch(prisma: any, cropId: string, cropTypes: BulkCropTypeDto[]) {
    // 1. Get all existing crop types for this crop
    const existingCropTypes = await prisma.cropType.findMany({
      where: {
        name: { in: cropTypes.map(ct => ct.name) },
        cropId: cropId
      },
      include: {
        seedStrains: true
      }
    });

    const existingCropTypeNames = existingCropTypes.map(ct => ct.name);
    const newCropTypes = cropTypes.filter(ct => !existingCropTypeNames.includes(ct.name));

    // 2. Create new crop types in batch
    if (newCropTypes.length > 0) {
      await prisma.cropType.createMany({
        data: newCropTypes.map(ct => ({
          name: ct.name,
          cropId: cropId
        })),
        skipDuplicates: true
      });
    }

    // 3. Get all crop types (existing + newly created)
    const allCropTypes = await prisma.cropType.findMany({
      where: {
        name: { in: cropTypes.map(ct => ct.name) },
        cropId: cropId
      },
      include: {
        seedStrains: true
      }
    });

    // 4. Prepare all seed strains for batch creation
    const allSeedStrainsToCreate = [];

    for (const cropTypeDto of cropTypes) {
      if (cropTypeDto.seedStrains && cropTypeDto.seedStrains.length > 0) {
        const matchingCropType = allCropTypes.find(ct => ct.name === cropTypeDto.name);
        if (matchingCropType) {
          const existingSeedStrainNames = matchingCropType.seedStrains.map(ss => ss.name);

          for (const seedStrainDto of cropTypeDto.seedStrains) {
            if (!existingSeedStrainNames.includes(seedStrainDto.name)) {
              allSeedStrainsToCreate.push({
                name: seedStrainDto.name,
                cropTypeId: matchingCropType.id
              });
            }
          }
        }
      }
    }

    // 5. Create all seed strains in one batch operation
    if (allSeedStrainsToCreate.length > 0) {
      await prisma.seedStrain.createMany({
        data: allSeedStrainsToCreate,
        skipDuplicates: true
      });
    }
  }

  // Add a default crop type creation method
  private async createDefaultCropType(prisma: any, cropId: string, cropName: string) {
    // Check if any crop type already exists for this crop
    const existingCropType = await prisma.cropType.findFirst({
      where: { cropId: cropId }
    });

    if (!existingCropType) {
      await prisma.cropType.create({
        data: {
          name: `${cropName} - Standard`,
          cropId: cropId
        }
      });
    }
  }

  // Optimized fertilizer handling with batch operations
  private async handleFertilizers(prisma: any, cropId: string, fertilizerNames: string[], user: User) {
    // Get all existing fertilizers in one query
    const existingFertilizers = await prisma.feterlizer.findMany({
      where: {
        name: { in: fertilizerNames }
      }
    });

    const existingFertilizerNames = existingFertilizers.map(f => f.name);
    const newFertilizerNames = fertilizerNames.filter(name => !existingFertilizerNames.includes(name));

    // Create new fertilizers in batch
    if (newFertilizerNames.length > 0) {
      await prisma.feterlizer.createMany({
        data: newFertilizerNames.map(name => ({
          name,
          createdBy: user.id
        })),
        skipDuplicates: true
      });
    }

    // Get all fertilizers (existing + newly created)
    const allFertilizers = await prisma.feterlizer.findMany({
      where: {
        name: { in: fertilizerNames }
      }
    });

    // Get existing crop-fertilizer relations
    const existingRelations = await prisma.crop.findFirst({
      where: { id: cropId },
      include: {
        fertilisers: {
          where: {
            id: { in: allFertilizers.map(f => f.id) }
          }
        }
      }
    });

    const existingFertilizerIds = existingRelations?.fertilisers?.map(f => f.id) || [];
    const newConnectionIds = allFertilizers
      .filter(f => !existingFertilizerIds.includes(f.id))
      .map(f => ({ id: f.id }));

    // Connect new fertilizers to crop
    if (newConnectionIds.length > 0) {
      await prisma.crop.update({
        where: { id: cropId },
        data: {
          fertilisers: {
            connect: newConnectionIds
          }
        }
      });
    }
  }

  // Optimized disease handling
  private async handleDiseases(prisma: any, cropId: string, diseases: BulkDiseaseDto[], user: User) {
    // Get existing diseases
    const existingDiseases = await prisma.disease.findMany({
      where: {
        OR: diseases.map(d => ({
          name: d.name,
          type: d.type
        }))
      }
    });

    // Find diseases that need to be created
    const newDiseases = diseases.filter(diseaseDto =>
      !existingDiseases.some(existing =>
        existing.name === diseaseDto.name && existing.type === diseaseDto.type
      )
    );

    // Create new diseases in batch
    if (newDiseases.length > 0) {
      await prisma.disease.createMany({
        data: newDiseases.map(d => ({
          name: d.name,
          type: d.type,
          medication: d.medication,
          createdBy: user.id
        })),
        skipDuplicates: true
      });
    }

    // Get all diseases for connection
    const allDiseases = await prisma.disease.findMany({
      where: {
        OR: diseases.map(d => ({
          name: d.name,
          type: d.type
        }))
      }
    });

    // Get existing crop-disease relations
    const existingRelations = await prisma.crop.findFirst({
      where: { id: cropId },
      include: {
        diseases: {
          where: {
            id: { in: allDiseases.map(d => d.id) }
          }
        }
      }
    });

    const existingDiseaseIds = existingRelations?.diseases?.map(d => d.id) || [];
    const newConnectionIds = allDiseases
      .filter(d => !existingDiseaseIds.includes(d.id))
      .map(d => ({ id: d.id }));

    // Connect new diseases to crop
    if (newConnectionIds.length > 0) {
      await prisma.crop.update({
        where: { id: cropId },
        data: {
          diseases: {
            connect: newConnectionIds
          }
        }
      });
    }
  }

  // Optimized pest handling
  private async handlePests(prisma: any, cropId: string, pests: BulkPestDto[], user: User) {
    // Get existing pests
    const existingPests = await prisma.pest.findMany({
      where: {
        OR: pests.map(p => ({
          name: p.name,
          type: p.type
        }))
      }
    });

    // Find pests that need to be created
    const newPests = pests.filter(pestDto =>
      !existingPests.some(existing =>
        existing.name === pestDto.name && existing.type === pestDto.type
      )
    );

    // Create new pests in batch
    if (newPests.length > 0) {
      await prisma.pest.createMany({
        data: newPests.map(p => ({
          name: p.name,
          type: p.type,
          medication: p.medication,
          createdBy: user.id
        })),
        skipDuplicates: true
      });
    }

    // Get all pests for connection
    const allPests = await prisma.pest.findMany({
      where: {
        OR: pests.map(p => ({
          name: p.name,
          type: p.type
        }))
      }
    });

    // Get existing crop-pest relations
    const existingRelations = await prisma.crop.findFirst({
      where: { id: cropId },
      include: {
        pests: {
          where: {
            id: { in: allPests.map(p => p.id) }
          }
        }
      }
    });

    const existingPestIds = existingRelations?.pests?.map(p => p.id) || [];
    const newConnectionIds = allPests
      .filter(p => !existingPestIds.includes(p.id))
      .map(p => ({ id: p.id }));

    // Connect new pests to crop
    if (newConnectionIds.length > 0) {
      await prisma.crop.update({
        where: { id: cropId },
        data: {
          pests: {
            connect: newConnectionIds
          }
        }
      });
    }
  }

  // Optimized medicine handling
  private async handleMedicines(prisma: any, cropId: string, medicineNames: string[]) {
    // Get existing medicines
    const existingMedicines = await prisma.medicine.findMany({
      where: {
        name: { in: medicineNames }
      }
    });

    const existingMedicineNames = existingMedicines.map(m => m.name);
    const newMedicineNames = medicineNames.filter(name => !existingMedicineNames.includes(name));

    // Create new medicines in batch
    if (newMedicineNames.length > 0) {
      await prisma.medicine.createMany({
        data: newMedicineNames.map(name => ({ name })),
        skipDuplicates: true
      });
    }

    // Get all medicines
    const allMedicines = await prisma.medicine.findMany({
      where: {
        name: { in: medicineNames }
      }
    });

    // Get existing crop-medicine relations
    const existingRelations = await prisma.cropMedicine.findMany({
      where: {
        cropId: cropId,
        medicineId: { in: allMedicines.map(m => m.id) }
      }
    });

    const existingMedicineIds = existingRelations.map(r => r.medicineId);
    const newRelations = allMedicines
      .filter(m => !existingMedicineIds.includes(m.id))
      .map(m => ({
        cropId: cropId,
        medicineId: m.id
      }));

    // Create new crop-medicine relations in batch
    if (newRelations.length > 0) {
      await prisma.cropMedicine.createMany({
        data: newRelations,
        skipDuplicates: true
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
      return await this.dataBaseService.$transaction(async (prisma) => {
        // Update the crop itself
        const updatedCrop = await prisma.crop.update({
          where: { id: id },
          data: {
            // Add any other crop fields that need updating here
          }
        });

        // Handle names updates if provided
        if (updateCropDto.names && updateCropDto.names.length > 0) {
          // Get existing names for this crop
          const existingNames = await prisma.cropNames.findMany({
            where: { cropId: id }
          });

          // Process each name in the update
          for (const nameDto of updateCropDto.names) {
            // Check if a name with the same language already exists
            const existingName = existingNames.find(
              existing => existing.languageCode === nameDto.languageCode
            );

            if (existingName) {
              // Update existing name for this language
              await prisma.cropNames.update({
                where: { id: existingName.id },
                data: {
                  name: nameDto.name,
                  languageName: nameDto.languageName
                }
              });
            } else {
              // Create new name for this language
              await prisma.cropNames.create({
                data: {
                  name: nameDto.name,
                  languageName: nameDto.languageName,
                  languageCode: nameDto.languageCode,
                  cropId: id
                }
              });
            }
          }
        }

        // Return the updated crop with names
        return await prisma.crop.findUnique({
          where: { id: id },
          include: {
            names: true,
            cropType: true
          }
        });
      });
    } catch (error) {
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
