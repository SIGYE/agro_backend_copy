import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MedicineService } from './medicine.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { AssignMedicineToCropDto } from './dto/assign-medicine-crop.dto';
import { AssignMedicineToAnimalDto } from './dto/assign-medicine-animal.dto';

@Controller('medicine')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Medicine')
export class MedicineController {
    constructor(private readonly medicineService: MedicineService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new medicine' })
    async create(@Body() createMedicineDto: CreateMedicineDto) {
        try {
            return new ApiResponse(
                true,
                "Medicine Created",
                await this.medicineService.create(createMedicineDto),
                201
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get()
    @ApiOperation({ summary: 'Get all medicines' })
    async findAll() {
        try {
            return new ApiResponse(
                true,
                "All Medicines",
                await this.medicineService.findAll(),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific medicine by ID' })
    @ApiParam({ name: 'id', description: 'ID of the medicine' })
    async findOne(@Param('id') id: string) {
        try {
            return new ApiResponse(
                true,
                "Medicine Retrieved",
                await this.medicineService.findOne(id),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a medicine' })
    @ApiParam({ name: 'id', description: 'ID of the medicine to update' })
    async update(@Param('id') id: string, @Body() updateMedicineDto: CreateMedicineDto) {
        try {
            return new ApiResponse(
                true,
                "Medicine Updated",
                await this.medicineService.update(id, updateMedicineDto),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a medicine' })
    @ApiParam({ name: 'id', description: 'ID of the medicine to delete' })
    async remove(@Param('id') id: string) {
        try {
            return new ApiResponse(
                true,
                "Medicine Deleted",
                await this.medicineService.remove(id),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Post('assign-to-crop')
    @ApiOperation({ summary: 'Assign a medicine to a crop' })
    async assignToCrop(@Body() assignDto: AssignMedicineToCropDto) {
        try {
            return new ApiResponse(
                true,
                "Medicine Assigned to Crop",
                await this.medicineService.assignToCrop(assignDto),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Post('assign-to-animal')
    @ApiOperation({ summary: 'Assign a medicine to an animal' })
    async assignToAnimal(@Body() assignDto: AssignMedicineToAnimalDto) {
        try {
            return new ApiResponse(
                true,
                "Medicine Assigned to Animal",
                await this.medicineService.assignToAnimal(assignDto),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Delete('crop-assignment/:cropId/:medicineId')
    @ApiOperation({ summary: 'Remove medicine assignment from a crop' })
    @ApiParam({ name: 'cropId', description: 'ID of the crop' })
    @ApiParam({ name: 'medicineId', description: 'ID of the medicine' })
    async removeCropAssignment(
        @Param('cropId') cropId: string,
        @Param('medicineId') medicineId: string
    ) {
        try {
            return new ApiResponse(
                true,
                "Medicine Assignment Removed from Crop",
                await this.medicineService.removeCropAssignment(cropId, medicineId),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Delete('animal-assignment/:animalId/:medicineId')
    @ApiOperation({ summary: 'Remove medicine assignment from an animal' })
    @ApiParam({ name: 'animalId', description: 'ID of the animal' })
    @ApiParam({ name: 'medicineId', description: 'ID of the medicine' })
    async removeAnimalAssignment(
        @Param('animalId') animalId: string,
        @Param('medicineId') medicineId: string
    ) {
        try {
            return new ApiResponse(
                true,
                "Medicine Assignment Removed from Animal",
                await this.medicineService.removeAnimalAssignment(animalId, medicineId),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }
}