import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  old_password: string;

  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password harus ada minimal 1 huruf kapital' })
  @Matches(/[0-9]/, { message: 'Password harus ada minimal 1 angka' })
  new_password: string;
}
