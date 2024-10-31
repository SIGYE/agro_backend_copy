import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

export class SlaughterRegistrationDto {
    @ApiProperty()
    @IsString()
    slaughterAnimalRegistrationId: string;
    @ApiProperty({
        type: 'string',
        format: 'date',
        example: '2021-08-20'
    })
    slaughterDate: string;
    @ApiProperty()
    @IsNumber()
    preSlaughterWeight: number;
    @ApiProperty()
    @IsNumber()
    postSlaughterWeight: number;

}
