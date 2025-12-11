import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Req, UnauthorizedException, Query, UseInterceptors, UploadedFile, BadRequestException, Put } from '@nestjs/common';
import { UsersService, UserWithRoles } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth, ApiBody, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { Role_Enum } from 'src/enums/role.enum';
import { ApiResponse } from 'src/responses/api.response';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { AuthRequest } from 'src/types/auth-request.type';
import { Agronomy, Farmer, Status, Umufashamyumvire, User, Veterinary } from '@prisma/client';
import { Allow } from 'src/decorators/allow.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('users')
@UseGuards(AuthGuard)
@ApiTags('Users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Allow()
  @Post()
  async createDevAdmin(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      return new ApiResponse(true, "Dev Admin Created Successfully", user, 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/all')
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  async findAll(@Query('locationId') locationId?: number): Promise<ApiResponse<User[]>> {
    try {
      return new ApiResponse<User[]>(true, "All Users", await this.usersService.findAll(locationId), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('/id/:id')
  @ApiParam({ name: "id", type: String })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<UserWithRoles>> {
    try {
      return new ApiResponse<UserWithRoles>(true, "User Retrieved", await this.usersService.findOne(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Put('/update/:id')
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateUserDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto): Promise<ApiResponse<User>> {
    try {
      return new ApiResponse<User>(true, "Updated User", await this.usersService.update(id, updateUserDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete('/delete/:id')
  @ApiParam({ name: "id", type: String })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<User>> {
    try {
      return new ApiResponse<User>(true, "Deleted User", await this.usersService.remove(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('change-password')
  @Allow()
  async changePassword(@Req() request: AuthRequest, @Body() changePasswordDTO: ChangePasswordDTO): Promise<ApiResponse<User>> {
    try {
      if (!request.user) {
        throw new UnauthorizedException("Please Login");
      } else {
        return new ApiResponse<User>(true, "Password Changed Successfully", await this.usersService.changeLoggedInPassword(request, changePasswordDTO), 200);
      }
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('register-agronomist')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerAgronomist(@Body() createUserDto: CreateUserDto, @CurrentUser() user: User): Promise<ApiResponse<Agronomy>> {
    try {
      return new ApiResponse<Agronomy>(true, "Agronomist Registered Successfully", await this.usersService.registerAgronomist(createUserDto, user), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('register-veterinary')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerVeterinary(@Body() createUserDto: CreateUserDto, @CurrentUser() user: User): Promise<ApiResponse<Veterinary>> {
    try {
      return new ApiResponse<Veterinary>(true, "Veterinary Registered Successfully", await this.usersService.registerVet(createUserDto, user), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('register-farmer')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerFarmer(@Body() createUserDto: CreateUserDto, @CurrentUser() user: User): Promise<ApiResponse<Farmer>> {
    try {
      return new ApiResponse<Farmer>(true, "Farmer Registered Successfully", await this.usersService.registerFarmer(createUserDto, null, user), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('register-farmer/cooperative/:cooperativeId')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerFarmerInCooperative(
    @Body() createUserDto: CreateUserDto, 
    @Param('cooperativeId') cooperativeId: string,
    @CurrentUser() user: User
  ): Promise<ApiResponse<Farmer>> {
    try {
      return new ApiResponse<Farmer>(true, "Farmer Registered Successfully in Cooperative", await this.usersService.registerFarmer(createUserDto, cooperativeId, user), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('import-farmers')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleFarmers(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const result = await this.usersService.registerMultipleFarmers(file, user);
      return new ApiResponse(true, `Successfully registered ${result.success} farmers, ${result.failed} failed`, result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('import-farmers/cooperative/:cooperativeId')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleFarmersInCooperative(
    @UploadedFile() file: Express.Multer.File, 
    @Param('cooperativeId') cooperativeId: string, 
    @CurrentUser() user: User
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const result = await this.usersService.registerMultipleFarmersIntoCooperative(file, cooperativeId, user);
      return new ApiResponse(true, `Successfully registered ${result.success} farmers in cooperative, ${result.failed} failed`, result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('import-veterinarians')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleVeterinarians(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const result = await this.usersService.registerMultipleVets(file, user);
      return new ApiResponse(true, `Successfully registered ${result.success} veterinarians, ${result.failed} failed`, result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('import-agronomists')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleAgronomists(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const result = await this.usersService.registerMultipleAgronomists(file, user);
      return new ApiResponse(true, `Successfully registered ${result.success} agronomists, ${result.failed} failed`, result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('register-umufasha-myumvire')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerUmufashaMyumvire(@Body() createUserDto: CreateUserDto, @CurrentUser() user: User): Promise<ApiResponse<Umufashamyumvire>> {
    try {
      return new ApiResponse<Umufashamyumvire>(true, "Umufasha Myumvire Registered Successfully", await this.usersService.registerUmufashaMyumvire(createUserDto, user), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('import-abafasha-myumvire')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleUmufashaMyumvire(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const result = await this.usersService.registerMultipleBafashaMyumvire(file, user);
      return new ApiResponse(true, `Successfully registered ${result.success} abafasha myumvire, ${result.failed} failed`, result, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Post('register-cooperative-manager')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerCooperativeManager(@Body() createUserDto: CreateUserDto, @CurrentUser() user: User): Promise<ApiResponse<User>> {
    try {
      return new ApiResponse<User>(true, "Cooperative Manager Registered Successfully", await this.usersService.registerCooperativeManager(createUserDto, user), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch('change-account-status/:userId')
  @UseGuards(AuthGuard)
  @ApiQuery({ name: "status", enum: Status })
  @ApiParam({ name: "userId", type: String })
  async changeAccountStatus(@Req() request: AuthRequest, @Param('userId') userId: string, @Query('status') status: Status): Promise<ApiResponse<User>> {
    try {
      if (!request.user) {
        throw new UnauthorizedException("Please Login");
      } else {
        return new ApiResponse<User>(true, "Account Status Changed Successfully", await this.usersService.changeUserAccountStatus(userId, status), 200);
      }
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  // Get users by location
  @Get('by-location/:locationId')
  @ApiParam({ name: "locationId", type: Number })
  async findByLocation(@Param('locationId') locationId: number): Promise<ApiResponse<User[]>> {
    try {
      return new ApiResponse<User[]>(true, `Users in location ${locationId}`, await this.usersService.findAll(locationId), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}