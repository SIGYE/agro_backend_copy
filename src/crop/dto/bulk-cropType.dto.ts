import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { BulkSeedStrainDto } from "./bulk-seedStrain.dto";
import { Type } from "class-transformer";

export class BulkCropTypeDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;
    @ApiProperty({
        isArray: true,
        type: BulkSeedStrainDto
    })
    @Type(() => BulkSeedStrainDto)
    @ValidateNested({ each: true })
    seedStrains?: BulkSeedStrainDto[];
}