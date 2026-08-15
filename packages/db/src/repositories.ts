import type {
  AudioAsset, AudioAssetRepository,
  Content, ContentRepository, ContentTargetItem,
  Encounter, EncounterRepository, LearnerProfile, LearnerProfileRepository, LearnerLexemeState, LearnerLexemeStateRepository,
  LearnerError, LearnerErrorRepository,
  LearnerInterest, LearnerInterestRepository,
  LearningSession, LearningSessionRepository,
  Lexeme, LexemeRepository, ReviewItem, ReviewRepository,
  SessionActivity, SessionActivityRepository,
  ImportedContent, ImportedContentRepository,
  World, WorldRepository, WorldProgress, WorldProgressRepository,
  BossChallenge, BossChallengeRepository, BossChallengeAttempt, BossChallengeAttemptRepository,
  MediaPreparation, MediaPreparationRepository,
  DeviceIdentity, DeviceIdentityRepository, SyncState, SyncStateRepository,
  SettingsRepository,
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
  listAll(language: string): Lexeme[] {
    return (this.db.prepare("SELECT * FROM lexemes WHERE language=? ORDER BY frequency_rank IS NULL, frequency_rank").all(language) as Row[]).map((row) => this.map(row));
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

const metadataFrom = (row: Row): Record<string, unknown> | undefined => typeof row.metadata_json === "string" ? JSON.parse(row.metadata_json) as Record<string, unknown> : undefined;
const numberOrUndefined = (value: unknown): number | undefined => typeof value === "number" ? value : undefined;

export class SqliteContentRepository implements ContentRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(id: string): Content | null { const row = this.db.prepare("SELECT * FROM content WHERE id=?").get(id) as Row | undefined; return row ? this.map(row) : null; }
  upsert(c: Content): void { this.db.prepare(`INSERT INTO content (id,learner_id,content_type,title,body_text,language,topic,estimated_difficulty,known_ratio,review_ratio,unknown_ratio,source_type,source_reference,provider,model,prompt_version,status,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body_text=excluded.body_text,topic=excluded.topic,estimated_difficulty=excluded.estimated_difficulty,known_ratio=excluded.known_ratio,review_ratio=excluded.review_ratio,unknown_ratio=excluded.unknown_ratio,status=excluded.status,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at`).run(c.id,c.learnerId ?? null,c.contentType,c.title ?? null,c.bodyText ?? null,c.language,c.topic ?? null,c.estimatedDifficulty ?? null,c.knownRatio ?? null,c.reviewRatio ?? null,c.unknownRatio ?? null,c.sourceType,c.sourceReference ?? null,c.provider ?? null,c.model ?? null,c.promptVersion ?? null,c.status,c.metadata ? JSON.stringify(c.metadata) : null,c.createdAt,c.updatedAt); }
  listTargetItems(contentId: string): ContentTargetItem[] { return (this.db.prepare("SELECT * FROM content_target_items WHERE content_id=?").all(contentId) as Row[]).map((r) => ({ id:String(r.id), contentId:String(r.content_id), itemType:String(r.item_type) as ContentTargetItem["itemType"], itemId:String(r.item_id), role:String(r.role) as ContentTargetItem["role"] })); }
  replaceTargetItems(contentId: string, items: ContentTargetItem[]): void {
    this.db.prepare("DELETE FROM content_target_items WHERE content_id=?").run(contentId);
    for (const item of items) this.db.prepare("INSERT INTO content_target_items (id,content_id,item_type,item_id,role) VALUES (?,?,?,?,?)").run(item.id,item.contentId,item.itemType,item.itemId,item.role);
  }
  private map(row: Row): Content { return { id:String(row.id), learnerId:optionalString(row.learner_id), contentType:String(row.content_type) as Content["contentType"], title:optionalString(row.title), bodyText:optionalString(row.body_text), language:String(row.language), topic:optionalString(row.topic), estimatedDifficulty:numberOrUndefined(row.estimated_difficulty), knownRatio:numberOrUndefined(row.known_ratio), reviewRatio:numberOrUndefined(row.review_ratio), unknownRatio:numberOrUndefined(row.unknown_ratio), sourceType:String(row.source_type) as Content["sourceType"], sourceReference:optionalString(row.source_reference), provider:optionalString(row.provider), model:optionalString(row.model), promptVersion:optionalString(row.prompt_version), status:String(row.status) as Content["status"], metadata:metadataFrom(row), createdAt:String(row.created_at), updatedAt:String(row.updated_at) }; }
}

export class SqliteLearningSessionRepository implements LearningSessionRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(id: string): LearningSession | null { const row = this.db.prepare("SELECT * FROM learning_sessions WHERE id=?").get(id) as Row | undefined; return row ? this.map(row) : null; }
  findInProgress(learnerId: string): LearningSession | null { const row = this.db.prepare("SELECT * FROM learning_sessions WHERE learner_id=? AND status='IN_PROGRESS' ORDER BY created_at DESC LIMIT 1").get(learnerId) as Row | undefined; return row ? this.map(row) : null; }
  listCompleted(learnerId: string, limit: number): LearningSession[] { return (this.db.prepare("SELECT * FROM learning_sessions WHERE learner_id=? AND status='COMPLETED' ORDER BY completed_at DESC LIMIT ?").all(learnerId, limit) as Row[]).map((r) => this.map(r)); }
  upsert(s: LearningSession): void { this.db.prepare(`INSERT INTO learning_sessions (id,learner_id,session_type,status,planned_minutes,actual_seconds,started_at,completed_at,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,planned_minutes=excluded.planned_minutes,actual_seconds=excluded.actual_seconds,started_at=excluded.started_at,completed_at=excluded.completed_at,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at`).run(s.id,s.learnerId,s.sessionType,s.status,s.plannedMinutes ?? null,s.actualSeconds ?? null,s.startedAt ?? null,s.completedAt ?? null,s.metadata ? JSON.stringify(s.metadata) : null,s.createdAt,s.updatedAt); }
  private map(row: Row): LearningSession { return { id:String(row.id), learnerId:String(row.learner_id), sessionType:String(row.session_type) as LearningSession["sessionType"], status:String(row.status) as LearningSession["status"], plannedMinutes:numberOrUndefined(row.planned_minutes), actualSeconds:numberOrUndefined(row.actual_seconds), startedAt:optionalString(row.started_at), completedAt:optionalString(row.completed_at), metadata:metadataFrom(row), createdAt:String(row.created_at), updatedAt:String(row.updated_at) }; }
}

