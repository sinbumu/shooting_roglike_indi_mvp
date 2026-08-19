# 🎮 STELLAR SURVIVOR — 기획/콘텐츠 현황판

> 게임 기획자가 **지금 무엇이 있고**, **다음에 어디를 팔지** 바로 논의할 수 있도록 정리한 문서입니다.  
> 수치·밸런스는 `src/GameConfig.ts`가 단일 소스입니다.  
> 마지막 점검: **2026-08-19** — **v1.8.6 레벨업 템포·드랍 스케일·최적화·제단·귀환** (온라인·외부 애널리틱스만 보류)

▶ 플레이: https://sinbumu.github.io/shooting_roglike_indi_mvp/

---

## 0. 한줄 결론 (지금 논의용)

| 질문 | 답 |
|---|---|
| 기획상 **로컬 MVP**는 다 됐나? | **예.** 코어·메타·스테이지·도전·스프라이트·프로시저럴 사운드까지 구현됨 |
| 엔드게임·도파민 패치? | **완료** — 한계 돌파 / 전술 / T0 어픽스 / 잭팟 / 보스 페이즈 / 돌발 균열 |
| 크래프팅·시너지? | **완료** — 큐브 오브 즉시 3선택지 · 어픽스×자석/투속/이속 ([docs/DESIGN_UPDATE_SYNERGY_CRAFTING.md](./docs/DESIGN_UPDATE_SYNERGY_CRAFTING.md), [docs/DESIGN_UPDATE_UX_ACTIVES.md](./docs/DESIGN_UPDATE_UX_ACTIVES.md)) |
| 다양성·초반 템포? | **완료** — EXP 곡선 · 동형 조합 3종 · 패시브 4 · 실더/텔레포터 · 돌연변이 ([docs/DESIGN_UPDATE_VARIETY_TEMPO.md](./docs/DESIGN_UPDATE_VARIETY_TEMPO.md)) |
| UX·액티브? | **완료** — 기체 액티브 스킬 · 키보드 UI 포커스 · 무기고 상점 삭제 |
| 정밀 조작? | **완료** — Shift 저속 비행 · 조이스틱 아날로그 ([docs/DESIGN_UPDATE_PRECISION_MOVEMENT.md](./docs/DESIGN_UPDATE_PRECISION_MOVEMENT.md)) |
| 시각·온보딩? | **완료** — 위험도 색상 · 보스 탄 시인성 · T3 없는 큐브 프리뷰 ([docs/DESIGN_UPDATE_VISUAL_ONBOARDING-v2.md](./docs/DESIGN_UPDATE_VISUAL_ONBOARDING-v2.md)) |
| 경제·로비? | **완료** — 격납고 크레딧 동기화 · 디노미네이션 · 블랙마켓 · 파라곤 ([docs/DESIGN_UPDATE_ECONOMY_SYNC.md](./docs/DESIGN_UPDATE_ECONOMY_SYNC.md)) |
| 후반 텐션? | **완료** — 에이지스/보스 등장 픽스 · 전역 자석 · 미라지/가디언/실더 리워크 ([docs/DESIGN_UPDATE_LATEGAME_TENSION.md](./docs/DESIGN_UPDATE_LATEGAME_TENSION.md)) |
| QA 폴리싱? | **완료** — 무기고 스펙/도감 · 실더 50히트 · 오메가 상향 · 호밍 너프 · 동형 T3 3종 ([docs/DESIGN_UPDATE_QA_FEEDBACK.md](./docs/DESIGN_UPDATE_QA_FEEDBACK.md)) |
| 크래프트·유도 후속? | **완료** — T3 선택지 무작위 · 쿨/크기 옵션 · 선회력 동기화 ([docs/DESIGN_UPDATE_CRAFT_HOMING.md](./docs/DESIGN_UPDATE_CRAFT_HOMING.md)) |
| 스테이지·무기 폴리시? | **완료** — orbit→rift→legion · 제네시스 조준관통 · 해머딘 · 패시브 교체 · 딜미터 ([docs/DESIGN_UPDATE_FINAL_POLISHING.md](./docs/DESIGN_UPDATE_FINAL_POLISHING.md)) |
| 수평 콘텐츠? | **완료** — 근접·장판 무기 10종 · 트래퍼/보텍스 · 격납고 드론 베이 ([docs/DESIGN_UPDATE_CONTENT_EXPANSION.md](./docs/DESIGN_UPDATE_CONTENT_EXPANSION.md)) |
| v1.7 엔드게임 확장? | **완료** — 공허의 제단 · 스테이지 재해 · 코어 각성 · 파일럿 특성 ([docs/DESIGN_UPDATE_ENDGAME_EXPANSION.md](./docs/DESIGN_UPDATE_ENDGAME_EXPANSION.md)) |
| v1.7.1 필감 폴리시? | **완료** — 고유 스프라이트 · 관성/데드존 · 오디오 버스 · 스테이지 주스 ([docs/DESIGN_UPDATE_FEEL_POLISH.md](./docs/DESIGN_UPDATE_FEEL_POLISH.md)) |
| v1.7.2 QA 핫픽스? | **완료** — 스페이스 오선택 · T3 진화 · 특이점 투척 · 근접 어픽스 ([docs/DESIGN_UPDATE_V1_7_2_HOTFIX.md](./docs/DESIGN_UPDATE_V1_7_2_HOTFIX.md)) |
| v1.7.3 밸런스·UI? | **완료** — 제네시스 단발 · 크래프트 슬롯 표기 · 프레데터/해머딘 · 관통 블랙리스트 ([docs/DESIGN_UPDATE_V1_7_3_BALANCE_UI.md](./docs/DESIGN_UPDATE_V1_7_3_BALANCE_UI.md)) |
| v1.7.4 타겟팅? | **완료** — 파열핵 최원거리 조준 · 제네시스 무작위 관통 ([docs/DESIGN_UPDATE_V1_7_4_TARGETING.md](./docs/DESIGN_UPDATE_V1_7_4_TARGETING.md)) |
| v1.7.5 지형 기믹? | **완료** — 단방향 쉴드 · 퀀텀 코어 · 성운 가스 · 모선 잔해 대피소 ([docs/DESIGN_UPDATE_TERRAIN_VISUALS.md](./docs/DESIGN_UPDATE_TERRAIN_VISUALS.md)) · EXP 곡선·솔라 랜스 필터·결과창 버전 ([docs/DESIGN_UPDATE_V1_7_5_POLISHING.md](./docs/DESIGN_UPDATE_V1_7_5_POLISHING.md)) |
| v1.8 성좌? | **완료** — 만렙 이후 판테온 포인트 · 격납고 22노드 성좌 보드 · 다음 런 룰 분기 ([docs/DESIGN_UPDATE_V1_8_CONSTELLATION_FULL.md](./docs/DESIGN_UPDATE_V1_8_CONSTELLATION_FULL.md)) |
| 4번째 기체? | **완료** — 붐바르딜로-크로코딜로 · 융단 폭격 ([docs/DESIGN_UPDATE_NEW_SHIP_BOMBER.md](./docs/DESIGN_UPDATE_NEW_SHIP_BOMBER.md)) |
| 근접·장판 VFX? | **완료** — 블레이드/지뢰/스웜 계열 2×2 애니메이션 스프라이트 (원뿔 Graphics 폴백) |
| 탄막 VFX? | **완료** — T1~T3 투사체·솔라 랜스 전용 시트 (v1.8.3) |
| 지형·재해 VFX? | **완료** — 성운·방벽·퀀텀·제단·태양풍 그늘·운석·EMP 시트 (v1.8.4) |
| 잔여 도형 VFX? | **완료** — 보석·적탄·경고·드론·말뚝·실더 역장 (v1.8.5) |
| 템포·드랍·편의? | **완료** — 배치 레벨업 · 적 수 반비례 드랍 · 제단 디스폰 · 격납고 귀환 (v1.8.6) |
| 패치 노트? | **완료** — 격납고 버전 버튼 · 인게임 체인지로그 ([docs/DESIGN_UPDATE_PATCH_NOTES.md](./docs/DESIGN_UPDATE_PATCH_NOTES.md)) |
| 아직 안 한 것(의도적 보류) | **① 온라인 리더보드·시드 런** · **② 외부 애널리틱스** |
| (선택) 보류 | 외부 `.mp3`/`.wav` — 지금은 Web Audio 합성만 사용 |
| 다음에 할 일 | **제품 방향 선택** (아래 §4~5). “빠진 필수 시스템”을 메우는 단계는 아님 |

