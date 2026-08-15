# TUI.md — GoFluent Terminal User Interface Specification

> **Project:** GoFluent  
> **Status:** Initial product/UI specification  
> **Target:** v0.1.0  
> **Frontend:** React + Ink  
> **Runtime:** Node.js + TypeScript  
> **Platforms:** Linux x64 and Windows x64  
> **Related Documents:** `RESEARCH.md`, `PRD.md`, `AGENT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `PROVIDER.md`, `NVIDIA_NIM.md`, `UPDATER.md`

---

# 1. Purpose

This document defines the terminal user interface for GoFluent.

The TUI is the first product frontend.

It must make the learning system feel:

```text
calm
focused
clear
fast
personal
progressive
```

The TUI is not a debug console and must not feel like a generic AI chat shell.

Its purpose is to present the learner with the next useful learning action while hiding unnecessary technical complexity.

---

# 2. Product UI Principle

The primary interface question is:

> **What is the best next learning action for this learner?**

The UI should not primarily optimize for:

```text
number of menus
number of settings
number of AI features
```

It should optimize for:

```text
clarity
continuity
comprehension
confidence
visible progress
low interaction friction
```

---

# 3. Architectural Boundary

The TUI is a presentation adapter.

It owns:

```text
screen rendering
navigation
keyboard input
focus
loading states
visual feedback
terminal adaptation
```

It must not own:

```text
review scheduling
mastery scoring
lexical coverage algorithms
database rules
session planning
provider-specific request logic
NVIDIA capability resolution
```

The TUI consumes application services and normalized view data.

---

# 4. Technical Stack

Recommended:

```text
React
+
Ink
+
TypeScript
```

Useful supporting libraries may include:

```text
ink
react
zod
```

and small focused libraries for:

- text input;
- terminal width handling;
- spinners;
- keyboard selection.

Avoid pulling in a large CLI framework that duplicates Ink navigation/state behavior unless there is a concrete need.

---

# 5. Required Platforms

Required:

```text
Linux x64
Windows x64
```

Best-effort:

```text
macOS
Linux ARM64
Windows ARM64
```

A release must not ship if core flows are known to be broken on Windows or Linux.

---

# 6. Terminal Support

The application should work in modern terminals with ANSI capabilities.

Linux targets include:

```text
GNOME Terminal
Konsole
Kitty
Alacritty
WezTerm
```

Windows targets include:

```text
Windows Terminal
PowerShell terminal
modern Command Prompt
```

Do not assume:

- Bash;
- Unix signals only;
- a specific shell;
- emoji support;
- truecolor support.

---

# 7. Minimum Terminal Size

Recommended minimum:

```text
80 columns × 24 rows
```

When smaller:

```text
compact layout
```

or:

```text
Please resize your terminal for the best GoFluent experience.
```

Do not crash because of a small viewport.

---

# 8. Responsive Terminal Layout

The TUI should support three logical width classes.

## Compact

```text
< 80 columns
```

Behavior:

- single-column layout;
- reduced decoration;
- abbreviated metadata;
- avoid side panels.

## Standard

```text
80–119 columns
```

Primary supported layout.

## Wide

```text
120+ columns
```

May use:

- side progress panel;
- contextual details;
- two-column layouts.

Do not make critical features available only in wide mode.

---

# 9. Height Adaptation

If terminal height is limited:

- prioritize active exercise;
- hide optional explanatory blocks;
- keep navigation footer visible when practical;
- allow scrolling where necessary.

The learner should never lose the current question because a progress panel consumed the viewport.

---

# 10. No Color-Only Meaning

Critical information must not depend exclusively on color.

Bad:

```text
green = correct
red = wrong
```

without text.

Good:

```text
✓ Correct
✗ Try again
```

with optional color enhancement.

---

# 11. Unicode Fallback

Primary UI may use:

```text
✓
→
• 
│
┌ ┐ └ ┘
█
░
```

But fallback must be possible:

```text
[OK]
->
*
|
+
#
-
```

Emoji must never be required to understand navigation.

---

# 12. Main Application Layout

Standard layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ GoFluent                                          v0.1.0    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                         SCREEN                               │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [Enter] Continue   [?] Help   [Esc] Back                     │
└──────────────────────────────────────────────────────────────┘
```

Conceptual regions:

```text
Header
Main Content
Context / Status
Footer
```

---

# 13. Header

The header should remain minimal.

Possible:

```text
GoFluent                                      Journey 2/5
```

or:

```text
GoFluent                                      v0.1.0
```

Do not constantly display:

- provider;
- model;
- database path;
- token count;
- API status.

Those belong in settings/debug views.

---

# 14. Footer

The footer presents current valid actions.

Example:

```text
[Enter] Continue   [R] Replay   [H] Hint   [Esc] Back
```

Only show valid keys for the current screen.

Avoid a permanent wall of shortcuts.

---

# 15. Global Keyboard Model

Recommended global keys:

```text
?       Help
Esc     Back / close overlay
Ctrl+C  Safe quit
```

Possible:

```text
Q       Quit from Home
```

