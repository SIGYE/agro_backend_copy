import { ApiProperty } from "@nestjs/swagger";
import { DiseaseType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

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
}