**현재 포지션:** 브라우저 로컬만으로 플레이·성장·재도전·후반 엔드게임이 도는 **완결형 빌드**.  
이 시점부터는 “미구현 메우기”가 아니라 **재미 심화 / 콘텐츠 볼륨 / 온라인·계측 / 폴리시** 중 어디에 시간을 쓸지 고르는 단계입니다.

---

## 1. 구현 완료 현황

| 항목 | 상태 |
|---|---|
| MVP 코어 루프 (이동·오토슈팅·파밍·레벨업·조합) | ✅ |
| 보스전 / 점수·콤보 / 아이템 / 스테이지별 클리어 | ✅ |
| PC·모바일 조작 (조이스틱 + WASD/방향키) | ✅ |
| 이펙트·프로시저럴 사운드·일시정지·최고기록 | ✅ |
| 공개 배포 (GitHub Pages) | ✅ |
| 시작 기체 7 / 패시브 / 엘리트 / 보스 2종 | ✅ |
| 런 간 메타 강화 + 업적 (로컬) | ✅ |
| 스테이지 3 + 도전 모드 4 + 스토리 자막 | ✅ |
| 로컬 세션 통계 | ✅ |
| 스프라이트 (기체·적·보스·픽업·전 무기 FX) | ✅ |
| 엔드게임·도파민 (한계돌파/어픽스/균열 등) | ✅ |
| v1.8 성좌 (판테온 포인트 · 격납고 22노드) | ✅ |
| 온라인 리더보드·시드 런 | ❌ **보류** (백엔드/BaaS 필요) |
| 외부 애널리틱스 | ❌ **보류** (도구·개인정보 정책 결정 필요) |
| 외부 음원 파일 | ❌ **의도적 미채택** (프로시저럴로 충분하다고 판단 시 유지) |

