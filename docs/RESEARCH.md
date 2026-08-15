# Research: AI-Powered English Learning System

## Executive Summary

This document outlines a research-informed product strategy for building an English-learning system powered by LLM APIs, with NVIDIA NIM as the primary infrastructure candidate for the MVP.

The central thesis is:

> **Help learners understand increasingly authentic English through large amounts of comprehensible input, turn encountered language into active vocabulary, and make important words and chunks reappear naturally across audio, text, conversation, and spaced review.**

The product should not become a traditional grammar course with an AI chatbot attached to it.

Instead, it should behave like a **personal English learning operating system** that models what the learner knows, selects the best next content, introduces high-value vocabulary in context, schedules re-exposure, and gradually transitions the learner from assisted study to real-world immersion.

The strongest product direction is:

- vocabulary and lexical repertoire first;
- comprehensible input;
- contextual repetition;
- retrieval practice;
- spaced repetition;
- listening-heavy learning;
- active speaking and writing;
- personalized content;
- learner-specific difficulty estimation;
- adaptive immersion;
- grammar as explanation and pattern recognition rather than the main curriculum;
- gamification tied to real competence rather than arbitrary points.

---

# 1. Core Research Conclusion

Focusing on **repertoire before grammar-first instruction** is a strong product direction, with one important qualification:

> Do not teach vocabulary primarily as isolated word-translation pairs.

Vocabulary is one of the major foundations of comprehension.

Research by Paul Nation and others suggests that a few thousand high-frequency word families provide a large percentage of coverage in everyday spoken English. Higher coverage is required for comfortable comprehension of authentic materials, especially written text.

This leads to an important product implication:

Traditional course architecture:

```text
Course
  ↓
Unit 1: Verb to Be
  ↓
Unit 2: Present Simple
  ↓
Unit 3: Past Simple
```

Recommended architecture:

```text
Repertoire
  ↓
Comprehension
  ↓
Re-use
  ↓
Fluency
```

Grammar still matters, but it should often explain patterns the learner is already encountering instead of acting as the main progression system.

Reference:

- Paul Nation, *Learning Vocabulary in Another Language*
- Cambridge University Press materials on vocabulary coverage and second-language vocabulary learning

---

# 2. The Lexical Engine Should Be the Core of the Product

The platform should maintain an explicit model of what the learner knows.

A simple binary model is not enough.

Bad model:

```text
apple = known
beautiful = unknown
```

Better model:

```text
word: "actually"

seen: 17
heard: 9

understands_in_context: 0.92
understands_audio: 0.71
can_recall_meaning: 0.83
can_use_in_sentence: 0.42
pronunciation: 0.58

contexts_seen:
- conversation
- movie
- article

last_seen: ...
next_review: ...
```

This becomes a **personal lexical model**.

That model can eventually become one of the most important technical and pedagogical assets of the platform.

---

# 3. Teach Chunks, Not Only Individual Words

Language is not built only from isolated vocabulary items.

The system should teach:

- words;
- collocations;
- phrasal verbs;
- formulaic expressions;
- sentence frames;
- lexical chunks.

Instead of teaching:

```text
take = pegar
```

Teach:

```text
take a look
take your time
take care
take a break
it takes time
```

Instead of teaching:

```text
point = ponto
```

Teach:

```text
What's the point?
That's a good point.
At this point...
The point is...
```

This makes learned vocabulary much closer to real usage.

A lexical record could include:

```text
word
lemma
word_family
meaning
frequency
CEFR
pronunciation
collocations
chunks
example_sentences
contexts_encountered
```

---

# 4. Comprehensible Input Should Drive the System

Putting a beginner in front of a difficult native movie without support and calling it immersion is not useful.

The material should be **slightly above the learner's current ability**.

The platform should estimate lexical coverage.

Example:

```text
Known vocabulary: 93%
Learning vocabulary: 5%
Hard vocabulary: 2%
```

This is potentially useful content.

Another example:

```text
Known vocabulary: 61%
Unknown vocabulary: 39%
```

This is probably too difficult for extensive learning.

The application should estimate difficulty for the specific learner rather than applying a generic label such as:

> "This series is B2."

A better interface:

```text
Breaking Bad — S01E01

Estimated comprehension:
████████░░ 81%

Known vocabulary: 87%
Known expressions: 73%
Speech speed: difficult
Pronunciation difficulty: intermediate
Visual context support: high

Recommendation:
Too difficult for relaxed extensive study.
Good for intensive assisted study.
```

This can become a major product differentiator.

---

# 5. Two Useful Frameworks for Language Learning

The traditional four skills are:

1. Listening
2. Reading
3. Speaking
4. Writing

The platform should support all four.

However, a second framework is especially useful for product architecture: Paul Nation's **Four Strands**.

