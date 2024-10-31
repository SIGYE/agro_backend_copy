import { ApiProperty } from "@nestjs/swagger";

export class CreateLiveStockRegistrationDto {
    @ApiProperty()
    weight: number;
    @ApiProperty()
    weightMeasurement: string;
    @ApiProperty()
    produce: number;
    @ApiProperty()
    produceMeasurement: string;
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

}
