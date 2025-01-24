import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber, IsString } from "class-validator"

export class CreateProduceDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    LivestockRegistrationId: string
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    animalProductId: string
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    amount: number
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    measurements: string
}