## 5.1 Meaning-Focused Input

The learner receives language primarily to understand meaning.

Examples:

- stories;
- podcasts;
- videos;
- articles;
- dialogues;
- books;
- graded readers;
- interviews.

## 5.2 Meaning-Focused Output

The learner uses English to communicate meaning.

Examples:

- speaking with AI;
- answering questions;
- retelling stories;
- writing;
- explaining ideas;
- roleplay;
- debates.

## 5.3 Language-Focused Learning

The learner deliberately studies language.

Examples:

- vocabulary;
- chunks;
- pronunciation;
- grammar;
- recurring errors;
- spelling.

## 5.4 Fluency Development

The learner becomes faster and more automatic using language that is already mostly known.

Examples:

- re-reading;
- listening again;
- shadowing;
- timed speaking;
- retelling the same story;
- conversation with familiar vocabulary.

This is an excellent pedagogical architecture for an adaptive product.

Reference:

- Paul Nation, research on the Four Strands of language learning

---

# 6. The Main Learning Loop

A strong learning loop could be:

```text
DISCOVER
   ↓
UNDERSTAND
   ↓
NOTICE
   ↓
RECALL
   ↓
USE
   ↓
RE-ENCOUNTER
   ↓
MASTER
```

Example with the phrase:

```text
I'm looking forward to it.
```

## Step 1 — Listen

The learner hears:

> I'm looking forward to it.

## Step 2 — Attempt Meaning

Do not immediately show the translation.

## Step 3 — Add Context

```text
Tomorrow is my first day at the new job.
I'm looking forward to it.
```

## Step 4 — Explain Meaning

Explain what it means naturally.

## Step 5 — Teach the Pattern

```text
look forward to + something
look forward to + verb-ing
```

## Step 6 — More Examples

```text
I'm looking forward to the weekend.
She's looking forward to meeting you.
```

## Step 7 — Retrieval

Later:

```text
Complete:

"I'm ________ to seeing you."
```

## Step 8 — Production

AI asks:

> What are you looking forward to this month?

The learner answers.

## Step 9 — Re-Encounter

The phrase appears naturally again in a story, dialogue, listening exercise, or future conversation.

This last step is extremely important.

---

# 7. Spaced Repetition Should Be Mostly Invisible

Retrieval practice and spacing are among the strongest memory techniques available for vocabulary retention.

However, the entire product should not feel like a flashcard application.

Traditional SRS:

```text
Word
  ↓
Definition
```

Recommended contextual SRS:

```text
Word
  ↓
Sentence
  ↓
Audio
  ↓
Story
  ↓
Conversation
  ↓
Video
  ↓
Recall
```

Example:

The system detects:

```text
although
memory_strength = falling
```

Instead of only showing a flashcard, the system can generate:

```text
Although Jack was tired, he decided to...
```

Later:

> Tell me something you enjoy although other people may not.

The repetition becomes part of meaningful communication.

References:

- research on retrieval practice;
- research on spacing effects;
- vocabulary learning studies involving repeated exposure.

---

# 8. Vocabulary Should Have Mastery States

A word should not be classified only as "known" or "unknown."

A more useful progression:

```text
NEW
↓
FAMILIAR
↓
RECOGNIZED
↓
UNDERSTOOD
↓
RECALLABLE
↓
USABLE
↓
AUTOMATIC
```

This helps distinguish passive from active knowledge.

For example, a learner may understand:

```text
nevertheless
```

when reading it but never produce it spontaneously.

The product should therefore maintain at least two major scores:

```text
Receptive Vocabulary
Active Vocabulary
```

Potential dashboard:

```text
Receptive repertoire
4,814 words/chunks

Active repertoire
2,176 words/chunks
```

This turns vocabulary growth into a visible progression system.

---

# 9. Gamification Should Represent Real Competence

Gamification can improve motivation, but game mechanics should reinforce learning rather than distract from it.

Avoid:

```text
+10 XP for clicking a button
```

Prefer meaningful progression.

Example:

```text
        Daily Life
           78%
          /   \
     Food 89%  Travel 63%
                /     \
            Hotel    Airport
             71%       52%
```

The learner is not merely collecting points.

They are **conquering areas of usable English**.

Reference:

- systematic reviews of gamification in ESL/EFL learning

---

# 10. An "English World" Progression

A possible gamified lexical progression:

## Level 1 — Survivor

```text
0 → 500 core words/chunks
```

Goal:

> Survive basic situations in English.

## Level 2 — Explorer

```text
500 → 1,500
```

## Level 3 — Conversational

```text
1,500 → 3,000
```

## Level 4 — Independent

```text
3,000 → 5,000
```

## Level 5 — Media

```text
5,000 → 8,000
```

## Level 6 — Advanced

```text
8,000+
```

