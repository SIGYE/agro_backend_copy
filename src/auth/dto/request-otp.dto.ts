import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length, Matches } from "class-validator";

export class RequestOtpDto {
  @IsNotEmpty()
  @ApiProperty({ example: "250700000000" })
  @IsString()
  @Length(12)
  @Matches(/^250\d{9}$/)
  telephone: string;
}