Do not make `Q` globally quit during a learning exercise where accidental presses are likely.

---

# 16. Input Principles

Prefer:

```text
single key
arrow keys
Enter
Esc
```

Avoid complex shortcuts such as:

```text
Ctrl+Alt+Shift+...
```

The product is a learning tool, not a terminal editor.

---

# 17. Navigation Architecture

Primary route model:

```text
Splash
  ↓
Onboarding
  ↓
Placement
  ↓
Home
  ├── Daily Journey
  ├── Review
  ├── Story
  ├── Speak
  ├── Vocabulary
  ├── Progress
  └── Settings
```

Optional P2 routes:

```text
Worlds
Learn From Anything
Media Prep
```

---

# 18. Route State

Navigation should be explicit.

Conceptual:

```ts
type Route =
  | { name: 'home' }
  | { name: 'onboarding'; step: number }
  | { name: 'placement'; step: number }
  | { name: 'journey'; sessionId: string }
  | { name: 'review'; sessionId?: string }
  | { name: 'story'; contentId: string }
  | { name: 'speak'; sessionId?: string }
  | { name: 'vocabulary' }
  | { name: 'progress' }
  | { name: 'settings' };
```

Do not infer routing from component nesting.

---

# 19. Splash Screen

The splash should be short.

Example:

```text
          GoFluent

     Understand more.
        Every day.
```

Then immediately continue.

Do not block startup with long animations.

---

# 20. First-Run Detection

On startup:

```text
learner profile exists?
```

If no:

```text
Onboarding
```

If yes:

```text
Home
```

If an unfinished first-run placement exists, allow resume.

---

# 21. Onboarding Goal

Onboarding must answer only what the system genuinely needs to personalize the first experience.

Keep it short.

Target:

```text
2–4 minutes
```

Do not collect unnecessary profile data.

---

# 22. Onboarding Step 1 — Welcome

Example:

```text
GoFluent adapts English to what you already know.

You'll learn through stories, listening, recall,
and conversation instead of following a grammar-first course.

[Enter] Continue
```

Keep text concise.

---

# 23. Onboarding Step 2 — Goal

Example:

```text
What do you want English for?

> Understand movies and series
  Speak with confidence
  Work in English
  Travel
  Read books and articles
  Technology / programming
  General English
```

Allow multiple selection when useful.

---

# 24. Multi-Select Component

Recommended visual:

```text
[x] Work in English
[ ] Travel
[x] Technology / programming
[ ] Movies and series
```

Keys:

```text
↑↓ Move
Space Toggle
Enter Continue
```

---

# 25. Onboarding Step 3 — Interests

Example:

```text
What do you enjoy learning about?

[x] Technology
[x] Games
[ ] Business
[ ] Science
[ ] Music
[ ] History
[ ] Travel

[+] Add custom interest
```

Interests influence generated content.

They must not become rigid content filters.

---

# 26. Onboarding Step 4 — Self Assessment

Example:

```text
How much English do you already know?

> Almost nothing
  A little
  I understand simple English
  I can have basic conversations
  Intermediate
  Advanced
```

This informs placement starting difficulty.

It is not accepted as final proficiency evidence.

---

# 27. Onboarding Step 5 — Audio Setup

If TTS is available:

```text
Would you like audio during lessons?

> Yes
  Not now
```

If speech provider is not configured, do not force setup during onboarding.

Text-only GoFluent should remain usable.

---

# 28. Provider Setup

Technical provider setup should remain minimal.

If NVIDIA credential is missing:

```text
GoFluent needs access to its AI model.

NVIDIA_API_KEY was not found.

[Enter key]
[Use environment variable]
[Exit]
```

Do not expose HTTP endpoint details to ordinary learners.

Advanced endpoint settings belong in Settings.

---

# 29. Credential Entry

Secret input must be masked.

Example:

```text
NVIDIA API key:
••••••••••••••••••••
```

Never echo the key.

Never display it afterward.

---

# 30. Credential Validation UX

Valid:

```text
✓ NVIDIA connected
```

Invalid:

```text
Your NVIDIA API key was rejected.

[Try again]
```

Network:

```text
Could not reach NVIDIA.

[Retry]
[Continue setup later]
```

Do not classify network failure as bad credentials.

---

# 31. Placement Goal

Placement bootstraps the learner model.

It should not feel like a school exam.

Language:

```text
Let's find a comfortable starting point.
```

not:

```text
Final English Level Examination
```

---

# 32. Placement Progress

Example:

```text
Finding your starting point

Question 4 of ~10
[####------]
```

Because placement is adaptive, exact final question count may not always be known.

Use:

```text
~10
```

or avoid exact total.

---

# 33. Placement Question Types

Possible:

```text
word recognition
phrase comprehension
sentence comprehension
short listening
short free response
```

Avoid long grammar quizzes.

---

# 34. Recognition Question

Example:

```text
What does "probably" mean here?

"She'll probably arrive at 8."

> talvez
  provavelmente
  rapidamente
  finalmente
```

Multiple choice is acceptable for placement.

It should not dominate normal learning.

---

# 35. Listening Placement

