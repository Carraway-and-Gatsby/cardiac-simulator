# Blender GUI 및 Codex MCP 연결 확인

확인일: 2026-10-15, Asia/Seoul

## 최신 상태 — 도식 검토와 잠금 테스트 수정 완료

2026-10-15 12:21 KST 기준, 원래 GUI `Scene`으로 복원했고 Codex MCP 연결은 정상 종료했습니다.
GUI 서버 PID `39691`은 계속 `127.0.0.1:9876`에서 LISTEN하며, 운영 잠금은 현재 사용 가능 상태입니다.
잠금 파일과 운영 코드는 그대로 유지했습니다. 아래 직접 호출 당시의 연결 유지 기록은 과거 상태입니다.

- 기존 미저장 장면을 `.local/inspection/20261015-121715-cc7d8dc4/original-scene.blend`에 사본으로 보존.
- 생성 파일의 장면만 임시 링크하여 네 구조를 확인한 후 제거. 원래 객체·형상·변환·선택·활성 장면이 일치하고
  `filepath=""`, `is_saved=false`, `is_dirty=false`, 추가 라이브러리 없음으로 복원.
- `mcp__blender__look`으로 정면과 사선 화면 확인. 평가 완료된 좌표·크기와 재질 색을 공통 JSON과 대조하여 통과.
  임시 링크 직후 원본 객체의 캐시된 크기가 갱신 전 값으로 나타나, 검사 스크립트는 명시적으로 장면을 평가한 객체를 검증함.

| ID | Blender 위치 (X, Y, Z) | 크기 (X, Y, Z) | 공통 색 |
|---|---|---|---|
| RA | (-0.8, 0, 0.8) | (1.3, 1.1, 1.2) | #58b9df |
| LA | (0.75, 0.25, 0.85) | (1.2, 1.0, 1.1) | #f79da5 |
| RV | (-0.65, -0.2, -0.5) | (1.4, 1.3, 1.9) | #427ed2 |
| LV | (0.65, 0, -0.65) | (1.5, 1.3, 2.2) | #de637c |

이 수치는 개발 도식의 임의 단위이며 의학적 크기나 위치를 의미하지 않습니다.

`npm run check`는 테스트 경로 분리 후 **실제 MCP가 연결된 상태에서 전체 통과**했습니다.
운영 잠금은 그대로여서 동시에 요청한 배경 검사는 종료 코드 75로 차단되었습니다.
이후 이 채팅의 MCP 실행기와 자식 프로세스를 정상 종료하고 `npm run blender:check`를 실행하여 통과했으며,
후속 `npm run verify:assets`도 통과했습니다. 격리 환경의 Blender 시작 실패는 일반 로컬 권한 재실행으로 해결했고,
배경 검사에서 현재 파일을 자기 자신에게 링크할 수 없는 제약은 검사 전용 임시 복사본으로 해결했습니다.

웹에서 선택·숨김·불투명도·회전·확대·초기화를 모두 확인했습니다. 웹은 같은 JSON으로 그린 도식이며 GLB 로더 검증은 아닙니다.
`verify:release`는 기존 미승인 상태 때문에 예상대로 실패했습니다. 전문가 검수는 수행하지 않았습니다.
백업, 복원 증거와 변경 파일은 [인계 문서](handoff.md)에 기록했습니다.

## 프로젝트 채팅의 네이티브 MCP 직접 호출 — 성공

2026-10-15, cardio-simulator 프로젝트에서 시작한 Codex 채팅
`01a13d7c-9fa4-79b3-80be-1a8a7c9ae31a`에서 등록된 Blender MCP 도구를 직접 호출했습니다.
아래 결과는 외부 검사 스크립트의 재사용이나 추정이 아니라 이 채팅의 실제 도구 응답입니다.

