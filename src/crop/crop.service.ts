import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
import { Role_Enum } from '../enums/role.enum';

// Extended User type
type ExtendedUser = User & {
  effectiveRole?: string;
  role?: any;
};

@Injectable()
export class CropService {
  constructor(
    private readonly dataBaseService: DatabaseService, 
    private readonly locationService: LocationService
  ) { }

  private getRoleName(user: ExtendedUser): string {
    return (user as any)?.effectiveRole ?? (user as any)?.role?.name ?? (user as any)?.role;
  }

  // Helper method to check if user can manage crops
  private canManageCrops(user: ExtendedUser): boolean {
    const roleName = this.getRoleName(user);
    const allowedRoles = [
      Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
      Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
      Role_Enum.FARMER,
    ];
    return allowedRoles.includes(roleName as any);
  }

  // Helper method to check if user can delete crops
  private canDeleteCrops(user: ExtendedUser): boolean {
    const roleName = this.getRoleName(user);
    const allowedRoles = [
      Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
      Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
      Role_Enum.FARMER,
    ];
    return allowedRoles.includes(roleName as any);
  }

  // Helper method to get the cooperative ID for a user
  private async getUserCooperativeId(user: ExtendedUser): Promise<string | null> {
    const roleName = this.getRoleName(user);
    if (String(roleName).includes('COOPERATIVE_MANAGER')) {
      const coop = await this.dataBaseService.cooperative.findFirst({
        where: { cooperativeManagerId: user.id },
        select: { id: true },
      });
      return coop?.id ?? null;
    }
    
    if (roleName === Role_Enum.FARMER) {
      const farmer = await this.dataBaseService.farmer.findUnique({
        where: { userId: user.id },
        select: { cooperativeId: true }
      });
      return farmer?.cooperativeId || null;
    }
    
    return null;
  }

