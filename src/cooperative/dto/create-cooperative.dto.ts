import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { CropCooperativeDto } from './cropCooperativeDto';
import { animalCooperativeDto } from './animalCooperative.dto';

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
    @ApiProperty({
        isArray: true,
        type: CropCooperativeDto
    })
    @ValidateNested({ each: true })
    @Type(() => CropCooperativeDto)
    @IsOptional()
    crops?: CropCooperativeDto[]
    @ApiProperty({
        isArray: true,
        type: animalCooperativeDto
    })
    @ValidateNested({ each: true })
    @Type(() => animalCooperativeDto)
    @IsOptional()
    animals?: animalCooperativeDto[]

}