export class SqliteSessionActivityRepository implements SessionActivityRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  listBySession(sessionId: string): SessionActivity[] { return (this.db.prepare("SELECT * FROM session_activities WHERE session_id=? ORDER BY sequence_number").all(sessionId) as Row[]).map((r) => this.map(r)); }
  upsert(a: SessionActivity): void { this.db.prepare(`INSERT INTO session_activities (id,session_id,activity_type,sequence_number,status,content_id,started_at,completed_at,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,content_id=excluded.content_id,started_at=excluded.started_at,completed_at=excluded.completed_at,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at`).run(a.id,a.sessionId,a.activityType,a.sequenceNumber,a.status,a.contentId ?? null,a.startedAt ?? null,a.completedAt ?? null,a.metadata ? JSON.stringify(a.metadata) : null,a.createdAt,a.updatedAt); }
  private map(row: Row): SessionActivity { return { id:String(row.id), sessionId:String(row.session_id), activityType:String(row.activity_type) as SessionActivity["activityType"], sequenceNumber:Number(row.sequence_number), status:String(row.status) as SessionActivity["status"], contentId:optionalString(row.content_id), startedAt:optionalString(row.started_at), completedAt:optionalString(row.completed_at), metadata:metadataFrom(row), createdAt:String(row.created_at), updatedAt:String(row.updated_at) }; }
}

