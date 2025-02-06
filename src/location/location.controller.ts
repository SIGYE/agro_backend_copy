import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocationService, LocationWithChildren, LocationWithParent } from './location.service';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { Allow } from 'src/decorators/allow.decorator';
import { Location, locationLevel } from '@prisma/client';
import { ApiResponse } from 'src/responses/api.response';

@Controller('location')
@ApiTags('Location')
@Allow()
export class LocationController {
    constructor(
        private readonly locationService: LocationService
    ) { }

    @Get('/all')
    async getAll(@Query('page') page: number, @Query('limit') limit: number): Promise<ApiResponse<{ data: LocationWithParent[], total: number }>> {
        try {
            const data = await this.locationService.getAll(page, limit);
            return new ApiResponse(true, "Success", data, 200);
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get('/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async getLocationById(@Param('id') id: number): Promise<ApiResponse<Location>> {
        try {
            const data = await this.locationService.getLocationById(id);
            return new ApiResponse<Location>(true, "Success", data, 200);
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get('/children/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async getChildrenLocations(@Param('id') id: number): Promise<ApiResponse<LocationWithChildren[]>> {
        try {
            const data = await this.locationService.getChildrenLocations(id);
            return new ApiResponse<LocationWithChildren[]>(true, "Success", data, 200);
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get('/level/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async getLocationByLevel(@Param('id') id: number): Promise<ApiResponse<Location[]>> {
        try {
            const data = await this.locationService.getLocationByLevel(id);
            return new ApiResponse<Location[]>(true, "Success", data, 200);
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get('/location-levels/all')
    async getAllLocationLevels(): Promise<ApiResponse<locationLevel[]>> {
        try {
            const data = await this.locationService.getAllLocationLevels();
            return new ApiResponse<locationLevel[]>(true, "Success", data, 200);
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get('/location-levels/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async getLOcationLevelById(@Param("id") id: number): Promise<ApiResponse<locationLevel>> {
        try {
            const data = await this.locationService.getLOcationLevelById(id);
            return new ApiResponse<locationLevel>(true, "Success", data, 200);
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get('/all/children/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async getAllWithChildren(@Param("id") id: number): Promise<ApiResponse<LocationWithChildren[]>> {
        try {
            const data = await this.locationService.getAllChildrenLocations(id);
            return new ApiResponse<any>(true, "Success", data, 200);
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }

    @Get('/recursively-get-all-children/:id')
    @ApiParam({
        name: "id",
        type: Number
    })
    async recursivelyGetAllChildrenLocations(@Param('id') id: number): Promise<ApiResponse<number[]>> {
        try {
            const children = await this.locationService.recursivelyGetAllChildrenLocations(id);
            console.log('children length : ' + children.length);
            const childrenSet = new Set(children);
            console.log('children set length : ' + childrenSet.size);
            const data = Array.from(childrenSet);
            return new ApiResponse<number[]>(true, "Success", data, 200);
        } catch (e) {
            return new ApiResponse(false, e.message, null, 400);
        }
    }
}