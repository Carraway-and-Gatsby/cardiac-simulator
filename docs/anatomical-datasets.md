# 해부학 데이터 조사와 도입 판정

조사일: 2026-10-23 (Asia/Seoul). 공식 제공처의 자료·이용 조건과 실제 확보 여부를 구분한다.
이번 증분에서는 **HRA 남성 심장 v1.3와 같은 남성 아틀라스의 혈관 v1.3 원본을 확보**하고
44개 원본 메시를 선택했다. 이는 직접 의료영상을 분할한 결과가 아니라 Visible Human 자료에
기반한 아틀라스 재구성이다. 선택한 심장의 정상성·세부 구조·관상동맥 우세형·운동은 미검증이다.
`unreviewed` / `internal-only` 상태를 유지하며, 권위 있는 출처나 공개 라이선스를 프로젝트의
해부학 승인으로 해석하지 않는다. [구조별 검수 기록](ANATOMICAL_VALIDATION.md)을 함께 읽는다.

## 기존 자산과 이번 도입의 차이

- 기존 `build_demo.py`는 RA/LA/RV/LV 네 구체의 기능 시험용 도식이다.
- 기존 `build_procedural.py`는 임의 단위의 외피·네 방·13개 혈관 초안이다. 실제 영상에
  대응하지 않으며 연속 내강·판막·중격·관상혈관·검증된 심근층을 갖추지 않았다.
- HRA 선택 목록은 [`src/data/heart-hra.json`](../src/data/heart-hra.json), 원본 URL·버전·해시·저작자·
  선택 정책은 [`assets/sources/heart-hra.json`](../assets/sources/heart-hra.json)에 기록했다.
  심장 14개와 혈관 30개를 같은 남성 아틀라스 좌표에서 선택한다. 서로 다른 기증자의 형상을 합성하지 않는다.
- 원본은 `.local/anatomy-sources/hra/`에 보존한다. 좌표와 비중복 삼각형을 유지하며 구조 선택과
  메타데이터·렌더링 처리를 분리한다. Blender import에서 동일 vertex-index 중복 면
  **18개(RA 12, LM 5, SVC 1)**가 자동 제거되었다. 선택 원본 267,360개에서 출력 267,342개
  삼각형이 되었고, 원본→import→export 최대 좌표 편차는 0, 추가 면은 0이었다.
  각 중복 그룹에서 원래 방향 중 하나만 남기는 경우를 별도 기록하며, 그 외 면 삭제·반전이나
  좌표 허용오차 확대를 허용하지 않는다. 따라서 모든 삼각형의 개수까지 같다고 주장하지 않고
  **좌표와 비중복 표면 보존**을 기록한다. 잔여 면적 0 삼각형은 RA 812, LM 6, SVC 17개다.
  [기하 보고서](../blender/generated/heart-hra.report.json)의 변환 충실도 통과는 해부학 검사가 아니다.
- `npm run blender:build`는 공통 잠금 아래 별도 Blender 4.5 LTS 프로세스를 사용한다.
  원본 또는 웹 GLB가 바뀌면 해시와 검수 근거를 갱신한다. 원본 검수를 프로젝트 승인으로 승계하지 않는다.

## HRA: 이번에 확보한 기반

