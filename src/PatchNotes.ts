export interface PatchNote {
  version: string;
  date: string;
  changes: string[];
}

/** 최신 패치가 index 0. 이후 커밋 전에 이 배열 앞에 항목을 추가한다. */
export const PATCH_NOTES: PatchNote[] = [
  {
    version: 'v1.2.0',
    date: '2026-08-13',
    changes: [
      '🐛 [버그] 로비 복귀 시 크레딧 UI가 즉시 갱신되지 않던 문제 수정',
      '⚖️ [경제] 크레딧 획득량 하향 · 강화 비용 지수 곡선(×1.5)',
      '✨ [신규] 블랙마켓 럭키박스 · 극한 강화(오버클럭 / 초경량 장갑)',
      '📝 [UI] 격납고에서 패치 노트를 볼 수 있습니다',
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-08-13',
    changes: [
      '🎨 [시각] 적 위험도(데미지) 색상 표준화 · 보스 탄막 흰 코어/보라 테두리',
      '💄 [UI] Tier 3 없을 때 퀀텀 큐브 크래프팅 프리뷰 안내',
    ],
  },
];

export const LATEST_VERSION = PATCH_NOTES[0]?.version ?? 'v0.0.0';
