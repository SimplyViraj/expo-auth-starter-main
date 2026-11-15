import { ApiProperty } from '@nestjs/swagger';
import { type PipeTransform } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsString, IsUUID, Length, Matches, Min, Max, ValidateNested } from 'class-validator';
import { ACCOUNT_TYPES, TIERS, type AccountType, type Tier } from '../membership.catalog.js';
import { ApiError } from '../../../common/errors/api-error.js';

// These actions take their entire authority from session + path + provider verification.
export class EmptyMembershipActionPipe implements PipeTransform {
  transform(value: unknown) {
    if (value !== undefined && (value === null || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 0)) {
      throw new ApiError(400, 'INVALID_REQUEST', 'This action does not accept request fields.');
    }
    return undefined;
  }
}

export class ParticipantDto {
  @ApiProperty({ minLength: 2, maxLength: 80 })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 80) @Matches(/^[^\u0000-\u001f\u007f]+$/)
  name!: string;
}
export class CreateMemberAccountDto extends ParticipantDto {
  @ApiProperty({ enum: ACCOUNT_TYPES }) @IsIn(ACCOUNT_TYPES) accountType!: AccountType;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') creationKey!: string;
  @ApiProperty({ type: [ParticipantDto], minItems: 1, maxItems: 4 })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4) @ValidateNested({ each: true }) @Type(() => ParticipantDto)
  participants!: ParticipantDto[];
}
export class QuoteMembershipDto {
  @ApiProperty({ enum: ACCOUNT_TYPES }) @IsIn(ACCOUNT_TYPES) accountType!: AccountType;
  @ApiProperty({ enum: TIERS }) @IsIn(TIERS) tier!: Tier;
  @ApiProperty({ minimum: 1, maximum: 120, description: 'An available duration from the published catalog.' }) @IsInt() @Min(1) @Max(120) months!: number;
}
export class PurchaseMembershipDto extends QuoteMembershipDto {
  @ApiProperty({ default: false, description: 'Explicit consent to renew this plan every selected duration; requires a verified provider mandate.' }) @IsBoolean() autoRenew: boolean = false;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') accountId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') idempotencyKey!: string;
  @ApiProperty() @IsString() @Length(1, 80) programId!: string;
  @ApiProperty() @IsString() @Length(1, 120) catalogVersion!: string;
}
export class MembershipIdDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') id!: string;
}
