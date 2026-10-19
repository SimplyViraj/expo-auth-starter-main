import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class CompleteOnboardingDto {
  @ApiProperty({ minLength: 3, maxLength: 24, pattern: '^[a-z][a-z0-9_]*$', example: 'river_42' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @Length(3, 24)
  @Matches(/^[a-z][a-z0-9_]*$/)
  username!: string;
}
export class CompletedProfileDto {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty({ enum: [true] }) onboardingCompleted!: true;
  @ApiProperty({ format: 'date-time' }) onboardingCompletedAt!: string;
}
export class CompleteOnboardingResponseDto {
  @ApiProperty({ type: CompletedProfileDto }) user!: CompletedProfileDto;
}
