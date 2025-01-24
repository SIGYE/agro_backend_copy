import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { CreateCropTypeDto } from "./create-cropType.dto";

export class CreateCropDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string
    @ApiProperty()
    @Type(() => CreateCropTypeDto)
    @ValidateNested({ each: true })
    cropTypes: CreateCropTypeDto[]


}
