# CardioLab · Cardiovascular Physiology Lab

**[English](README.md) · [한국어](README.ko.md)**

앱은 기본 영어로 시작하며 **EN / KO** 전환과 언어 선택 저장을 지원합니다.
공개 저장소에는 소스 코드와 출처·해시·검증 기록을 포함합니다. 미검수 GLB와 Blender 장면은
포함하지 않으며 아래 명령으로 로컬에서 생성합니다. 공개 소스·로컬 자산의 구분은
[공개 소스 안내](docs/public-source-release.md), 영문 사용법은 [User guide](docs/user-guide.md)를 참고하세요.

브라우저에서 압력·용적·유량을 계산하는 교육용 0D 심혈관 실험실과 해부학 탐색기입니다.
React Three Fiber 뷰어, Blender 자산 파이프라인, 독립적인 TypeScript 계산 엔진을 사용합니다.
임상적으로 검증된 시뮬레이터가 아닙니다. **기본 3D 자산은 HRA 남성 심장·혈관 v1.3에서 선택한 44개 메시의 검수 전 아틀라스 재구성**입니다.
네 방, 심실중격, 네 판막, 다섯 유두근, 큰혈관과 관상동맥·심장정맥을 원본 좌표로 다룹니다.
직접 CT 분할 결과, 정상 성인의 보편적 표준, 해부학 승인 또는 사진 같은 표본 재현을 주장하지 않습니다.
기존 18개 procedural 초안과 네 구체 도식의 자산·생성 경로도 보존합니다.

## 빠른 시작

```bash
git clone https://github.com/Carraway-and-Gatsby/cardio-simulator.git
cd cardio-simulator
npm ci
npm run check:source
# 설치된 Blender 4.5 LTS 실행 파일의 경로를 지정합니다.
export BLENDER_BIN="/Applications/Blender 4.5 LTS.app/Contents/MacOS/Blender"
npm run setup:assets
npm run dev
```

최초 실행에는 버전과 SHA-256이 고정된 CC BY 4.0 HRA 원본 두 개가 필요합니다.
획득 명령은 원본을 Git에서 제외된 `.local/anatomy-sources/`에 저장하고 기존 파일의 해시가 다르면 덮어쓰지 않습니다.
`python3 scripts/acquire-anatomy.py --verify-only`로 네트워크 없이 원본을 확인할 수 있습니다.
Blender 생성은 별도로 설치한 4.5 LTS와 프로젝트 공통 잠금을 사용합니다. macOS/Linux의 POSIX 잠금을 기준으로 하며 네이티브 Windows 작업 흐름은 검증하지 않았습니다. 현재 MCP 연결은 정상 종료한 뒤 실행하세요.
생성·검증의 이번 실행 상태는 [구현 기록](docs/implementation-status.md)의 최신 해부학 증분을 확인하세요.

터미널에 표시된 localhost 주소를 엽니다. 기준 상태/HFrEF/HFpEF 강성 표현형/대동맥판 저항/승모판 역류 중
기전을 선택하고 심박수·수축력·강성·전신 저항·총 혈액량·기전 강도를 조절합니다. 변경 시 Web Worker가
주기 평형을 다시 구하고, 한 주기를 재생하거나 멈춰 PV 루프·압력/용적/유량을 같은 시점에서 검사합니다.
매개변수 변경은 연속적인 치료 반응이 아니라 새 평형 실험입니다.

