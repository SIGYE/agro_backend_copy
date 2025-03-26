import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { VaccineService } from './vaccine.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { AssignVaccineToAnimalDto } from './dto/assign-vaccine-animal.dto';

@Controller('vaccine')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags('Vaccine')
export class VaccineController {
    constructor(private readonly vaccineService: VaccineService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new vaccine' })
    async create(@Body() createVaccineDto: CreateVaccineDto) {
        try {
            return new ApiResponse(
                true,
                "Vaccine Created",
                await this.vaccineService.create(createVaccineDto),
                201
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get()
    @ApiOperation({ summary: 'Get all vaccines' })
    async findAll() {
        try {
            return new ApiResponse(
                true,
                "All Vaccines",
                await this.vaccineService.findAll(),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific vaccine by ID' })
    @ApiParam({ name: 'id', description: 'ID of the vaccine' })
    async findOne(@Param('id') id: string) {
        try {
            return new ApiResponse(
                true,
                "Vaccine Retrieved",
                await this.vaccineService.findOne(id),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a vaccine' })
    @ApiParam({ name: 'id', description: 'ID of the vaccine to update' })
    async update(@Param('id') id: string, @Body() updateVaccineDto: CreateVaccineDto) {
        try {
            return new ApiResponse(
                true,
                "Vaccine Updated",
                await this.vaccineService.update(id, updateVaccineDto),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a vaccine' })
    @ApiParam({ name: 'id', description: 'ID of the vaccine to delete' })
    async remove(@Param('id') id: string) {
        try {
            return new ApiResponse(
                true,
                "Vaccine Deleted",
                await this.vaccineService.remove(id),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Post('assign-to-animal')
    @ApiOperation({ summary: 'Assign a vaccine to an animal' })
    async assignToAnimal(@Body() assignDto: AssignVaccineToAnimalDto) {
        try {
            return new ApiResponse(
                true,
                "Vaccine Assigned to Animal",
                await this.vaccineService.assignToAnimal(assignDto),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Delete('animal-assignment/:animalId/:vaccineId')
    @ApiOperation({ summary: 'Remove vaccine assignment from an animal' })
    @ApiParam({ name: 'animalId', description: 'ID of the animal' })
    @ApiParam({ name: 'vaccineId', description: 'ID of the vaccine' })
    async removeAnimalAssignment(
        @Param('animalId') animalId: string,
        @Param('vaccineId') vaccineId: string
    ) {
        try {
            return new ApiResponse(
                true,
                "Vaccine Assignment Removed from Animal",
                await this.vaccineService.removeAnimalAssignment(animalId, vaccineId),
                200
            );
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }
}