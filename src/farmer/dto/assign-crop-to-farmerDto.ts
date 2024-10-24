import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { cropFarmerDto } from "./crop-farmer.dto";
import { Type } from "class-transformer";

export class AssignCropToFarmerDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID()
    farmerId: string
    @ApiProperty({
        isArray: true,
        type: cropFarmerDto
      })
    @ValidateNested({ each: true })
    @Type(() => cropFarmerDto)
    crops: cropFarmerDto[]

}