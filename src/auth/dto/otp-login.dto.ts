import { IsNotEmpty , Length , Matches , IsString, isNotEmpty } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class OtpLoginDto {

    @IsNotEmpty()
    @ApiProperty()
    @IsString()
    @Length(12)
    @Matches(/^250\d{9}$/)
    telephone: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    otp : string
}