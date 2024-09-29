import { Organisation, Role, Status } from "@prisma/client"

export class LoginPayload {
    id: string
    email: string
    userName: string
    token: string
    isDefaultPassword : boolean
    organisation : Organisation[] | []
    roles: Role[]
    status: Status
}