export class SqliteAudioAssetRepository implements AudioAssetRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(id: string): AudioAsset | null { const row = this.db.prepare("SELECT * FROM audio_assets WHERE id=?").get(id) as Row | undefined; return row ? this.map(row) : null; }
  findByCacheKey(textHash: string, voice: string, speed: number, provider: string): AudioAsset | null { const row = this.db.prepare("SELECT * FROM audio_assets WHERE text_hash=? AND voice=? AND speed=? AND provider=? ORDER BY created_at DESC LIMIT 1").get(textHash, voice, speed, provider) as Row | undefined; return row ? this.map(row) : null; }
  upsert(a: AudioAsset): void { this.db.prepare(`INSERT INTO audio_assets (id,content_id,text_hash,provider,voice,speed,file_path,duration_ms,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET file_path=excluded.file_path,duration_ms=excluded.duration_ms`).run(a.id,a.contentId ?? null,a.textHash,a.provider ?? null,a.voice ?? null,a.speed ?? null,a.filePath,a.durationMs ?? null,a.createdAt); }
  private map(row: Row): AudioAsset { return { id:String(row.id), contentId:optionalString(row.content_id), textHash:String(row.text_hash), provider:optionalString(row.provider), voice:optionalString(row.voice), speed:numberOrUndefined(row.speed), filePath:String(row.file_path), durationMs:numberOrUndefined(row.duration_ms), createdAt:String(row.created_at) }; }
}

