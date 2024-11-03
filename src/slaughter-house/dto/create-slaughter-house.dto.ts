import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { SlaughterAnimalDto } from "./slaughter-animal.dto";
import { Type } from "class-transformer";
import { CreateUserDto } from "src/users/dto/create-user.dto";

export class CreateSlaughterHouseDto extends CreateUserDto {

    @ApiProperty({
        isArray: true,
        type: SlaughterAnimalDto
    })
    @ValidateNested({ each: true })
    @Type(() => SlaughterAnimalDto)
    @IsOptional()
    slaughterAnimalRegistrations: SlaughterAnimalDto[];

}