These numbers should **not** be presented as direct CEFR equivalents.

CEFR measures communicative ability, not just vocabulary size.

Use CEFR descriptors as a separate capability model.

Reference:

- Council of Europe, CEFR descriptors

---

# 11. Absolute Beginner: 0–500 Items

For someone who knows almost no English, avoid beginning with abstract grammar explanations.

Do not start with:

> Today we will study the verb "to be."

Start with highly concrete, visual, contextual language.

Example:

```text
This is a dog.
The dog is running.
Is the dog running?
Yes.
```

Prioritize:

```text
I
you
want
need
like
go
come
have
make
eat
drink
this
that
where
what
who
how
```

The curriculum should favor:

- extremely frequent words;
- extremely useful chunks;
- basic verbs;
- daily-life nouns;
- high-frequency question structures;
- survival language;
- visual and audio context.

Grammar can be present implicitly.

---

# 12. Beginner With Some Base: Approximately 500–2,000 Items

Introduce short stories.

Example:

```text
Tom wakes up late.
He looks at his phone.
"Oh no!"
His meeting starts in ten minutes...
```

The system should generate content using approximately:

```text
90–95% known language
5–10% learning language
```

A learning sequence:

## Listening

Listen without text.

## Reading

Read the story.

## Listening + Reading

Listen while following the text.

## Vocabulary Mining

Extract useful items such as:

```text
wake up
look at
start
late
meeting
```

## Comprehension

Ask meaning-focused questions.

## Retelling

Ask:

> Tell me what happened to Tom.

This combines vocabulary, reading, listening, speaking, and retrieval.

---

# 13. Intermediate Learners

At the intermediate level, the product should become less course-like and more content-driven.

Instead of:

> Lesson 28: Modal Verbs

Use:

> Choose what you want to learn about today.

Example topic:

```text
Technology
```

The platform can provide or adapt:

- articles;
- podcasts;
- interviews;
- videos;
- stories;
- documentation;
- dialogues.

The system automatically detects:

```text
unknown words
useful phrases
collocations
idioms
phrasal verbs
pronunciation challenges
```

The platform begins to teach **English for the learner's actual life**.

For a programmer:

```text
deployment
trade-off
bottleneck
latency
throughput
break down
figure out
set up
roll out
edge case
```

Personal relevance should improve motivation and usefulness.

---

# 14. Advanced Learners

At advanced levels, formal "lessons" should gradually disappear.

The platform becomes a:

> **Personal Language Immersion Engine**

Focus areas:

- nuance;
- humor;
- irony;
- phrasal verbs;
- idioms;
- collocations;
- professional language;
- academic vocabulary;
- accent exposure;
- speed;
- natural phrasing;
- cultural meaning.

Example feedback:

```text
You said:
"I did a mistake."

More natural:
"I made a mistake."
```

The system does not need to interrupt every conversation.

It can store the error and turn recurring patterns into future learning activities.

---

# 15. Error Memory

An adaptive error model can be extremely powerful.

Example:

```text
ERROR MEMORY

make/do mistakes     ███████░
in/on/at             █████░░░
present perfect      ███░░░░░
word order           ██░░░░░░
```

The system identifies recurring patterns and generates targeted practice.

This is better than forcing every learner through the same linear grammar syllabus.

---

# 16. Grammar Should Be Discovered From Input

Grammar should often appear after repeated exposure.

Suppose the learner repeatedly encounters:

```text
I've never been there.
Have you ever tried sushi?
I've already finished it.
```

Then the system can surface:

```text
Pattern discovered

You have encountered this pattern 14 times:

have/has + past participle
```

Then offer an explanation.

This approach makes grammar explain something the learner has already seen and partially internalized.

Grammar remains useful, but it is no longer the primary navigation structure.

---

# 17. Audio Should Be a First-Class Modality

Audio should be central to the product.

Every reading activity should ideally have audio.

Useful modes:

```text
▶ Normal
▶ 0.8×
▶ Sentence mode
▶ Shadow mode
▶ Dictation mode
▶ No transcript
```

Research on audiovisual input supports its value for second-language learning and vocabulary acquisition.

Reference:

- meta-analyses on audiovisual input and second-language learning

---

# 18. Example Listening Exercise

Audio:

```text
I didn't expect him to show up.
```

## First Pass

No transcript.

Ask:

> What happened?

## Second Pass

Reveal:

```text
I didn't expect him to show up.
```

Highlight:

```text
expect
show up
```

Explain meaning through context.

## Third Pass

Play again.

## Production

Ask the learner to repeat.

Then:

> Tell me about someone who showed up unexpectedly.

This converts one listening item into comprehension, vocabulary, pronunciation, and production practice.

---

# 19. Shadowing

A simple shadowing flow:

