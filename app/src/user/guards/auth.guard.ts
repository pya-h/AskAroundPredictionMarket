import { CanActivate, ExecutionContext } from "@nestjs/common";


export class AuthGuard implements CanActivate {
    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const { userID } = request.session;
        let isAuthorised = Boolean(userID);
        if(['PATCH', 'PUT', 'DELETE'].includes((request.method as string).toUpperCase())) {
            console.log('checking patch/delete/put')
            const { id } = request.params;
            isAuthorised &&= userID === +id;
        }

        return isAuthorised;
    }
}