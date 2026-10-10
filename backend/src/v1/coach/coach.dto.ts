import {
  IsBoolean,
  IsInt,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
  IsOptional,
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
export class GenerateCoachPlanDto {
  @IsUUID() requestId: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[];
  @IsInt() @Min(20) @Max(120) minutes: number;
  @IsString() @Length(1, 200) @Matches(/\S/) goal: string;
  @IsIn(['beginner', 'intermediate', 'advanced']) experience: string;
  @IsString() @Length(1, 200) @Matches(/\S/) equipment: string;
  @IsString() @MaxLength(300) limitations: string;
}
export class GenerateCoachPlanFromMessageDto {
  @IsUUID() requestId: string;
  @IsIn(['weekly', 'four_on_one_off', 'five_on_one_off']) pattern:
    | 'weekly'
    | 'four_on_one_off'
    | 'five_on_one_off';
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate: string;
  @IsOptional() @IsInt() @Min(1) @Max(6) cycles?: number;
  @IsArray()
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[];
  @IsInt() @Min(20) @Max(120) minutes: number;
  @IsString() @Length(1, 200) @Matches(/\S/) goal: string;
  @IsIn(['beginner', 'intermediate', 'advanced']) experience:
    | 'beginner'
    | 'intermediate'
    | 'advanced';
  @IsString() @Length(1, 200) @Matches(/\S/) equipment: string;
  @IsString() @Length(1, 300) @Matches(/\S/) limitations: string;
}
export class UpdateCoachPlanDto {
  @IsInt() @Min(1) version: number;
  @IsString() @MaxLength(30000) payload: string;
}
export class ApplyCoachPlanDto {
  @IsInt() @Min(1) version: number;
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  allowConflictDates: string[];
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  skipDates: string[];
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

export class CoachSettingsDto {
  @IsBoolean() enabled: boolean;
  @IsString() @Length(1, 40) @Matches(/\S/) name: string;
  @IsString() @Length(1, 500) @Matches(/\S/) welcome: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  @Matches(/\S/, { each: true })
  quickQuestions: string[];
  @IsIn(['concise', 'balanced', 'detailed']) style:
    | 'concise'
    | 'balanced'
    | 'detailed';
  @IsInt() @Min(1) @Max(500) dailyUserLimit: number;
  @IsInt() @Min(1) @Max(50000) dailyTotalLimit: number;
  @IsInt() @Min(256) @Max(4000) maxOutputTokens: number;
}
export class CoachFeedbackDto {
  @IsIn(['up', 'down']) rating: 'up' | 'down';
  @IsString() @MaxLength(1000) comment: string;
  @IsBoolean() shareContext: boolean;
}
export class ResolveFeedbackDto {
  @IsIn(['open', 'reviewing', 'resolved']) state: string;
  @IsString() @MaxLength(1000) resolution: string;
  @IsOptional() @IsUUID() documentId?: string | null;
}