```text
Listen
  ↓
Repeat
  ↓
Compare
```

The system should not necessarily reduce pronunciation to a fake precision score.

It can instead give useful guidance.

Example:

```text
Target:
thought

Your pronunciation sounded closer to:
tot
```

Then provide another model and repetition attempt.

---

# 20. Movies and Series Need a Learning Method

Simply watching content is not enough.

A **Cinema Learning Mode** can turn a short scene into a full learning loop.

## Step 1 — Watch the Scene

30–120 seconds.

Do not pause.

## Step 2 — Comprehension

Ask:

> What did you understand?

## Step 3 — English Subtitles

Replay with English subtitles.

## Step 4 — Lexical Mining

Extract only high-value items.

Example:

```text
figure it out
give me a break
what do you mean?
come on
I have no idea
by the way
```

Do not teach every unknown word.

## Step 5 — Replay

Watch again without subtitles.

## Step 6 — Recall

Ask:

> What did she say after "Come on..."?

## Step 7 — Production

Generate a conversation that encourages use of the target chunks.

## Step 8 — Re-Encounter

Recycle the same phrases during later sessions.

Research supports vocabulary learning from captioned or subtitled audiovisual input, especially when exposure is repeated.

---

# 21. Subtitle Progression

A possible progression:

## A0–A1

```text
English audio
+
English subtitles
+
Portuguese assistance on demand
```

## A2

```text
English audio
+
English subtitles
```

## B1

First viewing:

```text
English audio
without subtitles
```

Second viewing:

```text
English subtitles
```

## B2+

```text
English audio
without subtitles

Subtitles only when necessary
```

The product should reduce long-term dependence on subtitles.

---

# 22. Suggested Audiovisual Content by Approximate Difficulty

These should be considered rough recommendations, not scientific level labels.

The ideal system should estimate difficulty at the episode or scene level.

## Absolute Beginner / Early Beginner

Prefer:

- graded audiovisual stories;
- ESL learner videos;
- simple children's material;
- Peppa Pig;
- Pocoyo in English;
- highly contextual short videos.

The primary goal is comprehension, not entertainment.

## A2

Possible options:

- Extra English;
- selected scenes from Young Sheldon;
- selected scenes from Modern Family;
- family animation;
- simple sitcom scenes.

## B1

Possible options:

- Friends;
- The Office;
- Brooklyn Nine-Nine;
- Modern Family;
- selected Stranger Things scenes;
- accessible movies and animation.

Sitcoms can be useful because situations and conversational expressions repeat.

## B2

Possible options:

- Breaking Bad;
- Suits;
- The Good Place;
- Sherlock;
- documentaries;
- interviews;
- native podcasts.

## C1+

Almost any content:

- debates;
- technical documentaries;
- stand-up;
- long-form podcasts;
- lectures;
- culturally dense films;
- professional media.

Again, learner-specific analysis is preferable to static labels.

---

# 23. Books and Extensive Reading

Extensive reading is an important component of lexical growth.

The main problem for beginners is difficulty.

A learner with limited vocabulary cannot comfortably read a native novel.

Therefore:

## A0–A2

Use **graded readers**.

These control vocabulary and grammatical complexity.

The platform can progressively use wider vocabulary bands.

References:

- research on extensive reading;
- graded readers;
- second-language vocabulary acquisition through reading.

---

# 24. LLMs Can Improve the Graded Reader Model

Traditional graded readers are fixed.

LLMs allow the product to generate highly personalized content while controlling vocabulary.

Example learner interests:

```text
AI
programming
entrepreneurship
games
```

A beginner story could be:

```text
John wants to build a small game...
```

A higher-level version could become:

```text
John has been working on his game for three months...
```

The same fictional world can become more linguistically sophisticated as the learner improves.

---

# 25. Adaptive Story Engine

Possible input:

```json
{
  "known_words": ["..."],
  "learning_words": ["..."],
  "avoid_words": ["..."],
  "interests": [
    "AI",
    "games",
    "technology"
  ],
  "level": "A2"
}
```

Target output profile:

```text
95% known vocabulary
3% review vocabulary
2% new vocabulary
```

Important:

> The backend should verify lexical constraints instead of blindly trusting the LLM.

The LLM generates.

The system validates.

---

# 26. Repetition Through New Content

Suppose yesterday the learner studied:

```text
although
instead
figure out
probably
end up
```

Today the Story Engine receives:

```text
MUST NATURALLY REUSE:

although
instead
figure out
probably
end up
```

Then it generates a new story.

This creates spaced repetition without making the user feel that they are repeating the same lesson.

---

# 27. Incidental Vocabulary Learning

Research suggests that learners acquire vocabulary incidentally through meaning-focused input such as:

- reading;
- listening;
- reading while listening;
- audiovisual input.