1. `mcp__blender__get_addon_status({})`: 성공 (`isError: false`).
   응답의 주요 필드: `blender_version: "4.5.12 LTS"`, `addon_version: [1, 8]`,
   `protocol_version: 13`, `expected_protocol_version: 13`, `up_to_date: true`,
   `source: "native"`, `warning: null`, `telemetry_consent: false`.
   자산 라이브러리 및 생성기는 모두 off로 보고되었습니다.
2. `mcp__blender__get_scene_info`에 아래 인수를 전달: 성공 (`isError: false`).

```json
{"fields":["location","size","children","hidden","settings"],"limit":20}
```

실제 장면 응답 원문:

```text
Scene 'Scene' | 1 camera, 1 light, 1 mesh | active Cube | selected none | mode OBJECT
(unsaved) | engine BLENDER_EEVEE_NEXT | frames 1-250 (now 1) at 24 fps | 1920x1080 | camera Camera | HDRI none | unit scale 1.0

Showing 3 of 3 (name | type | location | size | hidden | children):
Cube | mesh | at (0.0, 0.0, 0.0) | size 2.0x2.0x2.0
Light | light | at (4.08, 1.01, 5.9)
Camera | camera | at (7.36, -6.93, 4.96)
```

장면 이름은 `Scene`, 저장 상태는 `(unsaved)`입니다. 위치와 Cube 크기는 위 응답 그대로이며
Light와 Camera의 크기는 도구가 반환하지 않았습니다. GUI 장면 수정·저장·삭제·교체 및 Python 실행은 하지 않았습니다.
생성된 심장 도식 `.blend`도 열지 않았습니다.

### 직접 호출 당시 연결 소유 상태

2026-10-15 12:05:41 KST 프로세스 확인 기준:

- 소유 클라이언트: 이 프로젝트의 Codex MCP 연결. 이번 조회 후에도 연결을 유지했으며 중지하지 않았습니다.
- Codex 프로세스 PID `66125` → 공통 실행기 `scripts/blender-mcp.py` PID `43607`
  → uvx PID `43649` → `mcp-for-blender` PID `43803`.
- 잠금: `/var/folders/nl/3wywyss147lfn48dgg4cxb4h0000gn/T/cardiolab-blender-501-9876.lock`,
  내용 `pid=43607`. 실행기의 열린 파일에서도 같은 잠금 파일을 확인했습니다.
- Blender GUI PID `39691`: `127.0.0.1:9876` LISTEN.
- MCP 서버 PID `43803`: `127.0.0.1:59804` → `127.0.0.1:9876` ESTABLISHED.
- Claude 및 별도 검사 MCP 클라이언트를 시작하지 않았고, 잠금 삭제나 프로세스 종료도 하지 않았습니다.

PID와 연결 상태는 이 시점의 관측값입니다. 다음 소유자는 상태를 다시 확인해야 합니다.
Codex 연결을 정상 중지하고 실행기와 자식 서버의 종료를 확인한 뒤에만 Claude나 검사 클라이언트가 연결합니다.
잠금 파일은 정상 종료 후에도 남을 수 있으므로 파일 존재나 기록된 PID만으로 활성 소유권을 판단하거나 삭제하지 않습니다.

### 직접 호출만 수행한 단계의 프로젝트 검증 (수정 전 이력)

- `npm run check`: **전체 통과 아님**. `verify:assets`와 `verify:config`는 통과했지만,
  잠금 테스트가 현재 Codex MCP 연결이 보유한 잠금을 획득하지 못해 `Blender is in use`로 실패했습니다.
  테스트는 실제 공통 잠금을 사용하므로 MCP 연결을 정상 중지한 이후 전체 검사를 다시 실행해야 합니다.
  잠금을 우회하거나 테스트를 수정하지 않았습니다.
