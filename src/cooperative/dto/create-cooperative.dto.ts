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

export enum CollectiveType {
  COLLECTIVE = 'COLLECTIVE',
  NON_COLLECTIVE = 'NON_COLLECTIVE'
}

export class CreateCooperativeDto {
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

  @ApiProperty()
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
  @ArrayMinSize(1, { message: 'At least one crop must be specified for the cooperative' })
  @ValidateNested({ each: true })
  @Type(() => cooperativeCropDto)
  @IsNotEmpty()
  crops: cooperativeCropDto[];

  @ApiProperty({
    enum: CollectiveType,
  })
  @IsEnum(CollectiveType)
  @IsNotEmpty()
  collectiveType: CollectiveType;
}