However, a single encounter is rarely enough.

The key principle is:

```text
Encounter
  ↓
Re-Encounter
  ↓
Retrieval
  ↓
Use
```

The system should treat vocabulary mastery as a probabilistic process rather than a one-time event.

Reference:

- meta-analyses on incidental second-language vocabulary learning

---

# 28. Lessons From Polyglots

Advice from polyglots should be treated as **experience-based guidance**, not as equivalent to controlled research.

Still, popular polyglot approaches often converge on useful principles.

Examples include ideas frequently promoted by learners such as Steve Kaufmann and Luca Lampariello:

- consume large amounts of interesting content;
- listen a lot;
- read a lot;
- tolerate ambiguity;
- learn words in context;
- revisit material;
- speak progressively;
- do not wait until you feel fully ready;
- integrate the language into everyday life.

Many of these ideas overlap with research on input, repeated exposure, extensive reading, vocabulary learning, and retrieval.

---

# 29. The Product Should Move Users Away From "Studying English"

A major behavioral objective should be changing:

> I need to study English for 30 minutes.

into:

> I want to spend 30 minutes consuming something interesting in English.

Eventually, the language becomes a medium rather than a school subject.

---

# 30. Immersion Feed

A controlled learning feed could contain:

```text
🎧 2 min podcast
📖 3 min story
🎬 1 min dialogue
📰 4 min article
🎤 3 min conversation
```

Each item can show:

```text
Estimated comprehension: 94%
New vocabulary: 7
Review vocabulary: 18
Topic: AI
Difficulty increase: +3%
```

The feed should not be designed as infinite-scroll addiction mechanics.

Sessions should have a clear educational endpoint.

---

# 31. Learn From Anything

A potential flagship feature:

The learner adds:

- text;
- article;
- PDF;
- transcript;
- permitted video transcript;
- permitted podcast transcript;
- personal material.

The system analyzes:

```text
Difficulty for you
████████░░

Known vocabulary: 91%
Unknown vocabulary: 9%

Useful new words: 14
Useful expressions: 8
Likely difficult sentences: 4
```

Then converts the material into:

- guided lesson;
- contextual flashcards;
- listening activity;
- quiz;
- conversation;
- cloze exercise;
- story;
- vocabulary review.

The application must respect licensing and copyright rules for third-party content.

---

# 32. "Netflix Difficulty for You"

A personalized media-preparation system could be extremely valuable.

Example:

```text
THE OFFICE

Estimated comprehension: 87%

Known: 3,418 / 4,032 relevant lexical items

High-value items to learn first:

○ awkward
○ apparently
○ fire someone
○ get along
○ make fun of
○ mess with
○ show up

[ PREPARE ME — 12 MIN ]
```

The system teaches the highest-value words and chunks before the learner watches.

This converts entertainment into structured immersion.

---

# 33. Pre-Immersion

Before a film, podcast, video, or book:

```text
Prepare me for it.
```

The system analyzes the content and selects 20–40 high-impact items.

Priority can use a score such as:

```text
Learning Value =
frequency_in_content
× general_usefulness
× importance_for_comprehension
× probability_unknown
```

This is much more useful than selecting random unknown words.

---

# 34. The LLM Should Be the Teacher, Not the Database

Responsibilities should be separated.

## Deterministic Backend

Responsible for:

- frequency lists;
- user history;
- SRS;
- CEFR;
- known vocabulary;
- progression;
- metrics;
- lexical state;
- scheduling;
- validation.

## LLM

Responsible for:

- examples;
- explanations;
- conversations;
- story generation;
- text adaptation;
- open-ended evaluation;
- error interpretation;
- contextual practice;
- natural-language feedback.

Do not ask an LLM:

> Decide by yourself which 3,000 words this learner knows.

Persist learner state explicitly.

---

# 35. NVIDIA NIM Architecture

NVIDIA NIM is a good fit for this type of system because it can support the main AI services required by the MVP.

High-level architecture:

```text
                   ┌──────────────┐
                   │    Client    │
                   │ Web / Mobile │
                   └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │ API Backend  │
                   └──────┬───────┘
                          │
        ┌─────────────────┼────────────────┐
        │                 │                │
        ▼                 ▼                ▼
 ┌────────────┐    ┌────────────┐   ┌─────────────┐
 │ Vocabulary │    │ Learning   │   │ Content     │
 │ Engine     │    │ Engine     │   │ Engine      │
 └─────┬──────┘    └─────┬──────┘   └─────┬───────┘
       │                 │                 │
       └────────────┬────┴─────────────────┘
                    ▼
              ┌─────────────┐
              │ NVIDIA NIM  │
              │     LLM     │
              └──────┬──────┘
                     │
        ┌────────────┼─────────────┐
        ▼            ▼             ▼
      ASR          TTS        Embeddings
```

