export class ApiResponse {
    message: string
    success: boolean
    data: any
    status : number

    constructor(success: boolean, message: string, data: any , status : number) {
        this.success = success
        this.message = message
        this.data = data
        this.status = status
    }
}