| 항목 | 확인한 사실과 제한 |
| --- | --- |
| 실제 파일 | [심장 v1.3 GLB](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-male/v1.3/assets/3d-vh-m-heart.glb), [혈관 v1.3 GLB](https://cdn.humanatlas.io/digital-objects/ref-organ/blood-vasculature-male/v1.3/assets/3d-vh-m-blood-vasculature.glb). 버전 고정 원본·metadata·crosswalk를 확보했다. |
| 증거 종류 | Visible Human 기반 의료 일러스트/참조 아틀라스 재구성이다. 직접 DICOM/NIfTI 분할이나 현재 프로젝트에서 영상과 정합한 표면이 아니다. [HRA 라이브러리](https://humanatlas.io/3d-reference-library), [심장 metadata](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-male/v1.3/metadata.json). |
| 기증자·위상 | Visible Human Male의 성인 자료에 기반한다. 프로젝트 명세에는 38세로 기록한다. 선택한 심장의 질환 여부와 심장 주기 위상은 확인되지 않았다. 단일 기증자를 정상 성인 집단의 대표 형상으로 취급하지 않는다. |
| 원영상 해상도 | NLM 남성 VHP에는 CT 1 mm 간격, MRI 4 mm 간격, 해부 절단 사진 0.33 mm 픽셀·1 mm 간격이 설명되어 있다. **이를 HRA 메시의 분할 해상도·정확도라고 주장하지 않는다.** 개별 구조의 원영상 대응·분할 오차는 제공받지 않았다. [NLM VHP](https://www.nlm.nih.gov/research/visible/visible_human.html). |
| 구조 | 네 방의 조직 표면, 심실중격, 네 정적 판막, 다섯 유두근 표기, 대혈관 15개, 관상 동·정맥 15개를 선택했다. LCx라는 독립 이름은 없고 일부 ontology 표기에 충돌이 있다. |
| 권리 | 두 원본 metadata가 **CC BY 4.0**을 명시한다. 저작자·출처·라이선스·변경 이력을 유지한다. 원본 제작자/검수자와 프로젝트 검수자를 구분한다. [혈관 metadata](https://cdn.humanatlas.io/digital-objects/ref-organ/blood-vasculature-male/v1.3/metadata.json), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). |
| 적합성 | 당장 재현 가능하게 사용할 수 있는 출처·권리가 명확한 구조별 기반이다. 고해상도 실물 표본의 사진 실재감, 미세 판막 장치, 검증된 정상 심장·벽 두께·운동을 달성한 것은 아니다. |

[NIH 3D의 HRA Heart, Male](https://3d.nih.gov/entries/21000?version=1.01)은 이전 HRA v1.2를 가리키는
보조 출처이다. 이번 v1.3의 버전·해시와 혼용하지 않는다. NIH 호스팅 자체를 public domain의 근거로 사용하지 않는다.

## NIH Heart Library와 University of Minnesota

| 자료 | 대상·형식·세부 정보 | 이용 조건·확보 결과·적합성 |
| --- | --- | --- |
| [NIH Heart Library](https://3d.nih.gov/collections/heart-library) | 환자 영상 기반 모델이지만 선천성 심장질환에 중점을 둔다. 개별 나이·질환·조직 종류를 검토해야 한다. | [3DPX-002636](https://3d.nih.gov/entries/2636?version=2)은 정상으로 기술된 **17세 여성**의 이완기 CT 모델이다. 성인으로 확대·재표시하지 않는다. 페이지도 판막 세부 재현 한계를 설명한다. 이번 기반으로 도입하지 않았다. |
| [UMN Atlas](https://www.vhlab.umn.edu/atlas/) | 기증 표본의 영상·조직 모델·혈액 공간 모델·실물 스캔을 구분한다. [제작 설명](https://www.vhlab.umn.edu/atlas/3dmodeling/index.shtml)은 CT/MRI와 Mimics를 사용하며 정상 치수에 가까워도 질환이 있을 수 있다고 설명한다. | 이미지·영상의 교육 이용 문구는 메시 전체의 재배포 허가가 아니다. 개별 라이선스를 확인한다. 대학의 [리소스 페이지](https://med.umn.edu/vhlab/resources)가 VisibleHeartLabs Sketchfab에 연결된다. |
| [UMN Heart0141](https://sketchfab.com/3d-models/healthy-young-adult-heart-model-heart0141-a177a01199fd4ab3b5a5f71ad9ee14e2) | **24세 여성, 알려진 심장 병력 없음**. 조직 모델이며 혈액 공간 주형이 아니다. 관상정맥동 주변 지방과 대동맥 세 분지가 설명된다. 공개 metadata: 995,990 faces, 497,353 vertices, 0 textures, 1 material, 0 animations. 개별 촬영 방식·복셀 간격·단위·축·분할 검수자 미확인. | **CC BY-NC 4.0**. 비상업적 복제·수정·재배포에 출처·변경 표기 필요. 공개 `/download` API는 **401 인증 필요**를 반환했다. UMN 항목도 Sketchfab에 연결되며 직접 파일 다운로드는 확인하지 못했다. **메시 미확보**; metadata만 `.local/anatomy-sources/umn-heart0141/`에 해시와 함께 보존했다. [metadata](https://api.sketchfab.com/v3/models/a177a01199fd4ab3b5a5f71ad9ee14e2), [UMN 항목](https://www.vhlab.umn.edu/cgi-bin/getItem.cgi?db_id=4746), [라이선스](https://creativecommons.org/licenses/by-nc/4.0/). |

UMN [기증자 이력](https://www.vhlab.umn.edu/atlas/histories/histories.shtml)과 개별 설명을 함께 확인했다.
인기 실물 스캔 Heart0142는 **14세 남성**이다. Heart0146은 18세지만 설명에 LAD 스텐트가 있고,
Heart0147에는 가능한 심장 내 구멍이 기술된다. Fresh0604는 기증자 표의 31세 남성과 모델 설명의
34세 여성이 충돌한다. 이들을 정상 성인 기준으로 선택하지 않았다. Heart0063의 관상동맥은
59세 여성의 별도 표본이므로 HRA나 Heart0141에 붙여 동일 대상자의 형상처럼 제시하지 않는다.

## CAP: 데이터셋마다 다른 권리와 범위

CAP 전체를 제한 자료로 분류한 이전 결론을 수정한다. [공식 홈페이지](https://www.cardiacatlas.org/)는
데이터 기여자별 조건을 적용하면서 공개 자료와 신청 자료를 구별한다.

| 데이터셋 | 확인한 범위·해상도·대상 | 권리·실제 접근·판정 |
| --- | --- | --- |
| [Sunnybrook Cardiac Data](https://www.cardiacatlas.org/sunnybrook-cardiac-data/) | 45개 cine-MRI 연구: 건강군 9, 비대 12, 경색 동반/비동반 심부전 각각 12. LV 수동 윤곽과 3D 유한요소 모델. 전체 심장·판막·관상혈관 분할은 아니다. 개별 연령·촬영 간격·파일은 이번에 검사하지 않았다. | **원자료와 파생물 모두 CC0 1.0**으로 명시한다. 공개 페이지가 DICOM 묶음·환자 표·LV 모델·윤곽을 열거하지만 이번에는 실제 파일을 확보하지 않았다. LV 용적·운동 검증 후보이며 P0 실물형 전체 심장 대체재는 아니다. |
| [AMRG Cardiac Atlas](https://www.cardiacatlas.org/amrg-cardiac-atlas/) | 정상 **25세 남성**, 1.5 T Siemens Avanto. T1 1.37 × 1.37 mm / 6 mm, cine 1.25 × 1.25 mm / 6 mm, phase contrast 1.37 × 1.37 mm / 8 mm, tagging 1.33 × 1.33 mm / 8 mm. cine 32개 시점. 명명된 영상면은 있으나 수동 분할 없음. | CAP 홈페이지는 **public domain**, 신청 불필요 자료로 설명한다. 실제 영상 미확보. 학습·운동 연구 후보지만 두꺼운 슬라이스에서 건삭·얇은 첨판을 정확히 재구성할 수 있다고 주장하지 않는다. |
| [biv-me rescans](https://www.cardiacatlas.org/biv-me-rescans/) | 건강한 대상자 10명의 두 시점 cine-CMR와 시간에 따른 양심실 VTK 표면. 전 심장의 세부 조직 모델은 아니다. | 기관 이메일 신청 필요. 지정 접근자 외에는 동의 없는 복제·배포·공개 금지. 연구용 CC BY-NC-SA 4.0 제공 가능 문구가 있지만 개별 제공 조건 확인 전 재배포 허가로 단정하지 않는다. 미신청·미확보. |
| MESA / DETERMINE / 기타 CAP | 코호트별 영상·모델·병력이 다르다. 무증상 집단이라는 이름만으로 각 자산의 정상성을 보증하지 않는다. | 기여자 승인·데이터셋별 계약을 따른다. Sunnybrook의 CC0를 다른 CAP 자료에 적용하지 않는다. [CAP 이용자 정책](https://cardiacatlasproject.isd.kcl.ac.uk/wp-content/uploads/2022/10/CAPPolicyStatementUsers.pdf). |

## 제한·추가 후보

| 자료 | 확인한 사실 | 판정 |
| --- | --- | --- |
| [MM-WHS](https://zmiclab.github.io/zxh/0/mmwhs/) | 60 CT/CTA + 60 MRI, 학습 각 20건. 7개 분할: 네 방의 혈액 공간, LV 심근, 상행대동맥, 폐동맥. 연령·질환·위상·간격은 개별 파일로 검사하지 않았다. | 등록 서명과 **제3자 공유 금지**를 명시한다. 계약에는 challenge 목적 제한·24개월 이내 삭제도 있다. 미신청·미확보; 웹 GLB 재배포 근거가 아니다. [데이터](https://zmiclab.github.io/zxh/0/mmwhs/data.html), [계약](https://zmiclab.github.io/zxh/0/mmwhs/res/Data_Access_Agreement_for_Participants.pdf). |
| [ACDC](https://www.creatis.insa-lyon.fr/Challenge/acdc/databases.html) | 임상 cine-MRI 150건, 5개 군; 학습 100건에 전문가 참조 분할과 이완기·수축기 시점. | 확인한 설명만으로 웹 메시·파생물 공개 재배포 허가를 확정하지 못했다. 미확보; 권리·구조 범위·해상도 확인 전 보류. [학습 자료](https://www.creatis.insa-lyon.fr/Challenge/acdc/databasesTraining.html). |
| [BodyParts3D 아카이브](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html) | 성인 남성 해부 구조·FMA 정보. v4.0 다운로드에는 99% polygon reduction OBJ 묶음이 있다. | 현재 아카이브는 CC BY 4.0을 명시하지만 [과거 원사이트](https://lifesciencedb.jp/bp3d/info_en/license/index.html)는 CC BY-SA 2.1 Japan이다. 선택 파일과 내부 고지를 함께 확인한다. 미확보; 얇은 구조의 축소 영향 미검사. [다운로드](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html), [현재 조건](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html). |
| [Human Organ Atlas / HiP-CT](https://human-organ-atlas.esrf.eu/) | 2024년 연구 대조군은 알려진 심장질환 없는 **63세 남성**; 비교군은 심혈관질환이 있는 87세 여성. 고정된 ex vivo 심장을 약 20 μm 등방 복셀, 일부 영역을 6.4/2.3 μm까지 촬영했다. 심근·판막·관상혈관의 강한 후속 후보. | 논문 CC BY 4.0과 개별 데이터 권리를 혼동하지 않는다. 이번에는 특정 파일의 라이선스·접근·분할 라벨·용량을 확인하여 확보하지 못했다. 바로 사용할 표면이나 운동 자료를 확보한 것으로 기록하지 않는다. [원논문](https://pubs.rsna.org/radiology/doi/10.1148/radiol.232731). |

## 3D Slicer / SlicerHeart 도구 평가

[3D Slicer](https://www.slicer.org/)와 [SlicerHeart](https://slicerheart.org/SlicerHeart/)는 처리 도구이며
그 자체가 정상 성인 데이터나 예제 환자의 재배포 허가는 아니다. [SlicerHeart 공식 코드](https://github.com/SlicerHeart/SlicerHeart)는
BSD 3-Clause이며 심장 영상 입출력, 판막 체적 분할, 첨판 표면 생성, 유두근·건삭 계측,
cine-MRI 재구성과 FEBio용 판막·분지 건삭 내보내기를 제공한다. 이번 HRA 가져오기를
SlicerHeart 분할이나 유한요소 판막 해석을 실행한 것으로 표시하지 않는다.

향후 허가된 원영상의 spacing·origin·direction·위상을 고정한 채 분할하고 대응 표면을 추출한다.
[Slicer 좌표 문서](https://slicer.readthedocs.io/en/latest/user_guide/coordinate_systems.html)에 따르면
내부 좌표는 RAS이며 파일은 별도 명시가 없으면 LPS로 취급한다. LPS↔RAS는 첫 두 축 부호를 바꾼다.
이 변환과 웹 Y-up 변환을 구분하여 행렬·단위·좌우를 검증한다. STL 단위나 영상 위상을 파일 이름만 보고 추정하지 않는다.

## 현재 결정과 후속 조건

이번 기반은 **원본 형상을 보존하는 HRA 44개 구조의 미검수 아틀라스**이다. 더 상세한 UMN Heart0141은
성인 조직 후보로 남지만 인증된 다운로드·출처 단위·검수가 필요하다. 현재 확보한 자료로 완전한
정상 성인 실물 표본, 사진 수준 외관, 세부 판막 장치, 실제 심근 운동을 완성했다고 선언하지 않는다.

새 데이터에는 원본 해시, 기증자 연령·질환, 조직/혈액 공간 구분, 영상 위상·간격, 라이선스와
수정·재배포 조건, 비식별화 근거를 기록한다. 없는 구조를 임의 도형으로 보충하지 않는다.
다른 표본과의 합성은 별도 추정 재구성으로 분류한다. 전문가 검수와 현재 GLB 해시가 일치하기
전에는 배포 게이트를 승인하지 않는다.
