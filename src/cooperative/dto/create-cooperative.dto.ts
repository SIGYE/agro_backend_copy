import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

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

    @IsInt()
    @IsNotEmpty()
    @ApiProperty()
    locationId: number;
}