Useful NVIDIA capabilities include:

- LLM inference APIs;
- OpenAI-compatible API patterns;
- tool calling;
- streaming;
- ASR;
- TTS;
- embeddings;
- reranking.

Official references:

- NVIDIA NIM documentation
- NVIDIA Speech NIM documentation
- NVIDIA NeMo Retriever documentation

---

# 36. Speech Architecture With NIM

For the MVP, a cascade is practical:

```text
USER SPEAKS
    ↓
ASR NIM
    ↓
TRANSCRIPT
    ↓
LLM NIM
    ↓
response / feedback
    ↓
TTS NIM
    ↓
AI SPEAKS
```

This architecture is valuable because the product can inspect:

```text
transcript
grammar
vocabulary
mistakes
known words
response quality
```

This makes it easier to build learning analytics.

---

# 37. Future Real-Time Voice Conversation

A future version may use lower-latency speech-to-speech systems.

However, for the MVP, a cascade is easier to control and debug.

The educational product benefits from access to intermediate text because it can analyze:

- vocabulary;
- grammar;
- word choice;
- recurring errors;
- target expressions;
- comprehension evidence.

---

# 38. Embeddings and Retrieval

Embeddings can support personalized content retrieval.

Possible embedded objects:

```text
content
sentences
stories
learner interests
chunks
errors
lesson history
```

Example:

The learner needs to review:

```text
figure out
```

The system retrieves content that:

- matches the learner's interests;
- is near the learner's lexical level;
- naturally contains or can support the target phrase.

This makes repetition relevant instead of mechanical.

---

# 39. Simplified Data Model

A starting schema:

```text
User

UserLexeme
    lexeme_id
    receptive_score
    productive_score
    listening_score
    pronunciation_score
    encounters
    successful_recalls
    last_seen
    next_review

Lexeme
    lemma
    forms
    definitions
    frequency_rank
    cefr
    phonemes

Chunk
    text
    frequency
    cefr

Encounter
    user
    lexeme
    content
    modality
    success
    timestamp

Content
    transcript
    lexical_profile
    difficulty
    topics

UserError
    original
    correction
    category
    occurrences
```

This supports significant personalization without requiring fine-tuning.

---

# 40. Do Not Fine-Tune First

Recommended MVP:

```text
LLM NIM
+
prompting
+
structured outputs
+
Postgres
+
ASR
+
TTS
```

Fine-tuning should come later, after the product accumulates valuable real usage data.

Examples of future training data:

```text
student response
→ correction
→ learner outcome
```

Before that, fine-tuning is likely premature optimization.

---

# 41. MVP Scope

Avoid building dozens of features initially.

Start with five experiences.

## 1. Daily Journey

Automatically assembled 15–20 minute session.

Example:

```text
3 min Review
5 min Story
4 min Listening
4 min Conversation
2 min Recap
```

## 2. Story

Adaptive reading + audio.

## 3. Speak

AI conversation.

## 4. Review

Contextual spaced review.

## 5. Learn From Content

Turn user-provided or permitted material into a lesson.

This is already enough to create a compelling MVP.

---

# 42. Adaptive Daily Journey

Example:

## Warm-Up

Review five items close to being forgotten.

## Story

Use:

- eight review items;
- three new items.

## Listening

Reuse the same vocabulary in a different context.

## Speak

Encourage the learner to use three target expressions.

## Boss Battle

End with an open conversation without hints.

---

# 43. Boss Battles

Boss Battles can make gamification represent real ability.

Example:

## Airport Boss

AI:

> Hello. Can I see your passport?

The learner must communicate without multiple choice.

Target repertoire:

```text
check in
passport
luggage
gate
flight
boarding pass
where
when
I'd like...
Could you...
```

Winning means demonstrating a practical communication skill.

That is much more meaningful than reaching an arbitrary XP number.

---

# 44. Learning Worlds

Possible worlds:

```text
🏠 Everyday Life
🍔 Food
✈️ Travel
💼 Work
👥 Friends
🎮 Gaming
💻 Technology
❤️ Relationships
🎬 Entertainment
🌎 Culture
🧠 Ideas
```

Each world contains:

- vocabulary;
- chunks;
- listening tasks;
- dialogues;
- stories;
- boss encounters;
- real content recommendations.

The user unlocks competence by domain.

---

# 45. Dashboard Metrics

Do not make XP the primary metric.

A stronger headline metric could be:

> **You understand approximately 72% of everyday English.**

Supporting metrics:

```text
Receptive vocabulary   2,841
Active vocabulary      1,394

Listening              68%
Reading                81%
Speaking               52%
Writing                61%
```

The user should feel:

> My world in English is getting larger.

---

# 46. Meaningful Exposure Metrics

