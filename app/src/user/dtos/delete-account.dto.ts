import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteUserAccountDto {
  @IsNotEmpty({
    message: 'Password verification is crucial for approving delete account!',
  })
  @IsString()
  password: string;
}
