import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { HarvestService } from './harvest.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { 
  ApiBearerAuth, 
  ApiTags, 
  ApiOperation, 
  ApiResponse as SwaggerApiResponse 
} from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role_Enum } from 'src/enums/role.enum';
import { ApiResponse } from 'src/responses/api.response';

@Controller('harvest')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@ApiTags('Harvest')
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) {}

  @Post()
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.FARMER
  )
  @SwaggerApiResponse({ status: 201, description: 'Harvest created successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Bad request' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @SwaggerApiResponse({ status: 404, description: 'Season not found' })
  async create(@Body() createHarvestDto: CreateHarvestDto, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role?.name || req.user.role;
      
      const result = await this.harvestService.create(createHarvestDto, userId, userRole);
      return new ApiResponse(true, "Harvest Created", result, 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, e.status || 400);
    }
  }

  @Get()
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.FARMER
  )
  @ApiOperation({ 
    summary: 'Get all harvests',
    description: 'UmufashaMyumvire sees all. Cooperative managers see their cooperative harvests. Farmers see their own harvests.'
  })
  @SwaggerApiResponse({ status: 200, description: 'List of harvests' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  async findAll(@Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role?.name || req.user.role;
      
      const result = await this.harvestService.findAll(userId, userRole);
      return new ApiResponse(true, "All Harvests", result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, e.status || 400);
    }
  }

  @Get('season/:seasonId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.FARMER
  )
  @ApiOperation({ 
    summary: 'Get all harvests for a specific season',
    description: 'Returns all harvest records for a given season with authorization checks'
  })
  @SwaggerApiResponse({ status: 200, description: 'Harvests by season' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @SwaggerApiResponse({ status: 404, description: 'Season not found' })
  async findAllBySeason(@Param('seasonId') seasonId: string, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role?.name || req.user.role;
      
      const result = await this.harvestService.findAllBySeason(seasonId, userId, userRole);
      return new ApiResponse(true, "Harvests By Season", result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, e.status || 400);
    }
  }

  @Get('cooperative/:cooperativeId/summary')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ 
    summary: 'Get cooperative harvest summary',
    description: 'For COLLECTIVE: Shows total harvests. For NON_COLLECTIVE: Shows individual farmer contributions and totals.'
  })
  @SwaggerApiResponse({ status: 200, description: 'Cooperative harvest summary' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  async getCooperativeHarvestSummary(
    @Param('cooperativeId') cooperativeId: string,
    @Request() req
  ) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role?.name || req.user.role;
      
      const result = await this.harvestService.getCooperativeHarvestSummary(
        cooperativeId, 
        userId, 
        userRole
      );
      return new ApiResponse(true, "Cooperative Harvest Summary", result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, e.status || 400);
    }
  }

  @Get(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.FARMER
  )
  @ApiOperation({ 
    summary: 'Get a specific harvest by ID',
    description: 'Returns harvest details with authorization checks'
  })
  @SwaggerApiResponse({ status: 200, description: 'Harvest details' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @SwaggerApiResponse({ status: 404, description: 'Harvest not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role?.name || req.user.role;
      
      const result = await this.harvestService.findOne(id, userId, userRole);
      return new ApiResponse(true, "Harvest Retrieved", result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, e.status || 400);
    }
  }

  @Patch(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.FARMER
  )
  @ApiOperation({ 
    summary: 'Update a harvest record',
    description: 'Updates harvest details. Properly recalculates season produceHarvested when amount is changed.'
  })
  @SwaggerApiResponse({ status: 200, description: 'Harvest updated successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Bad request' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @SwaggerApiResponse({ status: 404, description: 'Harvest not found' })
  async update(
    @Param('id') id: string, 
    @Body() updateHarvestDto: UpdateHarvestDto,
    @Request() req
  ) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role?.name || req.user.role;
      
      const result = await this.harvestService.update(id, updateHarvestDto, userId, userRole);
      return new ApiResponse(true, "Harvest Updated", result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, e.status || 400);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.FARMER
  )
  @ApiOperation({ 
    summary: 'Delete a harvest record',
    description: 'Deletes harvest and updates season produceHarvested accordingly'
  })
  @SwaggerApiResponse({ status: 200, description: 'Harvest deleted successfully' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @SwaggerApiResponse({ status: 404, description: 'Harvest not found' })
  async remove(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role?.name || req.user.role;
      
      const result = await this.harvestService.remove(id, userId, userRole);
      return new ApiResponse(true, "Harvest Deleted", result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, e.status || 400);
    }
  }
}