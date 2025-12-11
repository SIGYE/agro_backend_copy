import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsOptional, ValidateNested, IsEnum, IsNumber } from 'class-validator';
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
    @ApiProperty()
    membersNumber: number;
    @ApiProperty()
    @IsEnum(CooperativeType)
    cooperativeType: CooperativeType

    @IsInt()
    @IsNotEmpty()
    @ApiProperty()
    locationId: number;

    @ApiProperty()
    @Type(() => CreateUserDto)
    managerDto: CreateUserDto

    @ApiProperty({
        isArray: true,
        type: cooperativeCropDto
    })
    @ValidateNested({ each: true })
    @Type(() => cooperativeCropDto)
    @IsOptional()
    crops?: cooperativeCropDto[]

    @ApiProperty({
    enum: CollectiveType })
  @IsEnum(CollectiveType)
  @IsNotEmpty()
  collectiveType: CollectiveType;
}