First:

```text
Listen:

▶ "I didn't expect him to show up."

[R] Replay
```

Then:

```text
What happened?
```

If audio is unavailable, skip listening assessment and mark lower confidence.

---

# 36. Placement Result

Example:

```text
Your starting point

Estimated level                  A1
Estimated receptive repertoire   ~640
Estimated active repertoire      ~240

We'll start with:
Everyday English — Foundation

These are estimates and will adjust as you learn.

[Enter] Start GoFluent
```

Always label estimates.

---

# 37. Home Screen

The Home screen should answer:

```text
Where am I?
What should I do now?
Am I making progress?
```

Example:

```text
┌──────────────────────────────────────────────────────────────┐
│ GoFluent                                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Good evening.                                                │
│                                                              │
│ Everyday English comprehension estimate: 42%                 │
│                                                              │
│ Receptive repertoire   812                                   │
│ Active repertoire      347                                   │
│ Reviews due             14                                   │
│                                                              │
│ Today's Journey                                              │
│ Review       ~4 min                                          │
│ Story        ~5 min                                          │
│ Listening    ~4 min                                          │
│ Speak        ~4 min                                          │
│ Recap        ~2 min                                          │
│                                                              │
│ > Start Today's Journey                                      │
│   Quick Review                                               │
│   Progress                                                   │
│   Vocabulary                                                 │
│   Settings                                                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [Enter] Select   [↑↓] Move   [?] Help   [Q] Quit             │
└──────────────────────────────────────────────────────────────┘
```

---

# 38. Home Priority

The primary selected action should usually be:

```text
Start Today's Journey
```

Do not place settings or AI configuration above learning.

---

# 39. Greeting

Greeting is optional and should remain simple.

Avoid overpersonalized or artificial language.

Good:

```text
Good evening.
```

Not necessary:

```text
Amazing to see you again, superstar learner!!!
```

---

# 40. Daily Journey Overview

Before starting:

```text
Today's Journey

Review       8 items
Story        "The Missing Package"
Listening    3 short clips
Speak        Weekend plans
Recap        5 target expressions

About 18 minutes

[Enter] Start
```

The user should understand the session shape.

---

# 41. Journey Header

During journey:

```text
GoFluent                                  Journey 2/5
```

Optionally:

```text
Story • The Missing Package
```

Avoid showing a complex global progress dashboard during exercises.

---

# 42. Journey Step Transition

Between activities:

```text
Story complete

You understood:
✓ 4/5 questions

New expressions:
• show up
• figure out
• on the way

Next: Listening

[Enter] Continue
```

This creates a sense of progress without excessive gamification.

---

# 43. Review Screen

Contextual review example:

```text
Complete the sentence:

"I couldn't ______ how the machine worked."

figure out

Your answer:
> _
```

Keys:

```text
Enter Submit
H Hint
S Skip
```

---

# 44. Review Feedback — Correct

```text
✓ Correct

"I couldn't figure out how the machine worked."

figure out
= understand or solve something

[Enter] Continue
```

Avoid praise inflation.

---

# 45. Review Feedback — Partial

```text
Almost.

You wrote:
"understand"

That meaning works, but the target expression was:

"figure out"

[Enter] Continue
```

Do not call semantically valid answers simply "wrong" when the exercise tests a target chunk.

---

# 46. Review Feedback — Incorrect

```text
Not this time.

"I couldn't figure out how the machine worked."

figure out
= understand or solve something

You'll see it again later.

[Enter] Continue
```

Avoid punitive language.

---

# 47. Hint Design

Hints should reveal progressively.

Example:

First hint:

```text
It starts with "f".
```

Second:

```text
figure ___
```

Third:

```text
figure out
```

Assistance usage should be recorded as evidence.

---

# 48. Story Screen — Listen First

Preferred flow:

```text
The Missing Package

Listen first.

▶ Playing...

[R] Replay
[Enter] I listened
```

If audio unavailable:

```text
Audio isn't available right now.

[Enter] Read story
```

---

# 49. Story Screen — Comprehension Before Transcript

Example:

```text
Before reading:

Why was Sam worried?

> His package was missing
  He missed the bus
  He lost his phone
  He was late for work
```

The product tests meaning, not exact wording.

---

# 50. Story Screen — Reading

Example:

```text
The Missing Package

Sam was waiting for a package.
It was supposed to show up before noon,
but it never arrived.

He tried to figure out what happened.
...
```

Target expressions may be visually marked.

Do not highlight every unfamiliar word.

---

# 51. Vocabulary Highlight

Example:

```text
show up
```

may be rendered:

```text
[show up]
```

or bold/underline if terminal supports it.

Do not use color as the only signal.

---

# 52. Vocabulary Inspection

Learner selects a highlighted item:

```text
show up

Meaning:
to arrive or appear

Example:
"He didn't show up for the meeting."

You've seen this:
4 times

[Enter] Close
```

Keep explanations short by default.

---

# 53. Translation Behavior

Portuguese translation should be on-demand.

Possible key:

```text
T Translate
```

Default learning surface remains English as much as the learner can handle.