### 시스템 체크리스트 (요약)

- [x] 전투·월드: 종스크롤, Warning 스폰, 충돌/무적, 보석 자석, 보스 탄막, 드롭 3종  
- [x] 성장: 레벨업 3선택지, 슬롯 5, 패시브 4, Tier1→2→3 (47무기 / 기존+매트릭스 레시피, 동형 조합·진화·촉매 T3 포함)  
- [x] 피드백: 점수·콤보, 배너, 데미지 숫자, 히트스톱, 흔들림, SFX/BGM, 진동  
- [x] 메타: 기체·패시브·영구강화·업적·스테이지 해금·도전·로컬 통계  
- [x] 비주얼/오디오: Pixi 스프라이트 + Graphics 폴백, Web Audio 합성  
- [x] 엔드게임: 한계 돌파 스탯 · 전술(EMP/쉴드/자석폭주) · T0 어픽스(분열/관통/연쇄)  
- [x] 도파민: 잭팟 히트스톱·쉐이크·피치 SFX · 보스 50% 페이즈+보석 샤워 · 돌발 균열 웨이브  
- [x] 크래프팅: 퀀텀 큐브 오브 → 즉시 3선택지 (어픽스/데미지/투속/쿨/크기) · 어픽스 교차 시너지  
- [x] 다양성·템포: EXP 곡선 완화 · T1 복제 · 동형 T2 3종 · 과부하 코어 · 실더/텔레포터 · 후반 돌연변이  
- [x] UX·액티브: 기체 스킬(대시/방벽/시간왜곡) · 키보드 카드·격납고 포커스  
- [x] 정밀 조작: Shift 저속 비행 · 조이스틱 아날로그 강도  
- [x] 시각·온보딩: 접촉 피해 구간 색상 · 보스 탄 흰 코어/보라 테두리 · T3 미보유 크래프팅 프리뷰  
- [x] 경제: 로비 크레딧 동기화 · 지수 비용 · 블랙마켓 가차 · 파라곤 무한 강화  
- [x] 패치 노트: 격납고 버전 버튼 · 인게임 변경 내역 모달  
- [x] 후반 텐션: 에이지스 충격파 · 보스 등장 Lerp · 전역 자석/상단 중력 · 미라지·가디언·실더 역장  
- [x] QA 폴리싱: 무기고 스펙 · 도감 · 치명타 공개 · 실더 50히트 · 오메가/호밍 · 동형 T3 3종  
- [x] 크래프트 후속: T3 선택지 무작위 · 쿨/크기 옵션 · 유도 선회력 동기화  
- [x] v1.5.0: 군단 스테이지 · 제네시스 조준관통 · 해머딘 · 패시브 교체 · 딜미터 · 진화 카드  
- [x] v1.6.0: 근접·장판 트리 10종 · 트래퍼/보텍스 · 격납고 드론 베이  
- [x] v1.7.0: 공허의 제단 · 스테이지 환경 재해 · Lv.50 코어 각성 · 보스 코어/파일럿 특성  
- [x] v1.7.1: 고유 스프라이트 · 이동 관성/데드존 · 오디오 컴프·팬·일시정지 덕킹 · 스테이지 주스  
- [x] v1.7.2: 스페이스 오선택 · T3 진화 제외 · 특이점 전방 투척 · 근접 어픽스 · 증폭 드론 스케일  
- [x] v1.7.3: 제네시스 단발 융합 · 크래프트 슬롯 번호 · 프레데터/해머딘 상향 · 고관통 어픽스 제외  
- [x] v1.7.4: 파열핵 최원거리 조준·폭발 상향 · 제네시스 무작위 타겟·탄속 상향 
- [x] v1.7.5: 단방향 쉴드 · 퀀텀 코어 폭파 · 성운 둔화 · 궤도 모선 잔해 대피소 · EXP 곡선 · 솔라 랜스 필터 
- [x] v1.8.0: 격납고 성좌 보드 22노드 · 판테온 포인트 · 만렙 스탯 카드 제거 · 런타임 룰 분기
- [x] v1.8.1: 4번째 기체 붐바르딜로-크로코딜로 · 융단 폭격
- [x] v1.8.2: 근접·장판·스웜 애니메이션 스프라이트 (참격 크레센트, 톱날, 후광, 지뢰 5종, 스웜 드론)
- [x] v1.8.3: 탄막 트리 T1~T3 투사체·솔라 랜스 전용 스프라이트
- [x] v1.8.4: 지형·엔드게임 기믹 스프라이트 (성운 구름 · 홀로그램 방벽 · 퀀텀 · 제단 · 재해)
- [x] v1.8.5: 잔여 단색 도형 교체 (보석·적탄·경고·드론·트래퍼 말뚝·실더 역장)
- [x] v1.8.6: 배치 레벨업(16+는 5배수) · 드랍 스케일 · 충돌 그리드/파티클 캡 · 제단 연출/디스폰 · 격납고 귀환 
- [x] v1.9.0: 기체 3종(야차·오버로드·크림슨) · 매트릭스 무기 21종 · 패시브 촉매 T3 
- [x] v1.9.1: 채찍 스윕 판정/잔상 · 거합도 암전·섬광 참격·적 개별 VFX 
- [x] v1.9.2: 레벨업 카드 시너지 글로우 · 진화 임박 황금 맥동 · 조합 퍼즐 뱃지
- [x] v1.9.3: 신규 기체 코어 각성 A/B · Lv.50 각성 창 기체 매핑 픽스
- [x] v1.9.4: 후반 탄막 최적화 (DPR/AA · 히트 FX 상한 · 유도 그리드 · HUD 10Hz)
- [x] v1.9.5: 이벤트 예산 · 사망 FX 상한 · 별 스프라이트 · 투사체 풀 · 엔진/성운 생략 
- [x] v1.9.6: 오버로드 군단 폭주 리워크 · 소환 T3 시너지 · 코어 각성 A/B 개편 
- [x] v1.9.7: 거합도 참격 네모 테두리 제거 · 진동 채찍 장판 파지직 연출 
- [x] v1.9.8: 혈사포 피분수 연출 
- [x] v1.9.9: 마그네틱 훅 → 유도 참격 / 환영검무 

