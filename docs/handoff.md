# Blender 작업 인계

## 2026-10-23 심장·판막 애니메이션 — 웹 표시 변형

- 작업 전 코드·문서를 `.local/before-cardiac-motion/`에 보존했다. `src/motion/`의 순수 변형 모델과 상대 morph geometry, `AnimatedValves.tsx`의 재구성 판엽, 공통 시간/혈류 연동을 추가했다. 원본 형상은 움직임 끄기로 비교한다.
- `npm run mcp:check -- --scene` 조회는 다른 클라이언트 잠금 때문에 차단되어 현재 GUI 장면·저장 상태를 확인하지 못했다. 잠금 우회·삭제·기존 연결 종료를 하지 않았다.
- GUI 편집·저장·내보내기, bpy/GLB/manifest 수정 없음. `blender:build`/`blender:check`는 재실행하지 않았다. 기존 Blender 4.5 LTS CLI 경로와 공통 실행기를 유지한다.
- HRA GLB SHA-256 `d0d261297693ed432727d0ea6cc2313eaa43500abe79a7d3ab63ed96dd5f29ce` 및 기존 생리 엔진을 보존했다. 자동·브라우저 검증은 통과했고 배포 승인 게이트는 실패 상태를 유지한다. 전문가 검수는 수행하지 않았다.
- [심장·판막 검증](cardiac-motion-validation.md)에 57개 검사·브라우저 결과·표시 한계를 기록했다. 증거는 `.local/motion-evidence/`에 있으며 개발 서버 `127.0.0.1:5173`을 유지했다.

## 2026-10-23 혈류 애니메이션 — Blender 자산 변경 없음

- 기존 파일을 `.local/before-blood-flow/`에 보존하고 WebGL 입자·12개 교육용 경로를 추가했다. 그래프와 같은 0D 유량·재생 시점을 사용하며 부호 있는 적분으로 역류와 반복 주기 이동을 표현한다.
- 작업 전 공통 실행기 `npm run mcp:check -- --scene` 조회는 다른 클라이언트의 잠금으로 차단되었다. 잠금을 삭제하거나 소유 연결을 종료하지 않았고 현재 GUI 장면·저장 상태는 확인하지 못했다.
- GUI 수정·저장·내보내기, bpy/GLB/manifest 변경 없음. 따라서 `blender:build`와 `blender:check`는 재실행하지 않았다. 설치된 CLI는 기존 프로젝트 명령으로 사용할 수 있다.
- HRA GLB SHA-256은 `d0d261297693ed432727d0ea6cc2313eaa43500abe79a7d3ab63ed96dd5f29ce`로 유지된다. 전문가 검수·실측 유동 비교·배포 승인은 수행하지 않았다.
- 상세 실행·브라우저 검수는 [혈류 검증 기록](blood-flow-validation.md), 화면 증거는 `.local/flow-evidence/`를 참조한다.


## 2026-10-23 HRA 원본 아틀라스 도입 — 최신 상태

- 작업 전 `.local/before-source-anatomy/`에 코드·문서·Blender/manifest 사본을 보존했다. 원본 다운로드는 `.local/anatomy-sources/hra/`, 웹 출력은 `public/models/heart-hra.glb`, 마스터는 `blender/generated/heart-hra.blend`이다.
- `build_all.py`와 `validate_all.py`에 HRA 단계 추가. 소유 장면은 `CardioLab_HRA`이며 기존 두 소유 장면 생성도 유지한다. 새 원본 획득·변환·검사·비교 테스트와 UI는 README/ANATOMICAL_VALIDATION.md를 참조한다.
- 생성 성공: 44개 원본 구조, 267,342개 출력 삼각형, 중복 인덱스 면 18개 제거만 허용, 좌표 변화 0. HRA SHA-256 `d0d261297693ed432727d0ea6cc2313eaa43500abe79a7d3ab63ed96dd5f29ce`.
- 최종 `blender:check`, `verify:assets`, `check` 통과. `verify:release`는 세 자산 모두 미승인으로 예상 실패. 전문가 검수와 정답 영상 비교는 수행하지 않았다.
- 기존 procedural GLB 해시는 유지된다. 공통 재생성으로 schematic GLB 해시는 `829a7cb5bdb728e936b0872b5d89ca33a1dcfcd57210bcf769d6adac09761213`로 바뀌었지만 이전 사본과 JSON/정점 속성/방향 있는 삼각형 집합은 동일하며 인덱스 순서만 달랐다. 원래 두 생성 스크립트·명세와 생리 엔진은 변경하지 않았다.
- 14:55:10 / 15:17:46 KST에 공통 실행기 `npm run mcp:check -- --scene`으로 GUI를 읽었다. 저장되지 않은 기본 Scene, Cube/Camera/Light, 설정·좌표 동일. GUI 편집·저장·내보내기 없음; 생성/검사는 별도 Blender 4.5.12 LTS 프로세스에서 수행했다.
- 닫힌 이 채팅의 MCP bridge PID 28646을 SIGTERM으로 정상 종료한 뒤 공통 실행기로 읽기 확인했다. 종료 후 bridge/자식 서버 없음; Blender GUI PID31268만 127.0.0.1:9876 LISTEN, ESTABLISHED 연결 없음. 잠금 파일 삭제·우회 없음. 현재 MCP 소유자 없음. 다음 소유자는 연결 전 현 상태를 다시 읽을 것.
- 웹 브라우저의 실제 렌더·조작 증거는 `.local/anatomy-evidence/`와 `docs/anatomy-render-evidence.json`. 기존 localhost:5173 개발 서버를 유지했다. 실제 소스 메시에는 원본 결함 835개 면적0 삼각형·명칭 충돌이 남고, 실물 사진 수준/건삭/지방/검증된 벽 두께/운동은 미완료다.