3D의 외형·내부·관상혈관 보기를 전환하고 모델 또는 목록에서 구조를 선택합니다.
선택 구조 분리, 개별 표시/숨김, 불투명도, 단면 위치·방향, 라벨, 드래그 회전,
스크롤 확대·축소, 우클릭 드래그 이동과 보기 초기화를 제공합니다.
조직색·교육색·중성 재질은 표시 방식이며 측정된 조직 물성이나 사진 텍스처가 아닙니다.
전후·상하·좌우 시점은 원본의 구조명과 위치에서 추론한 축에 근거하고 전문가 방향 검수는 남아 있습니다.
**HRA 원본은 정적이며, 웹에서 교육용 움직임을 적용합니다.** 네 방의 상대 용적과 심실 활성도로
수축·이완·비틀림을 표현하고, 같은 변형장을 관상혈관과 혈류 경로에도 적용합니다.
네 판막의 재구성 판엽은 각각의 전방 유량·압력차에 따라 개폐하며 승모판 역류는 작은 접합 틈으로 구분합니다.
계산 시계는 심장·판막·그래프·수치·회로와 12개 교육용 혈류 경로의 입자를 동기화합니다.
‘좌심실 충만 끝 / 박출 끝’으로 비교하고, ‘판막 움직임 보기’나 개별 판엽 확대로 검사합니다.
‘심장·판막 움직임’을 끄면 원본 형상으로 복원됩니다. 혈류를 숨겨도 심장은 재생할 수 있습니다.
투시 보기, 좌심계·우심계 필터, 경로선, 입자 밀도와 재생 속도를 조절할 수 있습니다.
유량 부호에 따라 방향이 바뀌며 승모판 역류도 표현합니다. 동작 감소 설정에서는 자동 재생하지 않습니다.
입자 경로·속도·크기는 실제 혈구나 3D 유동장이 아닙니다. 표시 변형과 판엽은 실측 심근 운동,
벽 두께, 실제 판구 면적, 조직 접촉·응력을 재현하거나 검증한 결과가 아닙니다.
구현 범위와 검증 기록은 [심장·판막 움직임](docs/cardiac-motion-validation.md),
[혈류 애니메이션](docs/blood-flow-validation.md)을 참고하세요.
Node 22.23.1을 기준으로 설치했으며 `.nvmrc`와 `package-lock.json`을 포함합니다.

## 구현 범위와 과학적 근거

- **해부학:** Visible Human Male 기반 HRA 심장·혈관에서 44개 원본 메시를 선택합니다. 심장만의 원본 경계는 약 124.35 × 105.44 × 105.22 mm입니다. 원본의 미터 좌표·형상을 유지하며 전문가 검수와 배포 승인은 미완료입니다.
- **계산:** LA/LV/SA/SV/RA/RV/PA/PV의 8개 구획, 시간 가변 엘라스턴스, 지수형 수동 압력, 저항·컴플라이언스, 네 판막의 부호 있는 흐름, 폐쇄 순환의 혈액량 보존. 고정 보폭 RK4와 주기 수렴 검사.
- **질환:** 수축력 저하, 수동 강성 증가, 대동맥판 저항 증가, 승모판 역방향 전도도를 독립 기전으로 구현합니다. HFpEF 전체 임상 표현형, 판구 면적, 만성 재형성은 구현하지 않습니다.
- **학습:** PV 루프와 압력/용적/판막 유량 탭, 정지·재생·속도·시점 선택, 전방 CO와 용적 박출량/EF 및 역류량 구분, 압력차에 따른 회로 화살표. ECG나 CFD 흐름은 생성하지 않습니다.
- **해석 범위:** 수치 수렴과 생리적 타당성을 별도로 검사합니다. 수동 곡선이 능동 곡선을 넘는 극단 조합은 화면에서 결과 표시를 차단합니다. 동시 충만·박출은 별도 경고합니다.

[방정식·상수·가정·문헌](docs/physiology-model.md), [구조·구현 상태·검증 기록](docs/implementation-status.md),
[자동 생성 수치 보고서](docs/physiology-validation.json), [해부학 데이터셋 조사](docs/anatomical-datasets.md),
[HRA 원본 조사](docs/source-hra-research.md), [해부학 검수표](docs/ANATOMICAL_VALIDATION.md)를 참고하세요.
매개변수는 교육용 추정값이며 임상 자료에 대한 적합이나 전문가 검수는 수행하지 않았습니다.