---

## 2. 플레이어가 하는 일 (코어 루프)

```
이동(회피) → 자동 사격 → 적 처치 → EXP/아이템 획득
    ↑                                      ↓
    └──── 더 강한 빌드 ←── 레벨업 3선택지(신규/강화/조합)
```

- **목표:** 스테이지별 생존 시간 달성 → Mission Clear (기본 궤도 ≈ 5분)  
- **실패:** HP 0 → Game Over (점수·크레딧·업적). ESC 일시정지에서 **격납고 귀환** 시 그때까지 크레딧을 정산하고 로비로 복귀 (클리어 보너스 제외). **다시 시작**은 정산 없이 0 보상.
- **성장 템포:** 1~15레벨은 레벨마다 즉시 3선택지. 16부터는 5의 배수(20, 25…)에만 창이 열리고 쌓인 횟수를 연달아 고름.  
- **긴장 포인트:** 기습 Warning, 웨이브 가속, 보스 탄막, 도전 모드 제약  

격납고에서 스테이지·도전·기체 선택, 드론·특성은 전용 모달에서 장착 → 출격 → 클리어로 다음 스테이지 해금·크레딧·업적.

---

## 3. 콘텐츠 카탈로그 (현재량)

### 3-1. 무기 트리

| Tier | ID | 이름 | 역할 |
|---|---|---|---|
| 1 | `vulcan` / `spread` / `homing` | 벌컨 / 스프레드 / 호밍 | 직사 / 부채 / 유도 |
| 1 | `blade` / `mine` | 플라즈마 블레이드 / 중력 지뢰 | 근접 참격 / 설치형 폭발 (슬롯당 1) |
| 2 | `laser` / `railgun` / `swarm` | 레이저 / 레일건 / 스웜 | 이종 조합 |
| 2 | `gatling` / `nova` / `mothership` | 가틀링 / 노바 / 모선 | 동형 조합 (같은 T1 2개) |
| 2 | `rotor` / `beamSword` | 회전 톱날 / 빔 소드 | 근접 (blade+spread / blade+vulcan) |
| 2 | `seekerMine` / `singularity` | 추적 지뢰 / 특이점 | 장판 (mine+homing / mine+spread) |
| 3 | `omega` / `starfall` / `genesis` | 오메가 / 스타폴 / 제네시스 | 이종 T2 종결 (제네시스=무작위 조준 관통) |
| 3 | `tempest` / `rupture` / `solance` / `helix` | 템페스트 / 파열핵 / 솔라 랜스 / 해머딘 | 동형 경로 (파열핵=최원거리 폭발) |
| 3 | `halo` / `cleaver` | 발키리의 후광 / 차원 절단기 | 근접 종결 (rotor+nova / beamSword+laser) |
| 3 | `predator` / `eventHorizon` | 프레데터 스웜 / 이벤트 호라이즌 | 장판 종결 (seekerMine+swarm / singularity+mothership) |
| 1 | `plasmaWhip` / `spiderMine` / `bloodSpike` | 플라즈마 채찍 / 스파이더 마인 / 핏빛 쐐기 | 매트릭스 T1 (근접 / 소환 / HP코스트 발사체) |
| 2 | `orbitalSaw` / `seekingSlash` / `quakeWhip` | 궤도 전기톱 / 유도 참격 / 진동 채찍 | 채찍 트리 |
| 2 | `interceptorWing` / `autoTurret` / `sawDrone` | 요격기 편대 / 자동 포탑 / 톱니 드론 | 스파이더 트리 |
| 2 | `drainAura` / `bleedBurst` / `bloodSeeker` | 착취의 오라 / 출혈 폭발 / 피의 추적자 | 핏빛 트리 (쐐기+지뢰=오라) |
| 3 | `kingSaw` / `phantomBlade` / `tectonicCutter` | 명왕의 톱니 / 환영검무 / 지각 절단기 | 채찍 T3 (T2+패시브 촉매) |
| 3 | `doomsday` / `orbitalBattery` / `ironMaiden` | 둠스데이 / 궤도 폭격 신호소 / 아이언 메이든 | 스파이더 T3 |
| 3 | `bloodGallows` / `bloodNova` / `vampireBats` | 선혈의 처형대 / 혈노바 / 흡혈 박쥐 | 핏빛 T3 |

