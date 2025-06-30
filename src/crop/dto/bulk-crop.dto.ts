import { ApiProperty } from "@nestjs/swagger";
import { BulkDiseaseDto } from "./bulk-disease.dto";
import { BulkPestDto } from "./bulk-pest.dto";
import { IsArray, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { BulkCropTypeDto } from "./bulk-cropType.dto";
import { CropNameDto } from "./crop-name.dto";

export class BulkCropDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CropNameDto)
    names?: CropNameDto[];
    @ApiProperty({
        isArray: true,
        type: BulkCropTypeDto
    })
    @Type(() => BulkCropTypeDto)
    @ValidateNested({ each: true })
    cropTypes?: BulkCropTypeDto[];
    @ApiProperty({
        isArray: true,
        type: String
    })
    fertilizers?: string[];
    @ApiProperty({
        isArray: true,
        type: BulkDiseaseDto
    })
    @Type(() => BulkDiseaseDto)
    @ValidateNested({ each: true })
    diseases?: BulkDiseaseDto[];
    @ApiProperty({
        isArray: true,
        type: BulkPestDto
    })
    @Type(() => BulkPestDto)
    @ValidateNested({ each: true })
    pests?: BulkPestDto[];
    @ApiProperty({
        isArray: true,
        type: String
    })
    medicines?: string[];
}