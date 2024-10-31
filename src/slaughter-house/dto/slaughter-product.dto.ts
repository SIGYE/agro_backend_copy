import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class SlaughterProductDto {
    @ApiProperty()
    @IsString()
    productName: string;
}