- 슬롯 5 → 경로 선택형 빌드. T1 복제 카드는 **동형 레시피 있는 ID만** (`vulcan`/`spread`/`homing`). `blade`/`mine`은 슬롯당 1  
- 매트릭스 T3는 **해당 패시브를 보유**해야 카드가 뜨고, 패시브 슬롯은 **소모하지 않음** (T2 무기만 교체)
- 조합 레벨 = 재료 중 **낮은 쪽** 계승 (촉매 T3는 T2 레벨 계승)  
- 가중치: 조합 100 / 강화 40 / 신규 25 / T1 복제 18 / 잭팟 4% (`LevelUpSystem.ts`)

### 3-2. 적·보스

| ID | 이름 | 역할 |
|---|---|---|
| `drone` ~ `tank` | 드론·지그재그·대셔·러셔·탱크 | 일반 5종 |
| `shielder` | 실더 | 정면 횟수제 역장(50히트). 관통 불가. 색/금이 파괴 단계 |
| `teleporter` | 텔레포터 | 근접 시 플레이어 뒤/옆으로 워프 (180초~) |
| `splinter` | 파편 | 분열 돌연변이 처치 시 등장 (추가 분열 없음) |
| `mirage` | 미라지 | 200px 밖 은신·무적·유도 불가 |
| `guardian` | 가디언 | 오라 안 아군 피감 50%. 우선 점사 대상 |
| `trapper` | 트래퍼 | 후반 강적. 고정 후 플레이어 위치에 4방향 말뚝 투기장. 펜스 접촉 고피해 |
| `vortex` | 보텍스 | 후반 강적. 가장자리 스폰. 반경 안 기체·투사체 흡인 |
| `warden` / `herald` / `architect` | 군단장 3종 | 군단 스테이지 전용. 방어 HP 가산 / 스폰 가속 / 전방위 역장+투사체 감속 |
| (엘리트) | 동일 풀 + 강화 | 금색 tint, 보상↑ |
| (돌연변이) | 자폭 / 분열 / 탄막 | 후반 웨이브 속성 |
| `boss` | 드레드노트 | 탄막 + 조준. 탄환은 흰 코어+보라 테두리 |
| `bossSeraph` | 세라프 | 2번째 보스 패턴 |

적 `color`는 접촉 피해 구간: Low(`#4ade80`) / Medium(`#f97316`) / High(`#ef4444`) (`DANGER`).

스테이지마다 `bossRoster`·웨이브·배경·스토리 비트가 다름 (`STAGES`).

### 3-3. 스테이지·도전·기체·메타

| 분류 | 내용 |
|---|---|
| 스테이지 | `orbit` → `rift` → `legion` (클리어 해금, 군단 7분) |
| 도전 | 표준 / 제한무장 / 유리장갑 / 맨몸 |
| 기체 | 스카웃(위상 대시) / 포트리스(절대 방벽) / 헌터(시간 왜곡) / 붐바르딜로-크로코딜로(융단 폭격, 해금 2000) / 야차(발도술, 해금 2500) / 오버로드(군단 폭주, 해금 2500) / 크림슨 팩트(혈사포, 해금 2800) |
| 패시브 | 소형화·구속장·레벨업 쉴드·장갑·수집·과충전·과부하 코어 + 티타늄 장갑·추진기·고폭약·양자 배터리·확장 탄창·나노 장갑·재생 모듈·치명타 렌즈·가속 모터 (런 중 슬롯 4) |
| 메타 | 선체·화력·엔진·자석·행운 (5캡) + 오버클럭/초경량 장갑 (무한, 비용 ×1.15) · 블랙마켓 스킨 |
| 드론 베이 | 수집기·요격기·증폭기 (격납고 요약 한 줄 + 전용 모달, 크레딧 해금 후 선택, 없이 출격 가능, 강화 5캡) |
| 파일럿 특성 | 배수진·포대 암전·처형인 (보스 코어로 해금, 출격 전 1개 장착) |
| 업적 | 생존·클리어·보스·Tier·콤보·점수·엘리트·군단 격파 등 |