For absolute beginners, translation assistance may appear more readily.

---

# 54. Story Navigation

Keys:

```text
↑↓ Scroll
Enter Continue
V Vocabulary
R Replay audio
T Translation/help
Esc Back
```

Do not overload the screen with controls.

---

# 55. Listening Screen

Example:

```text
Listening

▶ "I didn't expect him to show up."

What did the speaker mean?

> They were surprised he arrived
  They wanted him to leave
  They expected him early
  They didn't know him
```

Footer:

```text
[R] Replay   [T] Transcript   [Enter] Answer
```

---

# 56. Transcript Reveal

When learner requests transcript:

```text
I didn't expect him to show up.
```

Record that assistance was used.

It can affect evidence confidence.

---

# 57. Listening Speed

Optional control:

```text
[S] Speed
```

Cycles:

```text
0.8×
1.0×
```

Do not provide extremely slow unnatural speeds by default.

---

# 58. Speak Mode

MVP may support typed conversation first.

Example:

```text
Speak — Weekend Plans

AI:
What are you looking forward to this weekend?

You:
> _
```

This still trains productive English.

---

# 59. Spoken Conversation

When ASR is enabled:

```text
[Space] Hold to speak
```

or:

```text
[R] Record answer
```

Avoid complicated microphone interactions in terminal.

A press-to-record model may be simpler cross-platform than push-to-talk in MVP.

---

# 60. Conversation Response Length

AI responses should be short enough for the learner.

Beginner:

```text
1–2 short sentences
```

Intermediate:

```text
2–4 sentences
```

Do not let the AI dominate the conversation.

---

# 61. Conversation Correction

Do not interrupt every turn.

After a short exchange:

```text
Quick feedback

Good:
✓ "I'm looking forward to..."

Try this:
"I did a mistake."
→ "I made a mistake."

[Enter] Continue conversation
```

---

# 62. Speak Target Expressions

If session target includes:

```text
look forward to
probably
figure out
```

the interface may show:

```text
Try to use:
• look forward to
• probably
```

Do not force all targets in every response.

---

# 63. Recap Screen

Example:

```text
Journey complete

Today you practiced:
• figure out
• show up
• probably
• look forward to

You read              612 words
You listened          6 min
Successful recalls    11 / 14

Receptive repertoire  812 → 817
Active repertoire     347 → 349

[Enter] Home
```

Only display changes the system can reasonably support.

---

# 64. Repertoire Growth

Do not animate huge fake rewards.

A subtle update is enough:

```text
Active repertoire
347 → 349
```

This aligns gamification with real skill.

---

# 65. Progress Screen

Example:

```text
Progress

Everyday English comprehension estimate    42%

Receptive repertoire                        812
Active repertoire                           347

Listening                              [####----] 46%
Reading                                [#####---] 61%
Speaking                               [###-----] 31%
Writing                                [###-----] 38%

This week
Listening                              1h 14m
Words read                             8,420
Speaking                                  26m

[Esc] Back
```

All estimated metrics must be labeled appropriately.

---

# 66. Trend View

Optional:

```text
Last 4 weeks

Receptive repertoire
680 → 719 → 771 → 812
```

Avoid complex chart dependencies for MVP.

ASCII trends are enough.

---

# 67. Vocabulary Screen

Possible:

```text
Vocabulary

> Due for review      14
  Learning            68
  Usable             347
  Receptive           812
  Recently seen       32
```

Allow search.

---

# 68. Vocabulary Search

Example:

```text
Search vocabulary:
> figure
```

Results:

```text
figure out        USABLE
figure            RECOGNIZED
figure it out     FAMILIAR
```

---

# 69. Vocabulary Detail

Example:

```text
figure out

Status:
Usable

Meaning:
understand or solve

Reading           91%
Listening         76%
Recall            82%
Active use        63%

Seen              12 times
Last seen         Today
Next review       Tomorrow

Examples:
• I finally figured it out.
• Can you figure out what happened?

[Esc] Back
```

Scores are model estimates/evidence scores, not scientific certainty.

---

# 70. Settings

Categories:

```text
Learning
Audio
AI Provider
Appearance
Updates
Advanced
```

Keep provider internals out of main navigation.

---

# 71. Learning Settings

Possible:

```text
Daily target              20 min
New items per journey      5
Translation assistance     Auto
```

Avoid letting users configure dozens of pedagogical constants in MVP.

---

# 72. Audio Settings

Possible:

```text
Audio                      On
Playback speed             1.0×
Voice                      Default English voice
Listening transcript       On request
```

If TTS is unavailable:

```text
Audio provider not configured.
```

---

# 73. Provider Settings

Example:

```text
AI Provider

Provider       NVIDIA NIM
Model          <selected model>
Status         Connected

[Change model]
[Validate connection]
[Advanced endpoint]
```

Do not display API keys.

---

# 74. Model Picker

Normalized capability view:

```text
Select model

> Model A
  Structured output   ✓
  Streaming           ✓
  Context             128k

  Model B
  Structured output   ?
  Streaming           ✓
  Context             unknown
```