export class SqliteLearnerErrorRepository implements LearnerErrorRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  findByPattern(learnerId: string, category: string, normalizedPattern: string): LearnerError | null {
    const row = this.db.prepare("SELECT * FROM learner_errors WHERE learner_id=? AND category=? AND normalized_pattern=?").get(learnerId, category, normalizedPattern) as Row | undefined;
    return row ? this.map(row) : null;
  }
  upsert(e: LearnerError): void {
    this.db.prepare(`INSERT INTO learner_errors (id,learner_id,category,normalized_pattern,example_original,example_preferred,occurrences,severity,first_seen_at,last_seen_at,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(learner_id,category,normalized_pattern) DO UPDATE SET example_original=excluded.example_original,example_preferred=excluded.example_preferred,occurrences=excluded.occurrences,severity=excluded.severity,last_seen_at=excluded.last_seen_at,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at`).run(e.id,e.learnerId,e.category,e.normalizedPattern,e.exampleOriginal ?? null,e.examplePreferred ?? null,e.occurrences,e.severity,e.firstSeenAt,e.lastSeenAt,e.metadata ? JSON.stringify(e.metadata) : null,e.createdAt,e.updatedAt);
  }
  listRecent(learnerId: string, limit: number): LearnerError[] {
    return (this.db.prepare("SELECT * FROM learner_errors WHERE learner_id=? ORDER BY last_seen_at DESC LIMIT ?").all(learnerId, limit) as Row[]).map((r) => this.map(r));
  }
  private map(row: Row): LearnerError {
    return { id: String(row.id), learnerId: String(row.learner_id), category: String(row.category) as LearnerError["category"], normalizedPattern: String(row.normalized_pattern),
      exampleOriginal: optionalString(row.example_original), examplePreferred: optionalString(row.example_preferred),
      occurrences: Number(row.occurrences), severity: Number(row.severity), firstSeenAt: String(row.first_seen_at), lastSeenAt: String(row.last_seen_at),
      metadata: metadataFrom(row), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
}

export class SqliteImportedContentRepository implements ImportedContentRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(id: string): ImportedContent | null {
    const row = this.db.prepare("SELECT * FROM imported_content WHERE id=?").get(id) as Row | undefined;
    return row ? this.map(row) : null;
  }
  upsert(r: ImportedContent): void {
    this.db.prepare(`INSERT INTO imported_content (id,learner_id,content_id,title,raw_text,language,estimated_difficulty,known_ratio,unknown_ratio,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content_id=excluded.content_id,title=excluded.title,estimated_difficulty=excluded.estimated_difficulty,known_ratio=excluded.known_ratio,unknown_ratio=excluded.unknown_ratio,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at`).run(r.id,r.learnerId,r.contentId ?? null,r.title ?? null,r.rawText,r.language,r.estimatedDifficulty ?? null,r.knownRatio ?? null,r.unknownRatio ?? null,r.metadata ? JSON.stringify(r.metadata) : null,r.createdAt,r.updatedAt);
  }
  listByLearner(learnerId: string, limit: number): ImportedContent[] {
    return (this.db.prepare("SELECT * FROM imported_content WHERE learner_id=? ORDER BY created_at DESC LIMIT ?").all(learnerId, limit) as Row[]).map((r) => this.map(r));
  }
  private map(row: Row): ImportedContent {
    return { id: String(row.id), learnerId: String(row.learner_id), contentId: optionalString(row.content_id), title: optionalString(row.title),
      rawText: String(row.raw_text), language: String(row.language), estimatedDifficulty: numberOrUndefined(row.estimated_difficulty),
      knownRatio: numberOrUndefined(row.known_ratio), unknownRatio: numberOrUndefined(row.unknown_ratio),
      metadata: metadataFrom(row), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
}

export class SqliteLearnerInterestRepository implements LearnerInterestRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  listByUser(userId: string): LearnerInterest[] { return (this.db.prepare("SELECT * FROM learner_interests WHERE user_id=? ORDER BY weight DESC").all(userId) as Row[]).map((r) => ({ id:String(r.id), userId:String(r.user_id), interest:String(r.interest), weight:Number(r.weight), createdAt:String(r.created_at) })); }
  replaceAll(userId: string, interests: LearnerInterest[]): void {
    this.db.prepare("DELETE FROM learner_interests WHERE user_id=?").run(userId);
    for (const interest of interests) this.db.prepare("INSERT INTO learner_interests (id,user_id,interest,weight,created_at) VALUES (?,?,?,?,?)").run(interest.id,interest.userId,interest.interest,interest.weight,interest.createdAt);
  }
}

const worldMetadataFrom = (row: Row): { targetLexemeIds?: string[] } => typeof row.metadata_json === "string" ? JSON.parse(row.metadata_json) as { targetLexemeIds?: string[] } : {};

export class SqliteWorldRepository implements WorldRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(id: string): World | null { const row = this.db.prepare("SELECT * FROM worlds WHERE id=?").get(id) as Row | undefined; return row ? this.map(row) : null; }
  getByKey(language: string, key: string): World | null { const row = this.db.prepare("SELECT * FROM worlds WHERE language=? AND key=?").get(language, key) as Row | undefined; return row ? this.map(row) : null; }
  listAll(language: string): World[] { return (this.db.prepare("SELECT * FROM worlds WHERE language=? ORDER BY ordering").all(language) as Row[]).map((r) => this.map(r)); }
  upsert(w: World): void {
    this.db.prepare(`INSERT INTO worlds (id,language,key,name,description,ordering,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,ordering=excluded.ordering,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at`).run(w.id,w.language,w.key,w.name,w.description ?? null,w.ordering,JSON.stringify({ targetLexemeIds: w.targetLexemeIds }),w.createdAt,w.updatedAt);
  }
  private map(row: Row): World {
    const metadata = worldMetadataFrom(row);
    return { id: String(row.id), language: String(row.language), key: String(row.key), name: String(row.name), description: optionalString(row.description),
      ordering: Number(row.ordering), targetLexemeIds: metadata.targetLexemeIds ?? [], createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
}

export class SqliteWorldProgressRepository implements WorldProgressRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(learnerId: string, worldId: string): WorldProgress | null { const row = this.db.prepare("SELECT * FROM world_progress WHERE learner_id=? AND world_id=?").get(learnerId, worldId) as Row | undefined; return row ? this.map(row) : null; }
  upsert(p: WorldProgress): void {
    this.db.prepare(`INSERT INTO world_progress (learner_id,world_id,mastery_score,boss_challenge_completed,last_activity_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(learner_id,world_id) DO UPDATE SET mastery_score=excluded.mastery_score,boss_challenge_completed=excluded.boss_challenge_completed,last_activity_at=excluded.last_activity_at,updated_at=excluded.updated_at`).run(p.learnerId,p.worldId,p.masteryScore,Number(p.bossChallengeCompleted),p.lastActivityAt ?? null,p.createdAt,p.updatedAt);
  }
  listByLearner(learnerId: string): WorldProgress[] { return (this.db.prepare("SELECT * FROM world_progress WHERE learner_id=?").all(learnerId) as Row[]).map((r) => this.map(r)); }
  private map(row: Row): WorldProgress {
    return { learnerId: String(row.learner_id), worldId: String(row.world_id), masteryScore: Number(row.mastery_score), bossChallengeCompleted: bool(row.boss_challenge_completed),
      lastActivityAt: optionalString(row.last_activity_at), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
}

const bossChallengeMetadataFrom = (row: Row): { targetPhrases?: string[] } => typeof row.metadata_json === "string" ? JSON.parse(row.metadata_json) as { targetPhrases?: string[] } : {};

export class SqliteBossChallengeRepository implements BossChallengeRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(id: string): BossChallenge | null { const row = this.db.prepare("SELECT * FROM boss_challenges WHERE id=?").get(id) as Row | undefined; return row ? this.map(row) : null; }
  getByKey(worldId: string, key: string): BossChallenge | null { const row = this.db.prepare("SELECT * FROM boss_challenges WHERE world_id=? AND key=?").get(worldId, key) as Row | undefined; return row ? this.map(row) : null; }
  listByWorld(worldId: string): BossChallenge[] { return (this.db.prepare("SELECT * FROM boss_challenges WHERE world_id=?").all(worldId) as Row[]).map((r) => this.map(r)); }
  upsert(c: BossChallenge): void {
    this.db.prepare(`INSERT INTO boss_challenges (id,world_id,language,key,title,scenario,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,scenario=excluded.scenario,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at`).run(c.id,c.worldId,c.language,c.key,c.title,c.scenario,JSON.stringify({ targetPhrases: c.targetPhrases }),c.createdAt,c.updatedAt);
  }
  private map(row: Row): BossChallenge {
    const metadata = bossChallengeMetadataFrom(row);
    return { id: String(row.id), worldId: String(row.world_id), language: String(row.language), key: String(row.key), title: String(row.title), scenario: String(row.scenario),
      targetPhrases: metadata.targetPhrases ?? [], createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
}

export class SqliteBossChallengeAttemptRepository implements BossChallengeAttemptRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  insert(a: BossChallengeAttempt): void {
    this.db.prepare("INSERT INTO boss_challenge_attempts (id,learner_id,boss_challenge_id,session_id,task_completion,comprehension,target_phrase_usage,ability_to_continue,result,feedback,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(a.id,a.learnerId,a.bossChallengeId,a.sessionId ?? null,a.taskCompletion,a.comprehension,a.targetPhraseUsage,a.abilityToContinue,a.result,a.feedback ?? null,a.createdAt);
  }
  listByLearner(learnerId: string, limit: number): BossChallengeAttempt[] { return (this.db.prepare("SELECT * FROM boss_challenge_attempts WHERE learner_id=? ORDER BY created_at DESC LIMIT ?").all(learnerId, limit) as Row[]).map((r) => this.map(r)); }
  bestForChallenge(learnerId: string, bossChallengeId: string): BossChallengeAttempt | null {
    const row = this.db.prepare("SELECT * FROM boss_challenge_attempts WHERE learner_id=? AND boss_challenge_id=? ORDER BY (task_completion+comprehension+target_phrase_usage+ability_to_continue) DESC LIMIT 1").get(learnerId, bossChallengeId) as Row | undefined;
    return row ? this.map(row) : null;
  }
  private map(row: Row): BossChallengeAttempt {
    return { id: String(row.id), learnerId: String(row.learner_id), bossChallengeId: String(row.boss_challenge_id), sessionId: optionalString(row.session_id),
      taskCompletion: Number(row.task_completion), comprehension: Number(row.comprehension), targetPhraseUsage: Number(row.target_phrase_usage), abilityToContinue: Number(row.ability_to_continue),
      result: String(row.result) as BossChallengeAttempt["result"], feedback: optionalString(row.feedback), createdAt: String(row.created_at) };
  }
}

export class SqliteMediaPreparationRepository implements MediaPreparationRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(id: string): MediaPreparation | null { const row = this.db.prepare("SELECT * FROM media_preparation WHERE id=?").get(id) as Row | undefined; return row ? this.map(row) : null; }
  upsert(p: MediaPreparation): void {
    this.db.prepare(`INSERT INTO media_preparation (id,learner_id,title,transcript_excerpt,language,estimated_comprehension,high_value_lexeme_ids_json,prepared_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET estimated_comprehension=excluded.estimated_comprehension,high_value_lexeme_ids_json=excluded.high_value_lexeme_ids_json,prepared_count=excluded.prepared_count,updated_at=excluded.updated_at`).run(p.id,p.learnerId,p.title,p.transcriptExcerpt,p.language,p.estimatedComprehension,JSON.stringify(p.highValueLexemeIds),p.preparedCount,p.createdAt,p.updatedAt);
  }
  listByLearner(learnerId: string, limit: number): MediaPreparation[] { return (this.db.prepare("SELECT * FROM media_preparation WHERE learner_id=? ORDER BY created_at DESC LIMIT ?").all(learnerId, limit) as Row[]).map((r) => this.map(r)); }
  private map(row: Row): MediaPreparation {
    return { id: String(row.id), learnerId: String(row.learner_id), title: String(row.title), transcriptExcerpt: String(row.transcript_excerpt), language: String(row.language),
      estimatedComprehension: Number(row.estimated_comprehension), highValueLexemeIds: JSON.parse(String(row.high_value_lexeme_ids_json)) as string[],
      preparedCount: Number(row.prepared_count), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
}

export class SqliteDeviceIdentityRepository implements DeviceIdentityRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(): DeviceIdentity | null {
    const row = this.db.prepare("SELECT * FROM device_identity LIMIT 1").get() as Row | undefined;
    return row ? { deviceId: String(row.device_id), createdAt: String(row.created_at) } : null;
  }
  create(identity: DeviceIdentity): void {
    this.db.prepare("INSERT OR IGNORE INTO device_identity (device_id,created_at) VALUES (?,?)").run(identity.deviceId, identity.createdAt);
  }
}

export class SqliteSyncStateRepository implements SyncStateRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(entityType: string, entityId: string): SyncState | null {
    const row = this.db.prepare("SELECT * FROM sync_state WHERE entity_type=? AND entity_id=?").get(entityType, entityId) as Row | undefined;
    return row ? this.map(row) : null;
  }
  upsert(s: SyncState): void {
    this.db.prepare(`INSERT INTO sync_state (id,entity_type,entity_id,device_id,sync_version,deleted_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(entity_type,entity_id) DO UPDATE SET device_id=excluded.device_id,sync_version=excluded.sync_version,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at`).run(s.id,s.entityType,s.entityId,s.deviceId,s.syncVersion,s.deletedAt ?? null,s.updatedAt);
  }
  listSince(syncVersion: number, limit: number): SyncState[] {
    return (this.db.prepare("SELECT * FROM sync_state WHERE sync_version > ? ORDER BY sync_version LIMIT ?").all(syncVersion, limit) as Row[]).map((r) => this.map(r));
  }
  private map(row: Row): SyncState {
    return { id: String(row.id), entityType: String(row.entity_type), entityId: String(row.entity_id), deviceId: String(row.device_id),
      syncVersion: Number(row.sync_version), deletedAt: optionalString(row.deleted_at), updatedAt: String(row.updated_at) };
  }
}

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: DatabaseSyncInstance) {}
  get(key: string): unknown | null {
    const row = this.db.prepare("SELECT value_json FROM settings WHERE key=?").get(key) as { value_json: string } | undefined;
    return row ? (JSON.parse(row.value_json) as unknown) : null;
  }
  set(key: string, value: unknown, updatedAt: string): void {
    this.db.prepare("INSERT INTO settings (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").run(key, JSON.stringify(value), updatedAt);
  }
}
