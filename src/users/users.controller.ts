import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Req, UnauthorizedException, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth, ApiBody, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { Role_Enum } from 'src/enums/role.enum';
import { ApiResponse } from 'src/responses/api.response';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { AuthRequest } from 'src/types/auth-request.type';
import { Status } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard)
@Roles(Role_Enum.SUPER_ADMIN , Role_Enum.DEV_ACCESS )
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
  async findAll() {
    return new ApiResponse(true, "All Users", await this.usersService.findAll() , null);
  }

  @Get('/id/:id')
  @ApiParam({ name: "id", type: String })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new ApiResponse(true, "User Retrieved", await this.usersService.findOne(id) , null);
  }

  @Patch('/update/:id')
  @ApiParam({ name: "id", type: String })
  @ApiBody({type : UpdateUserDto})
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return new ApiResponse(true, "Updated User", this.usersService.update(id, updateUserDto) , null);
  }

  @Delete('/delete/:id')
  @ApiParam({ name: "id", type: String })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return new ApiResponse(true, "Deleted User", this.usersService.remove(id) , null);
  }


  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(@Req() request: AuthRequest , @Body() changePasswordDTO : ChangePasswordDTO) {
    if(!request.user){
      throw new UnauthorizedException("Please Login")
    }else{
      return this.usersService.changeLoggedInPassword(request , changePasswordDTO);
    }
  }

  // changing the user account status
  @Roles(Role_Enum.DEV_ACCESS , Role_Enum.SUPER_ADMIN)
  @Patch('change-account-status/:userId')
  @UseGuards(AuthGuard)
  @ApiQuery({ name: "status", enum: Status })
  @ApiParam({ name: "userId", type: String })
  async changeAccountStatus(@Req() request: AuthRequest , @Param('userId') userId : string , @Query('status') status : Status) {
    if(!request.user){
      throw new UnauthorizedException("Please Login")
    }else{
      return this.usersService.changeUserAccountStatus(userId , status);
    }
  }

}