아래는 이전 작업 기록이다. 현재 기본 자산은 정적 HRA 아틀라스이며, 웹에는 위의 교육용 표시 변형이 적용된다.

## 2026-10-23 생리 계산·웹 통합 — Blender 자산 변경 없음

- 이번 작업에서 기존 GUI 장면·저장 상태를 MCP로 읽으려 했으나 연결할 수 없었습니다. 이전의 미저장 기본 장면 기록을 현재 상태로 간주하지 않습니다.
- GUI 수정·저장·내보내기와 bpy/GLB/manifest 변경 없음. 계산 엔진과 웹 UI만 확장했고, 자세한 결과는 [구현 기록](implementation-status.md)에 있습니다.
- 이 채팅의 MCP 실행기 PID 18960에 SIGTERM으로 정상 종료를 요청했고 자식 19000/19149도 종료 확인했습니다. 기존 잠금 파일 inode 65814550을 유지한 채 비차단 획득·반납이 성공했습니다. 현재 작업 소유자는 없습니다.
- `blender:check`는 bpy 변경이 없어 실행하지 않았고, 자산 무결성 검사는 통과했습니다. 전문가 검수·배포 승인은 수행하지 않았습니다.
- 아래 기록은 2026-10-15의 과거 관측값입니다. 다음 Blender 작업 전에 현재 GUI 저장 상태를 다시 확인해야 합니다.

- 현재 소유자: 없음 (2026-10-15 12:50 KST 확인). 공통 잠금 아래 배경 생성·검사와 읽기 전용 MCP 조회를 마쳤고, 정상 종료 후 잠금이 해제된 상태를 확인함.
- 기준 Blender: 4.5.12 LTS
- 기준 MCP: 2.1.9
- 생성 스크립트: `blender/scripts/build_all.py` → `build_demo.py`, `build_procedural.py`
- 생성 장면: `CardioLab_Schematic`, `CardioLab_Procedural`
- 최근 출력: `blender/generated/heart-procedural.blend`, `public/models/heart-procedural.glb` 및 기존 도식 파일
- 모델 상태: 자체 제작 외형·네 방·혈관 초안 및 기존 도식, 모두 해부학 미검수·내부 사용만
- 현재 GUI 장면: 저장되지 않은 기본 `Scene`. 생성 장면을 임시 링크하여 확인한 뒤 원래 장면으로 복원함. `is_saved=false`, `is_dirty=false`, 객체는 Camera/Cube/Light, 추가 라이브러리 없음.
- 다음 작업: Codex 또는 Claude 중 하나만 공통 실행기로 MCP에 연결. GUI 서버는 `127.0.0.1:9876`에서 계속 수신 중. 소유권 인계 전 연결 상태를 다시 확인.

## 2026-10-15 자체 제작 모델과 웹 연결 — 완료

- 외부 모델·텍스처·HDRI 없이 직접 작성한 단면·곡선 제어점으로 외형, 네 방, 주요 혈관 13개를 생성함.
  네 방과 혈관은 내벽과 입구를 가진 독립 메시이며, 혈관 접합부는 시각적 겹침임.
  연속 관강·판막·중격·관상혈관·검증된 벽층·생리 기능은 구현하지 않음.
- 명칭과 일반 연결 관계에 NHLBI 설명 텍스트만 참고. 외부 이미지·영상·모델은 가져오지 않음.
  출처와 변경 이력은 `assets/licenses/heart-procedural.md`, `assets/manifest.json`에 기록.
