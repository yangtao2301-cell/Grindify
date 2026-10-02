import {
  IsBoolean,
  IsIn,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class SendCoachMessageDto {
  @IsString() @Length(1, 3000) @Matches(/\S/) content: string;
  @IsUUID() requestId: string;
}
export class SaveKnowledgeDto {
  @IsString() @Length(1, 160) @Matches(/\S/) title: string;
  @IsString() @Length(1, 60) category: string;
  @IsString() @MaxLength(500) source: string;
  @IsString() @Length(20, 100000) content: string;
  @IsBoolean() demo: boolean;
}
export class UpdateCoachMemoryDto {
  @IsString() @Length(1, 500) @Matches(/\S/) content: string;
}
export class SearchKnowledgeDto {
  @IsString() @Length(1, 1000) @Matches(/\S/) query: string;
}
export class KnowledgeActionDto {
  @IsIn(['publish', 'unpublish']) action: 'publish' | 'unpublish';
}
