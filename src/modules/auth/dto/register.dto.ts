import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  Length,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username hanya boleh huruf, angka, dan underscore',
  })
  username: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password harus ada minimal 1 huruf kapital' })
  @Matches(/[0-9]/, { message: 'Password harus ada minimal 1 angka' })
  password: string;

  @IsString()
  @Length(16, 16, { message: 'NIK harus 16 digit' })
  @Matches(/^\d+$/, { message: 'NIK hanya boleh angka' })
  nik: string;

  @IsString()
  @MinLength(10)
  @MaxLength(15)
  @Matches(/^08\d+$/, { message: 'No. HP harus diawali 08' })
  phone: string;

  @IsString()
  @MinLength(1)
  bank_name: string;

  @IsString()
  @MinLength(5)
  @MaxLength(30)
  @Matches(/^\d+$/, { message: 'No. rekening hanya boleh angka' })
  bank_account_no: string;

  @IsString()
  @IsOptional()
  referral_code?: string;
}
