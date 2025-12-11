import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { CreateCropTypeDto } from "./create-cropType.dto";
import { CropNameDto } from "./crop-name.dto";

export class CreateCropDto {
    @IsArray()
    @ValidateNested({ each: true })
    @IsNotEmpty()
    @Type(() => CropNameDto)
    names: CropNameDto[];
    @ApiProperty({
        isArray: true,
        type: CreateCropTypeDto
    })
    @Type(() => CreateCropTypeDto)
    @ValidateNested({ each: true })
    cropTypes: CreateCropTypeDto[]


}
