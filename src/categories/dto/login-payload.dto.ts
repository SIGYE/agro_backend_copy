import { Role, Status } from "@prisma/client"

export class LoginPayload {
    id: string
    email: string
    userName: string
    token: string
    isDefaultPassword : boolean
    role: Role
    status: Status
}