  async create(createCropDto: CreateCropDto, user: ExtendedUser) {
    try {
      // Check if user has permission to create crops
      if (!this.canManageCrops(user)) {
        throw new ForbiddenException('You do not have permission to create crops');
      }

      return await this.dataBaseService.$transaction(async (prisma) => {
        let existingCrop = null;

        // For farmers and cooperative managers, crops are specific to their cooperative
        const userCooperativeId = await this.getUserCooperativeId(user);

        if (createCropDto.names && createCropDto.names.length > 0) { 
          const nameLanguagePairs = createCropDto.names.map(nameDto => ({
            name: nameDto.name,
            languageCode: nameDto.languageCode
          }));

          // Check if crop already exists for this user/cooperative
          existingCrop = await prisma.crop.findFirst({
            where: {
              country: user.country,
              cooperativeId: userCooperativeId, // Check within same cooperative
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
          // Check if user can modify this crop
          // Only allow modification if user created the crop
          if (existingCrop.createdBy !== user.id) {
            throw new ForbiddenException('You can only modify crops that you created');
          }

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
          // Create new crop - linked to user's cooperative
          const userCooperativeId = await this.getUserCooperativeId(user);
          
          let crop = await prisma.crop.create({
            data: {
              createdBy: user.id,
              country: user.country,
              cooperativeId: userCooperativeId // Link crop to cooperative
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

  async bulkCreate(bulkCreateCropDto: BulkCreateCropDto, user: ExtendedUser) {
    try {
      // Only allow cooperative managers to do bulk creation
      const allowedBulkRoles = [
        Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
        Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
      ];
      
      const roleName = this.getRoleName(user);
      if (!allowedBulkRoles.includes(roleName as any)) {
        throw new ForbiddenException('You do not have permission to bulk create crops');
      }

      const results = [];
      const BATCH_SIZE = 3;

      for (let i = 0; i < bulkCreateCropDto.crops.length; i += BATCH_SIZE) {
        const batch = bulkCreateCropDto.crops.slice(i, i + BATCH_SIZE);

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

  private async createSingleCropWithDetails(cropDto: BulkCropDto, user: ExtendedUser) {
    return await this.dataBaseService.$transaction(async (prisma) => {
      try {
        // Get user's cooperative ID
        const userCooperativeId = await this.getUserCooperativeId(user);

        // 1. Check if crop exists within user's cooperative
        let crop = await prisma.crop.findFirst({
          where: {
            cooperativeId: userCooperativeId,
            country: user.country,
            names: {
              some: {
                name: {
                  in: cropDto.names?.map(n => n.name)
                }
              }
            }
          },
          include: {
            names: true
          }
        });

        if (!crop) {
          // Create new crop linked to user's cooperative
          crop = await prisma.crop.create({
            data: {
              createdBy: user.id,
              country: user.country,
              cooperativeId: userCooperativeId
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

        // 3. Handle crop types and seed strains
        if (cropDto.cropTypes && cropDto.cropTypes.length > 0) {
          await this.handleCropTypesAndSeedStrainsBatch(prisma, crop.id, cropDto.cropTypes);
        } else {
          const defaultName = crop.names?.[0]?.name
          await this.createDefaultCropType(prisma, crop.id, defaultName);
        }

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
      timeout: 60000,
      maxWait: 10000
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
              seedType: seedStrainDto.seedType || null,  // New field
              cropTypeId: matchingCropType.id
            });
          }
        }
      }
    }
  }

  // 5. Create all seed strains in one batch operation - UPDATED
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
  private async handleFertilizers(prisma: any, cropId: string, fertilizerNames: string[], user: ExtendedUser) {
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
  private async handleDiseases(prisma: any, cropId: string, diseases: BulkDiseaseDto[], user: ExtendedUser) {
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
        medication: d.medication || null, 
        specificType: d.specificType || null,  
        causativeAgent: d.causativeAgent || null,  
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
  private async handlePests(prisma: any, cropId: string, pests: BulkPestDto[], user: ExtendedUser) {
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

  async findAll(user: ExtendedUser) {
    try {
      const countryQuery = user.country ? {
        country: user.country
      } : {}

      // Get user's cooperative ID to filter crops
      const userCooperativeId = await this.getUserCooperativeId(user);

      // Cooperative users should see both global crops (no cooperativeId) and their cooperative crops
      const cooperativeQuery = userCooperativeId
        ? { OR: [{ cooperativeId: userCooperativeId }, { cooperativeId: null }] }
        : {};

      return await this.dataBaseService.crop.findMany({
        where: {
          ...countryQuery,
          ...cooperativeQuery
        },
        include: {
          names: true,
          cropType: {
            include: {
              seedStrains: true
            }
          }
        }
      });
    }
    catch (error) {
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

  async update(id: string, updateCropDto: UpdateCropDto, user?: ExtendedUser) {
    try {
      // If user is provided, check permissions
      if (user && !this.canManageCrops(user)) {
        throw new ForbiddenException('You do not have permission to update crops');
      }

      return await this.dataBaseService.$transaction(async (prisma) => {
        // Check ownership if user is provided
        if (user) {
          const existingCrop = await prisma.crop.findUnique({
            where: { id: id }
          });

          if (!existingCrop) {
            throw new NotFoundException('Crop not found');
          }

          // Get user's cooperative ID
          const userCooperativeId = await this.getUserCooperativeId(user);

          // Check if user created this crop AND it belongs to their cooperative
          if (existingCrop.createdBy !== user.id || existingCrop.cooperativeId !== userCooperativeId) {
            throw new ForbiddenException('You can only update crops that you created within your cooperative');
          }
        }

        // Update the crop itself
        const updatedCrop = await prisma.crop.update({
          where: { id: id },
          data: {}
        });

        // Handle names updates if provided
        if (updateCropDto.names && updateCropDto.names.length > 0) {
          const existingNames = await prisma.cropNames.findMany({
            where: { cropId: id }
          });

          for (const nameDto of updateCropDto.names) {
            const existingName = existingNames.find(
              existing => existing.languageCode === nameDto.languageCode
            );

            if (existingName) {
              await prisma.cropNames.update({
                where: { id: existingName.id },
                data: {
                  name: nameDto.name,
                  languageName: nameDto.languageName
                }
              });
            } else {
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

  async remove(id: string, user?: ExtendedUser) {
    try {
      // If user is provided, check permissions
      if (user && !this.canDeleteCrops(user)) {
        throw new ForbiddenException('You do not have permission to delete crops');
      }

      // Check ownership if user is provided
      if (user) {
        const existingCrop = await this.dataBaseService.crop.findUnique({
          where: { id: id }
        });

        if (!existingCrop) {
          throw new NotFoundException('Crop not found');
        }

        // Get user's cooperative ID
        const userCooperativeId = await this.getUserCooperativeId(user);

        // Check if user created this crop AND it belongs to their cooperative
        if (existingCrop.createdBy !== user.id || existingCrop.cooperativeId !== userCooperativeId) {
          throw new ForbiddenException('You can only delete crops that you created within your cooperative');
        }
      }

      return await this.dataBaseService.crop.delete({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Get crops by cooperative (for cooperative managers to see all crops in their cooperative)
  async getCooperativeCrops(cooperativeId: string, user: ExtendedUser) {
    try {
      // Check permissions: cooperative managers can only see their own cooperative's crops
      const roleName = this.getRoleName(user);
      if (String(roleName).includes('COOPERATIVE_MANAGER')) {
        const userCooperativeId = await this.getUserCooperativeId(user);
        if (userCooperativeId !== cooperativeId) {
          throw new ForbiddenException('You can only view your own cooperative\'s crops');
        }
      }

      if (roleName === Role_Enum.FARMER) {
        throw new ForbiddenException('You can only view your own cooperative\'s crops');
      }

      return await this.dataBaseService.crop.findMany({
        where: {
          cooperativeId: cooperativeId
        },
        include: {
          names: true,
          cropType: {
            include: {
              seedStrains: true
            }
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              telephone: true
            }
          }
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Get farmer's crops
  async getFarmerCrops(farmerId: string, user: ExtendedUser) {
    try {
      // Check if user is the farmer or their cooperative manager
      const farmer = await this.dataBaseService.farmer.findUnique({
        where: { id: farmerId },
        include: { cooperative: true }
      });

      if (!farmer) {
        throw new NotFoundException('Farmer not found');
      }

      // Authorization checks
      if (user.id !== farmer.userId) {
        // If not the farmer, check if user is their cooperative manager
        const roleName = this.getRoleName(user);
        if (!String(roleName).includes('COOPERATIVE_MANAGER')) {
          throw new ForbiddenException('You can only view your own crops or crops from your cooperative');
        }

        const userCooperativeId = await this.getUserCooperativeId(user);
        if (userCooperativeId !== farmer.cooperativeId) {
          throw new ForbiddenException('You can only view your own crops or crops from your cooperative');
        }
      }

      // Get crops created by this farmer's user account
      return await this.dataBaseService.crop.findMany({
        where: {
          createdBy: farmer.userId,
          cooperativeId: farmer.cooperativeId
        },
        include: {
          names: true,
          cropType: {
            include: {
              seedStrains: true
            }
          }
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async importCrops(file: Express.Multer.File, user: ExtendedUser): Promise<{ success: number; failed: number; errors: any[] }> {
    // Only allow cooperative managers to import
    const allowedImportRoles = [
      Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
      Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    ];
    
    const roleName = this.getRoleName(user);
    if (!allowedImportRoles.includes(roleName as any)) {
      throw new ForbiddenException('You do not have permission to import crops');
    }

  ];

  if (!user.role || !allowedImportRoles.includes(user.role.name)) {
    throw new ForbiddenException('You do not have permission to import crops');
  }

  if (!file) {
    throw new BadRequestException('No file uploaded');
  }

  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Skip the first row (header row)
  const rowsToProcess = data.slice(1);

  let success = 0;
  let failed = 0;
  const errors = [];

  for (const row of rowsToProcess) {
    try {
      // Map the row to your crop DTO
      const cropDto = {
        names: [
          {
            name: row[0],
            languageCode: 'en',
            languageName: 'English',
          },
        ],
        cropTypes: [],
      };

      await this.create(cropDto, user);
      success++;
    } catch (error) {
      failed++;
      errors.push({
        row,
        error: error.message || 'Unknown error occurred',
      });
    }
  }

  return { success, failed, errors };
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
              cropType: {
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

  async getCropTypesByCrop(cropId: string) {
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
}
