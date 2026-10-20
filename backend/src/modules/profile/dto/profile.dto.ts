import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 80, example: 'Anaya Sharma' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(2, 80)
  @Matches(/^[^\u0000-\u001f\u007f]+$/)
  name?: string;

  @ApiPropertyOptional({ minLength: 3, maxLength: 24, pattern: '^[a-z][a-z0-9_]*$', example: 'anaya_sharma' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @Length(3, 24)
  @Matches(/^[a-z][a-z0-9_]*$/)
  username?: string;
}

export class MemberProfileDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) username!: string | null;
  @ApiProperty() email!: string;
  @ApiProperty() emailVerified!: boolean;
  @ApiProperty({ type: String, nullable: true }) phoneNumber!: string | null;
  @ApiProperty() phoneNumberVerified!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ProfileResponseDto {
  @ApiProperty({ type: MemberProfileDto }) user!: MemberProfileDto;
}
