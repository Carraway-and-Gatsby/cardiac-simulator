# macOS Blender MCP 설정

2026-10-15 공식 프로젝트 README와 PyPI 배포를 확인했습니다. 패키지 이름은 `mcp-for-blender`,
확인한 버전은 **2.1.9**입니다. 저장소 main 커밋은 `7a0373ec9199183cb460068c4f96aed9c579fb4f`였습니다.
공식 빠른 설치는 `uvx mcp-for-blender setup`이지만, 이번에는 기존 클라이언트 설정과 Blender 환경설정을
보존하도록 명시적인 서버/애드온 설치와 프로젝트 설정을 사용했습니다.

## 설치 명령

```bash
brew install uv
DISABLE_TELEMETRY=true UV_PYTHON_PREFERENCE=only-managed \
  /opt/homebrew/bin/uvx --python 3.11 mcp-for-blender==2.1.9 --help
DISABLE_TELEMETRY=true UV_PYTHON_PREFERENCE=only-managed \
  /opt/homebrew/bin/uvx --python 3.11 mcp-for-blender==2.1.9 install-addon \
  --addons-dir "$HOME/Library/Application Support/Blender/4.5/scripts/addons"
```

서버는 uv 도구 캐시에 설치되고 Python 3.11 관리 런타임을 사용합니다.
서버/애드온 버전을 고정했지만 uvx의 전이 Python 의존성 전체를 잠근 것은 아닙니다.
`--refresh`나 자동 update는 사용하지 않습니다. 업그레이드 시 서버와 애드온을 함께 시험하고 버전 기록을 갱신합니다.

## Blender GUI에서 마칠 단계

1. **Blender 4.5 LTS** 앱을 엽니다. 다른 Blender 버전이 같은 9876 포트를 사용하지 않도록 합니다.
2. **Edit → Preferences → Add-ons**에서 `MCP for Blender`를 검색해 **Interface: MCP for Blender**를 활성화합니다.
3. 목록에 없으면 Blender를 다시 열거나 Add-ons 우측 메뉴의 **Install from Disk…**에서
   `~/Library/Application Support/Blender/4.5/scripts/addons/blender_mcp.py`를 선택합니다.
   구버전 UI에서는 이 항목이 **Install…**로 표시될 수 있습니다.
4. 3D Viewport 위에 마우스를 두고 **N** → **MCP for Blender** 탭을 엽니다.
   애드온은 기본적으로 자동 시작합니다. 2.1.9 코드의 연결 버튼 표시는 **Connect to MCP server**이고,
   시작되면 **Connected on port 9876**와 **Disconnect**가 표시됩니다.
   README에 나오는 **Start MCP Server / Connect to Claude**는 버전별 명칭입니다.
5. 외부 자산 서비스와 생성 서비스의 체크박스·API 키는 필요할 때만 설정합니다. 현재 도식에는 필요 없습니다.
   Allow Telemetry는 켜지 않습니다. 실행기도 `DISABLE_TELEMETRY=true`를 설정합니다.
6. 환경설정의 자동 저장 여부를 확인하고, 수동 저장 모드라면 Preferences를 저장합니다.
7. 두 클라이언트 MCP를 잠시 끈 상태에서 프로젝트 터미널의 `npm run mcp:probe`가 PASS인지 확인합니다.
   이 검사는 `get_scene_info`만 요청하고 장면을 수정하지 않습니다.

## Codex Desktop

이 프로젝트는 로컬 Codex 설정에서 이미 신뢰된 프로젝트로 등록되어 있습니다.
프로젝트 안의 `.codex/config.toml`을 읽는 새 세션/재시작 후 MCP 목록에서 `blender`를 확인합니다.
`codex mcp get blender`는 설정 등록을 보여줄 뿐 실제 Blender 연결 성공을 보장하지 않습니다.
첫 동작은 `get_scene_info`로 장면 정보를 읽는 것입니다. 이 채팅에는 새 MCP 도구가 자동으로 추가되지 않을 수 있습니다.

공식 전역 등록 명령은 `codex mcp add blender -- uvx mcp-for-blender`지만,
이미 프로젝트 설정이 있으므로 중복 등록하지 마세요. 이번에는 글로벌 `~/.codex/config.toml`을 수정하지 않았습니다.
선택적인 Codex 전용 viewport 플러그인도 중복 서버 방지를 위해 설치하지 않았습니다.

## Claude Code

프로젝트 루트에서 `claude`를 실행합니다. `.mcp.json`의 프로젝트 서버 사용 승인이 나타나면 검토 후 승인하고,
`/mcp`에서 `blender`를 확인합니다. 이 최초 신뢰/승인은 클라이언트에서 사용자가 완료해야 합니다.
`CLAUDE.md`의 `@AGENTS.md` import는 현재 설치된 2.1.220에서도 공통 지침을 공유하기 위한 구성입니다.

이미 `.mcp.json`을 만들었으므로 `claude mcp add`를 다시 실행할 필요가 없습니다.
공식 수동 명령 형식은 `claude mcp add --scope project --transport stdio blender -- <command> <args>`입니다.
CLI `/memory` 또는 `/context`에서 공통 지침을 확인합니다.

## 연결 전환과 문제 해결

- Codex가 연결되어 있으면 Claude의 Blender MCP는 끄고, 그 반대도 같습니다. 잠금 오류(종료 코드 75)는 정상적인 충돌 방지입니다.
- 이전 클라이언트의 MCP 중지/종료 후 다음 클라이언트의 MCP를 재연결합니다. Blender의 애드온 서버는 유지해도 됩니다.
- `uvx not found`: `which uvx` 확인 후 `CARDIOLAB_UVX`를 설정하거나 실행기 검색 경로를 수정합니다. Dock 실행 앱은 shell PATH와 다를 수 있습니다.
- `Connection refused`: Blender 4.5 GUI의 애드온/포트/연결 상태를 확인합니다. MCP 프로세스만 실행해서는 Blender가 열리지 않습니다.
- `Blender is in use`: 다른 세션을 중지하세요. 잠금 파일은 삭제하지 않습니다. 강제 종료 후 남은 프로세스는 소유자를 확인하고 종료합니다.
- 새 PC에서는 두 클라이언트 설정의 절대 경로를 바꿔야 합니다. `/usr/bin/python3`는 런처용이며 서버는 uv의 Python 3.11을 사용합니다.
- MCP는 Blender 안에서 Python을 실행합니다. 루프백 9876만 사용하세요. 선택적 safe mode는 공식 README를 참고하여 별도로 시험합니다.

## 근거

- [MCP for Blender 공식 프로젝트 README](https://github.com/ahujasid/mcp-for-blender)
- [PyPI 2.1.9](https://pypi.org/project/mcp-for-blender/2.1.9/)
- [Codex MCP](https://developers.openai.com/codex/mcp)
- [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [Claude Code 공통 지침 가져오기](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools)
- [React Three Fiber 설치·React 버전 호환](https://r3f.docs.pmnd.rs/getting-started/installation)
