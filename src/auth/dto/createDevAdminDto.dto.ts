import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";
import { CreateUserDto } from "src/users/dto/create-user.dto";

export class CreateDevAdminDto extends CreateUserDto{
    @IsNotEmpty()
    @ApiProperty()
    @IsString()
    registration_code : string
}