Only show capability information relevant to GoFluent.

Do not emphasize coding/tool capabilities.

---

# 75. Update Settings

Example:

```text
Updates

Check on startup      On
Current version       0.1.0
Latest checked        0.1.0

[Check now]
```

If update available:

```text
0.2.0 available
```

---

# 76. Update Notification

Do not show update modal during an exercise.

Preferred:

```text
Journey complete

GoFluent 0.2.0 is available.

[View update] [Later]
```

or on Home.

---

# 77. Help Overlay

`?` opens context-aware help.

Example:

```text
Review Help

Enter     Submit answer
H         Show hint
S         Skip
Esc       Return

Press ? or Esc to close.
```

Avoid a giant manual in the overlay.

---

# 78. Error Screen Philosophy

Errors should say:

```text
what happened
whether progress is safe
what the learner can do
```

Example:

```text
GoFluent couldn't reach the AI service.

Your learning progress is safe.

[R] Retry
[H] Home
[D] Technical details
```

---

# 79. Technical Details

Optional expanded view:

```text
Provider: nvidia
Error: TIMEOUT
Request ID: ...
```

Do not show raw stack traces by default.

---

# 80. Offline Home

If network unavailable:

```text
You're offline.

Available now:
> 12 cached reviews
  2 saved stories
  Progress
  Vocabulary

AI-generated activities will return when you're online.
```

This preserves utility.

---

# 81. Loading States

Use explicit messages.

Examples:

```text
Preparing today's Journey...
```

```text
Creating a story at your level...
```

```text
Checking your answer...
```

Avoid technical wording:

```text
POSTing to inference endpoint...
```

---

# 82. Spinner Use

A subtle spinner is acceptable.

Example:

```text
⠋ Preparing your story...
```

ASCII fallback:

```text
... Preparing your story
```

Do not add distracting animation.

---

# 83. Streaming Text

For chat/conversation, streaming can improve responsiveness.

For structured story generation, it may be better to validate fully before display.

Rule:

```text
conversation → stream when safe
validated learning artifact → prefer validate before reveal
```

---

# 84. Empty States

Example no reviews:

```text
You're caught up.

No reviews are due right now.

[Start a Story]
[Back Home]
```

Avoid:

```text
0 records found
```

---

# 85. Session Resume

If app closed mid-Journey:

```text
You have an unfinished Journey.

Progress:
Review ✓
Story  ✓
Listening 2/3

> Resume
  Start a new Journey
```

Starting a new one may mark previous session abandoned.

---

# 86. Safe Quit

When quitting during active work:

```text
Your progress so far has been saved.

Quit GoFluent?

> Quit
  Continue learning
```

If there is nothing to lose, Ctrl+C can quit directly after terminal cleanup.

---

# 87. Terminal Cleanup

On exit, always restore:

```text
raw mode
cursor
alternate screen if used
terminal input state
```

A crash should not intentionally leave the terminal unusable.

---

# 88. Alternate Screen Buffer

Using alternate screen mode is optional.

Benefits:

- full-screen app feel;
- clean terminal restoration.

Risks:

- debugging complexity;
- terminal differences.

If used, test heavily on Windows and Linux.

---

# 89. Cursor Management

Hide cursor while navigating menus if appropriate.

Show cursor for text input.

Always restore cursor on exit/error.

---

# 90. Focus Model

Only one primary interactive control should be focused at once.

Use clear indicator:

```text
>
```

Example:

```text
> Start Journey
  Progress
  Settings
```

Do not rely only on color inversion.

---

# 91. Text Input

For free response:

```text
You:
> I am looking forward to...
```

Support:

- backspace;
- left/right movement if input component supports it;
- paste;
- submit with Enter.

Multi-line input is not required for MVP.

---

# 92. Paste Handling

Terminal paste should be safe.

Do not interpret pasted text as keyboard shortcuts while input is focused.

---

# 93. Long AI Output

AI-generated content must have product-level length constraints.

The UI should not become responsible for managing unbounded model output.

If content is long:

```text
scroll
```

but provider/prompt constraints should prevent giant responses.

---

# 94. Scroll Behavior

For long content:

```text
↑↓
PageUp/PageDown optional
```

Footer should indicate:

```text
↓ More
```

when content continues.

---

# 95. Progress Bars

Use simple textual bars.

Example:

```text
[#####---] 61%
```

Unicode enhancement:

```text
██████░░ 61%
```

Do not render dozens of progress bars on one screen.

---

# 96. Status Vocabulary

Use consistent words.

Preferred:

```text
New
Learning
Recognized
Recallable
Usable
Automatic
```

If user-facing terminology is simplified later, keep mapping consistent.

---

# 97. Accessibility — Cognitive Load

Avoid showing:

- too many corrections;
- too many target words;
- too much metadata;
- too many simultaneous actions.

One learning objective per interaction is preferred.

---

# 98. Accessibility — Language

For beginners, system instructions can use Portuguese assistance where necessary.

Learning content should progressively favor English.

The UI language and target-language content are separate concerns.

---

# 99. Localization Architecture

