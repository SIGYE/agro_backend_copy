import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { CooperativeType } from '@prisma/client';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

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


}