import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsUUID } from "class-validator"

export class AssignRoleDto {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    roleId: string
    @ApiProperty()
    @IsNotEmpty()
    userIds: string[]

}