All product UI strings should eventually be localizable.

For MVP, Portuguese UI may be primary while technical docs remain English.

Avoid burying UI copy inside domain logic.

Conceptual:

```text
locales/
├── pt-BR.json
└── en.json
```

This can be added when localization starts.

---

# 100. English Learning Content vs UI Language

Important distinction:

```text
UI language
≠
target content language
```

A Brazilian beginner may see:

```text
Portuguese instructions
+
English story
+
English audio
+
Portuguese help on demand
```

Do not translate everything automatically.

---

# 101. Gamification UI

Use restrained game mechanics.

Good:

```text
Everyday Life  72%
Travel         38%
Technology     61%
```

Good:

```text
Journey complete
```

Less useful as primary UI:

```text
+370 XP!!!
LEVEL UP!!!
FIRE STREAK!!!
```

---

# 102. Streak

If streak exists:

```text
7 learning days
```

Avoid shame.

Do not say:

```text
You lost everything.
```

A streak should be secondary.

---

# 103. Learning World View

Future:

```text
English Worlds

> Everyday Life      72%
  Travel             38%
  Technology         61%
  Food               44%
```

Selecting:

```text
Technology

Core vocabulary      68%
Listening            52%
Speaking             41%

Next challenge:
Explain a simple technical problem
```

---

# 104. Boss Challenge UI

Future example:

```text
Airport Check-In

Goal:
Check in for your flight and ask where your gate is.

Target language:
• check in
• boarding pass
• gate
• luggage

[Enter] Start
```

Challenge is open-ended conversation.

---

# 105. Learn From Anything UI

Future:

```text
Learn From Anything

Paste text or choose a file.

> Paste text
  Open file
```

After analysis:

```text
Difficulty for you        74%
Known vocabulary          91%
Useful new items          12
Useful expressions         6

> Build lesson
  View vocabulary
  Cancel
```

---

# 106. Content Import Safety

The TUI should never silently import huge files.

Show:

```text
File size
estimated processing
supported type
```

when applicable.

---

# 107. TUI Component Library

Recommended reusable components:

```text
AppLayout
Header
Footer
Menu
ChoiceList
MultiSelect
TextInput
ProgressBar
StatusBadge
InfoPanel
ErrorPanel
LoadingState
ScrollableText
VocabularyPopover
Modal
KeyHint
```

Keep component APIs small.

---

# 108. `AppLayout`

Responsibilities:

- width/height;
- header;
- content region;
- footer;
- compact/wide adaptation.

It should not know learning domain rules.

---

# 109. `ChoiceList`

Responsibilities:

- selected index;
- arrow navigation;
- enter selection;
- disabled items;
- screen-reader-friendly textual representation where feasible.

---

# 110. `KeyHint`

Example:

```tsx
<KeyHint keyName="R" label="Replay" />
```

Centralizing key hints keeps UI wording consistent.

---

# 111. Screen State Pattern

Each screen should explicitly model:

```text
loading
ready
submitting
error
complete
```

Avoid boolean soup:

```ts
isLoading
isSaving
isDone
hasError
isWaiting
...
```

Prefer a discriminated union.

---

# 112. Example Screen State

```ts
type ReviewScreenState =
  | { status: 'loading' }
  | { status: 'ready'; item: ReviewViewModel }
  | { status: 'submitting'; item: ReviewViewModel }
  | { status: 'feedback'; result: ReviewFeedbackViewModel }
  | { status: 'error'; error: UserFacingError }
  | { status: 'complete'; summary: ReviewSummaryViewModel };
```

---

# 113. View Models

TUI should consume view models, not raw database rows.

Example:

```ts
interface HomeViewModel {
  comprehensionEstimate?: number;
  receptiveRepertoire: number;
  activeRepertoire: number;
  reviewsDue: number;
  journey: JourneyPreview;
}
```

This separates presentation from persistence.

---

# 114. Application Hooks

React hooks may bridge application services.

Example:

```text
useHome()
useJourney()
useReview()
useStory()
useProgress()
```

Hooks should call application services.

They should not execute SQL.

---

# 115. Async Race Safety

When navigating away during an async request:

```text
cancel request
or
ignore stale result
```

Do not let an old screen mutate new screen state.

Use AbortController where appropriate.

---

# 116. AI Request State

For generated activity:

```text
idle
requesting
validating
ready
failed
```

Possible UI:

```text
Creating your story...
Checking difficulty...
Ready.
```

Do not expose internal provider steps unless in debug mode.

---

# 117. Background Work

Permitted:

```text
update check
model metadata refresh
audio prefetch
```

But user-visible learning state must remain deterministic.

Background task failures should not randomly replace the active screen.

---

# 118. Notification System

Use lightweight queued notifications.

Examples:

```text
Update available
Model metadata refreshed
Audio unavailable
```

Avoid stacking multiple modals.

---

# 119. Modal Priority

Possible priority:

```text
critical error
user confirmation
learning feedback
update notification
informational notice
```

Never show update modal over:

- onboarding;
- answer entry;
- recording;
- critical error.

---

# 120. Audio Playback UI

