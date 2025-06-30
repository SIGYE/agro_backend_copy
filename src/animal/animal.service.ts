import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { DatabaseService } from 'src/database/database.service';
import * as XLSX from 'xlsx';
import { CreateAnimalProductDto } from './dto/create-animal-product.dto';
import { LocationService } from 'src/location/location.service';
import { BulkAnimalDiseaseDto, BulkAnimalDto, BulkAnimalPestDto, BulkAnimalProductDto, BulkBreedDto, BulkCreateAnimalDto } from './dto/bulk-create.dtos';
import { User } from '@prisma/client';


@Injectable()
export class AnimalService {
  constructor(private readonly dataBaseService: DatabaseService, private readonly locationService: LocationService) {

  }
  async create(createAnimalDto: CreateAnimalDto, userId: string) {
    try {
      console.log('createAnimalDto : ' + createAnimalDto)
      return await this.dataBaseService.animal.create({
        data: {
          // name: createAnimalDto.name,
          createdBy: userId
        }
      })
    } catch (error) {
      console.log('error : ' + error)
      throw new BadRequestException(error.message);
    }
  }
  async createAnimalProduct(createAnimalProduct: CreateAnimalProductDto) {
    try {
      return await this.dataBaseService.animalProduct.create({
        data: {
          name: createAnimalProduct.name,
          animal: {
            connect: {
              id: createAnimalProduct.animalId
            }
          }
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async bulkCreateAnimals(bulkCreateAnimalDto: BulkCreateAnimalDto, user: User) {
    try {
      const results = [];

      // Process animals in smaller batches to avoid transaction timeouts
      const BATCH_SIZE = 3;

      for (let i = 0; i < bulkCreateAnimalDto.animals.length; i += BATCH_SIZE) {
        const batch = bulkCreateAnimalDto.animals.slice(i, i + BATCH_SIZE);

        // Process batch in parallel with individual transactions
        const batchPromises = batch.map(animalDto =>
          this.createSingleAnimalWithDetails(animalDto, user)
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      return results;
    } catch (error) {
      throw new BadRequestException(`Animal bulk create failed: ${error.message}`);
    }
  }

  private async createSingleAnimalWithDetails(animalDto: BulkAnimalDto, user: User) {
    return await this.dataBaseService.$transaction(async (prisma) => {
      try {
        // 1. Create or get existing animal
        let animal = await prisma.animal.findFirst({
          where: {
            // name: animalDto.name,
            createdBy: user.id
          }
        });

        if (!animal) {
          animal = await prisma.animal.create({
            data: {
              // name: animalDto.namesp,
              createdBy: user.id
            }
          });
        }

        // 2. Handle all related data in parallel where possible
        const promises = [];

        if (animalDto.vaccines && animalDto.vaccines.length > 0) {
          promises.push(this.handleAnimalVaccines(prisma, animal.id, animalDto.vaccines));
        }

        if (animalDto.medicines && animalDto.medicines.length > 0) {
          promises.push(this.handleAnimalMedicines(prisma, animal.id, animalDto.medicines));
        }

        if (animalDto.diseases && animalDto.diseases.length > 0) {
          promises.push(this.handleAnimalDiseases(prisma, animal.id, animalDto.diseases, user));
        }

        if (animalDto.pests && animalDto.pests.length > 0) {
          promises.push(this.handleAnimalPests(prisma, animal.id, animalDto.pests, user));
        }

        // Wait for all related data to be processed
        await Promise.all(promises);

        // 3. Handle breeds and animal products (must be after animal creation)
        if (animalDto.breeds && animalDto.breeds.length > 0) {
          await this.handleAnimalBreeds(prisma, animal.id, animalDto.breeds);
        }

        if (animalDto.animalProducts && animalDto.animalProducts.length > 0) {
          await this.handleAnimalProducts(prisma, animal.id, animalDto.animalProducts);
        }

        // Return the complete animal with all relations
        return await prisma.animal.findUnique({
          where: { id: animal.id },
          include: {
            breeds: true,
            animalProducts: true,
            animalVaccinations: {
              include: {
                vaccine: true
              }
            },
            animalMedicines: {
              include: {
                medicine: true
              }
            },
            // Note: diseases and pests are many-to-many relations through arrays
            // You might need to adjust based on your actual schema
          }
        });
      } catch (error) {
        console.error('Animal transaction error:', error);
        throw error;
      }
    }, {
      timeout: 60000, // 60 seconds timeout
      maxWait: 10000   // 10 seconds max wait
    });
  }

  // Handle animal vaccines with batch operations
  private async handleAnimalVaccines(prisma: any, animalId: string, vaccineNames: string[]) {
    // Get existing vaccines
    const existingVaccines = await prisma.vaccine.findMany({
      where: {
        name: { in: vaccineNames }
      }
    });

    const existingVaccineNames = existingVaccines.map(v => v.name);
    const newVaccineNames = vaccineNames.filter(name => !existingVaccineNames.includes(name));

    // Create new vaccines in batch
    if (newVaccineNames.length > 0) {
      await prisma.vaccine.createMany({
        data: newVaccineNames.map(name => ({ name })),
        skipDuplicates: true
      });
    }

    // Get all vaccines (existing + newly created)
    const allVaccines = await prisma.vaccine.findMany({
      where: {
        name: { in: vaccineNames }
      }
    });

    // Get existing animal-vaccine relations
    const existingRelations = await prisma.animalVaccine.findMany({
      where: {
        animalId: animalId,
        vaccineId: { in: allVaccines.map(v => v.id) }
      }
    });

    const existingVaccineIds = existingRelations.map(r => r.vaccineId);
    const newRelations = allVaccines
      .filter(v => !existingVaccineIds.includes(v.id))
      .map(v => ({
        animalId: animalId,
        vaccineId: v.id
      }));

    // Create new animal-vaccine relations in batch
    if (newRelations.length > 0) {
      await prisma.animalVaccine.createMany({
        data: newRelations,
        skipDuplicates: true
      });
    }
  }

  // Handle animal medicines with batch operations
  private async handleAnimalMedicines(prisma: any, animalId: string, medicineNames: string[]) {
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

    // Get existing animal-medicine relations
    const existingRelations = await prisma.animalMedicine.findMany({
      where: {
        animalId: animalId,
        medicineId: { in: allMedicines.map(m => m.id) }
      }
    });

    const existingMedicineIds = existingRelations.map(r => r.medicineId);
    const newRelations = allMedicines
      .filter(m => !existingMedicineIds.includes(m.id))
      .map(m => ({
        animalId: animalId,
        medicineId: m.id
      }));

    // Create new animal-medicine relations in batch
    if (newRelations.length > 0) {
      await prisma.animalMedicine.createMany({
        data: newRelations,
        skipDuplicates: true
      });
    }
  }

  // Handle animal diseases with batch operations
  private async handleAnimalDiseases(prisma: any, animalId: string, diseases: BulkAnimalDiseaseDto[], user: User) {
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

    // Get existing animal-disease relations
    const existingRelations = await prisma.animal.findFirst({
      where: { id: animalId },
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

    // Connect new diseases to animal
    if (newConnectionIds.length > 0) {
      await prisma.animal.update({
        where: { id: animalId },
        data: {
          diseases: {
            connect: newConnectionIds
          }
        }
      });
    }
  }

  // Handle animal pests with batch operations
  private async handleAnimalPests(prisma: any, animalId: string, pests: BulkAnimalPestDto[], user: User) {
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

    // Get existing animal-pest relations
    const existingRelations = await prisma.animal.findFirst({
      where: { id: animalId },
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

    // Connect new pests to animal
    if (newConnectionIds.length > 0) {
      await prisma.animal.update({
        where: { id: animalId },
        data: {
          pests: {
            connect: newConnectionIds
          }
        }
      });
    }
  }

  // Handle animal breeds with batch operations
  private async handleAnimalBreeds(prisma: any, animalId: string, breeds: BulkBreedDto[]) {
    // Get existing breeds for this animal
    const existingBreeds = await prisma.breed.findMany({
      where: {
        animalId: animalId,
        breedName: { in: breeds.map(b => b.breedName) }
      }
    });

    const existingBreedNames = existingBreeds.map(b => b.breedName);
    const newBreeds = breeds.filter(b => !existingBreedNames.includes(b.breedName));

    // Create new breeds in batch
    if (newBreeds.length > 0) {
      await prisma.breed.createMany({
        data: newBreeds.map(b => ({
          breedName: b.breedName,
          animalId: animalId
        })),
        skipDuplicates: true
      });
    }
  }

  // Handle animal products with batch operations
  private async handleAnimalProducts(prisma: any, animalId: string, animalProducts: BulkAnimalProductDto[]) {
    // Get existing animal products for this animal
    const existingProducts = await prisma.animalProduct.findMany({
      where: {
        animalId: animalId,
        name: { in: animalProducts.map(p => p.name) }
      }
    });

    const existingProductNames = existingProducts.map(p => p.name);
    const newProducts = animalProducts.filter(p => !existingProductNames.includes(p.name));

    // Create new animal products in batch
    if (newProducts.length > 0) {
      await prisma.animalProduct.createMany({
        data: newProducts.map(p => ({
          name: p.name,
          animalId: animalId
        })),
        skipDuplicates: true
      });
    }
  }
  async findAll() {
    try {
      return await this.dataBaseService.animal.findMany();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async findAllAnimalProducts(animalId: string) {
    try {
      return await this.dataBaseService.animalProduct.findMany({
        where: {
          animalId: animalId
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async getAnimalCardData(locationId?: number, cooperativeId?: string) {
    try {
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
      if (cooperativeId) {
        const cooperative = await this.dataBaseService.cooperative.findUnique({
          where: {
            id: cooperativeId
          }
        });
        if (!cooperative) {
          throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
        }
      }
      const locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {};
      const cooperativeQuery = cooperativeId
        ? {
          cooperativeId: cooperativeId
        } : {}
      let totalAnimals = await this.dataBaseService.animal.count({
        where: {
          animalFarmerRegistrations: {
            some: {
              farmer: {
                user: {
                  ...locationQuery
                },
                ...cooperativeQuery

              }
            }
          }
        }
      })
      let totalBreed = await this.dataBaseService.breed.count({
        where: {
          animal: {
            animalFarmerRegistrations: {
              some: {
                farmer: {
                  user: {
                    ...locationQuery
                  },
                  ...cooperativeQuery
                }
              }
            }
          }
        }
      })

      return {
        totalBreed,
        totalAnimals
      }


    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getAnimalFarmersData(locationId?: number, cooperativeId?: string) {
    try {
      // Handle location filtering
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

      // Build query conditions
      const locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {};
      const cooperativeQuery = cooperativeId ? { cooperativeId } : {};

      // Get animals with their farmer registrations
      const animals = await this.dataBaseService.animal.findMany({
        include: {
          animalFarmerRegistrations: {
            include: {
              farmer: {
                include: {
                  cooperative: true
                }
              }
            }
          }
        }
      });

      // Process and transform the data
      const result = animals.map(animal => {
        // Filter farmer registrations based on location and cooperative
        const filteredRegistrations = animal.animalFarmerRegistrations.filter(registration => {
          const meetsLocationCriteria = locationIds.length === 0 ||
            (registration.farmer.cooperative &&
              locationIds.includes(registration.farmer.cooperative.locationId));

          const meetsCooperativeCriteria = !cooperativeId ||
            registration.farmer.cooperativeId === cooperativeId;

          return meetsLocationCriteria && meetsCooperativeCriteria;
        });

        // Calculate totals
        const totalFarmers = filteredRegistrations.length;
        const totalAnimals = filteredRegistrations.reduce((sum, reg) => sum + reg.totalNumber, 0);
        const totalMales = filteredRegistrations.reduce((sum, reg) => sum + reg.maleNumber, 0);
        const totalFemales = filteredRegistrations.reduce((sum, reg) => sum + reg.femaleNumber, 0);

        return {
          id: animal.id,
          name: animal.name,
          statistics: {
            totalFarmers,
            totalAnimals,
            totalMales,
            totalFemales
          }
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
  async getAnimalCompleteStatistics(locationId?: number, cooperativeId?: string) {
    try {
      // Handle location filtering
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

      const animals = await this.dataBaseService.animal.findMany({
        include: {
          breeds: true,
          animalProducts: {
            include: {
              farmerAnimalRegistrationProduces: {
                include: {
                  animalFarmerRegistration: true
                }
              }
            }
          },
          animalFarmerRegistrations: {
            include: {
              farmer: {
                include: {
                  cooperative: true
                }
              },
              liveStockRegistrations: {
                include: {
                  farmerAnimalRegistrationProduce: {
                    include: {
                      animalProduct: true
                    }
                  },
                  breed: true
                }
              }
            }
          }
        }
      });

      const result = animals.map(animal => {
        // Filter farmer registrations based on location and cooperative
        const filteredRegistrations = animal.animalFarmerRegistrations.filter(registration => {
          const meetsLocationCriteria = locationIds.length === 0 ||
            (registration.farmer.cooperative &&
              locationIds.includes(registration.farmer.cooperative.locationId));

          const meetsCooperativeCriteria = !cooperativeId ||
            registration.farmer.cooperativeId === cooperativeId;

          return meetsLocationCriteria && meetsCooperativeCriteria;
        });

        // Calculate total breeds
        const totalBreeds = animal.breeds.length;

        // Calculate total farmers (from filtered registrations)
        const totalFarmers = filteredRegistrations.length;

        // Calculate products statistics using filtered registrations
        const productStats = animal.animalProducts.map(product => {
          const producesByMeasurement = {};

          // Get all produces for this product from filtered registrations
          const allProduces = filteredRegistrations.flatMap(registration =>
            registration.liveStockRegistrations.flatMap(livestock =>
              livestock.farmerAnimalRegistrationProduce.filter(produce =>
                produce.animalProductId === product.id
              )
            )
          );

          // Sum up amounts by measurement type
          allProduces.forEach(produce => {
            const measurement = produce.measurements;
            if (!producesByMeasurement[measurement]) {
              producesByMeasurement[measurement] = 0;
            }
            producesByMeasurement[measurement] += produce.amount;
          });

          return {
            productId: product.id,
            productName: product.name,
            totalProduceByMeasurement: Object.entries(producesByMeasurement).map(([measurement, amount]) => ({
              measurement,
              totalAmount: amount
            }))
          };
        });

        // Calculate breed statistics from filtered registrations
        const breedStats = animal.breeds.map(breed => {
          const totalLivestock = filteredRegistrations.reduce((sum, registration) =>
            sum + registration.liveStockRegistrations.filter(livestock =>
              livestock.breedId === breed.id
            ).length
            , 0);

          return {
            breedId: breed.id,
            breedName: breed.breedName,
            totalLivestock
          };
        });

        // Calculate additional livestock statistics
        const livestockStats = {
          totalLivestock: filteredRegistrations.reduce((sum, reg) =>
            sum + reg.liveStockRegistrations.length, 0),
          byPurpose: this.groupLivestockByPurpose(
            filteredRegistrations.flatMap(reg => reg.liveStockRegistrations)
          ),
          byAnimalState: this.groupLivestockByState(
            filteredRegistrations.flatMap(reg => reg.liveStockRegistrations)
          )
        };

        return {
          id: animal.id,
          name: animal.name,
          statistics: {
            totalBreeds,
            totalFarmers,
            breedStatistics: breedStats,
            productStatistics: productStats,
            livestockStatistics: livestockStats
          }
        };
      });

      return result;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch animal complete statistics');
    }
  }

  // Helper methods for grouping livestock
  private groupLivestockByPurpose(livestock: any[]) {
    const purposeGroups = {};
    livestock.forEach(item => {
      if (!purposeGroups[item.purpose]) {
        purposeGroups[item.purpose] = 0;
      }
      purposeGroups[item.purpose]++;
    });
    return Object.entries(purposeGroups).map(([purpose, count]) => ({
      purpose,
      count
    }));
  }

  private groupLivestockByState(livestock: any[]) {
    const stateGroups = {};
    livestock.forEach(item => {
      if (!stateGroups[item.animalState]) {
        stateGroups[item.animalState] = 0;
      }
      stateGroups[item.animalState]++;
    });
    return Object.entries(stateGroups).map(([state, count]) => ({
      state,
      count
    }));
  }

  async findOne(id: string) {
    try {
      return await this.dataBaseService.animal.findUnique({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(id: string, updateAnimalDto: UpdateAnimalDto) {
    try {
      return await this.dataBaseService.animal.update({
        where: {
          id: id
        },
        data: {
          // name: updateAnimalDto.name
        }
      });
    }
    catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: string) {
    try {
      return await this.dataBaseService.animal.delete({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async importAnimals(file: Express.Multer.File, userId: string): Promise<{ success: number; failed: number; errors: any[] }> {
    // if (!file) {
    //   throw new BadRequestException('No file uploaded');
    // }

    // const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    // const sheetName = workbook.SheetNames[0];
    // const worksheet = workbook.Sheets[sheetName];
    // const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // // Skip the first row (assuming it's the header row)
    // const rowsToProcess = data.slice(1);

    // let success = 0;
    // let failed = 0;
    // const errors = [];

    // for (const row of rowsToProcess) {
    //   try {
    //     // Map the row to a userDto-like object based on the cell index
    //     let animalDto = {
    //       name: row[0],
    //       purpose: row[1]

    //     };


    //     await this.create(animalDto, userId) // Register vet with the custom object
    //     success++;
    //   } catch (error) {
    //     failed++;
    //     errors.push({
    //       row: row,
    //       error: error.message || 'Unknown error occurred',
    //     });
    //   }
    // }

    return { success: 0, failed: 0, errors: [] };
  }
  // async assignLivestockDisease(livestockId: string, diseaseId: string) {
  //   try {
  //     return await this.dataBaseService.livestock.update({
  //       where: {
  //         id: livestockId
  //       },
  //       data: {
  //         diseases: {
  //           connect: {
  //             id: diseaseId
  //           }
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     throw new BadRequestException(error.message);
  //   }
  // }
  async getAnimalsWithProductStats() {
    const animals = await this.dataBaseService.animal.findMany({
      include: {
        animalProducts: {
          include: {
            farmerAnimalRegistrationProduces: {
              select: {
                amount: true,
                measurements: true,
              },
            },
          },
        },
      },
    });

    // Process and aggregate production stats
    return animals.map((animal) => ({
      id: animal.id,
      name: animal.name,
      animalProducts: animal.animalProducts.map((product) => {
        const totalAmount = product.farmerAnimalRegistrationProduces.reduce(
          (sum, produce) => sum + produce.amount,
          0
        );

        return {
          id: product.id,
          name: product.name,
          totalAmount,
          measurements:
            product.farmerAnimalRegistrationProduces.length > 0
              ? product.farmerAnimalRegistrationProduces[0].measurements
              : null, // Assuming all measurements are the same for a product
        };
      }),
    }));
  }
  async getFarmersByProduct(productId: string) {
    // Fetch farmers who have registered animals producing this product
    const farmers = await this.dataBaseService.farmer.findMany({
      include: {
        user: {
          select: { firstName: true, lastName: true, telephone: true },
        },
        cooperative: {
          select: { id: true, name: true, type: true },
        },
        animalFarmerRegistrations: {
          include: {
            liveStockRegistrations: {
              include: {
                farmerAnimalRegistrationProduce: {
                  where: { animalProductId: productId },
                  select: { amount: true, measurements: true },
                },
              },
            },
          },
        },
      },
    });

    // Organize farmers into two groups
    const farmersWithoutCoop = [];
    const cooperativesMap = new Map();

    farmers.forEach((farmer) => {
      const produceRecords = farmer.animalFarmerRegistrations.flatMap((afr) =>
        afr.liveStockRegistrations.flatMap((lsr) =>
          lsr.farmerAnimalRegistrationProduce,
        ),
      );

      if (produceRecords.length === 0) return; // Skip farmers without relevant products

      // Aggregate total amount and get measurement (assuming same measurement for a product)
      const totalAmount = produceRecords.reduce((sum, record) => sum + record.amount, 0);
      const measurement = produceRecords[0].measurements; // Taking measurement from the first record

      if (!farmer.cooperative) {
        // Farmers without a cooperative
        farmersWithoutCoop.push({
          name: farmer.user.firstName + " " + farmer.user.lastName,
          phoneNumber: farmer.user.telephone,
          totalAmount,
          measurement,
        });
      } else {
        // Grouping by cooperative
        if (!cooperativesMap.has(farmer.cooperative.id)) {
          cooperativesMap.set(farmer.cooperative.id, {
            name: farmer.cooperative.name,
            type: farmer.cooperative.type,
            farmers: [],
          });
        }
        cooperativesMap.get(farmer.cooperative.id).farmers.push({
          name: farmer.user.firstName + " " + farmer.user.lastName,
          phoneNumber: farmer.user.telephone,
          totalAmount,
          measurement,
        });
      }
    });

    return {
      farmersWithoutCooperative: farmersWithoutCoop,
      cooperatives: Array.from(cooperativesMap.values()),
    };
  }
}
