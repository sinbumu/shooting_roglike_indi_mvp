# 🚀 STELLAR SURVIVOR — 기획 추가 지시서 (v1.7.2 QA 핫픽스 및 로직 고도화)

> **문서 목적:** v1.7.1 사양을 기준으로, 테스터가 제보한 치명적 조작 이슈(스페이스바 오입력)와 `GameConfig.ts`에 내재된 무기 기믹(특이점 폭탄 자살, 크기 스탯 미적용, 증폭 드론 스케일링 누락)의 로직을 고친다.

> **구현 고정:** 프레데터 관통은 어픽스 풀에서 제외(태그 필터). 증폭 드론은 지속시간 대신 레벨당 쿨감 (`amplifierCooldownMulPerLv: 0.05`). PLAN.md는 수정하지 않는다.

---

## 1. 치명적 조작 UX 및 메커니즘 픽스

유저의 의도와 다르게 작동하여 불쾌감을 유발하는 요소를 최우선으로 수정합니다.

- **[x] 레벨업 카드 포커스 오입력 방지 (`UI.ts`, `main.ts`):**
  - 액티브 스킬(Spacebar) 사용 중 레벨업 창이 뜨면 의도치 않은 카드가 강제 선택되는 현상.
  - **해결:** 레벨업/크래프트/제단 모달 팝업 시 초기 포커스를 `-1`(선택 없음). 방향키 입력 시에만 포커스 링 활성화. Space/Enter는 포커스가 있을 때만 확정. 일시정지/결과/격납고는 기존처럼 0부터.
- **[x] 진화(Evolve) 카드 타겟팅 예외 처리 (`LevelUpSystem.ts`):**
  - 이미 종결인 T3 무기가 무작위 1레벨 무기로 교체당하는 문제 수정.
  - **해결:** `acquireOrder`를 뒤에서 훑어 첫 비-T3만 대상. 비-T3가 없으면 카드 미등장. `applyChoice('evolve')`에도 T3 가드.
- **[x] 특이점 폭탄(singularity) 자살 기믹 수정 (`GameConfig.ts` & `GameState.ts`):**
  - 기존 `speed: 0`으로 발밑에 스폰된 뒤 적을 끌어당겨 충돌 피해를 입힘.
  - **해결:** `speed: 180`. 플레이어 위치에서 `lastAim * speed`로 전방 투척. 지뢰/추적지뢰는 기존 후방 설치 유지.

---

## 2. 무기 어픽스 호환성 및 스탯 동기화

근접/장판 무기와 원거리 어픽스 간의 충돌을 막고, 누락된 스탯 동기화를 구현합니다.

- **[x] 비호환 어픽스 필터링 및 전용 어픽스 추가 (`GameConfig.ts` & `LevelUpSystem.ts`):**
  - `WeaponTag = 'projectile' | 'melee' | 'aura' | 'drop'`. melee: blade/beamSword/cleaver. aura: rotor/halo. drop: mine/seekerMine/singularity/predator/eventHorizon. 나머지 projectile.
  - split/pierce/chain은 `['projectile']`만. 신규 3종은 `['melee']`.
  - **잔상 (afterimage):** 슬래시 히트 후 0.5초 뒤 같은 각도·60% 데미지/사거리 추가 참격. 잔상은 재잔상 없음.
  - **메아리 (echo):** 해당 무기 처치 시 20%로 시체 위치 폭발.
  - **화려한 빛 (brilliance):** 타격 위치에 커졌다 줄어드는 짧은 원형 존.
  - 필터는 한 함수 `compatibleAffixes`로 레벨업·크래프트 부여/리롤·T3 합성 랜덤·`grantAffix`에 공통 적용. 크래프트 `speed`는 melee/aura에서 제외.
- **[x] 공격 크기 스탯 렌더링 동기화 (`Renderer.ts` & `GameState.ts`):**
  - 참격 `arcDeg`에도 sizeMul. 절단기 `leaveZone.radius` sizeMul. fired 슬래시 VFX에 실제 arcDeg/range 전달. 오라 스폰 링도 sizeMul된 반경.
- **[x] 프레데터 스웜(`predator`) 관통 무효화:**
  - drop 태그가 투사체 어픽스를 받지 않음 (어픽스 풀에서 제외).

---

## 3. UI 표기 및 수치 스케일링 누락 픽스

용어 혼동을 막고 누락된 레벨 디자인 수치를 보완합니다.

- **[x] 딜미터기 실제 데미지(Raw Damage) 추가 (`UI.ts`):**
  - 결과창 딜 기여도 `%` 옆에 `1.2M` / `450K` / `12,345` 실딜 표기.
- **[x] 증폭 드론(`amplifier`) 스케일링 누락 픽스 (`GameConfig.ts`):**
  - `amplifierCooldownMulPerLv: 0.05`. 실제 배율 `max(floor, 0.6 - (lv-1)*0.05)`. HUD/격납고 설명도 레벨에 맞게.
- **[x] 근접/오라 무기 텍스트 예외 처리 (`UI.ts`):**
  - 크래프트 쿨 카드 제목·설명을 "공격 빈도 증가"로 분기. HUD 툴팁은 근접/오라 `빈도 +N%`.

---

## 4. 구현 체크리스트

- [x] 레벨업 포커스 -1, T3 제외 진화, 특이점 전방 투척
- [x] WeaponTag 필터 + afterimage/echo/brilliance
- [x] sizeMul 동기화, 딜미터 실딜, 근접 쿨 문구, amplifier 레벨 쿨감
- [x] PatchNotes v1.7.2 · DESIGN.md · `npm run build`
