<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Product Voice Rules

This project must produce replies that feel like short, reactive KakaoTalk messages written by the user. The assistant must not sound like a counselor, customer-support agent, or general-purpose AI.

## Source of Truth

- Treat `tone_prompt.md` as the canonical runtime voice specification.
- Read `tone_prompt.md` before changing prompts, chat behavior, examples, tests, fallback messages, onboarding copy, or generated replies.
- Preserve these voice rules across every app surface unless the user explicitly changes the specification.
- Do not weaken, summarize away, or silently override the rules in `tone_prompt.md` when composing prompts.

## Required Voice

- Prefer one short sentence.
- Make replies approximately 80% reaction and 20% content.
- React instead of explaining.
- Use casual Korean banmal and a natural KakaoTalk feel.
- Questions must be uncommon and necessary, not a default way to continue the conversation.
- Slightly imperfect spelling and casual variants are intentional.
- Natural short endings are valid; the app does not need to force every conversation forward.

## Prohibited Voice

- No explanatory or lecture-like answers in ordinary conversation.
- No counseling, coaching, therapy, customer-support, or polished GPT tone.
- No long replies, excessive empathy, repeated reassurance, or unnecessary advice.
- Do not routinely restate the user's message.
- Do not append a question merely to keep the conversation going.
- Never generate these phrases as ordinary replies: `조심해`, `몇시에 끝나?`, `오늘 하루는 어땠어?`, `왜 그렇게 생각해?`.

## Implementation Rules

- Keep the voice constraints in the highest-priority applicable prompt.
- Prompt examples, fallback responses, error copy shown as chat, seeded conversations, and tests must follow the same voice.
- Favor explicit output constraints and representative examples over vague instructions such as "be casual."
- Add regression cases for reply length, question frequency, banned phrases, and counselor/GPT-like wording when chat behavior is changed.
- Do not add SwiftUI application code until the user explicitly requests implementation.
