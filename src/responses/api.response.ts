export class ApiResponse<T> {
    message: string
    success: boolean
    data: T
    status : number

    constructor(success: boolean, message: string, data: T , status : number) {
        this.success = success
        this.message = message
        this.data = data
        this.status = status
    }
}