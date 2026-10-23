# cardio-simulator 초기 환경 설정 결과

> 최신 후속 작업: 외부 자산 없이 외형·네 방·주요 혈관을 제작하고 실제 GLB 웹 표시와 검증을 완료했습니다. 현재 장면·잠금·검증 결과는 [인계 기록](handoff.md)을 참고하세요. GUI 연결 이력은 [GUI 연결 결과](gui-connection-status.md)에 있으며, 아래 표는 최초 설정 시점 기록입니다.

설정일: 2026-10-15 (Asia/Seoul)

대상: `/path/to/cardio-simulator`

## 초기 상태와 보존

Codex Desktop의 저장된 프로젝트 목록에서 실제 경로를 확인했습니다. 최초 폴더는 비어 있었고 Git 저장소도 없었습니다.
상위 경로의 적용 가능한 AGENTS.md/CLAUDE.md가 없었으며, 기존 사용자 Codex/Claude 설정에 Blender 서버도 없었습니다.
새 파일만 추가했고 로컬 Git을 main 브랜치로 초기화했습니다. 커밋·원격 저장소·외부 배포는 만들지 않았습니다.
기존 전역 Codex/Claude MCP 설정과 Blender GUI 환경설정은 보존했습니다.

## 실제 수행한 작업

- Homebrew로 uv 0.13.1 설치. Homebrew의 기본 메타데이터 갱신도 수행되었습니다.
- 공식 PyPI의 `mcp-for-blender 2.1.9` 및 Python 3.11 관리 런타임을 사용하는 uv 실행 환경 준비.
- Blender 4.5용 `blender_mcp.py` 설치. 공식 wheel 안의 파일과 SHA-256이 일치함을 확인.
- Codex `.codex/config.toml`과 Claude Code `.mcp.json`에 같은 잠금 실행기 등록.
- `AGENTS.md` 및 `@AGENTS.md`를 가져오는 `CLAUDE.md` 작성.
- React 19.3.1 / React Three Fiber 9.8.2 / Drei 10.7.9 / Three.js 0.186.1 / TypeScript 7.0.2 / Vite 8.3.4 설치 및 npm lockfile 생성.
- 구조 선택·숨김·불투명도·회전·확대·초기화를 제공하는 개발용 3D 도식 화면 구현.
- 공통 JSON 기반 bpy 생성 스크립트, .blend/GLB 내보내기, 보존 및 재수입 검사 추가.
- 자산 출처·권리·해시·검수 manifest, 의존성 라이선스 목록, 전문가 검수 및 인계 문서 작성.
- 모델 재생성 시 검수 승인을 초기화하고, 배포 검사에서 승인 대상 해시가 현재 자산과 일치하는지도 확인하도록 구성.

## 실제 검증 결과

| 검사 | 결과 |
|---|---|
| `npm ci` | 성공, 설치 시 npm 보안 감사에 보고된 취약점 0개 |
| `npm run check` | 자산 무결성·설정 일치·동시 잠금·타입 검사·빌드 통과 |
| `npm run blender:check` | Blender 4.5.12 LTS에서 두 번 생성, 기존 Cube 보존, GLB의 정확한 구조 ID 4개와 좌표 재수입 확인 |
| `npm run verify:assets` | 최종 GLB 해시와 등록 정보 확인 |
| `npm run mcp:check` | 실제 STDIO 초기화 성공, `get_scene_info` / `execute_blender_code` 포함 도구 9개 확인 |
| 설치 애드온 배경 등록/해제 | Blender 4.5.12에서 성공, 환경설정 저장 없이 종료 |
| `codex mcp get blender --json` | 프로젝트 서버 enabled 및 공통 실행기 경로 확인 |
| `claude mcp get blender` | Project scope 인식, **Pending approval** |
| `npm run mcp:probe` | **Connection refused** — GUI 애드온이 아직 실행되지 않음 |
| `npm run verify:release` | **예상된 실패** — 해부학 검수·배포 권리·검수 해시·증거 미승인 |
| `npm run licenses` | lockfile 128개 항목(현재 플랫폼 설치 85개), 라이선스 식별 누락 0개 |
| 브라우저 | 실제 WebGL 표시, 선택·숨김·불투명도·회전·확대·초기화 확인; 콘솔 오류 없음 |

