import { IsEmail, IsOptional, IsString, IsStrongPassword } from "class-validator";

export class PatchUserDto {
    @IsString()
    @IsOptional()
    username: string;

    @IsString() @IsEmail()
    @IsOptional()
    email: string;

    @IsString() @IsStrongPassword()
    @IsOptional()
    password: string;
}