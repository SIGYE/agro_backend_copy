import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsString, 
  IsNotEmpty, 
  IsInt, 
  ValidateNested, 
  IsEnum,
  Min 
} from 'class-validator';
import { CooperativeType } from '@prisma/client';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

export class CreateNonCollectiveCooperativeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  telephone: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  registrationNumber: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @ApiProperty()
  membersNumber: number;
  
  @ApiProperty({ enum: CooperativeType })
  @IsEnum(CooperativeType)
  cooperativeType: CooperativeType;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty()
  locationId: number;

  @ApiProperty()
  @Type(() => CreateUserDto)
  @ValidateNested()
  managerDto: CreateUserDto;
}