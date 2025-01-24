import { ApiProperty } from "@nestjs/swagger";
import { AnimalState, Purpose } from "@prisma/client";
import { IsEnum } from "class-validator";

export class CreateLiveStockRegistrationDto {
    @ApiProperty()
    weight: number;
    @ApiProperty()
    weightMeasurement: string;
    @ApiProperty(
        {
            type: 'string',
            format: 'date',
            example: '2021-08-20'
        }
    )
    dob: string;
    @ApiProperty()
    animalFarmerRegistrationId: string;
    @ApiProperty()
    breedId: string;
    @ApiProperty()
    @IsEnum(Purpose)
    purpose: Purpose
    @ApiProperty()
    @IsEnum(AnimalState)
    animalState: AnimalState

}
