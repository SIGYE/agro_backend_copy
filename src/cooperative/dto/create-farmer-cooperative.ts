import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty } from "class-validator";
import { CreateFarmerDto } from "src/farmer/dto/create-farmer.dto";

export class CreateCooperativeFarmerDto {

    @ApiProperty()
    @IsNotEmpty()
    cooperativeId: string
    @ApiProperty({
        isArray: true,
        type: CreateFarmerDto
    })
    @Type(() => CreateFarmerDto)
    farmers: CreateFarmerDto[]

}