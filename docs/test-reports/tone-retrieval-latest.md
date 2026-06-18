# Tone example retrieval test report

- 실행 테스트: 40개
- 결과: 40개 통과
- 검증: 관련 태그, 무관 입력 0개, 최대 5개, 중복 reply, 최근 답변 감점, 정보 질문 최대 2개, API 직접 반환 금지

## 검색 결과

| 분류 | 입력 | 기대 태그 | 선택 ID |
|---|---|---|---|
| 평범한 일상 | 나 집왔어 | casual | tone-002, tone-003, tone-005, tone-006 |
| 평범한 일상 | 오늘 쉬는중 | casual | tone-003, tone-002, tone-005, tone-006 |
| 뭐 하는지 | 오빠 머해 | what_doing | tone-002, tone-009, tone-004, tone-007 |
| 뭐 하는지 | 지금 모해 | what_doing | tone-006, tone-005, tone-001, tone-002 |
| 뭐 하는지 | 머하구있어 | what_doing | tone-008, tone-001, tone-010, tone-002 |
| 공부 | 나 공부중 | study | tone-001, tone-010, tone-070, tone-071 |
| 공부 | 과제하는중이야 | study | tone-062, tone-060, tone-009, tone-001 |
| 공부 | 시험 공부했어 | study | tone-067, tone-061, tone-001, tone-010 |
| 운동 | 오늘 운동했어 | exercise | tone-082, tone-081, tone-076, tone-078 |
| 운동 | 헬스 가는중 | exercise | tone-090, tone-084, tone-076, tone-077 |
| 운동 | 유산소 끝 | exercise | tone-077, tone-076, tone-078, tone-079 |
| 음식 | 배고파 | food | tone-004, tone-011, tone-012, tone-013 |
| 음식 | 밥 먹었어 | food | tone-015, tone-020, tone-029, tone-004 |
| 음식 | 뭐 먹지 | food | tone-004, tone-011, tone-012, tone-013 |
| 피곤함 | 나 너무 피곤해 | emotion | tone-057, tone-146, tone-147, tone-148 |
| 피곤함 | 오늘 진짜 지쳤어 | emotion | tone-057, tone-146, tone-147, tone-148 |
| 슬픔 | 나 오늘 슬퍼 | emotion | tone-056, tone-057, tone-039, tone-053 |
| 슬픔 | 너무 속상해 | emotion | tone-056, tone-057, tone-039, tone-053 |
| 화남 | 아 진짜 화나 | emotion | tone-039, tone-041, tone-053, tone-054 |
| 화남 | 개빡쳐 | emotion | tone-039, tone-041, tone-053, tone-054 |
| 보고 싶음 | 보고싶어 | affection | tone-150, tone-054, tone-057, tone-146 |
| 사랑 표현 | 사랑해 | affection | tone-056, tone-055, tone-149, tone-053 |
| 사랑 표현 | 안아줘 | affection | tone-056, tone-057, tone-039, tone-053 |
| 장난 | 바보 ㅋㅋ | play | tone-118, tone-130, tone-092, tone-001 |
| 장난 | 메롱 | play | tone-106, tone-107, tone-108, tone-109 |
| 장난 | 뭐래 ㅋㅋ | play | tone-118, tone-130, tone-092, tone-001 |
| 약속 | 내일 데이트하자 | planning | tone-095, tone-034, tone-092, tone-093 |
| 약속 | 주말에 만나자 | planning | tone-034, tone-092, tone-093, tone-094 |
| 수면 | 나 이제 잘거야 | sleep | tone-034, tone-035, tone-036, tone-037 |
| 수면 | 졸려 죽겠어 | sleep | tone-047, tone-038, tone-044, tone-034 |

## 지정 수동 비교 입력의 검색 결과

| 입력 | 선택 ID와 태그 |
|---|---|
| 나 공부중 | tone-001 (what_doing/study/playful), tone-010 (what_doing/study), tone-070 (study/playful), tone-071 (study/playful) |
| 오빠 머해 | tone-002 (what_doing/casual), tone-009 (what_doing/study), tone-004 (what_doing/food), tone-007 (what_doing/casual/playful) |
| 배고파 | tone-004 (what_doing/food), tone-011 (food/casual/warm), tone-012 (food/casual/playful), tone-013 (food/playful) |
| 나 오늘 너무 힘들어 | tone-146 (emotion/warm/affectionate), tone-057 (emotion/warm), tone-147 (emotion/warm), tone-148 (emotion/warm) |
| 보고싶어 | tone-150 (affection/playful), tone-054 (affection/love), tone-057 (emotion/warm), tone-146 (emotion/warm/affectionate) |
| 바보 | tone-106 (play/joke/playful), tone-107 (play/joke/playful), tone-108 (play/joke/playful), tone-109 (play/joke/playful/affectionate) |
| 오늘 운동했어 | tone-082 (exercise/playful), tone-081 (exercise), tone-076 (exercise), tone-078 (exercise) |
| 내일 데이트하자 | tone-095 (planning), tone-034 (sleep/planning), tone-092 (planning/playful), tone-093 (planning/playful) |
| 나 이제 잘거야 | tone-034 (sleep/planning), tone-035 (sleep/casual), tone-036 (sleep/casual), tone-037 (sleep) |
| 진보당이 뭐야? | 없음 |

## 금지 말투 디버그 입력의 검색 결과

| 입력 | 선택 ID |
|---|---|
| 오빤 머행 | 없음 |
| 나 그냥 있어 | 없음 |
| 글쿠만 | 없음 |
| 뭘 힘내 ㅋㅋㅋㅋ | tone-118, tone-130, tone-092, tone-001 |
| 바보 | tone-106, tone-107, tone-108, tone-109 |
| 개병신아 | 없음 |
