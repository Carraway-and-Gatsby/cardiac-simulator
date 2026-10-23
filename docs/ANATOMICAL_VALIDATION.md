# 해부학 검증 기록 — HRA 남성 심장

기록일: 2026-10-23 (Asia/Seoul). 대상: `heart-hra-male-v1`, HRA Heart Male v1.3 및
Blood Vasculature Male v1.3에서 선택한 44개 메시. **현재 판정: `unreviewed`, 내부 개발 전용.**
구조의 존재나 자동 검사 성공은 해부학적 정확성·정상성·임상적 적합성의 승인이 아니다.

## 1. 증거와 승인 범위

| 구분 | 현재 확인·미확인 상태 |
| --- | --- |
| 원본 | 버전 고정 GLB 두 개를 확보했다. 심장 SHA-256 `689df039c8bc264ea06a44cd926762976f0666c0ff2dc532d046409b185e6b0c`; 혈관 SHA-256 `3a9fe60549769f3a27c15a0901a055e7c4fd3a9f4a37f39a77f5047f0166d4c3`. |
| 증거 종류 | `atlas-reconstruction`. Visible Human 기반 참조 아틀라스이다. 직접 분할·원영상 대조를 이번 프로젝트에서 수행하지 않았다. |
| 대상 | Visible Human Male, 명세상 38세. 선택 심장의 병력·구조적 정상성·심장 위상은 미확인. 정상 성인 전체의 변이를 대표한다고 주장하지 않는다. |
| 조직 종류 | 방·중격·판막·유두근은 원본 조직 표면이다. 별도의 검증된 RA/LA/RV/LV 혈액 공간 표면이 없으며 조직 메시 부피를 혈액 용적으로 사용하지 않는다. |
| 원본 제작·검수 | 심장 제작자 Kristen Browne, 혈관 제작자 Kristen Browne/Heidi Schlehlein. 원본 metadata의 Shin Lin 및 혈관의 Marc Halushka는 **프로젝트의 선택·변환·재질·표시를 승인한 검수자가 아니다**. |
| 권리 | 원본 CC BY 4.0. 저작자·출처·변경·라이선스 표기를 유지한다. 라이선스 허용과 프로젝트 해부학 검수·배포 승인은 별개다. |
| 프로젝트 검수 | 해부학 전문가 검수자·날짜·승인 범위·`reviewedSha256` 없음. `approved`로 승격하지 않는다. |

