# 자체 제작 심장 시각화 초안 v1

- 제작일: 2026-10-15 (Asia/Seoul)
- 제작: cardio-simulator 프로젝트, 사용자 요청에 따른 Codex 보조 프로시저 모델링.
- 원본: `blender/scripts/build_procedural.py`, `src/data/heart-procedural.json`.
- 제작 방식: 직접 작성한 단면 좌표·곡선 제어점·메시 연결·단색 PBR 재질.
- 외부 모델, 스캔, 사진, 텍스처, HDRI, AI 3D 생성 서비스 및 환자 데이터: 사용하지 않음.
- 결과물: `blender/generated/heart-procedural.blend`, `public/models/heart-procedural.glb`.
- 변경 이력: v1 — 외피 1개, 개별 내부 면과 상단 개구부를 가진 네 방, 주요 혈관 13개 생성.

명칭과 일반적 연결 관계를 확인하기 위해 다음의 **설명 텍스트**를 참고했습니다.
해당 사이트의 이미지·영상·모델은 다운로드·추적·변환·포함하지 않았습니다.

- [NHLBI: What the Heart Looks Like](https://www.nhlbi.nih.gov/health/heart/anatomy)
- [NHLBI: How Blood Flows through the Heart](https://www.nhlbi.nih.gov/health/heart/blood-flow)

모든 형상 수치는 이 프로젝트에서 정한 임의 값입니다. 특정 자료의 형상 복원이나 환자별 재구성이 아닙니다.
혈관 접합부는 겹쳐 배치한 시각적 연결이며 연속 내강이나 혈류 영역이 아닙니다.
판막·중격·관상혈관·검증된 벽층·생리 데이터는 구현하지 않았습니다.

`LicenseRef-Project-Internal`은 내부 관리용 식별자입니다. 외부 자산이 없다는 기록은
독점적 저작권이나 법적 무위험을 보증하지 않습니다. 인간의 설계·수정 기록을 보존하고,
프로젝트 소유자가 배포 라이선스를 결정한 뒤 권리 검토를 받아야 합니다.
해부학 검수자·권리 승인자: 미지정. 승인 상태는 `unreviewed` / `internal-only`입니다.
