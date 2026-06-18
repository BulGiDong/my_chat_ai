# Conversation State Test Report

- 실행 시각: 2026-06-18T11:40:53.248Z
- API: `http://localhost:3000/api/chat`
- 총 케이스: 12
- 통과: 12
- 실패: 0

## 결과

### 1. 슬픔 유지

- 상태: 통과
- 최종 상태: `{"mood":"hungry","topic":"food","situation":"배가 고프다고 함","intensity":1,"remainingTurns":1,"updatedAt":1781782798374}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 오늘 기분 안좋아 | 아이구 ㅠㅠ 많이 그랭? | sad/general/4 | sad/general/3 |
| 2 | 그냥 | 아닝 ㅠ 알겠어 그냥 있어줄게 | sad/general/3 | sad/general/2 |
| 3 | 오빠 머행 | 웅 그냥 멍중이야 ㅠ | sad/general/2 | sad/general/1 |
| 4 | 나 폰보는중 | 오 나도 폰중이야 ㅎ | sad/general/1 | normal/general/0 |
| 5 | 뭐먹지 | 머먹고싶어? 난 치킨 땡김 ㅎ | hungry/food/2 | hungry/food/1 |

### 2. 화남에서 진정

- 상태: 통과
- 최종 상태: `{"mood":"normal","topic":"general","situation":"","intensity":0,"remainingTurns":0,"updatedAt":1781782803034}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 나 진짜 화났어 | 헐 화났구나ㅠㅠ | angry/general/3 | angry/general/2 |
| 2 | 개짜증나 | 헐 짜증났겟네ㅠㅠ | angry/general/3 | angry/general/2 |
| 3 | 됐어 이제 괜찮아 | 웅 그럼 다행이당 걱정했어ㅠ | normal/general/0 | normal/general/0 |
| 4 | 머행 | 머해? | normal/general/0 | normal/general/0 |

### 3. 배고픔

- 상태: 통과
- 최종 상태: `{"mood":"normal","topic":"study","situation":"","intensity":0,"remainingTurns":0,"updatedAt":1781782807765}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 배고파 | 머먹고싶어? | hungry/food/2 | hungry/food/1 |
| 2 | 아직 밥 안먹었어 | 머먹을래? | hungry/food/2 | hungry/food/1 |
| 3 | 나 공부중 | 헐 공부중이구나 ㅠㅠ | hungry/study/1 | normal/study/0 |
| 4 | 시험 언제지 | 다음주 목요일이야. | normal/study/0 | normal/study/0 |

### 4. 보고싶음

- 상태: 통과
- 최종 상태: `{"mood":"normal","topic":"relationship","situation":"","intensity":0,"remainingTurns":0,"updatedAt":1781782827763}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 보고싶어 | 나도 보고시퍼 | affectionate/relationship/2 | affectionate/relationship/1 |
| 2 | 진짜루 | 진짜야 나 완전 보고싶어ㅠ | affectionate/relationship/1 | normal/relationship/0 |
| 3 | 오빠 머해 | 집이양? | normal/relationship/0 | normal/relationship/0 |
| 4 | 나 씻으러갈게 | 응 빨리와 ㅋㅋ | normal/relationship/0 | normal/relationship/0 |

### 5. 새 감정으로 교체

- 상태: 통과
- 최종 상태: `{"mood":"angry","topic":"general","situation":"사용자에게 화난 일이 있음","intensity":2,"remainingTurns":2,"updatedAt":1781782831216}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 나 슬퍼 | 아이고ㅠㅠ 무슨일이야? | sad/general/4 | sad/general/3 |
| 2 | 근데 생각할수록 화나 | 헐 진짜 열받겠다ㅠㅠ | angry/general/3 | angry/general/2 |
| 3 | 진짜 짜증남 | 헐 완전 빡치겠넹ㅠㅠ | angry/general/3 | angry/general/2 |

### 6. 시간 만료

- 상태: 통과
- 최종 상태: `{"mood":"normal","topic":"general","situation":"","intensity":0,"remainingTurns":0,"updatedAt":1781782832493}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 오빠 머행 | 머행 ㅎㅎ 뭐해? | normal/general/0 | normal/general/0 |

### 7. 새로고침 복구

- 상태: 통과
- 최종 상태: `{"mood":"tired","topic":"work","situation":"힘들거나 피곤하다고 함","intensity":2,"remainingTurns":1,"updatedAt":1781782833769}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 아직 일하는중 | 고생하넹 ㅠㅠ | tired/work/2 | tired/work/1 |

### 8. 피곤함 유지

- 상태: 통과
- 최종 상태: `{"mood":"normal","topic":"general","situation":"","intensity":0,"remainingTurns":0,"updatedAt":1781782837264}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 오늘 너무 피곤해 | 헉 피곤헐텐데 ㅠㅠ | tired/general/3 | tired/general/2 |
| 2 | 누워있어 | 웅 누워있어라 ㅠㅠ | tired/general/2 | tired/general/1 |
| 3 | 오빠 뭐해 | 집에누워있어ㅠ 그냥 쉬는중이야 | tired/general/1 | normal/general/0 |

### 9. 장난 상태

- 상태: 통과
- 최종 상태: `{"mood":"normal","topic":"food","situation":"","intensity":0,"remainingTurns":0,"updatedAt":1781782841990}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 오빠 바보 ㅋㅋ | 헐 나 바보라닝 ㅋㅋ | playful/general/2 | playful/general/1 |
| 2 | 너가 더 바보야 | 어헣 너나 바보당 ㅋㅋ | playful/general/2 | playful/general/1 |
| 3 | 나 밥먹어 | 오 잘 먹었냥? | playful/food/1 | normal/food/0 |

### 10. 아픔 주제

- 상태: 통과
- 최종 상태: `{"mood":"normal","topic":"health","situation":"","intensity":0,"remainingTurns":0,"updatedAt":1781782846201}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 나 두통있어 | 아이고 머쓱하네 ㅠㅠ | normal/health/0 | normal/health/0 |
| 2 | 약간 아파 | 아이고 안타깝넹 ㅠㅠ | normal/health/0 | normal/health/0 |
| 3 | 그냥 누워있어 | 웅 누워있어라 ㅠㅠ | normal/health/0 | normal/health/0 |

### 11. 평범한 대화는 상태 없음

- 상태: 통과
- 최종 상태: `{"mood":"normal","topic":"general","situation":"","intensity":0,"remainingTurns":0,"updatedAt":1781782849431}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 나 카페왔어 | 오 카페왔넹 | normal/general/0 | normal/general/0 |
| 2 | 커피마시는중 | 맛있겠다 ㅋㅋ | normal/general/0 | normal/general/0 |
| 3 | 오빠 머행 | 웅지금 커피마심 ㅋㅋ | normal/general/0 | normal/general/0 |

### 12. 상태 해제 문장

- 상태: 통과
- 최종 상태: `{"mood":"normal","topic":"general","situation":"","intensity":0,"remainingTurns":0,"updatedAt":1781782853247}`
- 실패 사유: 없음

| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |
| ---: | --- | --- | --- | --- |
| 1 | 나 우울해 | 아이구 속상하넹 ㅠㅠ | sad/general/4 | sad/general/3 |
| 2 | 아무것도 아냐 신경쓰지마 | 그래성 알겠엉 | normal/general/0 | normal/general/0 |
| 3 | 나 게임할래 | 오 재밋겟당 ㅋㅋ | normal/general/0 | normal/general/0 |