- 작업 시작 전 12:30:54, 종료 후 12:49:41 KST에 `npm run mcp:check -- --scene`으로 읽기 조회.
  이 조회는 공통 실행기를 거치는 실제 MCP 프로토콜 검사이며 채팅의 네이티브 도구 직접 호출과는 구분함.
  기존 미저장 `Scene`, Cube/Light/Camera, 활성 Cube, 선택 없음, 좌표·크기·프레임·렌더 설정이 동일함.
  이번에는 GUI 장면을 전환·저장·수정하지 않았고, 생성은 별도 background Blender 4.5.12 LTS에서 수행함.
- `npm run blender:build` 통과. `npm run blender:check` 최종 통과(12:49:30):
  기존 도식 검사, 반복 생성, 다른 장면 객체 보존, 18개 구조 ID, 유한 좌표·양의 면적,
  폐합된 벽 메시, GLB 재수입 후 ID/크기/월드 경계 일치, 이미지·텍스처·외부 버퍼 없음 확인.
  자동 검사 보고서: `blender/generated/heart-procedural.report.json`.
- `npm run check` 통과: 자산 검사, 설정 일치, 경쟁 잠금 테스트, 타입 검사, 웹 빌드.
  최종 재생성 뒤 `npm run verify:assets` 통과. 빌드된 GLB와 포함된 해시도 최종 manifest와 일치.
  `npm run verify:release`는 두 자산 모두 검수·권리·검수 해시·서명 증거 미승인으로 예상대로 실패.
- 웹은 구체를 다시 그리는 방식에서 실제 GLB 로딩으로 변경. 외형/네 방/겹쳐 보기,
  모델 클릭 및 목록 선택, 개별 표시/숨김, 혈관 일괄 표시/숨김, 불투명도, 회전·확대·초기화 확인.
  390px 화면에서 모델과 제어판의 세로 배치 확인. 실제 모바일 기기·전체 브라우저 검사는 수행하지 않음.
  최종 새로고침 후 콘솔 오류 없음. 기존 THREE.Clock 경고와 약 1.24 MB JS 번들 크기 경고는 남음.
- 웹 확인 주소: `http://127.0.0.1:5173/`. 기존 개발 서버를 유지하며 브라우저 결과 탭을 남김.
  화면 증거: `.local/inspection/procedural-v1/surface.png`, `chambers.png`, `mobile.png`.
- 최종 GLB: 1,109,976 bytes, SHA-256 `63ae800d1bdd2452e82db893e7979248b44badabbcac418a05da34382caa2002`.
  `unreviewed` / `internal-only`, 검수자와 승인 증거는 미지정. 전문가 검수와 배포 권리 검토는 수행하지 않음.
- 최종 연결: GUI PID `39691`만 `127.0.0.1:9876` LISTEN. MCP 실행기·자식 서버·연결 없음.
  잠금 inode `29661583` 유지, 비차단 획득/반납 성공. 운영 잠금 파일·실행기·클라이언트 설정은 변경하지 않음.

## 2026-10-15 도식 확인 및 테스트 충돌 해결 — 완료

- GUI 원본 백업: `.local/inspection/20261015-121715-cc7d8dc4/original-scene.blend`.
  `copy=True`로 사본만 저장하여 현재 파일 경로와 미저장 상태를 유지함.
  SHA-256: `022399a9b1c222a10d4b834a0c7f358e6876b62d2463949866359f5bfd2b3c04`.
- `blender/scripts/inspect_demo.py`로 생성 파일의 `CardioLab_Schematic`만 임시 링크하여 확인.
  RA/LA/RV/LV의 ID, Y-up→Z-up 좌표, 스케일, 크기, 재질 색이 공통 JSON과 일치.
  네 객체 각각 정점 1,490개, 면 1,536개. MCP `look`으로 정면·사선 화면 확인.
- 임시 라이브러리 제거 후 원래 장면·객체 포인터·변환·형상 해시·선택·활성 객체·프레임·파일 상태 일치 확인.
  `restoration.json`의 `preserved=true`, `dirty_before=false`, `dirty_after=false`.
  검사 JSON과 복원 증거는 위 백업과 같은 폴더에 있으며 `.local/`은 Git 제외 대상.
- `tests/test_blender_lock.py`에서 부모·자식 테스트 프로세스의 임시 경로만 동일한 전용 디렉터리로 지정.
  운영용 `scripts/blender-lock.py`, MCP 실행기, 두 클라이언트 설정은 변경하지 않음.
  경쟁 프로세스 거부, 소유자 내용/파일 inode 보존, 정상 종료 후 재획득을 검사.
- 실제 MCP PID `43607`이 운영 잠금을 가진 상태에서 `npm run check` 전체 통과.
  같은 상태에서 `npm run blender:check`는 종료 코드 75로 정상 차단되어 운영 단일 제어가 유지됨을 확인.
- GUI 복원 확인 후 이 채팅의 실행기 PID `43607`에 SIGTERM을 전달하여 정상 종료.
  uvx `43649`와 MCP 자식 `43803`도 종료 확인. 다른 클라이언트를 시작하거나 잠금 파일을 삭제하지 않음.