### 3-4. 아이템

회복 / 자석 / 폭탄 / 퀀텀 큐브(크래프팅) / 황금 큐브(제단 보상: 슬롯+1 또는 크레딧 3배) (+ 선택지 폴백 수리 카드)

### 3-5. 궤도 스테이지 리듬 (참고)

| 시각 | 이벤트 |
|---|---|
| 0:00~ | 드론 → 지그재그 → 대셔/러셔 |
| ~1:15 | 1차 보스 + 탱크 |
| ~1:30 | 태양풍 재해 (궤도) · 제단 스폰(~1:40) |
| ~2:45 / ~4:15 | 2·3차 보스 (로스터·체력 성장) |
| ~2:45 / ~4:15 | 2·3차 보스 (로스터·체력 성장) |
| ~3:00~ | 실더·텔레포터 + 자폭/분열/탄막 돌연변이 · 트래퍼/보텍스 |
| ~5:00 | Mission Clear |

균열(4:30)·군단(7:00, 60초마다 군단장)은 타임·웨이브·스토리가 다름 → `GameConfig.ts`의 `STAGES` 참고.

---

## 4. 다음 개발 방향 — 논의용 메뉴

**로컬 MVP에 “빠진 필수 기능”은 없음.**  
아래는 **어디를 깊게 팔지** 고르기 위한 후보입니다. 우선순위는 미확정.

### 축 A — 재미·밸런스 심화 (백엔드 없음 · 추천 출발점)

| 후보 | 플레이어 체감 | 비용 | 상태 |
|---|---|---|---|
| 웨이브/보스/무기 수치 튜닝 | 클리어율·빌드 편중 조절 | 낮음 (`GameConfig`) | 후보 |
| 일반 적 2~3종 / 웨이브 리듬 | 회피 패턴 다양화 | 낮~중 | ✅ 완료 (실더·텔레포터·돌연변이) |
| 보스 **페이즈** (HP 구간별 탄막) | 보스전 긴장감 | 중 | ✅ 완료 (50% + 보석 샤워) |
| 한계 돌파·전술·어픽스·균열 | 후반 정체 해소·도파민 | 중 | ✅ 완료 |
| 드롭 1~2종 (쉴드·버프 등) | 상황 판단 | 낮~중 | 후보 (전술 카드로 일부 충족) |
| 세션 길이 A/B (3/5/7분) | 데모·리텐션 실험 | 낮음 | 후보 |

### 축 B — 콘텐츠·메타 볼륨 (로컬 유지)

| 후보 | 목적 | 비용 |
|---|---|---|
| 스테이지 4+ / 테마 적 풀 | 수명 | 중~높 |
| 기체·패시브·업적 추가 | 수집·목표 | 중 |
| 스토리/언락 연출 강화 | 브랜드·감정선 | 중 |
| UX 폴리시 (격납고·튜토리얼·접근성) | 첫 세션 이탈↓ | 중 |

### 축 C — 제품·온라인 (보류 해제 시)

| 후보 | 전제 | 비용 |
|---|---|---|
| **시드 런 + 온라인 리더보드** | BaaS/백엔드·부정행위 정책 | 높 |
| **외부 애널리틱스** | 동의 문구·도구 선택 | 중 |
| 외부 음원·아트 패스 | 라이선스·용량 | 중~높 |

### 이미 끝난 과거 백로그 (참고)

다음 항목은 **구현 완료**되어 “다음에 넣을지” 목록에서 제외합니다.  
패시브 슬롯 · 시작 기체 · 엘리트 · 도전 모드 · 메타 강화 · 스테이지 복수 · 스프라이트 · 프로시저럴 사운드 개선 ·  
**한계 돌파 · 전술 폴백 · T0 어픽스 · 잭팟 연출 · 보스 페이즈 · 돌발 균열 · 동형 조합 · 후반 강적/돌연변이**.

---

## 5. 지금 답하면 좋은 논의 질문

1. **다음 2주 목표**가 “데모 재미 검증”인가, “콘텐츠 수명”인가, “경쟁/공유(온라인)”인가?  
2. 재미의 중심을 어디에 둘까 — **조합 트리** / **탄막 회피** / **점수·메타 갱신**?  
3. 축 A에서 **한 방**을 고른다면: 밸런스 패치 / 새 적 / 새 무기 계열 / 보스 페이즈 중?  
4. 온라인(리더보드·시드)을 **언제** 열까 — 지금 / 로컬 리텐션 확인 후 / 무기한 보류?  
5. 애널리틱스 없이 피드백을 모을 방법(플레이테스트 체크리스트)만으로 충분한가?  
6. 외부 음원·추가 아트에 예산을 쓸 가치가 있는가, 아니면 합성+현 스프라이트 유지?

