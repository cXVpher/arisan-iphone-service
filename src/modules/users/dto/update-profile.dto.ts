import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  @Matches(/^08\d+$/, { message: 'No. HP harus diawali 08' })
  phone?: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'No. rekening hanya boleh angka' })
  bank_account_no?: string;
}