- `npm run build`: 별도 실행 성공. 타입 검사 및 Vite 빌드 통과; 기존 번들 크기 경고 있음.
- `npm run verify:release`: **예상된 실패**. 배포 권리·해부학 검수·현재 해시를 포함하는 검수·서명된 증거 미승인.
- 이번 변경은 이 문서와 `docs/handoff.md` 기록뿐입니다. bpy 코드 변경이 없어 `blender:check`는 재실행하지 않았고,
  웹 화면 변경이 없어 브라우저 동작 검증도 반복하지 않았습니다. 이전 검증 이력은 `docs/setup-status.md`에 있습니다.
- 전문가 해부학 검수와 배포 권리 승인은 수행하지 않았으며 도식의 미검수 상태를 유지합니다.

## 이전 세션의 GUI 설정 및 스크립트 검증

- Blender 4.5.12 LTS의 Preferences → Add-ons에서 MCP for Blender 활성화.
- Auto-Save Preferences가 켜진 것을 확인하고 Save Preferences도 실행.
- 사이드바에 `Connected on port 9876` 표시 확인. 실제 리스너도 `127.0.0.1:9876`으로 확인.
- `codex mcp get blender --json`: cardio-simulator 프로젝트 설정의 서버가 enabled이며 공통 실행기 경로가 정확함.
- `npm run mcp:probe`: GUI 애드온에 읽기 전용 장면 조회 성공.
- `npm run mcp:check -- --scene`: 같은 MCP 실행기로 initialize → tools/list → tools/call(get_scene_info) 성공.
- 기존 장면의 객체·형상·파일은 수정하지 않음. 검증용 MCP 프로세스는 정상 종료했고 Blender GUI 서버는 켜둠.

## 이전 스크립트의 실제 장면 응답

```text
Scene 'Scene' | 1 camera, 1 light, 1 mesh | active Cube | selected none | mode OBJECT
(unsaved) | engine BLENDER_EEVEE_NEXT | frames 1-250 (now 1) at 24 fps
1920x1080 | camera Camera | HDRI none | unit scale 1.0

Cube   | mesh   | at (0.0, 0.0, 0.0)    | size 2.0x2.0x2.0
Light  | light  | at (4.08, 1.01, 5.9)
Camera | camera | at (7.36, -6.93, 4.96)
```

현재 GUI는 기본 장면이며 심장 도식 파일을 열거나 덮어쓰지 않았습니다.
새로 추가한 `--scene` 옵션으로 이후에도 실제 MCP 장면 조회를 반복할 수 있습니다.

## 이전 Codex 세션의 검증 범위

Codex의 프로젝트 설정 인식 및 **등록된 동일 실행기를 통한 실제 MCP 통신과 장면 조회**를 확인했습니다.
이전 채팅은 프로젝트 밖의 Documents/Codex 폴더에서 시작되었으며, 그 채팅의 기본 도구 목록에는 Blender가 없었습니다.
따라서 이전 검증을 네이티브 `mcp__blender__get_scene_info` 도구의 직접 호출로 기록하지 않습니다.
이후 이 프로젝트에서 시작한 새 채팅의 직접 호출은 문서 상단에 별도로 기록했습니다.
전역 설정에 중복 서버를 추가하지 않았습니다.

Claude Code의 최초 MCP 승인은 이번 작업 범위에서 진행하지 않았습니다.
Codex와 Claude를 동시에 같은 Blender 서버에 연결하지 마세요.

## 버전 표기

PyPI 서버 패키지는 `mcp-for-blender 2.1.9`입니다. 그 공식 패키지에 포함된 애드온의 Blender UI 표기는 **1.8**,
연결 프로토콜은 **13**입니다. 서버가 호환 버전으로 인식하는 것을 확인했으며 서로 다른 버전 번호 체계입니다.

관련 명령:

```bash
cd /path/to/cardio-simulator
codex mcp get blender --json
npm run mcp:probe
npm run mcp:check -- --scene
```

두 검사 명령은 다른 MCP 클라이언트가 잠금을 보유하지 않은 상태에서 실행합니다.
