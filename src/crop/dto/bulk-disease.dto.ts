import { ApiProperty } from "@nestjs/swagger";
import { DiseaseType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsString, IsOptional } from "class-validator";

export class BulkDiseaseDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsEnum(DiseaseType)
    type: DiseaseType;
    @ApiProperty()
    @IsString()
    medication: string;
    @ApiProperty()
    @IsOptional()
    @IsString()
    specificType?: string;
    @ApiProperty()
    @IsOptional()
    @IsString()
    causativeAgent?: string;
}