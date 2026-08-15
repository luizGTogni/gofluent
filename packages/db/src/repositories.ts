import type {
  Encounter, EncounterRepository, LearnerProfile, LearnerProfileRepository, LearnerLexemeState, LearnerLexemeStateRepository,
  Lexeme, LexemeRepository, ReviewItem, ReviewRepository,
} from "@gofluent/core";
import type { DatabaseSyncInstance } from "./sqlite/node-sqlite.js";

type Row = Record<string, unknown>;
const bool = (value: unknown): boolean => value === 1;
const optionalString = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;
const stateFrom = (row: Row): LearnerLexemeState => ({
  learnerId: String(row.learner_id), itemId: String(row.lexeme_id), lexemeId: String(row.lexeme_id),
  encounters: Number(row.encounters), heardCount: Number(row.heard_count), readingRecognition: Number(row.reading_recognition),
  listeningRecognition: Number(row.listening_recognition), recallScore: Number(row.recall_score), productiveScore: Number(row.productive_score),
  pronunciationScore: typeof row.pronunciation_score === "number" ? row.pronunciation_score : undefined,
  lastSeenAt: optionalString(row.last_seen_at), lastSuccessAt: optionalString(row.last_success_at), nextReviewAt: optionalString(row.next_review_at),
  createdAt: String(row.created_at), updatedAt: String(row.updated_at),
});
const encounterFrom = (row: Row): Encounter => ({
  id: String(row.id), learnerId: String(row.learner_id), itemType: String(row.item_type) as Encounter["itemType"], itemId: String(row.item_id),
  modality: String(row.modality) as Encounter["modality"], activity: String(row.activity) as Encounter["activity"], result: String(row.result) as Encounter["result"],
  assistanceUsed: bool(row.assistance_used), contentId: optionalString(row.content_id), sessionId: optionalString(row.session_id),
  confidence: typeof row.confidence === "number" ? row.confidence : undefined,
  metadata: typeof row.metadata_json === "string" ? JSON.parse(row.metadata_json) as Record<string, unknown> : undefined, createdAt: String(row.created_at),
});

export class SqliteLexemeRepository implements LexemeRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(id: string): Lexeme | null {
    const row = this.db.prepare("SELECT * FROM lexemes WHERE id = ?").get(id) as Row | undefined;
    return row ? this.map(row) : null;
  }
  findByNormalizedForm(language: string, form: string): Lexeme[] {
    return (this.db.prepare("SELECT l.* FROM lexemes l JOIN lexeme_forms f ON f.lexeme_id=l.id WHERE l.language=? AND f.normalized_form=?").all(language, form.toLowerCase()) as Row[]).map((row) => this.map(row));
  }
  upsert(item: Lexeme): void {
    this.db.prepare(`INSERT INTO lexemes (id,language,lemma,part_of_speech,frequency_rank,cefr,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET language=excluded.language,lemma=excluded.lemma,part_of_speech=excluded.part_of_speech,frequency_rank=excluded.frequency_rank,cefr=excluded.cefr,updated_at=excluded.updated_at`).run(item.id,item.language,item.lemma,item.partOfSpeech ?? null,item.frequencyRank ?? null,item.cefr ?? null,item.createdAt,item.updatedAt);
    for (const form of item.forms) this.db.prepare("INSERT OR IGNORE INTO lexeme_forms (id,lexeme_id,form,normalized_form) VALUES (?,?,?,?)").run(`${item.id}:${form.toLowerCase()}`, item.id, form, form.toLowerCase());
  }
  private map(row: Row): Lexeme {
    const forms = this.db.prepare("SELECT form FROM lexeme_forms WHERE lexeme_id=?").all(String(row.id)) as Row[];
    return { id: String(row.id), language: String(row.language), lemma: String(row.lemma), partOfSpeech: optionalString(row.part_of_speech), frequencyRank: typeof row.frequency_rank === "number" ? row.frequency_rank : undefined, cefr: optionalString(row.cefr) as Lexeme["cefr"], forms: forms.map((f) => String(f.form)), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
}

export class SqliteLearnerProfileRepository implements LearnerProfileRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  getByUserId(userId: string): LearnerProfile | null {
    const row = this.db.prepare("SELECT * FROM learner_profiles WHERE user_id=?").get(userId) as Row | undefined;
    return row ? { id:String(row.id), userId:String(row.user_id), nativeLanguage:String(row.native_language), targetLanguage:String(row.target_language), estimatedCefr:optionalString(row.estimated_cefr) as LearnerProfile["estimatedCefr"], estimatedReceptiveVocabulary:typeof row.estimated_receptive_vocabulary === "number" ? row.estimated_receptive_vocabulary : undefined, estimatedProductiveVocabulary:typeof row.estimated_productive_vocabulary === "number" ? row.estimated_productive_vocabulary : undefined, dailyMinutes:Number(row.daily_minutes), onboardingCompleted:bool(row.onboarding_completed), createdAt:String(row.created_at), updatedAt:String(row.updated_at) } : null;
  }
  upsert(p: LearnerProfile): void {
    this.db.prepare(`INSERT INTO learner_profiles (id,user_id,native_language,target_language,estimated_cefr,estimated_receptive_vocabulary,estimated_productive_vocabulary,daily_minutes,onboarding_completed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET native_language=excluded.native_language,target_language=excluded.target_language,estimated_cefr=excluded.estimated_cefr,estimated_receptive_vocabulary=excluded.estimated_receptive_vocabulary,estimated_productive_vocabulary=excluded.estimated_productive_vocabulary,daily_minutes=excluded.daily_minutes,onboarding_completed=excluded.onboarding_completed,updated_at=excluded.updated_at`).run(p.id,p.userId,p.nativeLanguage,p.targetLanguage,p.estimatedCefr ?? null,p.estimatedReceptiveVocabulary ?? null,p.estimatedProductiveVocabulary ?? null,p.dailyMinutes,Number(p.onboardingCompleted),p.createdAt,p.updatedAt);
  }
}