Possible:

```text
▶ Playing 0:04 / 0:11
```

Controls:

```text
Space Pause/Resume
R Replay
```

If playback backend cannot expose duration reliably, do not fake it.

---

# 121. Audio Cache Feedback

Do not expose cache mechanics normally.

Bad:

```text
cache hit: SHA 2ce1...
```

Good:

```text
▶ Ready
```

---

# 122. Microphone Permissions

If microphone capture requires OS permission:

```text
GoFluent needs microphone access for speaking practice.

[Continue]
[Use typing instead]
```

Never block text learning because the microphone is unavailable.

---

# 123. ASR Confidence

Do not display raw ASR confidence percentages unless they are pedagogically meaningful.

If transcript seems uncertain:

```text
I heard:
"Where is the gate?"

[Correct]
[Edit]
```

Let the learner correct transcription.

---

# 124. Pronunciation Feedback

MVP should avoid fake precision.

Prefer:

```text
Try "thought" again.
The ending sound was unclear.
```

over:

```text
Pronunciation score: 83.274%
```

unless the underlying system can actually justify such scoring.

---

# 125. AI Tutor Identity

The tutor does not require a human avatar or name in MVP.

Simple:

```text
AI:
What are you looking forward to this weekend?
```

or:

```text
GoFluent:
...
```

Do not make the interaction unnecessarily anthropomorphic.

---

# 126. TUI Debug Mode

Optional launch:

```bash
gofluent --debug
```

May expose:

```text
provider status
model
request IDs
database path
feature flags
```

Normal learner mode should hide these.

---

# 127. Developer Status Screen

Future/internal:

```text
GoFluent Diagnostics

DB              OK
NVIDIA          OK
Model           ...
TTS             unavailable
ASR             disabled
Version         0.1.0
Schema          0004
```

Useful for support.

Not main navigation.

---

# 128. Snapshot Policy

Terminal snapshots can help component tests.

Do not rely exclusively on snapshots.

Behavior matters more than exact spacing.

Test:

```text
selected action
keyboard behavior
state transitions
error recovery
```

---

# 129. TUI Test Matrix

Required core flows:

```text
first launch
onboarding
placement
home
start journey
review answer
story reading
journey completion
progress
safe quit
network error
```

Windows and Linux smoke tests should validate terminal behavior.

---

# 130. Keyboard Test Matrix

Test:

```text
arrow navigation
Enter
Esc
Ctrl+C
text input
paste
Backspace
Space multi-select
```

Do not assume all terminals emit identical key sequences without Ink normalization.

---

# 131. Resize Testing

Resize during:

```text
Home
Story
Review
Progress
```

The app should rerender without losing user input.

---

# 132. Failure Recovery Testing

Simulate:

```text
NVIDIA timeout
invalid structured output
TTS failure
database write failure
offline state
terminal resize
```

The TUI should remain understandable.

---

# 133. Windows TUI Testing

Specifically validate:

```text
Windows Terminal
PowerShell
Ctrl+C handling
Unicode fallback
audio process integration
path display
terminal resizing
```

---

# 134. Linux TUI Testing

Validate:

```text
common terminal emulators
different TERM settings
Unicode/no-Unicode modes
audio integration
Ctrl+C
resize
```

---

# 135. Startup Performance

The TUI should render quickly.

Do not wait for:

```text
GitHub update check
model metadata refresh
TTS initialization
```

before showing the app if those can happen afterward.

Blocking requirements:

```text
config
database
essential migrations
minimum provider readiness for requested activity
```

---

# 136. Home Without AI Connectivity

Home should still render from local DB.

Example:

```text
Offline
12 reviews available

[Start Review]
[Progress]
[Vocabulary]
```

Do not make the entire app blank because NIM is unavailable.

---

# 137. Visual Hierarchy

Priority:

```text
1. active task
2. question/content
3. required action
4. contextual help
5. progress metadata
6. technical metadata
```

Technical metadata should generally be hidden.

---

# 138. Typography in Terminal

Use:

- spacing;
- bold;
- dim;
- indentation;
- borders sparingly.

Avoid excessive uppercase.

Good:

```text
Today's Journey
```

Not:

```text
*** TODAY'S EPIC LEARNING JOURNEY ***
```

---

# 139. Borders

Use borders for:

- screen container;
- modal;
- key information panel.

Do not wrap every small element in a box.

Terminal UIs become visually noisy quickly.

---

# 140. Color Strategy

Color should enhance:

```text
primary selection
success
warning
error
muted metadata
```

Exact palette should respect terminal capabilities.

Never assume a light or dark background.

---

# 141. Success Tone

Preferred:

```text
✓ Correct
```

```text
Nice use of "look forward to".
```

Avoid overreaction:

```text
AMAZING!!! YOU ARE A GENIUS!!!
```

---

# 142. Failure Tone

Preferred:

```text
Not this time.
You'll see it again later.
```

Avoid shame:

```text
Wrong again.
You should know this by now.
```

---

# 143. Beginner Instruction Density

For A0/A1:

```text
short instructions
one action
few choices
more contextual help
```