```bash
npm run test:flow            # 혈류 경로·부호·정체·시간 적분·주기 경계 검사
npm run test:motion          # 심근 변형·판막 개폐·힌지·CPU/GPU 자세·선택·원본 복원 22개 검사
npm run test:physiology      # Node 22 TypeScript 내장 실행: 보존·응답·수렴·정제·범위 회귀검사
npm run validate:physiology  # 코드 해시를 포함한 실제 수치 보고서 재생성
```

## Blender 연결

기준 버전은 **Blender 4.5 LTS**이며 기존 자산 검증에는 4.5.12 LTS를 사용했습니다. 앱 실행과 배경 생성에는 MCP 연결이 필요하지 않습니다.
Blender MCP 2.1.9 서버와 애드온 설치 및 GUI에서 할 작업은 [설치 안내](docs/blender-mcp-setup.md)를 따릅니다.
MCP for Blender는 커뮤니티 프로젝트이며 Blender Foundation 공식 제품은 아닙니다.

| 파일 | 역할 |
|---|---|
| `AGENTS.md` | Codex가 읽는 공통 작업 규칙 |
| `CLAUDE.md` | `@AGENTS.md`로 공통 규칙 가져오기 |
| `.codex/config.toml` | 신뢰된 프로젝트에서 Codex가 읽는 MCP 설정 |
| `.mcp.json` | Claude Code의 프로젝트 MCP 설정 |
| `scripts/blender-mcp.py` | 두 클라이언트의 공통 잠금·서버 실행기 |

두 MCP 설정 파일은 서로 다른 형식이며 머신별 경로를 포함하므로 Git에서 제외합니다.
`npm run setup:local`은 현재 체크아웃에 맞는 누락된 설정만 생성하고 기존 설정을 보존합니다.
`npm run verify:config`로 공통 실행기를 확인하세요. Codex/Claude 전역 설정은 수정하지 않습니다.
프로젝트 이동 시 두 설정의 args 경로와 `BLENDER_BIN`, uvx 위치도 확인합니다.

## 단일 동시 제어와 인계

하나의 Blender 포트에 MCP 서버를 하나만 연결합니다. Codex 또는 Claude Code 중 한쪽만 Blender MCP를 활성화합니다.
공통 실행기는 macOS 파일 잠금으로 두 번째 연결을 거부합니다. 다른 클라이언트의 MCP를 중지하고 다시 연결하면 됩니다.
이 잠금은 이 프로젝트 실행기를 따르는 프로세스에만 적용됩니다. 직접 실행한 외부 서버, GUI 수동 편집,
강제 SIGKILL 후 남은 자식 프로세스까지 통제하는 보안 장치는 아닙니다.

인계 순서: 현재 `.blend` 저장 → 변경한 스크립트와 출력 경로 기록 → 현재 클라이언트의 Blender MCP 중지
→ 다음 클라이언트 연결 → `get_scene_info` 읽기 → 작업. 클라이언트가 실행한 MCP 외에 별도 터미널 서버를 띄우지 않습니다.
`docs/handoff.md`에 작업 상태를 기록합니다.

## 재현 가능한 bpy 작업

```bash
npm run blender:build
npm run blender:check
npm run verify:assets
```

별도 background Blender에서 세 소유 장면을 만듭니다.

| 생성 장면 | 출력 | 용도 |
|---|---|---|
| `CardioLab_HRA` | `public/models/heart-hra.glb`, `blender/generated/heart-hra.blend` | 기본 뷰어의 HRA 원본 유래 44개 구조 |
| `CardioLab_Procedural` | `public/models/heart-procedural.glb`, `blender/generated/heart-procedural.blend` | 보존한 자체 제작 초안·기능 시험용 |
| `CardioLab_Schematic` | `public/models/heart-schematic.glb`, `blender/generated/heart-schematic.blend` | 기존 네 구체 도식 |

