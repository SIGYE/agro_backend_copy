import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { DatabaseService } from 'src/database/database.service';
import { LocationService } from 'src/location/location.service';
import { Farmer } from '@prisma/client';
import { UsersService } from 'src/users/users.service';
import { AssignCropToFarmerDto } from './dto/assign-crop-to-farmerDto';
import * as XLSX from 'xlsx';
import { AssignAnimalToFarmerDto } from './dto/assign-animal-to-famer.dto';
import { UpdateCropFarmerDto } from './dto/update-crop-farmer.dto';
import { UpdateAnimalFarmerDto } from './dto/update-animal-farmer.dto';

@Injectable()
export class FarmerService {
  constructor(private readonly databaseService: DatabaseService, private readonly locationService: LocationService, private readonly userServcice: UsersService) { }
  async registerFarmer(CreateFarmerDto: CreateFarmerDto): Promise<Farmer> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "FARMER"
        }
      });
      let user = await this.userServcice.create({ roleId: role.id, ...CreateFarmerDto });

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
              plantationArea: crop.plantationArea,
              seeds: crop.seeds,
              produceHarvested: crop.produceHarvested,
              farmer: {
                connect: {
                  id: farmer.id
                }
              },
              crop: {
                connect: {
                  id: crop.cropsId
                }
              }
            }
          })
          await this.databaseService.cropFertilizerFarmerRegistration.create({
            data: {
              fertilizerId: crop.fertilizerId,
              cropFarmerRegistrationId: cropFarmer.id,
              amount: crop.amountOfFertilizer,
              measurement: crop.measurementUnit


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
            plantationArea: crop.plantationArea,
            seeds: crop.seeds,
            produceHarvested: crop.produceHarvested,
            farmer: {
              connect: {
                id: farmer.id
              }
            },
            crop: {
              connect: {
                id: crop.cropsId
              }
            },
          }
        })
        await this.databaseService.cropFertilizerFarmerRegistration.create({
          data: {
            fertilizerId: crop.fertilizerId,
            cropFarmerRegistrationId: cropFarmer.id,
            amount: crop.amountOfFertilizer,
            measurement: crop.measurementUnit
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
          plantationArea: updateCropFarmerRegistrationDto.plantationArea,
          seeds: updateCropFarmerRegistrationDto.seeds,
          produceHarvested: updateCropFarmerRegistrationDto.produceHarvested,
          crop: {
            connect: {
              id: updateCropFarmerRegistrationDto.cropsId
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
          cropFarmerRegistrations: true
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
          crop: true
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
        where: { id: farmerId }
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
}
