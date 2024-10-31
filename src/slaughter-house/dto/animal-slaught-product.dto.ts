import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class AnimalSlaughtProductDto {
    @ApiProperty()
    @IsString()
    productId: string;
    @ApiProperty()
    @IsString()
    slaughterRegistrationId: string;
}