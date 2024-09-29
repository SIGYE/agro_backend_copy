import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

export class ChangePasswordDTO{
    @IsString()
    @ApiProperty()
    @IsNotEmpty()
    newPassword : string

    @IsString()
    @ApiProperty()
    @IsNotEmpty()
    confirmNewPassword : string
}