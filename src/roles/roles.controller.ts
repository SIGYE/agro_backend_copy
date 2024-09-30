import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiResponse } from 'src/responses/api.response';
import { Role } from '@prisma/client';

@UseGuards(AuthGuard)
@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post('/create')
  async create(@Body() createRoleDto: CreateRoleDto) : Promise<ApiResponse<Role>> {
    return new ApiResponse<Role>(true, "Role Created", await this.rolesService.create(createRoleDto) , null);
  }

  @Get()
  async findAll() : Promise<ApiResponse<Role[]>> {
    return new ApiResponse<Role[]>(true, "All Roles", await this.rolesService.findAll() , null);
  }

  @Get(':id')
  @ApiParam({ name: "id", type: String })
  async findOne(@Param('id', ParseUUIDPipe) id: string) : Promise<ApiResponse<Role>> {
    return new ApiResponse<Role>(true, "Role Retrieved", await this.rolesService.findOne(id) , null);
  }

  @Patch(':id')
  @ApiParam({ name: "id", type: String })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateRoleDto: UpdateRoleDto) : Promise<ApiResponse<Role>> {
    return new ApiResponse<Role>(true, "Updated Role", await this.rolesService.update(id, updateRoleDto) , null);
  }

  @Delete(':id')
  @ApiParam({ name: "id", type: String })
  async remove(@Param('id', ParseUUIDPipe) id: string) : Promise<ApiResponse<Role>> {
    return new ApiResponse<Role>(true, "Role Deleted", await this.rolesService.remove(id) , null);
  }
}
