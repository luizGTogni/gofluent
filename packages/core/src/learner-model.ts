import type {
  EncounterActivity,
  EncounterItemType,
  EncounterModality,
  EncounterResult,
} from "./enums.js";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export const CEFR_LEVELS: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export type LexicalItemType = EncounterItemType;

export interface LearnerProfile {
  id: string;
  userId: string;
  nativeLanguage: string;
  targetLanguage: string;
  estimatedCefr?: CefrLevel | undefined;
  estimatedReceptiveVocabulary?: number | undefined;
  estimatedProductiveVocabulary?: number | undefined;
  dailyMinutes: number;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lexeme {
  id: string;
  language: string;
  lemma: string;
  partOfSpeech?: string | undefined;
  frequencyRank?: number | undefined;
  cefr?: CefrLevel | undefined;
  forms: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Chunk {
  id: string;
  language: string;
  text: string;
  normalizedText: string;
  chunkType?: string | undefined;
  frequencyRank?: number | undefined;
  cefr?: CefrLevel | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerItemState {
  learnerId: string;
  itemId: string;
  encounters: number;
  heardCount: number;
  readingRecognition: number;
  listeningRecognition: number;
  recallScore: number;
  productiveScore: number;
  lastSeenAt?: string | undefined;
  lastSuccessAt?: string | undefined;
  nextReviewAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerLexemeState extends LearnerItemState {
  lexemeId: string;
  pronunciationScore?: number | undefined;
}
export interface LearnerChunkState extends LearnerItemState {
  chunkId: string;
}

export interface Encounter {
  id: string;
  learnerId: string;
  itemType: LexicalItemType;
  itemId: string;
  modality: EncounterModality;
  activity: EncounterActivity;
  result: EncounterResult;
  assistanceUsed: boolean;
  contentId?: string | undefined;
  sessionId?: string | undefined;
  confidence?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  learnerId: string;
  itemType: LexicalItemType;
  itemId: string;
  dueAt: string;
  priority: number;
  lastResult?: EncounterResult | undefined;
  schedulingVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerProfileRepository {
  getByUserId(userId: string): LearnerProfile | null;
  upsert(profile: LearnerProfile): void;
}
export interface LexemeRepository {
  get(id: string): Lexeme | null;
  findByNormalizedForm(language: string, form: string): Lexeme[];
  listAll(language: string): Lexeme[];
  upsert(lexeme: Lexeme): void;
}
export interface LearnerLexemeStateRepository {
  get(learnerId: string, lexemeId: string): LearnerLexemeState | null;
  upsert(state: LearnerLexemeState): void;
}
export interface LearnerChunkStateRepository {
  get(learnerId: string, chunkId: string): LearnerChunkState | null;
  upsert(state: LearnerChunkState): void;
}
export interface EncounterRepository {
  append(encounter: Encounter): void;
  listRecent(learnerId: string, limit: number): Encounter[];
}
export interface ReviewRepository {
  upsert(item: ReviewItem): void;
  listDue(learnerId: string, now: string, limit: number): ReviewItem[];
}

export function emptyLearnerItemState(
  learnerId: string,
  itemId: string,
  timestamp: string,
): LearnerItemState {
  return { learnerId, itemId, encounters: 0, heardCount: 0, readingRecognition: 0, listeningRecognition: 0,
    recallScore: 0, productiveScore: 0, createdAt: timestamp, updatedAt: timestamp };
}
