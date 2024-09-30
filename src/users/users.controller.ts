import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Req, UnauthorizedException, Query } from '@nestjs/common';
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
import { Status, User } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard)
@ApiTags('Users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // @Allow()
  // @Post()
  // async createDevAdmin(@Body() createUserDto: CreateUserDto) {
  //   const user = await this.usersService.create(createUserDto)
  //   return new ApiResponse(true, "Dev Admin Created Successfully", user);
  // }

  @Get('/all')
  async findAll() : Promise<ApiResponse<User[]>> {
    return new ApiResponse<User[]>(true, "All Users", await this.usersService.findAll() , null);
  }

  @Get('/id/:id')
  @ApiParam({ name: "id", type: String })
  async findOne(@Param('id', ParseUUIDPipe) id: string) : Promise<ApiResponse<UserWithRoles>> {
    return new ApiResponse<UserWithRoles>(true, "User Retrieved", await this.usersService.findOne(id) , null);
  }

  @Patch('/update/:id')
  @ApiParam({ name: "id", type: String })
  @ApiBody({type : UpdateUserDto})
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) : Promise<ApiResponse<User>> {
    return new ApiResponse<User>(true, "Updated User", await this.usersService.update(id, updateUserDto) , null);
  }

  @Delete('/delete/:id')
  @ApiParam({ name: "id", type: String })
  async remove(@Param('id', ParseUUIDPipe) id: string) : Promise<ApiResponse<User>> {
    return new ApiResponse<User>(true, "Deleted User", await this.usersService.remove(id) , null);
  }


  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(@Req() request: AuthRequest , @Body() changePasswordDTO : ChangePasswordDTO) : Promise<ApiResponse<User>> {
    if(!request.user){
      throw new UnauthorizedException("Please Login")
    }else{
      return new ApiResponse<User>(true, "Password Changed Successfully", await this.usersService.changeLoggedInPassword(request , changePasswordDTO) , null);
    }
  }

  // changing the user account status
  @Patch('change-account-status/:userId')
  @UseGuards(AuthGuard)
  @ApiQuery({ name: "status", enum: Status })
  @ApiParam({ name: "userId", type: String })
  async changeAccountStatus(@Req() request: AuthRequest , @Param('userId') userId : string , @Query('status') status : Status) :  Promise<ApiResponse<User>> {
    if(!request.user){
      throw new UnauthorizedException("Please Login")
    }else{
      return new ApiResponse<User>(true , "Account Status Changed Successfully" , await this.usersService.changeUserAccountStatus(userId , status) , 200);
    }
  }

}