Another useful dashboard:

```text
English understood this month

🎧 6h 42m listening
📖 31,420 words read
🎤 1h 18m speaking
```

Gamify meaningful exposure instead of just exercise completion.

---

# 47. The Algorithm Should Optimize Two Main Goals

## Retention

```text
What is the learner about to forget?
```

## Expansion

```text
Which next vocabulary items will most increase comprehension?
```

Not all vocabulary has equal value.

Learning a rare word may add almost nothing to everyday comprehension.

Learning a common connector, verb, chunk, or phrasal expression can have a much larger impact.

---

# 48. Vocabulary ROI

A useful heuristic:

```text
Learning Value =
frequency
× contextual_usefulness
× learner_interest
× upcoming_content_relevance
× current_memory_weakness
```

This allows the platform to prioritize the most valuable next items.

The LLM should not choose vocabulary randomly.

---

# 49. Personalization Changes the Curriculum

Two B1 learners should not necessarily learn the same next 500 items.

They share a common high-frequency core.

After that, the curriculum should branch.

Example:

```text
                 English Core
                  0 → 3000
                     / \
                    /   \
                   /     \
               Tech     Music
```

A programmer may need:

- deployment;
- debugging;
- architecture;
- APIs;
- bottlenecks.

A musician may need:

- rhythm;
- rehearsal;
- arrangement;
- mixing;
- performance.

The system should combine general English with domain-specific English.

---

# 50. What to Avoid

Avoid building the product around:

- grammar as the main map;
- isolated word translation;
- unrealistic numbers of new words per day;
- incomprehensible content labeled "immersion";
- endless multiple choice;
- XP disconnected from competence;
- interrupting every speaking mistake;
- letting the LLM invent the curriculum randomly;
- relying only on CEFR;
- permanent Portuguese subtitles;
- making SRS the entire product.

---

# 51. Internal Product Rule #1

> **Never teach an important word only once.**

A high-value item should:

1. appear;
2. be understood;
3. be heard;
4. be retrieved;
5. reappear;
6. be used;
7. become automatic.

---

# 52. Internal Product Rule #2

> **Never teach something without context when meaningful context is available.**

There is still value in deliberate study.

Vocabulary, grammar, pronunciation, and form-focused work should exist.

The key is balance.

Language-focused learning should support input, output, and fluency rather than replace them.

---

# 53. Proposed Pedagogical Architecture

```text
┌─────────────────────────────────────┐
│         PERSONAL ENGLISH OS         │
├─────────────────────────────────────┤
│                                     │
│        COMPREHENSIBLE INPUT         │
│       audio • text • video          │
│                  ↓                  │
│          Vocabulary Mining          │
│                  ↓                  │
│           Memory Engine             │
│                  ↓                  │
│          Contextual Review          │
│                  ↓                  │
│          Speaking / Writing         │
│                  ↓                  │
│             Feedback                │
│                  ↓                  │
│            Re-exposure              │
│                  ↓                  │
│              Fluency                │
│                                     │
└─────────────────────────────────────┘
```

Everything is personalized through:

```text
Learner interests
        +
CEFR profile
        +
Vocabulary model
        +
Memory model
        +
Error model
        +
Content difficulty
```

---

# 54. Main Product Differentiator

The positioning should not be:

> Learn English with AI.

That will quickly become generic.

A stronger product thesis is:

> **Everything you consume adapts to what you already know, and every important word you learn keeps reappearing until it becomes part of your English.**

This describes a system rather than a chatbot.

---

# 55. Recommended Learning Resources and Media Strategy

The platform should recommend external study material according to learner readiness.

The important part is not only **what to watch or read**, but **how to use it**.

## Beginner

Focus on:

- graded readers;
- short ESL videos;
- slow or simplified podcasts;
- visual stories;
- children's animation with clear context;
- generated adaptive stories.

Suggested study method:

```text
Listen
  ↓
Try to understand
  ↓
Read transcript
  ↓
Extract a few useful items
  ↓
Listen again
  ↓
Retell
```

## Intermediate

Focus on:

- sitcoms;
- YouTube channels around personal interests;
- accessible podcasts;
- news explainers;
- graded-to-native bridge books;
- interviews;
- simple documentaries.

Study method:

```text
First pass without help
  ↓
Second pass with English subtitles/transcript
  ↓
Mine only high-value vocabulary
  ↓
Replay
  ↓
Summarize
  ↓
Use target chunks in conversation
```

## Advanced

Focus on:

- native podcasts;
- debates;
- professional content;
- documentaries;
- novels;
- essays;
- lectures;
- stand-up;
- interviews with varied accents;
- technical and academic material.

At this stage the system should focus more on:

- nuance;
- speed;
- culture;
- collocations;
- idioms;
- stylistic register;
- natural expression.