현재 GUI 파일을 열거나 덮어쓰지 않습니다. 생성 스크립트는 같은 소유 장면을 재실행할 수 있고,
동명의 사용자 장면/객체가 충돌하면 중단합니다. `blender:check`는 생성물을 재생성하며
반복 실행·다른 장면 보존·GLB 재수입 후 ID/좌표/크기·외부 이미지 부재를 확인합니다.
HRA 경로는 고정된 원본 해시와 노드 대응, 원본→Blender→GLB 형상·방향 있는 삼각형 연결 관계를 비교하고
경계·퇴화면 등 메시 품질을 기록합니다. 원본 노드 전체를 선택하며 재구성·평활화·강제 폐합·임의 분기를 추가하지 않습니다.
예외로 Blender의 자동 메시 검증이 중복 정점 인덱스 면 18개(RA 12, LM 5, SVC 1)를 제거합니다.
중복되지 않은 방향 있는 삼각형은 그대로 유지하고, 중복 그룹마다 원본 방향 하나를 남겼습니다.
선택 원본 267,360개 삼각형은 출력 267,342개가 되며 관찰된 좌표 편차는 0입니다.
면적 0인 면 835개(RA 812, LM 6, SVC 17)가 남아 있어 이 처리를 해부학적 복구나 완전한 메시 정리로 표현하지 않습니다.
절단된 혈관 끝 등에는 열린 경계가 타당할 수 있으므로 모든 HRA 메시의 폐합을 승인 조건으로 삼지 않습니다.
품질 보고서는 `blender/generated/heart-hra.report.json`에 기록합니다.
이 검사는 접합부의 내강 연속성이나 해부학적 정확성 검사가 아닙니다. Blender 버전과 의미상 형상 재현을 목표로 하며
바이너리 파일이 매번 동일한 바이트가 된다고 보장하지 않습니다.

웹은 `heart-hra.glb`와 `src/data/heart-hra.json`의 의미 ID를 연결합니다.
HRA GLB의 Y-up 미터 좌표를 보존하고, 화면 중앙 배치와 균일한 표시 배율만 적용합니다.
단면 도구는 실제 표면을 클리핑하며 절단면을 임의 조직으로 메우지 않습니다. 열린 단면이나 혈관 끝이 보일 수 있습니다.
0D 엔진의 용적·유량은 메시의 혈액 공간 측정, 심근 역학 또는 3D 유체 해석이 아닙니다.

원본은 CC BY 4.0이며 출처·저작자·변경 이력을 [HRA 권리 기록](assets/licenses/heart-hra.md)에 기록합니다.
원본 LAD ontology와 전방 유두근 소속 주석에 충돌이 있어 활성 매핑을 미확정으로 두었습니다.
독립 LCx 메시, 검증된 건삭·세부 첨판·심외막 지방·측정된 운동은 없습니다. 관상동맥 기시부·연속성·우세형,
심근 두께와 모든 구조의 해부학적 정확성은 별도 검수 대상입니다. 표본 수준의 사진 같은 재현은 아직 달성하지 않았습니다.
기존 초안의 기록은 [자체 제작 모델 출처](assets/licenses/heart-procedural.md)에 남깁니다.
공개 라이선스 확인과 프로젝트 배포 승인은 별개이며, manifest는 미승인 상태를 유지합니다.

`blender/scripts/inspect_demo.py`는 기존 MCP 연결에서 생성 장면만 임시 링크하여 살펴보는 도구입니다.
`begin()`은 `.local/inspection/`에 현재 상태의 사본을 저장하고 검사 장면으로 전환합니다.
`inspect()`는 평가된 객체의 ID·좌표·크기·재질을 확인하며, 화면 확인 후 반드시 `finish()`를 호출하여
임시 라이브러리를 제거하고 원래 장면으로 복원합니다. 오류가 나더라도 `finish()`로 복원을 마쳐야 합니다.
검사 결과와 복원 비교는 백업과 같은 폴더에 기록됩니다. 생성 파일 자체를 현재 파일로 연 상태에서는
자기 자신을 링크할 수 없으므로 이 보조 도구를 사용하지 않습니다.

