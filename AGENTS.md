# CardioLab 공동 작업 규칙

이 파일이 Codex와 Claude Code의 공통 규칙 원본이다. `CLAUDE.md`는 이 파일을 가져온다.

## 범위와 보존

- 교육용 3D Heart Visualizer의 개발 환경이다. 임상용 제품이나 검증된 생리 시뮬레이터로 표현하지 않는다.
- 작업 전에 현재 파일과 `git status`를 확인한다. 사용자 변경을 덮어쓰거나 reset/clean 하지 않는다.
- 기존 Blender GUI 장면을 먼저 읽고 저장 상태를 확인한다. 재현 가능한 작업은 `blender/scripts/`에 기록한다.
- 배경 생성은 `npm run blender:build`를 사용한다. 이 명령은 별도 Blender 프로세스와 소유 장면만 다룬다.
- 전역 Codex/Claude 설정을 덮어쓰지 않는다. 비밀키·환자 정보·다운로드한 미검증 자산을 커밋하지 않는다.

## Blender 단일 제어

- 두 클라이언트는 `scripts/blender-mcp.py`를 통해서만 동일한 localhost:9876에 연결한다.
- 하나가 MCP 서버를 보유하면 다른 클라이언트는 연결을 해제한 상태로 코드를 작업한다. 다른 앱에서 직접 `uvx` 서버를 켜지 않는다.
- 이전 소유자가 저장·내보내기·변경 내용을 기록하고 MCP를 중지한 뒤 다음 소유자가 연결한다.
- 잠금 파일을 지워서 우회하지 않는다. 정상 종료는 잠금을 자동 해제한다. 강제 종료 후에는 자식 서버가 남았는지도 확인한다.
- 동시에 두 Blender 버전에서 9876을 열지 않는다. 기준은 Blender 4.5 LTS다.
- MCP에는 Python 실행 권한이 있다. 로컬 루프백만 사용하며 작업에 필요한 코드만 실행한다.

## 모델 계약과 검수

- 기본 도식은 `src/data/heart-demo.json`; 구조 ID는 RA/LA/RV/LV다. 좌표는 웹에서 Y-up, Blender에서 Z-up으로 변환한다.
- 구체 모델은 해부학적으로 부정확하며 검수 전이다. 위치·크기·색·관계에 의학적 의미를 추가하지 않는다.
- 실제 자산은 `assets/manifest.json`에 출처·저작자·라이선스 증거·변경 이력·해시·검수자를 기록한다.
- `docs/anatomy-and-licensing.md`의 전문가 검수와 배포 권리 확인이 끝나기 전에는 `approved`로 바꾸지 않는다.
- AI 생성이나 자동 테스트만으로 해부학적 정확성을 보장할 수 없다. 판막·혈관·벽·관상혈관·생리 데이터는 별도 검증한다.

## 완료 기준

- `npm run check`, bpy 변경 시 `npm run blender:check` 후 `npm run verify:assets`.
- 화면 동작은 브라우저에서 선택·숨김·불투명도·회전·확대·초기화를 확인한다.
- `npm run verify:release`는 현재 도식에서 실패해야 한다. 이 실패를 우회하여 교육 배포 승인을 주장하지 않는다.
- 결과 보고에서 실행 성공, 실행하지 못한 검증, GUI 작업, 전문가 검수를 구분한다.