자동 검증 중 발견된 다른 장면의 Cube가 GLB에 포함되는 문제는 활성 장면만 내보내도록 수정하고,
재수입 후 구조 ID 집합이 정확히 네 개인지 다시 확인했습니다. CSS 타입 선언도 보완하여 최종 타입 검사가 통과했습니다.

비차단 경고: 3D 라이브러리를 포함한 웹 번들은 약 1.15 MB(압축 약 317 KB)라 Vite 크기 경고가 있습니다.
브라우저에서는 라이브러리 내부의 `THREE.Clock` 사용 중단 예정 경고가 표시됩니다. 현재 기능 오류는 확인되지 않았습니다.
모바일 실기기, 모든 브라우저, 5.2 Blender, 실제 해부학 모델은 이번 검증 범위에 포함하지 않았습니다.

## 사용자에게 남은 연결 단계

1. **Blender 4.5 LTS**를 열고 **Edit → Preferences → Add-ons**에서 **Interface: MCP for Blender**를 활성화합니다.
2. 3D Viewport에서 **N → MCP for Blender** 탭을 열어 **Connected on port 9876**을 확인합니다.
   아직 연결되지 않았다면 **Connect to MCP server**를 누릅니다. 정확한 파일 경로와 대체 설치 방법은 설치 안내에 있습니다.
3. Codex에서 이 프로젝트의 새 세션/재시작으로 MCP 설정을 읽습니다. Claude Code는 프로젝트 루트에서 실행해 첫 MCP 사용 승인을 완료합니다.
4. 두 클라이언트 중 **한쪽만** Blender MCP에 연결합니다. 먼저 `get_scene_info`로 장면 읽기를 확인합니다.

GUI 접속과 각 클라이언트에서의 실제 장면 도구 호출은 아직 완료로 표시하지 않았습니다.
로컬 웹 서버는 이번 세션에서 `http://127.0.0.1:5173/`로 실행해 두었습니다. 종료 후 다시 사용하려면 프로젝트에서 `npm run dev`를 실행합니다.

## 모델과 권리의 한계

현재 도식은 실제 심장의 정확성을 보장하지 않으며 교육 배포 전용 검수도 통과하지 않았습니다.
해부학적 형태가 필요한 다음 단계에서는 출처와 사용권이 확인된 모델을 선정하고, 적격 전문가의 검수를 받아야 합니다.
라이선스 목록은 패키지 메타데이터/설치 파일 검사 결과이며 법률적 승인이나 번들 내부 모든 자산의 권리 검증이 아닙니다.
`webgl-constants`의 누락된 메타데이터는 설치된 LICENSE의 MIT 문구를 직접 확인해 보완했습니다.
외부 해부학 자산은 다운로드하지 않았습니다. 프로젝트 자체의 공개 라이선스는 아직 결정하지 않았습니다.

MCP 서버와 애드온의 버전은 고정했으나 uvx의 모든 전이 Python 의존성을 잠근 것은 아닙니다.
공통 잠금은 이 실행기를 사용하는 프로세스만 조정합니다. 외부 직접 실행이나 강제 종료 후 남은 프로세스는 별도로 확인해야 합니다.

## 프로젝트 문서 및 주요 파일

- `README.md`: 실행과 검증 명령, 구조 설명
- `docs/blender-mcp-setup.md`: 공식 출처와 정확한 GUI 연결 단계
- `docs/anatomy-and-licensing.md`: 전문가 검수와 자산 권리 검사
- `docs/dependency-licenses.json`: npm 직접/전이/선택 의존성 라이선스 목록
- `docs/handoff.md`: Blender 소유권 인계 기록
- `public/models/heart-schematic.glb`: 생성한 247,404 byte 도식
- `blender/generated/heart-schematic.blend`: 생성한 Blender 파일

공식 근거: [MCP for Blender README](https://github.com/ahujasid/mcp-for-blender),
[PyPI 2.1.9](https://pypi.org/project/mcp-for-blender/2.1.9/),
[Codex MCP](https://developers.openai.com/codex/mcp),
[Claude Code MCP](https://code.claude.com/docs/en/mcp),
[Claude Code 공통 지침](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools).