export class SqliteLearnerLexemeStateRepository implements LearnerLexemeStateRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(learnerId: string, lexemeId: string): LearnerLexemeState | null { const row = this.db.prepare("SELECT * FROM learner_lexeme_state WHERE learner_id=? AND lexeme_id=?").get(learnerId, lexemeId) as Row | undefined; return row ? stateFrom(row) : null; }
  upsert(s: LearnerLexemeState): void { this.db.prepare(`INSERT INTO learner_lexeme_state (learner_id,lexeme_id,encounters,heard_count,reading_recognition,listening_recognition,recall_score,productive_score,pronunciation_score,last_seen_at,last_success_at,next_review_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(learner_id,lexeme_id) DO UPDATE SET encounters=excluded.encounters,heard_count=excluded.heard_count,reading_recognition=excluded.reading_recognition,listening_recognition=excluded.listening_recognition,recall_score=excluded.recall_score,productive_score=excluded.productive_score,pronunciation_score=excluded.pronunciation_score,last_seen_at=excluded.last_seen_at,last_success_at=excluded.last_success_at,next_review_at=excluded.next_review_at,updated_at=excluded.updated_at`).run(s.learnerId,s.lexemeId,s.encounters,s.heardCount,s.readingRecognition,s.listeningRecognition,s.recallScore,s.productiveScore,s.pronunciationScore ?? null,s.lastSeenAt ?? null,s.lastSuccessAt ?? null,s.nextReviewAt ?? null,s.createdAt,s.updatedAt); }
}

export class SqliteEncounterRepository implements EncounterRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  append(e: Encounter): void { this.db.prepare("INSERT INTO encounters (id,learner_id,item_type,item_id,modality,activity,result,assistance_used,content_id,session_id,confidence,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(e.id,e.learnerId,e.itemType,e.itemId,e.modality,e.activity,e.result,Number(e.assistanceUsed),e.contentId ?? null,e.sessionId ?? null,e.confidence ?? null,e.metadata ? JSON.stringify(e.metadata) : null,e.createdAt); }
  listRecent(learnerId: string, limit: number): Encounter[] { return (this.db.prepare("SELECT * FROM encounters WHERE learner_id=? ORDER BY created_at DESC LIMIT ?").all(learnerId,limit) as Row[]).map(encounterFrom); }
}

export class SqliteReviewRepository implements ReviewRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  upsert(i: ReviewItem): void { this.db.prepare(`INSERT INTO review_queue (id,learner_id,item_type,item_id,due_at,priority,last_result,scheduling_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(learner_id,item_type,item_id) DO UPDATE SET due_at=excluded.due_at,priority=excluded.priority,last_result=excluded.last_result,scheduling_version=excluded.scheduling_version,updated_at=excluded.updated_at`).run(i.id,i.learnerId,i.itemType,i.itemId,i.dueAt,i.priority,i.lastResult ?? null,i.schedulingVersion,i.createdAt,i.updatedAt); }
  listDue(learnerId: string, now: string, limit: number): ReviewItem[] { return (this.db.prepare("SELECT * FROM review_queue WHERE learner_id=? AND due_at<=? ORDER BY priority DESC,due_at LIMIT ?").all(learnerId,now,limit) as Row[]).map((r) => ({ id:String(r.id),learnerId:String(r.learner_id),itemType:String(r.item_type) as ReviewItem["itemType"],itemId:String(r.item_id),dueAt:String(r.due_at),priority:Number(r.priority),lastResult:optionalString(r.last_result) as ReviewItem["lastResult"],schedulingVersion:String(r.scheduling_version),createdAt:String(r.created_at),updatedAt:String(r.updated_at) })); }
}
