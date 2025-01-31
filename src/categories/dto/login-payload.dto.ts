import { Gender, Role, Status } from "@prisma/client"

export class LoginPayload {
    id: string
    email: string
    userName: string
    token: string
    isDefaultPassword: boolean
    role: Role
    status: Status
    locationId: number
    fullName?: string
    phoneNumber?: string
    nationalId?: string
    gender?: Gender
    farmerId?: string
    cooperativeId?: string
    cooperativeName?: string
    cooperativePhoneNumber?: string
    registrationNumber?: string
}