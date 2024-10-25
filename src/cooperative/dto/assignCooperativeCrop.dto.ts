import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CropCooperativeDto } from "./cropCooperativeDto";

export class AssignCropToCooperativeDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID()
    cooperativeId: string
    @ApiProperty({
        isArray: true,
        type: CropCooperativeDto
    })
    @ValidateNested({ each: true })
    @Type(() => CropCooperativeDto)
    crops: CropCooperativeDto[]

}