구조 목록은 [`src/data/heart-hra.json`](../src/data/heart-hra.json), 원본 기록은
[`assets/sources/heart-hra.json`](../assets/sources/heart-hra.json)을 기준으로 한다.
외부 근거: [HRA 심장 metadata](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-male/v1.3/metadata.json),
[혈관 metadata](https://cdn.humanatlas.io/digital-objects/ref-organ/blood-vasculature-male/v1.3/metadata.json),
[심장 crosswalk](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-male/v1.3/assets/crosswalk.csv),
[혈관 crosswalk](https://cdn.humanatlas.io/digital-objects/ref-organ/blood-vasculature-male/v1.3/assets/crosswalk.csv).

## 2. 좌표·척도·변환

- 원본 glTF는 오른손 좌표계 Y-up, 단위 m를 유지한다. 명세의 심장 경계는 약
  **124.351 × 105.435 × 105.215 mm**다. 원본 경계 측정이며 정상범위 인증이 아니다.
  대혈관까지 포함한 전체 선택 경계와 심장만의 경계를 혼용하지 않는다.
- 전체 선택 경계(m): min `[-0.043448250, 0.400054872, -0.0385727622]`,
  max `[0.0809029341, 0.585033238, 0.090188520]`.
- 현재 방향 해석은 **+X 환자 왼쪽, +Y 위쪽, +Z 앞쪽**이다. 좌우 폐정맥·방 이름,
  상하 구조, RV와 LA의 상대 위치를 교차 확인한 **랜드마크 기반 추론**이다.
  명시적 원본 해부학 축 선언은 찾지 못했으며 전문가 검증 전이다. 화면 왼쪽과 환자 왼쪽을 동일시하지 않는다.
- HRA graph 치수와 원본 경계를 대조하여 metre scale을 확인하는 정책이다. graph의 전체 신체
  배치용 회전·이동을 GLB에 중복 적용하지 않는다. Blender Z-up↔glTF Y-up 왕복과 해부학 배치 변경을 구별한다.
- 비균일 확대, 좌우 반사, 심장을 보기 좋게 만드는 재배치, 여러 대상자 간 정합을 하지 않는다.
  카메라 회전·초기화는 원본 구조간 관계를 바꾸지 않아야 한다.
- 승인 전 확인: 변환 determinant 양수, 원본/출력 좌표 오차, 좌우 이름과 선택 영역,
  LV apex·RV 전면·LA 후면·RA 우측 경계·AV 평면·기저부/첨부/심장 장축의 실제 관계.

원영상 파이프라인의 RAS/LPS 변환은 이 HRA glTF 왕복과 별개다.
[Slicer 공식 좌표 문서](https://slicer.readthedocs.io/en/latest/user_guide/coordinate_systems.html)를 따르며
spacing·origin·direction을 보존한다. 스크린샷이 그럴듯하다는 이유만으로 축을 승인하지 않는다.

## 3. 구조별 존재와 미완료 검수

**있음**은 명세에 대응하는 원본 메시의 존재를 뜻한다. 연결·형상·두께·명칭의 전문가 승인은
모든 행에서 미완료다. **독립 표기 없음**은 해당 구조를 검증하거나 따로 선택할 수 없다는 뜻이며,
원본 표면에 아무 흔적도 없다고 단정하는 표현이 아니다.

| 범위 / 현재 ID | 존재·명칭·조직 표현 | 형상·연결·검수 제한 |
| --- | --- | --- |
| 우심방 `RA` | 원본 right cardiac atrium 조직 표면 있음. | 우심방이·fossa ovalis·crista terminalis·pectinate muscles·심방중격·관상정맥동 입구 독립 표기 없음. SVC/IVC 접합·내부 형태 미검수. |
| 좌심방 `LA` | 원본 left cardiac atrium 조직 표면 있음. | 좌심방이·심방중격면 독립 표기 없음. 후방 위치·네 폐정맥 ostia·승모판 연결 미검수. |
| 우심실 `RV` | 별도 원본 조직 메시 있음; LV를 복제하지 않음. | 초승달형 내강, inlet/apical/outlet, RVOT, moderator band, trabeculae와 얇은 자유벽 미검수. RVOT·moderator band 독립 ID 없음. |
| 좌심실 `LV` | 별도 원본 조직 메시 있음. | 첨부 형성, 내강 타원형, 국소 벽 두께, LVOT·mitral-aortic continuity 미검수. 혈액 공간/심외막/심내막의 별도 기준 표면 없음. |
| 심실중격 `IVS` | 독립 원본 조직 표면 있음. | LV/RV 접합, 중복·틈·간섭, 막성/근육성 중격 구분 미검수. 심방중격을 이 구조로 대체하지 않음. |
| 승모판 `MV` | 원본 정적 판막 메시 있음. | anterior/posterior leaflet, P1/P2/P3, saddle annulus, commissures, chordae 독립 ID 없음. 첨판 수·두께·papillary attachment·접합 검증 없음. |
| 삼첨판 `TV` | 원본 정적 판막 메시 있음. | anterior/posterior/septal leaflet 및 annulus·chordae 독립 ID 없음. 판륜·건삭 연결·유두근 소속 미검수. |
| 대동맥판 `AV` | 원본 정적 판막 메시 있음. | 세 첨판, aortic sinuses, coronary ostia, sinotubular junction 독립 표기·연결 미검수. 반월판에 건삭/유두근을 추가하지 않음. |
| 폐동맥판 `PVvalve` | 원본 정적 판막 메시 있음. | 세 첨판·sinus·root·RVOT 연결 미검수. `PVvalve`를 폐정맥 ID와 혼동하지 않음. 건삭/유두근을 추가하지 않음. |
| 유두근 `PM_ANT`, `PM_AL`, `PM_SEPT`, `PM_POST`, `PM_PM` | 다섯 원본 분리 메시. | 방 소속·부착·건삭 관계 미검수. `PM_ANT`는 crosswalk와 위치가 충돌하여 ontology/심실 소속 보류. |
| 대동맥 `AO`, `ARCH`, `BCA`, `LCCA`, `LSA`, `DAO` | 상행/궁/근위 세 분지/선택 흉부 하행 원본 표면. | LVOT 기시·판막 연결·분지 순서·열린 끝·연속 내강 미검수. 원본의 분리된 근위 노드만 선택하며 임의 분기를 추가하지 않음. |
| 폐동맥 `PT`, `LPA`, `RPA` | 폐동맥줄기와 좌우 분지 원본 표면. | RVOT 기시와 대동맥에 대한 상대 위치·분지 연속성 미검수. |
| 폐정맥 `RIPV`, `RSPV`, `LIPV`, `LSPV` | 네 개의 이름 있는 원본 폐정맥. | LA 접합부·독립 ostia·정상 변이 확인 전. 네 이름의 존재만으로 정상 연결을 승인하지 않음. |
| 대정맥 `SVC`, `IVC` | 상대정맥·근위 하대정맥 원본 표면. | RA 접합과 열린 혈관 끝, SVC 소스 퇴화 삼각형 영향 미검수. |
| 관상동맥 `LM`, `LAD`, `RCA`, `RM`, `RPDA`, `DIAG1`, `DIAG2`, `LMARG` | 같은 남성 아틀라스의 여덟 이름 있는 동맥. | coronary ostia·aortic sinus 연결·고랑을 따르는 경로·직경·부착·우세형 미검수. **LCx라는 독립 이름이 없음.** 두 diagonal을 LCx로 바꾸지 않음. 중격 천공가지·후외측가지 독립 표기 없음. |
| 심장정맥 `GCV`, `MCV`, `OVLA`, `ACV`, `CS`, `PVLV`, `SCV` | 큰/중간/작은심장정맥, 좌심방빗정맥, 앞심장정맥, 관상정맥동, 좌심실뒤정맥의 일곱 표면. | 정맥동 배액·RA 연결·동맥과의 상대 위치·혈관 내강/벽 표현 미검수. |
| 심외막·지방·미세형태 | 별도 epicardium/fat/trabecula/chordae 메시 ID 없음. | 무작위 노이즈·가짜 지방 패치·임의 혈관으로 누락을 가리지 않음. 원본에 없는 층을 새로 분할한 것으로 표시하지 않음. |

## 4. 확인된 원본 주석 충돌

1. `LAD` 원본 node는 `VH_M_left_anterior_descending_artery`지만 crosswalk의 `FMA:8636`과
   설명은 좌폐동맥 가지를 가리킨다. 원본 node에 따른 잠정 이름을 유지하되 활성 `ontologyId`는
   비워 두었다. 올바른 구조·기시를 전문가가 확인해야 한다.
2. `PM_ANT`는 crosswalk에 좌심실 전방 유두근 `FMA:7264`로 표시되지만 위치상 우심실 소속
   가능성이 의심된다. 자동 재명명·소속 변경을 하지 않고 활성 ontology를 보류한다.
3. 남성 혈관 metadata의 설명에는 `female`이 나오지만 자산 ID·제목·GLB node prefix·graph의
   organ owner sex는 남성이다. 단순 오기라고 확정하지 않고 출처 충돌로 보존한다.
4. `DIAG1`과 `DIAG2`는 다른 메시지만 같은 diagonal ontology를 갖는다. 어느 하나를 LCx로
   해석하거나 `RPDA`라는 이름만으로 우관상동맥 우세를 확정하지 않는다.

## 5. 기하 검사와 보존 정책

원본 선택·Blender import/export의 충실도와 원본 자체의 정확성은 별도 판정이다.
원본 node, vertex 좌표, 방향 있는 triangle 연결, 구조 경계·단위·변환, finite 좌표, 면적,
경계 edge·비다양체 edge·연결 성분·winding을 가능한 범위에서 기록한다. 모든 혈관을 폐합시키지
않는다. 원래 열린 혈관 끝·얇은 판막면은 용도에 따라 허용될 수 있다.

2026-10-23 생성한 [기하 보고서](../blender/generated/heart-hra.report.json)를 확인했다.
Blender 4.5.12 LTS의 원본→import→export 결과는 **44개 구조, 267,342개 삼각형**이다.
선택 원본의 267,360개 중 동일 vertex-index 중복 면 **18개**가 Blender 자동 mesh validation에서
제거되었다. 원본부터 최종 출력까지 최대 좌표 편차 **0 m**, 추가 삼각형 **0**이며 나머지 방향 있는
표면은 보존되었다. 이것은 **좌표와 비중복 표면 보존**의 성공이고 원본 삼각형 개수의 완전 일치는 아니다.

| 구조 | 선택 원본 삼각형 | 출력 삼각형 | 동일 인덱스 중복 면 제거 | 원본 면적 0 삼각형 | 최종 잔여 면적 0 삼각형 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `RA` | 48,186 | 48,174 | 12 | 820 | 812 |
| `LM` | 12,240 | 12,235 | 5 | 6 | 6 |
| `SVC` | 11,222 | 11,221 | 1 | 18 | 17 |
| 나머지 41개 | 195,712 | 195,712 | 0 | 0 | 0 |
| 합계 | 267,360 | 267,342 | 18 | 844 | 835 |

RA 중복 12쌍은 각 쌍의 winding이 반대였다. 비교 검사는 모든 비중복 면의 원래 방향·연결을
보존하도록 요구하고, 중복 그룹마다 원본 방향 중 정확히 하나를 유지하는 경우에만 예외를 허용한다.
보존한 원본 triangle index·제거 수를 구조별 보고서에 기록한다. 이 예외는 유사 좌표 병합·새 면
생성·일반 면 삭제·winding 변경·허용오차 확대가 아니다. 설정된 좌표 허용오차는 `1e-7 m`이며
실측 편차는 0이다. 최종 GLB SHA-256은
`d0d261297693ed432727d0ea6cc2313eaa43500abe79a7d3ab63ed96dd5f29ce`이다.

면적 기준 삭제나 평활화로 결함을 숨기지 않았으며, 잔여 퇴화 삼각형 **835개**는 해결된 결함이나 의학적으로
무해하다는 판정이 아니다. NaN/무한 좌표나 새 퇴화 면을 허용하는 일반 예외로 확장하지 않는다.
추가 수리는 변경 버전·전후 표면 비교·전문가 검수 범위를 기록해야 한다.

아직 완료하지 않은 검사:

- self-intersection과 구조간 교차/겹침의 체계적 검출 및 해부학적 타당성 판정.
- lumen continuity, valve/chamber connectivity, coronary ostia 연결의 검증.
- 동일 위상의 LV/RV 국소 자유벽 두께 비교와 조직 체적 정확도.
- normal·경계 문제가 cutaway/투명 표시에서 만드는 결함의 전문가 판정.

직접 대응하는 정답 분할·원영상 정합이 없으므로 **Dice, surface distance, HD95, landmark error,
chamber volume error를 측정했다고 기재하지 않는다**. 원본 GLB와 출력 GLB의 작은 좌표 오차는
전송·변환 충실도이며 영상 대비 해부학 정확도와 다르다.

위 값은 실제 생성 보고서의 형상 측정이다. 최종 명령 실행과 실제 브라우저 검증은 아래 9절에 별도로 기록한다. 자동 검사와 화면 확인은 전문가 승인으로 승격되지 않는다.

## 6. 재질·단면·운동의 한계

- 자연색 PBR·교육용 색·중립 재구성은 표현 방식이다. 원본 실물의 촬영 색이나 계측된 광학
  특성으로 보정한 재질이 아니다. **사진 수준 실물 외관과 의료 검수는 달성하지 않았다.**
- microstructure 노이즈나 displacement로 trabeculae·epicardial fat·건삭을 꾸며내지 않는다.
  구조를 추가한다면 근거와 전문가 추정 재구성 여부를 기록한다.
- clipping은 기존 표면을 잘라 보는 기능이며 조직 분할을 추가하지 않는다. 닫힌 단면 cap,
  검증된 wall/lumen segmentation, 절단면 조직별 경계가 없는 경우 그 한계를 표시한다.
- 네 방/장축/단축/RV inflow-outflow 프리셋은 landmark와 면의 관계를 검증해야 한다.
  임의 카메라 각도를 임상 표준 단면으로 이름 붙이지 않는다.
- HRA는 **정적**이며 측정된 cine motion·변형장·leaflet dynamics가 없다. 전역 확대/축소를
  실제 심근 수축으로 표시하지 않는다. 압력-용적 계산은 지역별 변형장을 유일하게 정하지 않는다.
- 향후 운동은 영상 유래 / 생체역학 계산 / 설명용 애니메이션을 구분한다. longitudinal
  shortening, torsion, wall thickening, AV plane motion, near-incompressibility, 공동 시계와
  valve pressure gradient 관계를 따로 검증한다. 현재 메시를 이완기/수축기 측정 형상으로 부르지 않는다.

## 7. 화면 검수와 증거 캡처 체크리스트

아래는 요구 캡처 목록이다. 실제 이미지 파일·결과가 붙기 전에는 완료가 아니다.
캡처에는 모델 ID·최종 GLB 해시·시점/정적 여부·방향·숨긴 구조·단면·렌더링 모드를 기록한다.

| 캡처 | 확인할 내용 | 자료의 제한 |
| --- | --- | --- |
| 전면 외형 | LV apex, RV sternocostal surface, RA 경계, 혈관 위치·실루엣 | 방향은 landmark 추론; 전문가 검수 필요 |
| 후면 외형 | LA, 폐정맥, coronary sinus, 대동맥/폐동맥 관계 | 정맥 접합·심외막/지방 미검증 |
| 횡격막면 | 하방 방향, LV/RV 기여, 후하행 혈관 | 우세형 미확정 |
| 관상동맥 | 기시·경로·분기·부착·선택 라벨 | LCx 독립 표기 없음; LAD 주석 충돌 |
| 네 방 단면 | wall/lumen 구분, 중격·판막 관계, clipping 결함 | 임상 표준 단면 승인 전; cap/조직 분할 한계 표시 |
| 승모판·건삭 근접 | leaflet/annulus/papillary 관계 | 건삭 독립 표기·형상 검증 없음; 완성 캡처로 주장하지 않음 |
| RV 내부 | RVOT, moderator band, trabeculae, 유두근 | 여러 세부 구조 미분류·미검수 |
| 대동맥근·판막 근접 | 세 첨판·sinuses·coronary ostia | 각 세부 구조 미검증 |
| 이완기 외형 | 동일 위상 영상과 비교 | 원본 위상 없음 — 해당 결과 제공 불가 |
| 수축기 외형 | 체적·벽 두께·연속 운동 비교 | 동적 형상 없음 — 해당 결과 제공 불가 |

브라우저 동작은 회전·확대·이동·초기화, 선택·격리·숨김·표시·불투명도·라벨,
절단면 이동·초기화와 원본 공간 관계 복원을 실제 화면에서 확인한다. 코드 읽기로 시각 검수를
대체하지 않는다. 표본 비교는 [UMN Atlas](https://www.vhlab.umn.edu/atlas/)와 해부학적 위치 설명을
참고할 수 있지만 다른 기증자를 동일 대상자의 정답 영상으로 사용하지 않는다.

## 8. 외부 대안과 남은 승인 조건

[UMN Heart0141](https://sketchfab.com/3d-models/healthy-young-adult-heart-model-heart0141-a177a01199fd4ab3b5a5f71ad9ee14e2)은
24세 여성·알려진 심장 병력 없음으로 설명된 995,990-face 조직 모델이다. CC BY-NC 4.0이며
공식 다운로드는 인증이 필요해 **메시를 확보하지 못했다**. 0 textures / 0 animations로,
허가된 다운로드 이후에도 단위·축·해상도·형태 검수가 필요하다. 공개 metadata와 접근 결과만
`.local/anatomy-sources/umn-heart0141/evidence-manifest.json`에 보존했다. 이 표본이나 다른 사람의
관상동맥을 HRA에 붙이지 않았다. 후보별 권리·도구·해상도 차이는 [데이터 조사](anatomical-datasets.md)에 기록한다.

승인 전 적격 심장 해부 전문가가 최종 GLB 해시와 구조별 범위에 대해 이름·역할·날짜·기준 자료·
관찰 오류·허용 용도를 기록해야 한다. source review를 자동 승계하지 않는다.
[`anatomy-and-licensing.md`](anatomy-and-licensing.md)의 배포 게이트를 유지하며,
`verify:release`의 미승인 실패를 우회하여 교육 배포·의학 정확성을 주장하지 않는다.


## 9. 실제 실행·화면 검증 — 2026-10-23 최종 기록

| 검사 | 실제 결과 |
| --- | --- |
| `npm run anatomy:acquire -- --verify-only`와 동등한 Python 명령 | 두 원본의 고정 SHA-256 일치. 허가된 공개 버전 파일만 사용. |
| `npm run blender:build` | 통과. 소유 장면과 GLB/Blend/기하 보고서 생성. 초기 중복 면 실패는 숨기지 않고 엄격한 중복 인덱스 예외로 수정 후 재검사. |
| `npm run blender:check` | 최종 강화 검사 통과. 반복 생성, 다른 장면 객체 43개의 포인터·변환·정점/면 해시 보존, 44개 ID, 원본/출력 및 재수입의 좌표·비중복 방향 있는 면 보존. 로그 `.local/anatomy-blender-check.log`. |
| `npm run verify:assets` | 3개 자산 무결성 통과. 외부 런타임 버퍼·영상·동적 모션 없음, provenance 및 보고서 해시 일치. |
| `npm run check` | 통과. Python 10개(공통 잠금 1 + 기하 비교 9), TypeScript 생리 16개, 설정·자산·타입·프로덕션 빌드. 로그 `.local/anatomy-check.log`. |
| `npm run verify:release` | **예상대로 실패(exit 1)**. 세 자산 모두 프로젝트 배포·해부학 승인·검수 해시·서명 증거 미완료. |
| Blender GUI | 공통 MCP 실행기로 작업 전후 실제 장면 읽기. 저장되지 않은 기본 Scene의 Cube/Camera/Light, 위치·프레임·설정 동일. GUI 모델 편집·저장·내보내기 없음. 배경 생성과 구별한다. |
| 전문가 검수 / 대응 원영상 비교 | 수행하지 않음. 해부학적 의료 승인, 정상성, Dice/HD95/벽 두께 정확도를 주장하지 않음. |

브라우저에서 실제 GLB 렌더를 보고 다음을 확인했다:

- 메시 직접 클릭으로 LV 선택, 목록 선택, 개별 숨김/복원(44→43→44), 대혈관 일괄 표시, 분류/구조 격리, 판막 확대.
- 세 재질, 55% 투명도, 선택 라벨, 회전 드래그, 이동 모드 드래그, 스크롤 확대, 카메라 초기화.
- 전/후/상/하 방향과 소스 Z 절단·반전·이동(+16.7 mm), RV의 별도 기하 단면. 단면은 cap 없는 열린 표면이다. 임상 표준 단면으로 판정하지 않았다.
- 판막 격리 후 다른 구조를 격리할 때 숨겨진 판막 초점이 남던 문제를 수정했다. macOS overlay scrollbar가 체크박스 클릭을 가로막던 문제는 목록 안쪽 여백으로 수정하고 실제 포인터/키보드로 재검사했다.
- 390px 화면에서 문서 scrollWidth 390px, 구조 설정의 수직 배치와 직접 숨김 확인. 모바일 실기기/GPU 성능 평가는 수행하지 않았다. 좁은 화면의 카메라는 원본 경계 8개 꼭짓점을 기준으로 맞춘다.
- 재생 중 두 시점의 3D viewport PNG 바이트가 동일함을 확인했다. 생리 시계/수치는 진행하지만 정적 아틀라스는 변형되지 않는다. HFrEF 전환 후 CO 4.54 L/min, EF 38.4%로 재계산되면서 MV 선택과 1개 구조 격리가 유지되었고 기준 상태로 복원했다.

### 실제 캡처와 재현

모델 SHA-256은 5절의 최종 해시이며, 개별 PNG 해시 목록은
[`anatomy-render-evidence.json`](anatomy-render-evidence.json)에 있다. 로컬 이미지들은
`.local/anatomy-evidence/`에 보존한다. 1440px 뷰포트, 크게 보기, 재생 정지, 보기 초기화를
기준으로 아래 설정을 적용하고 anatomy panel을 캡처했다. 표시 이름의 별표는 방향 미검수 상태다.

| 요구 화면 | 실제 증거 및 설정 | 판정 |
| --- | --- | --- |
| 전면 | [anterior.png](../.local/anatomy-evidence/anterior.png): 전체 표면, 조직색, 전면 | 실제 렌더 확인, 해부 승인 아님 |
| 후면 | [posterior.png](../.local/anatomy-evidence/posterior.png): 후면 | LA/폐정맥/하행대동맥 표면 확인; 접합 정확도 미검증 |
| 하면 | [inferior.png](../.local/anatomy-evidence/inferior.png): 하면 | 실제 방향 프리셋 확인; 횡격막면 의료 판정 아님 |
| 관상혈관 | [coronary-network.png](../.local/anatomy-evidence/coronary-network.png): 관상혈관 15개, 전면 | 동맥·정맥 혼합 네트워크. LCx/기시/우세형 미완료 |
| 단면 | [source-z-section.png](../.local/anatomy-evidence/source-z-section.png), [이동 후](../.local/anatomy-evidence/source-z-section-moved.png): 중립, Z, 반대쪽, 0→+16.7mm | **4방 단면의 대체 합격 결과가 아님** |
| 승모판 | [mitral-valve.png](../.local/anatomy-evidence/mitral-valve.png): MV만 확대, 전면 | 원본 단순 판막 표면. 건삭 장치 완성 기준 미충족 |
| RV 내부 | [rv-hidden.png](../.local/anatomy-evidence/rv-hidden.png), [rv-section.png](../.local/anatomy-evidence/rv-section.png): RV 숨김 또는 RV 단독 Z절단 +26.7mm | 내부 구조 접근 확인; 상세 소주·moderator band·두께 검수 없음 |
| 대동맥판 | [aortic-valve.png](../.local/anatomy-evidence/aortic-valve.png): AV만 확대, 상면 | 판막 표면 확인; root/ostia 검증 기준 미충족 |
| 이완기/수축기 | 제공하지 않음 | 원본 위상·동적 형상 없음 |
| 모바일/표시 조작 | [mobile.png](../.local/anatomy-evidence/mobile.png), [transparency-55.png](../.local/anatomy-evidence/transparency-55.png), [panned.png](../.local/anatomy-evidence/panned.png) | 실제 반응형·투명도·이동 확인 |

시각적으로 원본 아틀라스의 비대칭 외형과 구별되는 RV/LV 표면, 대혈관 및 관상 경로가 보인다.
그러나 표면은 매끈하고 판막은 단순하며, 일부 경계·이음·열린 끝이 드러난다. 실물 지방·미세 표면·
건삭의 부재와 잔여 결함을 재질로 숨기지 않았다. **요청한 실물 사진 수준, P0/P1의 전체 의료
수용 기준, P2 생체역학은 미달성**이다. 이 파일의 실행 성공을 그 기준의 통과로 읽으면 안 된다.

최종 새로고침(06:23:40 UTC) 뒤 런타임 오류는 없었다. [최종 화면](../.local/anatomy-evidence/final.png)을 남겼다.

현재 성능 제한: 5,740,860-byte GLB, 약 1.06 MB의 지연 로드 3D JS chunk 경고와 upstream
Three.Clock deprecated 경고가 남아 있다. 요구 시 렌더링과 제한된 DPR을 사용하되 원본 형상을
단순화하지 않았다. 임의 메시 감축 대신 검증 가능한 LOD와 실제 기기 프로파일링이 후속 과제다.
