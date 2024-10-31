import { ApiProperty } from "@nestjs/swagger";
import { HealthStatus } from "@prisma/client";
import { IsNumber, IsString } from "class-validator";

export class SlaughterAnimalDto {
    @ApiProperty()
    @IsNumber()
    age: number;
    @ApiProperty()
    @IsNumber()
    weight: number;
    @ApiProperty({
        enum: HealthStatus,
        example: HealthStatus.HEALTHY
    })
    healthStatus: HealthStatus;
    @ApiProperty()
    @IsString()
    animalId: string;
    @ApiProperty()
    @IsString()
    liveStockId: string;
    @ApiProperty()
    @IsString()
    breedId: string;

}