- 이어서 `npm run blender:check` 통과: 반복 생성, 기존 Cube 보존, GLB 재수입 ID/좌표,
  새 검사 스크립트의 임시 라이브러리 제거와 원래 장면 복원까지 검증.
  생성 `.blend`/GLB가 재생성되었으며 후속 `npm run verify:assets` 통과.
- 브라우저에서 버튼/모델 클릭 선택, 숨김, 불투명도 50%, 회전, 확대, 초기화(LV·전체 표시·88%·기본 시점) 확인.
  웹은 GLB 로더가 아니라 같은 JSON을 사용하는 도식임. 콘솔 오류 없음; 기존 `THREE.Clock` 경고 있음.
  화면 기록: `.local/inspection/evidence/web-verified.jpg`.
  이번 검증용 브라우저 탭과 임시 웹 서버(5174)는 정리했으며 기존 서버(5173)는 변경하지 않음.
- `npm run verify:release`는 검수·배포 권리·현재 해시를 포함한 검수·서명 증거 미승인으로 예상대로 실패.
  전문가 검수는 수행하지 않았으며 해부학 검수 상태는 `unreviewed` 유지.
- 마지막 상태: Blender GUI PID `39691`만 9876에서 LISTEN. MCP 연결 없음.
  운영 잠금 inode `29661583` 유지, 비차단 잠금 획득/반납으로 사용 가능 상태 확인.

아래 내용은 위 후속 작업 이전의 직접 호출 검증 이력입니다.

## 2026-10-15 네이티브 도구 직접 호출 확인

- 이 프로젝트 채팅에서 `mcp__blender__get_addon_status({})` 직접 호출 성공:
  Blender `4.5.12 LTS`, 애드온 `[1, 8]`, 프로토콜/기대 프로토콜 `13`, `up_to_date: true`,
  `source: "native"`, `warning: null`, `telemetry_consent: false`.
- `mcp__blender__get_scene_info({"fields":["location","size","children","hidden","settings"],"limit":20})`
  직접 호출 성공. 실제 응답:

```text
Scene 'Scene' | 1 camera, 1 light, 1 mesh | active Cube | selected none | mode OBJECT
(unsaved) | engine BLENDER_EEVEE_NEXT | frames 1-250 (now 1) at 24 fps | 1920x1080 | camera Camera | HDRI none | unit scale 1.0

Showing 3 of 3 (name | type | location | size | hidden | children):
Cube | mesh | at (0.0, 0.0, 0.0) | size 2.0x2.0x2.0
Light | light | at (4.08, 1.01, 5.9)
Camera | camera | at (7.36, -6.93, 4.96)
```

- Light와 Camera의 크기는 응답에 없음. GUI 수정·저장·내보내기·삭제·교체는 하지 않았으며 변경한 코드나 bpy 스크립트도 없음.
- 현재 연결: Codex PID `66125` → 잠금 실행기 PID `43607` → uvx PID `43649` → MCP 서버 PID `43803`.
  잠금 내용은 `pid=43607`, 실행기가 잠금 파일을 열고 있음을 확인.
  Blender PID `39691`이 `127.0.0.1:9876`에서 수신 중이며 MCP 서버의 루프백 연결도 ESTABLISHED로 확인.
- MCP 중지 여부: **중지하지 않음**. 이전 세션의 검사 스크립트 프로세스가 종료된 것과 현재 Codex 연결을 구분해야 함.
  다른 클라이언트를 연결하기 전 현재 실행기와 자식 서버의 정상 종료를 확인할 것. 잠금 파일은 삭제하지 않을 것.
- 이전 `npm run mcp:probe` / `npm run mcp:check -- --scene` 성공은 외부 스크립트 검증이며,
  이번 성공은 채팅에 노출된 실제 도구의 직접 호출임. 자세한 이력과 소유권 정보는 [GUI 연결 결과](gui-connection-status.md) 참고.
- 이번 검증: `npm run check` 중 자산 무결성·설정 일치는 통과, 잠금 테스트는 현재 Codex MCP 소유 잠금 때문에 실패.
  `npm run build`는 별도 실행하여 타입 검사·빌드 통과 (기존 번들 크기 경고).
  `npm run verify:release`는 검수·권리·해시·서명 증거 미승인으로 예상대로 실패.
  다음 소유권 인계 시 MCP를 정상 중지한 뒤 `npm run check`를 다시 실행할 것.
- 문서만 변경. `blender:check`와 브라우저 동작 검증은 이번에 재실행하지 않았으며 전문가 검수도 수행하지 않음.

인계 시 소유자, 저장 경로, 변경한 스크립트, 실행한 검증, 알려진 문제, MCP 중지 여부를 갱신합니다.
