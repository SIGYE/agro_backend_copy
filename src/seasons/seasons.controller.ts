import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiResponse as SwaggerApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role_Enum } from '../enums/role.enum';
import { ApiResponse } from 'src/responses/api.response';

@Controller('seasons')
@UseGuards(AuthGuard, RolesGuard)
@ApiTags('Seasons')
@ApiBearerAuth()
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 201, description: 'Season created successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Bad request - Invalid data or crop not registered' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  async create(@Body() createSeasonDto: CreateSeasonDto, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.create(createSeasonDto, userId, userRole);
      return new ApiResponse(true, "Season created successfully", data, 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 200, description: 'List of seasons' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  async findAll(@Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAll(userId, userRole);
      return new ApiResponse(true, "All seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmer/:farmerId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 200, description: 'List of farmer seasons' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  async findAllByFarmerId(@Param('farmerId') farmerId: string, @Request() req) {
    try {
      if (!farmerId) throw new BadRequestException('farmerId is required');
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAllByFarmerId(farmerId, userId, userRole);
      return new ApiResponse(true, "Farmer seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('cooperative/:cooperativeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 200, description: 'List of cooperative seasons' })
  @SwaggerApiResponse({ status: 400, description: 'Bad request - Non-collective cooperatives do not have cooperative-level seasons' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  async findAllByCooperativeId(@Param('cooperativeId') cooperativeId: string, @Request() req) {
    try {
      if (!cooperativeId) throw new BadRequestException('cooperativeId is required');
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAllByCooperativeId(cooperativeId, userId, userRole);
      return new ApiResponse(true, "Cooperative seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('cooperative/:cooperativeId/all-seasons')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 200, description: 'Comprehensive list of cooperative seasons with context' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  async findAllByCooperativeIdComprehensive(
    @Param('cooperativeId') cooperativeId: string, 
    @Request() req
  ) {
    if (!cooperativeId) throw new BadRequestException('cooperativeId is required');
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findAllByCooperativeIdComprehensive(cooperativeId, userId, userRole);
  }

  @Get('crop-type/:cropTypeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 200, description: 'List of seasons for crop type' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  async findAllByCropTypeId(@Param('cropTypeId') cropTypeId: string, @Request() req) {
    try {
      if (!cropTypeId) throw new BadRequestException('cropTypeId is required');
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAllByCropTypeId(cropTypeId, userId, userRole);
      return new ApiResponse(true, "Crop type seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmer/:farmerId/crop-type/:cropTypeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 200, description: 'List of seasons' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  async findAllByFarmerIdAndCropTypeId(
    @Param('farmerId') farmerId: string,
    @Param('cropTypeId') cropTypeId: string,
    @Request() req
  ) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAllByFarmerIdAndCropTypeId(farmerId, cropTypeId, userId, userRole);
      return new ApiResponse(true, "Farmer crop seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('cooperative/:cooperativeId/crop-type/:cropTypeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 200, description: 'List of cooperative seasons for crop type' })
  @SwaggerApiResponse({ status: 400, description: 'Bad request - Non-collective cooperatives do not have cooperative-level seasons' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  async findAllByCooperativeIdAndCropTypeId(
    @Param('cooperativeId') cooperativeId: string,
    @Param('cropTypeId') cropTypeId: string,
    @Request() req
  ) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAllByCooperativeIdAndCropTypeId(
        cooperativeId,
        cropTypeId,
        userId,
        userRole
      );
      return new ApiResponse(true, "Cooperative crop seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 200, description: 'Season details' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @SwaggerApiResponse({ status: 404, description: 'Season not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findOne(id, userId, userRole);
      return new ApiResponse(true, "Season retrieved", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 200, description: 'Season updated successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Bad request' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @SwaggerApiResponse({ status: 404, description: 'Season not found' })
  async update(
    @Param('id') id: string,
    @Body() updateSeasonDto: UpdateSeasonDto,
    @Request() req
  ) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.update(id, updateSeasonDto, userId, userRole);
      return new ApiResponse(true, "Season updated", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @SwaggerApiResponse({ status: 200, description: 'Season deleted successfully' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @SwaggerApiResponse({ status: 404, description: 'Season not found' })
  async remove(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.remove(id, userId, userRole);
      return new ApiResponse(true, "Season deleted", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}
