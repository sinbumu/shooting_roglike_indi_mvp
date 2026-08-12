# 🚀 STELLAR SURVIVOR

뱀파이어 서바이버식 **경험치 파밍·레벨업**과 **무기 조합(합성)**을 결합한 종스크롤 슈팅 로그라이크 웹게임입니다.

| | |
|---|---|
| **상태** | MVP + 메타루프 (기체/패시브/엘리트/업적) — 2026-08 |
| **플레이** | https://sinbumu.github.io/shooting_roglike_indi_mvp/ |
| **기획/콘텐츠 현황** | **[DESIGN.md](./DESIGN.md)** ← 기획자용 메인 문서 |
| **발표 참고** | [REPORT.md](./REPORT.md) |

## 지금 할 수 있는 것 (플레이 요약)

- 시작 전 **격납고**에서 기체 선택 · 영구 강화 · 업적 확인
- **5분 생존**하면 Mission Clear. 무기는 **자동 발사**.
- 레벨업 3선택지: 신규/강화/조합/대성공 + **패시브**
- 무기 슬롯 5 + 패시브 슬롯 3, Tier1→2→3 조합 트리
- **엘리트 적**(금색) · 보스 **드레드노트/세라프** 교대
- 점수→**크레딧**으로 메타 강화·기체 해금 (브라우저 저장)

### 조작

| 환경 | 조작 |
|---|---|
| 모바일 | 화면을 누르면 **가상 조이스틱** — 드래그로 이동 |
| PC | **WASD** / **방향키**, 마우스 조이스틱도 가능, **ESC** 일시정지 |

### 무기 트리

```
Tier 1          Tier 2                    Tier 3 (종결)
🔫 벌컨    ─┬─→ ⚡ 레이저 배러지  ─┬─→ ☀️ 오메가 캐논
🌊 스프레드 ─┤   (벌컨+스프레드)    │   (레이저+레일건)
            ├─→ 🎯 레일건        ─┼─→ 🌟 스타폴
🚀 호밍    ─┤   (벌컨+호밍)       │   (레이저+스웜)
            └─→ 🐝 스웜 드론     ─┴─→ 💫 제네시스
                (스프레드+호밍)       (레일건+스웜)
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

- Vite + TypeScript (strict) + PixiJS v8 + DOM UI + Web Audio (애셋 파일 없음)

## 아키텍처

```
src/
├── GameConfig.ts    # ★ 밸런스·콘텐츠 데이터 (기획 실험의 주 무대)
├── types.ts
├── GameState.ts     # 게임 로직
├── Renderer.ts      # PixiJS + 이펙트
├── Audio.ts         # 효과음·BGM
├── LevelUpSystem.ts # 3선택지
├── UI.ts            # HUD·오버레이
├── main.ts          # 루프·입력
└── style.css
```

로직 / 렌더 / UI 분리. 수치 변경은 대부분 `GameConfig.ts`만으로 가능합니다.

## 문서 가이드

| 문서 | 누가 보면 좋은가 |
|---|---|
| [DESIGN.md](./DESIGN.md) | **기획** — 구현 현황, 콘텐츠 목록, 추가 후보, 논의 질문 |
| [REPORT.md](./REPORT.md) | 발표·피치·데모 시나리오 |
| [PLAN.md](./PLAN.md) | 초기 개발 계획 (완료된 역사 문서) |
