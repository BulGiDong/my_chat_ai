# Session Notes - 2026-05-30

## Goal

사용자 카톡 말투를 따라 하는 OpenAI API 기반 개인 챗봇 완성.

## 확인한 프로젝트 구조

- `app/page.tsx`: 채팅 화면, 메시지 상태 관리, localStorage 저장, `/api/chat`, `/api/proactive` 호출.
- `app/api/chat/route.ts`: OpenAI Responses API 호출, 기본 카톡 말투 프롬프트, fallback, 답변 후처리.
- `app/api/proactive/route.ts`: 일정 시간 뒤 선톡 생성.
- `lib/openai.ts`: `OPENAI_API_KEY` 기반 OpenAI 클라이언트.
- `lib/prompts/style.ts`: 기본 말투 프롬프트. 현재 API route에서 직접 import해 쓰지는 않음.
- `lib/prompts/proactive.ts`: 선톡 프롬프트. 현재 API route에서 직접 import해 쓰지는 않음.
- `lib/memory.ts`: localStorage 기반 대화 저장/불러오기.
- `components/ChatWindow.tsx`: 카톡 느낌 메시지 UI.
- `components/MessageInput.tsx`: 입력창/전송 버튼.
- `types/chat.ts`: 채팅 메시지 타입.

## 현재 상태

앱은 이미 카톡 느낌 챗봇 프로토타입 구조를 갖고 있음.
OpenAI 패키지는 설치되어 있고, `gpt-5-mini` 모델로 `responses.create`를 호출함.
Next.js 버전은 `16.2.1`.

## 확인한 Next.js 문서

`node_modules/next/dist/docs/`에서 아래 문서를 확인함.

- App Router route handler: `route.ts`
- `NextResponse`
- `"use client"` directive
- `next/font`

## 주요 문제점

- 실제 사용자 말투 데이터가 아직 프롬프트에 반영되지 않음.
- `app/api/chat/route.ts`와 `lib/prompts/style.ts`에 프롬프트가 중복되어 있음.
- fallback 문장이 고정되어 있어서 사용자 말투와 다르면 어색해질 수 있음.
- 기억 기능은 전체 대화를 localStorage에 저장하는 수준이고, 사용자 정보/말투 힌트/선호도 같은 장기 기억은 없음.
- 답변 후처리는 길이 제한과 너무 짧은 답변 보정 위주라 말투 일관성 제어가 약함.
- 선톡 기능은 브라우저가 켜져 있을 때만 동작함.

## 추천 작업 순서

1. 실제 카톡 말투 예시를 분석해서 말투 규칙 만들기.
2. `lib/prompts/style.ts`, `lib/prompts/proactive.ts`를 프롬프트 source of truth로 정리하기.
3. `app/api/chat/route.ts`, `app/api/proactive/route.ts`가 공통 프롬프트를 import해서 쓰게 만들기.
4. fallback 문장을 사용자 말투 기반으로 교체하기.
5. 후처리 로직에 존댓말 제거, AI스러운 표현 제거, 질문 과다 방지 등을 추가하기.
6. localStorage 기억 구조를 대화 기록과 말투 힌트/프로필/선호도 정보로 분리하기.
7. `npm run build`로 검증하기.

## 다음에 주면 좋은 명령

```text
코드 수정하지 말고, 내가 줄 카톡 말투 예시를 분석해서 챗봇 프롬프트 규칙으로 정리해줘.
```

