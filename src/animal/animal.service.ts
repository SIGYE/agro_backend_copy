import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { DatabaseService } from 'src/database/database.service';
import * as XLSX from 'xlsx';
import { CreateAnimalProductDto } from './dto/create-animal-product.dto';


@Injectable()
export class AnimalService {
  constructor(private readonly dataBaseService: DatabaseService) {

  }
  async create(createAnimalDto: CreateAnimalDto, userId: string) {
    try {
      console.log('createAnimalDto : ' + createAnimalDto)
      return await this.dataBaseService.animal.create({
        data: {
          name: createAnimalDto.name,
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
          name: updateAnimalDto.name
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
        let animalDto = {
          name: row[0],
          purpose: row[1]

        };


        await this.create(animalDto, userId) // Register vet with the custom object
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
}
