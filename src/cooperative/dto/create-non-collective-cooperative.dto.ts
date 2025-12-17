import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsString, 
  IsNotEmpty, 
  IsInt, 
  ValidateNested, 
  IsEnum,
  IsArray,
  ArrayMinSize,
  Min 
} from 'class-validator';
import { CooperativeType } from '@prisma/client';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { cooperativeCropDto } from './cooperative-crop.dto';

export class CreateNonCollectiveCooperativeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telephone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @ApiProperty({ 
    minimum: 1
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  membersNumber: number;
  
  @ApiProperty({ 
    enum: CooperativeType,
  })
  @IsEnum(CooperativeType)
  cooperativeType: CooperativeType;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  locationId: number;

  @ApiProperty({ 
    type: () => CreateUserDto,
  })
  @Type(() => CreateUserDto)
  @ValidateNested()
  managerDto: CreateUserDto;

  @ApiProperty({
    type: [cooperativeCropDto],
    minItems: 1
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Non-collective cooperatives must specify at least one crop in the registry' })
  @ValidateNested({ each: true })
  @Type(() => cooperativeCropDto)
  @IsNotEmpty()
  crops: cooperativeCropDto[];
}