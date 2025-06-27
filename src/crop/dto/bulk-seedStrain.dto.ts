import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class BulkSeedStrainDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;
}
