import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class SetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @Length(8, 128, { message: 'Password must be between 8 and 128 characters' })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @Length(8, 128, { message: 'Password must be between 8 and 128 characters' })
  confirmNewPassword: string;
}

