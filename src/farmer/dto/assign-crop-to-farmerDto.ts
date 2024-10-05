import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { cropFarmerDto } from "./crop-farmer.dto";

export class AssignCropToFarmerDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID()
    farmerId: string
    @ApiProperty()
    crops: cropFarmerDto[]

}