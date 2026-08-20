# 스프라이트 파이프라인 (코딩 에이전트용)

런타임 텍스처는 **lossless WebP만** `public/assets/sprites/`에 둔다. GPU 해상도 다운스케일은 이 문서 범위가 아니다.

## 규칙

- **배치:** `public/assets/sprites/`에 PNG를 커밋하지 않는다. 확장자는 `.webp`.
- **초안:** pngjs · AI · 크로마 입력이 PNG만 되면 `assets/raw/`(gitignore) 또는 임시 PNG로 그린다. **게임에 넣기 전에** WebP로 바꾼다.
- **시트:** FX는 2×2 정적 시트. 코드 `sliceSheet`가 자른다. **애니메이션 WebP 금지.** FX 시트는 트리밍하지 않는다 (셀 정렬).
- **인코딩:** sharp `{ lossless: true }`만. lossy quality 쓰지 않는다. 공유 상수: `scripts/png-to-webp.mjs`의 `WEBP_LOSSLESS`.
- **적용:** [`src/assets.ts`](../src/assets.ts) `SPRITE_PATHS`에 `.webp` 경로를 추가한다.

```
PNG 초안 (raw / pngjs / AI)
        ↓
npm run sprites:webp
  또는 chroma-fx / chroma-sprites / gen-v19 (public 출력은 이미 WebP)
        ↓
public/assets/sprites/*.webp
        ↓
SPRITE_PATHS
```

## 명령

| 상황 | 명령 |
|---|---|
| public에 PNG가 생긴 경우 | `npm run sprites:webp` (변환 후 PNG 삭제) |
| 2×2 FX raw (`*_raw.png`) | `node scripts/chroma-fx.mjs` |
| 128px 기체·적 raw | `node scripts/chroma-sprites.mjs` |
| v1.9 절차적 시트 | `node scripts/gen-v19-sprites.mjs` (raw PNG 유지, public만 WebP) |
| v1.10 교차 매트릭스 FX | `node scripts/gen-v110-sprites.mjs` 후 `node scripts/chroma-fx.mjs` |

Pixi 8 `Assets.load`는 `.webp`를 PNG와 같이 `Texture`로 연다. `Renderer` blit은 손대지 않는다.
