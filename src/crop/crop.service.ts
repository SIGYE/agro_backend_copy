import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { DatabaseService } from 'src/database/database.service';
import * as XLSX from 'xlsx';

@Injectable()
export class CropService {
  constructor(private readonly dataBaseService: DatabaseService) { }
  create(createCropDto: CreateCropDto, userId: string) {

    try {
      return this.dataBaseService.crop.create({
        data: {
          name: createCropDto.name,
          createdBy: userId

        }
      })
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  findAll() {
    try {
      return this.dataBaseService.crop.findMany();
    }
    catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  findOne(id: string) {
    try {
      return this.dataBaseService.crop.findUnique({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  update(id: string, updateCropDto: UpdateCropDto) {
    try {
      return this.dataBaseService.crop.update({
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

  remove(id: string) {
    try {
      return this.dataBaseService.crop.delete({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async importCrops(file: Express.Multer.File, userId: string): Promise<{ success: number; failed: number; errors: any[] }> {
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
          name: row[0]

        };


        await this.create(cropDto, userId) // Register vet with the custom object
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
