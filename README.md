# 🚀 STELLAR SURVIVOR

뱀파이어 서바이버식 **경험치 파밍·레벨업**과 **무기 조합(합성)**을 결합한 종스크롤 슈팅 로그라이크 웹게임입니다.

| | |
|---|---|
| **상태** | **로컬 MVP + 엔드게임·시너지 크래프팅 완료** (2026-08) — 온라인·애널리틱스만 보류 |
| **플레이** | https://sinbumu.github.io/shooting_roglike_indi_mvp/ |
| **기획·다음 논의** | **[DESIGN.md](./DESIGN.md)** ← 현황 + 다음 개발 축 |
| **발표 참고** | [REPORT.md](./REPORT.md) |
| **완료 기록** | [PLAN.md](./PLAN.md) |

## 지금 할 수 있는 것

- 격납고: **스테이지 / 도전 모드 / 기체** 선택, **드론 베이** 모달, 영구 강화, 업적, 로컬 통계
- 스테이지 3종 (궤도→균열→군단, 클리어 해금) + 도전 4종
- 무기 26종(근접·장판 트리 포함), 패시브 4, 보스 2종(페이즈), 엘리트·트래퍼/보텍스, 스프라이트·프로시저럴 사운드
- **엔드게임:** 한계 돌파 · EMP/쉴드/자석폭주 · T0 어픽스 · 잭팟 · 돌발 균열
- **크래프팅:** 퀀텀 큐브 오브 획득 → 즉시 3선택지 (어픽스 부여/리롤 · 데미지 · 투속)
- **다양성:** 동형 조합(가틀링/노바/모선) · 과부하 코어 · 실더/텔레포터 · 후반 돌연변이
- **액티브:** 스카웃 대시 · 포트리스 방벽 · 헌터 시간왜곡 (`Space` / 우하단 버튼)
- 점수→크레딧 메타 루프 (브라우저 `localStorage`)

### 의도적 미구현

- 온라인 리더보드·시드 런
- 외부 애널리틱스  
(상세·다음 후보: [DESIGN.md](./DESIGN.md))

### 조작

| 환경 | 조작 |
|---|---|
| 모바일 | 화면을 누르면 **가상 조이스틱** — 드래그 거리에 비례해 속도. 우하단 **스킬 버튼** |
| PC | **WASD** / **방향키**, **Shift** 저속(정밀 비행), **Space** 스킬, **ESC** 일시정지. 카드·격납고는 **A/D·화살표 + Enter** |

### 무기 트리

```
Tier 1              Tier 2                         Tier 3 (종결)
🔫 벌컨        ─┬─→ ⚡ 레이저  ─┬─→ ☀️ 오메가 / 🌟 스타폴 / 💫 제네시스
🌊 스프레드    ─┤   🎯 레일건   │
🚀 호밍        ─┤   🐝 스웜     └─→ 동형: 가틀링 / 노바 / 모선
⚔️ 블레이드    ─┤                 └─→ 템페스트 / 파열핵 / 솔라 랜스 / 해머딘
💣 지뢰        ─┤
                ├─→ 톱날 / 빔소드     ─→ 후광 / 절단기
                └─→ 추적지뢰 / 특이점 ─→ 프레데터 / 이벤트 호라이즌
```

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview
```

## 배포

- `main` push → GitHub Actions → **GitHub Pages** 자동 배포.
- Settings → Pages → Source를 **GitHub Actions**로 둔 상태여야 합니다.
- 로컬 작업은 커밋만 하고, 원격 push는 모아서 진행하는 운영을 권장합니다.

## 기술 스택

- Vite + TypeScript (strict) + PixiJS v8 + DOM UI + Web Audio (프로시저럴, 외부 음원 없음)
- 스프라이트: `public/assets/sprites/` (기체·적·보스·픽업 PNG)

## 아키텍처

```
src/
├── GameConfig.ts    # ★ 밸런스·콘텐츠 데이터 (기획 실험의 주 무대)
├── types.ts
├── assets.ts        # 스프라이트 경로·로드
├── GameState.ts     # 게임 로직
├── Renderer.ts      # PixiJS + 스프라이트·이펙트
├── Audio.ts         # 프로시저럴 효과음·BGM
├── LevelUpSystem.ts # 3선택지
├── UI.ts            # HUD·오버레이
├── Meta.ts          # 메타 진행·업적
├── main.ts          # 루프·입력
└── style.css
public/assets/sprites/  # ship_*/enemy_*/boss_*/pickup_*.png
```

로직 / 렌더 / UI 분리. 수치 변경은 대부분 `GameConfig.ts`만으로 가능합니다.

## 문서 가이드

| 문서 | 누가 보면 좋은가 |
|---|---|
| [DESIGN.md](./DESIGN.md) | **기획** — 완료 현황, 다음 개발 축, 논의 질문 |
| [REPORT.md](./REPORT.md) | 발표·피치·데모 시나리오 |
| [PLAN.md](./PLAN.md) | 초기~로컬 MVP 완료 기록 |
