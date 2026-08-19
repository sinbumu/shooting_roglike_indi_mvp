# STELLAR SURVIVOR — 기획 추가 지시서 (v1.7.1 필감·비주얼·오디오 폴리시)

> **문서 목적:** 콘텐츠 추가는 없이, 재사용 스프라이트·조작 스냅·오디오 클립·배경 단조로움을 한 패치에서 정리한다.

---

## 1. 고유 스프라이트
트래퍼·보텍스·군단장 3종·황금 큐브는 전용 PNG. 식별용 적 tint는 제거하고 히트/엘리트/돌연변이 tint만 유지.

## 2. 조작감
이동은 목표 속도로 지수 접근(관성). 조이스틱 안쪽 데드존 후 재정규화. 대시는 마지막 입력 방향을 유지. 피격 무적은 프레임 스킵 대신 알파 펄스.

## 3. 오디오
마스터 DynamicsCompressor. 월드 SFX는 위치 스테레오 팬. 일시정지는 컨텍스트 freeze 대신 SFX 뮤트 + BGM 덕킹/LPF. 스테이지별 BGM 팔레트(궤도/균열/군단). 외부 음원 없음.

## 4. 주스
스테이지 시차 레이어(잔해/위습/격자). 엔진 트레일은 조준 반대. 참격 잔상. 지뢰 대기 펄스. 드론 기체 실루엣.

---

## 5. 구현 체크리스트
- [x] 6종 스프라이트 크로마키 + `SPRITE_PATHS` 연결, 식별 tint 제거
- [x] `PLAYER.accel/friction`, `JOYSTICK.deadzone`, lastAim, 무적 알파
- [x] compressor / sfxBus pan / `setPaused` / `setStageMood`
- [x] 배경 레이어 · 엔진 트레일 · 슬래시 잔상 · 지뢰 펄스 · 드론 실루엣
- [x] PatchNotes v1.7.1 · DESIGN.md · `npm run build`