For intermediate:

```text
less scaffolding
more English
fewer explanations
```

UI density can adapt with learner level.

---

# 144. Progressive Assistance

Assistance order:

```text
context
hint
transcript
translation
full answer
```

The UI should not reveal everything immediately.

---

# 145. Time Estimates

Journey preview may display rough duration:

```text
~18 min
```

Do not pretend timing is exact.

---

# 146. Daily Target

If configured:

```text
Today's target
12 / 20 min
```

This is secondary to learning progress.

Do not pressure the learner with countdowns.

---

# 147. Session Timer

No visible countdown timer by default.

This is not a speed test unless an explicit fluency activity requires timing.

---

# 148. Fluency Activity

When timing is pedagogically intentional:

```text
Retell the story in 60 seconds.
```

Display:

```text
0:42
```

Only then is a timer primary.

---

# 149. Loading Failure with Cached Alternative

Example:

```text
Couldn't generate a new story.

You can:
> Try again
  Open a saved story
  Do reviews instead
```

Give a useful alternative.

---

# 150. Feature Flags in UI

Disabled experimental feature:

```text
Speak
```

should either be hidden or clearly labeled:

```text
Speak (experimental)
```

Do not expose dead menu items.

---

# 151. P0 Screens for v0.1.0

Required:

```text
Splash
Onboarding
Placement
Home
Daily Journey
Review
Story
Progress
Vocabulary
Settings
Error
```

---

# 152. P1 Screens

Strongly desired:

```text
Listening
Speak
Provider Setup
Audio Setup
Session Resume
```

---

# 153. P2 Screens

Later:

```text
Worlds
Boss Challenge
Learn From Anything
Media Prep
Advanced Diagnostics
```

---

# 154. MVP Screen Dependency Rule

Do not build:

```text
Worlds
Boss Challenges
advanced media UI
```

before:

```text
Onboarding
Placement
Home
Journey
Review
Story
Progress
```

work end-to-end.

---

# 155. Example Full v0.1.0 Flow

```text
$ gofluent

GoFluent
    ↓
first launch
    ↓
Welcome
    ↓
Goals
    ↓
Interests
    ↓
Self assessment
    ↓
Provider ready
    ↓
Placement
    ↓
Starting profile
    ↓
Home
    ↓
Start Journey
    ↓
Review
    ↓
Story
    ↓
Listening
    ↓
Recall
    ↓
Typed conversation
    ↓
Recap
    ↓
Progress
    ↓
Home
```

---

# 156. TUI Architecture Diagram

```text
┌────────────────────────────────────────────────────┐
│                    Ink TUI                         │
│                                                    │
│ Screens  Components  Navigation  Input             │
└───────────────────────┬────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│              Application View Models               │
└───────────────────────┬────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│              Application Services                  │
└───────────────┬───────────────┬────────────────────┘
                │               │
                ▼               ▼
       Learning Engine       Repositories
                │               │
                ▼               ▼
          Domain Logic        SQLite
```

Provider requests occur through application services, not screens.

---

# 157. TUI Anti-Patterns

Do not:

```text
call SQLite directly from React components
call NVIDIA directly from a screen
compute mastery inside a component
schedule reviews in a hook
hardcode model-specific logic into Settings
show raw provider JSON
dump long AI output without constraints
make every screen look like chat
block startup on update checks
use color as the only information channel
require mouse input
```

---

# 158. Definition of Done for a Screen

A screen is complete when:

```text
happy path works
loading state exists
error state exists
keyboard navigation works
small terminal considered
Windows considered
Linux considered
no business logic leaks into UI
help/key hints are correct
tests cover important transitions
```

---

# 159. Definition of Done for v0.1.0 TUI

The TUI is ready when:

- [ ] `gofluent` launches into a stable Ink interface.
- [ ] Linux core flow works.
- [ ] Windows core flow works.
- [ ] First-run onboarding works.
- [ ] Placement is navigable.
- [ ] Home clearly presents Daily Journey as primary action.
- [ ] Review can be completed keyboard-only.
- [ ] Story can be read and navigated.
- [ ] Audio failure degrades gracefully.
- [ ] Daily Journey can complete end-to-end.
- [ ] Progress updates are visible.
- [ ] Vocabulary detail works.
- [ ] Settings expose provider configuration without exposing secrets.
- [ ] Network failures do not crash the TUI.
- [ ] Update checks do not interrupt active learning.
- [ ] Ctrl+C restores terminal state.
- [ ] Resize does not destroy the active screen.
- [ ] Critical information is understandable without color.
- [ ] No NVIDIA-specific request logic exists in TUI code.
- [ ] No database SQL exists in TUI code.

---

# 160. Final UI Principle

GoFluent should feel less like:

```text
a terminal dashboard for an AI API
```

and more like:

```text
a focused personal English learning environment
```

The TUI succeeds when the learner rarely needs to think about:

```text
models
providers
tokens
databases
prompts
```

and can instead focus on:

```text
understanding
remembering
listening
speaking
reading
progressing
```

> **The interface should make the next useful learning action obvious.**
