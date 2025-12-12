import { ApiProperty } from "@nestjs/swagger";
import { Gender } from "@prisma/client";
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString, Max, Min } from "class-validator";

export class CreateFarmerLiteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsPhoneNumber()
  telephone: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ description: "Age in years" })
  @IsNumber()
  @Min(1)
  @Max(120)
  age: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  locationId?: number;

  @ApiProperty({ required: false, description: "Attach to a cooperative if provided" })
  @IsOptional()
  cooperativeId?: string;
}