---

## 6. 밸런스 실험 위치

모든 숫자의 중심: **`src/GameConfig.ts`**

| 느낌 | 상수 |
|---|---|
| 이속 | `PLAYER.moveSpeed` / 기체·메타 |
| 정밀 비행 | `PLAYER.focusSpeedMul` (Shift) / 조이스틱 드래그 강도 |
| 초반 허함 | `STAGES.*.waves`, `LEVELING.expForLevel` |
| 보스 강약 | `BOSS` / 스테이지 `bossTimes`·`bossRoster` |
| 조합 빈도 | `LevelUpSystem.ts` 가중치 |
| 클리어 난이도 | `VICTORY_TIME` / 스테이지 duration·스케일 |
| 드롭 | `PICKUPS.dropChance` · 적 수 보정 `1/sqrt(n/10)` · 힐/폭탄은 `time * ScalePerSec` |

`npm run dev`로 즉시 체감. Pages 반영은 `main` push 시.

---

## 7. 관련 문서

| 문서 | 용도 |
|---|---|
| [README.md](./README.md) | 플레이·실행·배포·기술 개요 |
| [REPORT.md](./REPORT.md) | 발표/피치·데모 시나리오 |
| [PLAN.md](./PLAN.md) | 초기 MVP 계획 → **로컬 MVP 완료** 기록 |
| [docs/DESIGN_UPDATE_STELLAR_SURVIVOR.md](./docs/DESIGN_UPDATE_STELLAR_SURVIVOR.md) | 엔드게임·도파민 기획 (구현 완료) |
| [docs/DESIGN_UPDATE_SYNERGY_CRAFTING.md](./docs/DESIGN_UPDATE_SYNERGY_CRAFTING.md) | 퀀텀·무기고·어픽스 시너지 (구현 완료) |
| [docs/DESIGN_UPDATE_VARIETY_TEMPO.md](./docs/DESIGN_UPDATE_VARIETY_TEMPO.md) | 초반 템포·동형 조합·후반 강적 (구현 완료) |
| [docs/DESIGN_UPDATE_UX_ACTIVES.md](./docs/DESIGN_UPDATE_UX_ACTIVES.md) | 크래프팅 오브·기체 액티브·키보드 UX (구현 완료) |
| [docs/DESIGN_UPDATE_PRECISION_MOVEMENT.md](./docs/DESIGN_UPDATE_PRECISION_MOVEMENT.md) | Shift 저속·조이스틱 아날로그 (구현 완료) |
| [docs/DESIGN_UPDATE_MINI_FEEDBACK.md](./docs/DESIGN_UPDATE_MINI_FEEDBACK.md) | 초반 무기 확정·패시브 수치·격납고 스크롤 (구현 완료) |
| [docs/DESIGN_UPDATE_VISUAL_ONBOARDING-v2.md](./docs/DESIGN_UPDATE_VISUAL_ONBOARDING-v2.md) | 위험도 색상·보스 탄 시인성·큐브 프리뷰 (구현 완료) |
| [docs/DESIGN_UPDATE_ECONOMY_SYNC.md](./docs/DESIGN_UPDATE_ECONOMY_SYNC.md) | 로비 동기화·경제 디노미네이션·블랙마켓 (구현 완료) |
| [docs/DESIGN_UPDATE_PATCH_NOTES.md](./docs/DESIGN_UPDATE_PATCH_NOTES.md) | 인게임 패치 노트 (구현 완료) |
| [docs/DESIGN_UPDATE_LATEGAME_TENSION.md](./docs/DESIGN_UPDATE_LATEGAME_TENSION.md) | 후반 텐션·강적 기믹 (구현 완료) |
| [docs/DESIGN_UPDATE_QA_FEEDBACK.md](./docs/DESIGN_UPDATE_QA_FEEDBACK.md) | QA 피드백 폴리싱 (구현 완료) |
| [docs/DESIGN_UPDATE_CRAFT_HOMING.md](./docs/DESIGN_UPDATE_CRAFT_HOMING.md) | 크래프팅 무작위·쿨/크기 · 유도 선회 (구현 완료) |
| [docs/DESIGN_UPDATE_FINAL_POLISHING.md](./docs/DESIGN_UPDATE_FINAL_POLISHING.md) | 스테이지 재구성·무기/패시브 리워크·딜미터 (구현 완료) |
| [docs/DESIGN_UPDATE_CONTENT_EXPANSION.md](./docs/DESIGN_UPDATE_CONTENT_EXPANSION.md) | 근접·장판 트리 · 트래퍼/보텍스 · 드론 베이 (구현 완료) |
| [docs/DESIGN_UPDATE_V1_6_HOTFIX.md](./docs/DESIGN_UPDATE_V1_6_HOTFIX.md) | v1.6 핫픽스: 문서 동기화 · 트래퍼 투기장 · UX (구현 완료) |
| [docs/DESIGN_UPDATE_DRONE_UI_HOTFIX.md](./docs/DESIGN_UPDATE_DRONE_UI_HOTFIX.md) | 격납고 드론 베이 모달 분리 (구현 완료) |
| [docs/DESIGN_UPDATE_ENDGAME_EXPANSION.md](./docs/DESIGN_UPDATE_ENDGAME_EXPANSION.md) | 제단·환경 재해·코어 각성·파일럿 특성 (구현 완료) |
| [docs/DESIGN_UPDATE_FEEL_POLISH.md](./docs/DESIGN_UPDATE_FEEL_POLISH.md) | v1.7.1 필감·비주얼·오디오 폴리시 (구현 완료) |
| [docs/DESIGN_UPDATE_V1_7_2_HOTFIX.md](./docs/DESIGN_UPDATE_V1_7_2_HOTFIX.md) | v1.7.2 QA 핫픽스 (구현 완료) |
| [docs/DESIGN_UPDATE_V1_7_3_BALANCE_UI.md](./docs/DESIGN_UPDATE_V1_7_3_BALANCE_UI.md) | v1.7.3 조준·크래프트 UI·밸런스 (구현 완료) |
| [docs/DESIGN_UPDATE_V1_7_4_TARGETING.md](./docs/DESIGN_UPDATE_V1_7_4_TARGETING.md) | v1.7.4 파열핵·제네시스 타겟팅 (구현 완료) |
| [docs/DESIGN_UPDATE_TERRAIN_VISUALS.md](./docs/DESIGN_UPDATE_TERRAIN_VISUALS.md) | v1.7.5 지형 기믹 4종 (구현 완료) |
| [docs/DESIGN_UPDATE_V1_7_5_POLISHING.md](./docs/DESIGN_UPDATE_V1_7_5_POLISHING.md) | v1.7.5 EXP 곡선 · 솔라 랜스 필터 · 결과창 버전 (구현 완료) |
| [docs/DESIGN_UPDATE_V1_8_CONSTELLATION_FULL.md](./docs/DESIGN_UPDATE_V1_8_CONSTELLATION_FULL.md) | v1.8 성좌 22노드 · 판테온 포인트 (구현 완료) |
| [docs/DESIGN_UPDATE_NEW_SHIP_BOMBER.md](./docs/DESIGN_UPDATE_NEW_SHIP_BOMBER.md) | 4번째 기체 붐바르딜로-크로코딜로 (구현 완료) |
| [docs/DESIGN_UPDATE_V1_8_2_POLISHING_RETREAT_V2.md](./docs/DESIGN_UPDATE_V1_8_2_POLISHING_RETREAT_V2.md) | v1.8.6 배치 레벨업 · 드랍 스케일 · 최적화 · 제단 · 귀환 |
| [docs/DESIGN_UPDATE_V1_9_NEW_SHIPS_WEAPONS.md](./docs/DESIGN_UPDATE_V1_9_NEW_SHIPS_WEAPONS.md) | v1.9 신기체 3종 · 매트릭스 무기 트리 (구현 완료) |
| [docs/DESIGN_UPDATE_V1_9_1_QA_FIXES.md](./docs/DESIGN_UPDATE_V1_9_1_QA_FIXES.md) | v1.9.1 채찍 스윕 판정 · 거합도 VFX (구현 완료) |
| [docs/DESIGN_UPDATE_V1_9_2_UI_HINTS.md](./docs/DESIGN_UPDATE_V1_9_2_UI_HINTS.md) | v1.9.2 레벨업 카드 시너지/진화/조합 힌트 (구현 완료) |
| [docs/DESIGN_UPDATE_V1_9_3_CORE_AWAKENINGS.md](./docs/DESIGN_UPDATE_V1_9_3_CORE_AWAKENINGS.md) | v1.9.3 신규 기체 코어 각성 A/B · 기체 매핑 픽스 (구현 완료) |
| [docs/DESIGN_UPDATE_V1_9_5_REPLACE_MAGNETIC_HOOK.md](./docs/DESIGN_UPDATE_V1_9_5_REPLACE_MAGNETIC_HOOK.md) | 마그네틱 훅 → 유도 참격/환영검무 (게임 버전 v1.9.9) |
| `public/assets/sprites/fx_*.png` | 무기·지형·엔드게임·잔여 도형 2×2 애니메이션 시트 (v1.8.2~1.8.5, v1.9 T1 FX) |
| `src/GameConfig.ts` | 실제 콘텐츠·밸런스 데이터 |
