import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class FertiliserDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    fertiliserId: string
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    amountOfFertilizer: number
}