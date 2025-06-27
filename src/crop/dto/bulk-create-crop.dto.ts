import { ApiProperty } from "@nestjs/swagger";
import { BulkCropDto } from "./bulk-crop.dto";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class BulkCreateCropDto {
    @ApiProperty({
        isArray: true,
        type: BulkCropDto
    })
    @Type(() => BulkCropDto)
    @ValidateNested({ each: true })
    crops: BulkCropDto[];
}