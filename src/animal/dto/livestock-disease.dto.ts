import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class LiveStockDiseaseDto {
    @ApiProperty()
    @IsString()
    li: string
}