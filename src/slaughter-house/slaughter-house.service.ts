import { Injectable } from '@nestjs/common';
import { CreateSlaughterHouseDto } from './dto/create-slaughter-house.dto';
import { UpdateSlaughterHouseDto } from './dto/update-slaughter-house.dto';
import { DatabaseService } from 'src/database/database.service';
import { SlaughterAnimalDto } from './dto/slaughter-animal.dto';
import { SlaughterRegistrationDto } from './dto/slaughter-registration.dto';
import { SlaughterProductDto } from './dto/slaughter-product.dto';
import { AnimalSlaughtProductDto } from './dto/animal-slaught-product.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class SlaughterHouseService {
  constructor(private readonly databaseService: DatabaseService, private readonly userService: UsersService) { }
  async create(createSlaughterHouseDto: CreateSlaughterHouseDto) {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "BUTCHER"
        }
      });
      let user = await this.userService.create({ roleId: role.id, ...createSlaughterHouseDto });
      let slaughterHouse = await this.databaseService.slaughterHouse.create({
        data: {
          name: createSlaughterHouseDto.firstName,
          telephone: createSlaughterHouseDto.telephone,
          user: {
            connect: {
              id: user.id
            }
          }
        }
      })



      if (createSlaughterHouseDto.slaughterAnimalRegistrations) {
        for (let slaughterAnimal of createSlaughterHouseDto.slaughterAnimalRegistrations) {
          await this.databaseService.slaughterAnimalRegistration.create({
            data: {
              slaughterHouse: slaughterHouse.id,
              animalId: slaughterAnimal.animalId,
              breedId: slaughterAnimal.breedId,
              liveStockId: slaughterAnimal.liveStockId,
              age: slaughterAnimal.age,
              weight: slaughterAnimal.weight,
              healthStatus: slaughterAnimal.healthStatus
            }
          })
        }
      }
      return await this.databaseService.slaughterHouse.findUnique({
        where: {
          id: slaughterHouse.id
        },
        include: {
          slaughterAnimalRegistrations: true
        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async findAll() {
    try {
      return await this.databaseService.slaughterHouse.findMany({
        include: {
          slaughterAnimalRegistrations: true
        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.slaughterHouse.findUnique({
        where: {
          id: id
        },
        include: {
          slaughterAnimalRegistrations: true
        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async update(id: string, updateSlaughterHouseDto: UpdateSlaughterHouseDto) {
    try {
      let slaughterHouse = await this.databaseService.slaughterHouse.findUnique({
        where: {
          id: id
        }
      })
      if (!slaughterHouse) {
        throw new Error("SlaughterHouse not found")
      }
      return await this.databaseService.slaughterHouse.update({
        where: {
          id: id
        },
        data: {
          name: updateSlaughterHouseDto.firstName,
          telephone: updateSlaughterHouseDto.telephone
        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async assignAnimalsToSlaughterHouse(slaughterHouseId: string, slaughterAnimalRegistrations: SlaughterAnimalDto[]) {
    try {
      let slaughterHouse = await this.databaseService.slaughterHouse.findUnique({
        where: {
          id: slaughterHouseId
        }
      })
      if (!slaughterHouse) {
        throw new Error("SlaughterHouse not found")
      }
      for (let slaughterAnimal of slaughterAnimalRegistrations) {
        await this.databaseService.slaughterAnimalRegistration.create({
          data: {
            slaughterHouse: slaughterHouse.id,
            animalId: slaughterAnimal.animalId,
            breedId: slaughterAnimal.breedId,
            liveStockId: slaughterAnimal.liveStockId,
            age: slaughterAnimal.age,
            weight: slaughterAnimal.weight,
            healthStatus: slaughterAnimal.healthStatus
          }
        })
      }
      return await this.databaseService.slaughterHouse.findUnique({
        where: {
          id: slaughterHouse.id
        },
        include: {
          slaughterAnimalRegistrations: true
        }
      })

    } catch (error) {
      throw new Error(error.message)
    }
  }
  async findAllSlaughterAnimalRegistrationsBySlaughterHouseId(slaughterHouseId: string) {
    try {
      return await this.databaseService.slaughterAnimalRegistration.findMany({
        where: {
          slaughterHouse: slaughterHouseId
        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }
  async createSlaughterRegistration(slaughterRegistrationDto: SlaughterRegistrationDto) {
    try {
      let slaughterAnimalRegistration = await this.databaseService.slaughterAnimalRegistration.findUnique({
        where: {
          id: slaughterRegistrationDto.slaughterAnimalRegistrationId
        }
      })
      if (!slaughterAnimalRegistration) {
        throw new Error("Slaughter Animal Registration not found")
      }
      return await this.databaseService.slaughterRegistration.create({
        data: {
          slaughterAnimalRegistrationId: slaughterRegistrationDto.slaughterAnimalRegistrationId,
          slaughterDate: new Date(slaughterRegistrationDto.slaughterDate),
          preSlaughterWeight: slaughterRegistrationDto.preSlaughterWeight,
          postSlaughterWeight: slaughterRegistrationDto.postSlaughterWeight,

        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }
  async findAllSlaughterRegistrations() {
    try {
      return await this.databaseService.slaughterRegistration.findMany()
    } catch (error) {
      throw new Error(error.message)
    }
  }
  async findAllSlaughterRegistrationsByAnimalRegistrationId(slaughterAnimalRegistrationId: string) {
    try {
      return await this.databaseService.slaughterRegistration.findMany({
        where: {
          slaughterAnimalRegistrationId: slaughterAnimalRegistrationId
        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }
  async createSlaughterProduct(slaughterProduct: SlaughterProductDto) {
    try {
      return await this.databaseService.slaughterProducts.create({
        data: {
          productName: slaughterProduct.productName,
        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }
  async findAllSlaughterProducts() {
    try {
      return await this.databaseService.slaughterProducts.findMany()
    } catch (error) {
      throw new Error(error.message)
    }
  }
  async createAnimalSlaughterProduct(animalSlaughterProduct: AnimalSlaughtProductDto) {
    try {
      return await this.databaseService.animalSlaughterProduct.create({
        data: {
          productId: animalSlaughterProduct.productId,
          slaughterRegistrationId: animalSlaughterProduct.slaughterRegistrationId
        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }
  async findAllAnimalSlaughterProducts() {
    try {
      return await this.databaseService.animalSlaughterProduct.findMany()
    } catch (error) {
      throw new Error(error.message)
    }
  }
  async findAllSlaughterProductsBySlaughterRegistrationId(slaughterRegistrationId: string) {
    try {
      return await this.databaseService.animalSlaughterProduct.findMany({
        where: {
          slaughterRegistrationId: slaughterRegistrationId
        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }
  async remove(id: string) {
    try {
      return await this.databaseService.slaughterHouse.delete({
        where: {
          id: id
        }
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }
}
