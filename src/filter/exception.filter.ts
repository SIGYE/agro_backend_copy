import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { log } from "console";
import { Request, Response } from 'express';
import { ApiResponse } from "src/responses/api.response";

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        console.log(exception);
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const status: number = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const message: string = this.getErrorMessage(exception);

        response.status(status).json(new ApiResponse<[]>(false, message, [] , status));
    }

    private getErrorMessage(exception: any): string {
        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            
            // If the response is an object and has a 'message' property
            if (typeof response === 'object' && response['message']) {
                // Check if 'message' is an array (validation errors)
                if (Array.isArray(response['message'])) {
                    return response['message'].join(', ');
                }
                // Otherwise, return the message as a string
                return response['message'];
            }
            
            // Fallback to the exception message if no detailed message is found
            return exception.message || 'An unexpected error occurred';
        }
    
        // Default error messages for common HTTP status codes
        switch (exception.status) {
            case HttpStatus.BAD_REQUEST:
                return 'Bad request';
            case HttpStatus.UNAUTHORIZED:
                return 'Unauthorized';
            case HttpStatus.FORBIDDEN:
                return 'Forbidden';
            case HttpStatus.NOT_FOUND:
                return 'Resource not found';
            default:
                return 'Internal server error';
        }
    }
    
    }