---

# 56. Better Method for Watching Movies and Series

Recommended workflow:

## Passive Pass

Watch a short scene normally.

Goal:

> Understand the situation.

## Assisted Pass

Watch with English subtitles.

Goal:

> Confirm what was said.

## Lexical Pass

Select only important expressions.

Goal:

> Learn useful language, not every unknown word.

## Replay Pass

Watch again without subtitles.

Goal:

> Improve auditory recognition.

## Production Pass

Retell or roleplay the scene.

Goal:

> Convert passive comprehension into active language.

## Spaced Re-Use

Recycle target expressions during future sessions.

Goal:

> Long-term retention.

---

# 57. Reading Strategy

The user should not constantly stop for every unknown word.

A better extensive-reading strategy:

1. choose material with high known-vocabulary coverage;
2. keep reading when the unknown item does not block comprehension;
3. look up words that are:
   - frequent;
   - repeated;
   - important to understanding;
   - personally useful;
4. save only high-value items;
5. review them later in new contexts.

The product should help automate this decision.

---

# 58. Immersion Strategy

Immersion does not mean changing every device setting to English on day one and struggling with everything.

Good immersion is **graduated**.

Possible progression:

## Stage 1

```text
5–15 minutes/day
```

Highly comprehensible English.

## Stage 2

```text
30–60 minutes/day
```

Stories, audio, simple videos.

## Stage 3

English becomes part of entertainment:

- YouTube;
- series;
- games;
- podcasts.

## Stage 4

English becomes part of work and information consumption.

## Stage 5

The learner lives significant parts of their digital life through English.

The platform should increase immersion as comprehension improves.

---

# 59. Research Summary

The strongest evidence-informed ideas for the product are:

- meaning-focused comprehensible input;
- extensive reading and listening;
- vocabulary-rich exposure;
- deliberate vocabulary study;
- incidental vocabulary learning;
- spaced repetition;
- retrieval practice;
- repeated encounters;
- active speaking and writing;
- fluency development;
- contextual learning;
- audiovisual input;
- lexical chunks and collocations;
- adaptive difficulty;
- real-world content;
- meaningful gamification.

The core learning cycle can be summarized as:

```text
Understand more
  ↓
Notice useful language
  ↓
Remember it
  ↓
Meet it again
  ↓
Use it
  ↓
Become faster
  ↓
Understand even more
```

---

# 60. Suggested Research References

## Vocabulary and Lexical Coverage

- Paul Nation — *Learning Vocabulary in Another Language*
- Norbert Schmitt — research on second-language vocabulary
- Stuart Webb — research on vocabulary learning and repeated exposure
- Cambridge University Press research on lexical coverage

## Extensive Reading

- Paul Nation
- William Grabe
- research on extensive reading and graded readers

## Retrieval Practice and Spacing

- cognitive psychology research on retrieval practice
- research on the spacing effect
- vocabulary-specific spaced learning studies

## Incidental Vocabulary Learning

- Stuart Webb and related meta-analyses
- studies comparing reading, listening, and reading-while-listening

## Audiovisual Learning

- research and meta-analyses on audiovisual input
- studies on captions and subtitles
- research on repeated viewing

## Four Strands

- Paul Nation's Four Strands framework

## CEFR

- Council of Europe
- Common European Framework of Reference for Languages

## Gamification

- systematic reviews of gamification in EFL/ESL learning

## Polyglot Practice

Use as practical inspiration rather than primary scientific evidence:

- Steve Kaufmann
- Luca Lampariello
- other experienced multilingual learners who emphasize input, repetition, and consistent use

## NVIDIA

- NVIDIA NIM for LLMs
- NVIDIA Speech NIM
- NVIDIA NeMo Retriever
- NVIDIA voice-agent reference architectures

---

# 61. Recommended MVP Philosophy

The MVP should prove one hypothesis:

> **Can a system that knows the learner's vocabulary state continuously select or generate better input, recycle the right language at the right time, and measurably expand real comprehension?**

Everything else is secondary.

The first release does not need:

- a giant course;
- hundreds of lessons;
- complex avatars;
- a massive social network;
- dozens of game modes.

It needs:

```text
A strong learner model
+
Excellent adaptive content
+
Audio
+
Contextual vocabulary learning
+
Conversation
+
Repetition
```

If those pieces work, the rest can be layered on later.

---

# 62. Final Product Vision

The long-term system is not simply:

> an English course powered by an LLM.

It is:

> **a personalized language-acquisition engine that continuously models what the learner knows, selects the best next input, turns real content into lessons, recycles useful language, and gradually moves the learner from assisted comprehension to independent immersion.**

The learner should eventually stop feeling that they are using a study app.

They should feel that more and more of the English-speaking world is becoming accessible to them.
