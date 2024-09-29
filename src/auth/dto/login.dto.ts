import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, Length , Matches ,  IsNotEmpty, IsOptional, IsString } from "class-validator"


export class loginDto {
    @ApiProperty()
    @IsString({ message: 'Credentail must be a string' })
    @IsOptional()
    credential: string;


    @ApiProperty()
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password cannot be empty' })
    password: string
}