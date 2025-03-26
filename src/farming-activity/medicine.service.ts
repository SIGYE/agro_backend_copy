import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { AssignMedicineToCropDto } from './dto/assign-medicine-crop.dto';
import { AssignMedicineToAnimalDto } from './dto/assign-medicine-animal.dto';


@Injectable()
export class MedicineService {
    constructor(private readonly databaseService: DatabaseService) { }

    async create(createMedicineDto: CreateMedicineDto) {
        try {
            return await this.databaseService.medicine.create({
                data: {
                    name: createMedicineDto.name
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async findAll() {
        try {
            return await this.databaseService.medicine.findMany({
                include: {
                    cropMedicines: {
                        include: {
                            crop: true
                        }
                    },
                    animalMedicines: {
                        include: {
                            animal: true
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async findOne(id: string) {
        try {
            return await this.databaseService.medicine.findUnique({
                where: { id },
                include: {
                    cropMedicines: {
                        include: {
                            crop: true
                        }
                    },
                    animalMedicines: {
                        include: {
                            animal: true
                        }
                    },
                    farmingActivities: true
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async update(id: string, updateMedicineDto: CreateMedicineDto) {
        try {
            return await this.databaseService.medicine.update({
                where: { id },
                data: {
                    name: updateMedicineDto.name
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async remove(id: string) {
        try {
            // First remove all relations to prevent foreign key constraint errors
            await this.databaseService.cropMedicine.deleteMany({
                where: { medicineId: id }
            });

            await this.databaseService.animalMedicine.deleteMany({
                where: { medicineId: id }
            });

            // Then delete the medicine
            return await this.databaseService.medicine.delete({
                where: { id }
            });
        } catch (e) {
            throw e;
        }
    }

    async assignToCrop(assignDto: AssignMedicineToCropDto) {
        try {
            // Check if the relation already exists to prevent duplicates
            const existing = await this.databaseService.cropMedicine.findFirst({
                where: {
                    cropId: assignDto.cropId,
                    medicineId: assignDto.medicineId
                }
            });

            if (existing) {
                return existing;
            }

            return await this.databaseService.cropMedicine.create({
                data: {
                    crop: {
                        connect: { id: assignDto.cropId }
                    },
                    medicine: {
                        connect: { id: assignDto.medicineId }
                    }
                },
                include: {
                    crop: true,
                    medicine: true
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async assignToAnimal(assignDto: AssignMedicineToAnimalDto) {
        try {
            // Check if the relation already exists to prevent duplicates
            const existing = await this.databaseService.animalMedicine.findFirst({
                where: {
                    animalId: assignDto.animalId,
                    medicineId: assignDto.medicineId
                }
            });

            if (existing) {
                return existing;
            }

            return await this.databaseService.animalMedicine.create({
                data: {
                    animal: {
                        connect: { id: assignDto.animalId }
                    },
                    medicine: {
                        connect: { id: assignDto.medicineId }
                    }
                },
                include: {
                    animal: true,
                    medicine: true
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async removeCropAssignment(cropId: string, medicineId: string) {
        try {
            return await this.databaseService.cropMedicine.deleteMany({
                where: {
                    cropId,
                    medicineId
                }
            });
        } catch (e) {
            throw e;
        }
    }

    async removeAnimalAssignment(animalId: string, medicineId: string) {
        try {
            return await this.databaseService.animalMedicine.deleteMany({
                where: {
                    animalId,
                    medicineId
                }
            });
        } catch (e) {
            throw e;
        }
    }
}