## 검증

```bash
npm run check:source    # 자산·개인 MCP 설정 없이 공개 소스, 테스트, 타입 검사, 빌드
npm run setup:local     # 선택 사항: 누락된 로컬 MCP 설정 생성
npm run check           # 로컬 자산과 MCP 설정을 포함한 전체 검사
npm run blender:check   # 실제 Blender 생성/재수입 검사
npm run verify:assets   # 재생성 뒤 해시 확인
npm run mcp:check       # MCP 초기화와 도구 목록
npm run mcp:check -- --scene # 실제 MCP get_scene_info로 GUI 장면 조회
npm run licenses        # lockfile 및 설치본 라이선스 목록 생성
npm run mcp:probe       # GUI 애드온 시작 후, 두 클라이언트 MCP가 꺼진 상태에서 읽기 검사
npm run verify:release # 현재는 실패가 정상: 검수·배포 권리 미승인
npm run preview        # 빌드 결과 로컬 확인
```

`verify:release`는 증거와 상태를 확인하는 보조 장치입니다. 해부학적 정확성이나 법적 권리를 자동 판정하지 않습니다.
`npm run check`의 잠금 테스트는 부모·자식 테스트 프로세스만 공유하는 임시 디렉터리를 사용하므로
실제 MCP가 연결된 상태에서도 실행할 수 있습니다. 운영용 잠금 경로나 실행기는 바꾸지 않습니다.
반면 `blender:build`, `blender:check`, 별도 MCP 검사 클라이언트는 실제 공통 잠금을 사용하므로
현재 MCP 연결을 정상 중지한 뒤 실행해야 합니다.
교육용 배포 전에 [해부학·라이선스 검수](docs/anatomy-and-licensing.md)를 완료해야 합니다.
이번 실제 실행 결과와 남은 작업은 [설정 결과](docs/setup-status.md)에 기록합니다.

## 디렉터리

```text
src/                       React 학습 UI, Worker, GLB 로더, HRA/기존 도식 JSON
src/simulation/            렌더링과 독립적인 순수 계산 엔진·타입·매개변수
src/components/            동기화 SVG 그래프와 0D 순환 회로
src/hooks/                 취소 가능한 Worker 수명주기
public/models/             웹 제공용 GLB (manifest 등록 필수)
blender/scripts/           재실행 가능한 bpy 생성·검사
blender/generated/         생성된 .blend
scripts/                   MCP 실행기, 잠금, 검사
assets/sources/            버전·SHA-256 고정 HRA 획득 설정
.local/anatomy-sources/    원본 GLB·근거 캐시 (Git 제외)
tests/                     동시 연결 방지 + 생리학적/수치적 회귀검사
assets/manifest.json        자산 출처·라이선스·검수·해시
assets/licenses/           자산별 권리 증거
docs/                      설치, 검수, 인계, 실제 검증 결과
```

## 공개 라이선스

프로젝트의 원본 코드·스크립트·테스트·번역·문서는 [MIT](LICENSE)로 공개합니다.
HRA 유래 자료는 **CC BY 4.0**, 의존성은 각 원본 라이선스를 유지합니다.
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)의 저작자·출처·변경 기록을 함께 확인하세요.
공개 소스 업로드는 미검수 자산의 해부학적 정확성·교육 배포 승인 또는 원저작자의 보증을 뜻하지 않습니다.
`internal-only` / `unreviewed` 상태와 실패해야 하는 `verify:release` 게이트를 유지하며,
GLB·생성 Blender 파일·로컬 증거·개인 설정은 공개 저장소에서 제외합니다.
