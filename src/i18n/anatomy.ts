import type { Locale } from '../i18n';

// Display translations only: the source JSON, identifiers and geometry remain unchanged.
export const anatomyLabels = {
  RA: 'Right atrium', LA: 'Left atrium', RV: 'Right ventricle', LV: 'Left ventricle',
  IVS: 'Interventricular septum', MV: 'Mitral valve', TV: 'Tricuspid valve',
  AV: 'Aortic valve', PVvalve: 'Pulmonary valve',
  PM_ANT: 'Anterior papillary muscle · source assignment unresolved',
  PM_AL: 'Anterolateral papillary muscle', PM_SEPT: 'Septal papillary muscle',
  PM_POST: 'Posterior papillary muscle', PM_PM: 'Posteromedial papillary muscle',
  AO: 'Ascending aorta', ARCH: 'Aortic arch', BCA: 'Brachiocephalic artery · proximal',
  LCCA: 'Left common carotid artery · proximal', LSA: 'Left subclavian artery · proximal',
  DAO: 'Descending aorta · thoracic extent', PT: 'Pulmonary trunk',
  LPA: 'Left pulmonary artery', RPA: 'Right pulmonary artery',
  RIPV: 'Right inferior pulmonary vein', RSPV: 'Right superior pulmonary vein',
  LIPV: 'Left inferior pulmonary vein', LSPV: 'Left superior pulmonary vein',
  SVC: 'Superior vena cava', IVC: 'Inferior vena cava · proximal',
  LM: 'Left main coronary artery', LAD: 'Left anterior descending artery · source annotation conflict',
  RCA: 'Right coronary artery', RM: 'Right marginal artery',
  RPDA: 'Right posterior descending branch · source label',
  DIAG1: 'Diagonal branch 1 · source label', DIAG2: 'Diagonal branch 2 · source label',
  LMARG: 'Left marginal branch', GCV: 'Great cardiac vein', MCV: 'Middle cardiac vein',
  OVLA: 'Oblique vein of left atrium', ACV: 'Anterior cardiac vein', CS: 'Coronary sinus',
  PVLV: 'Posterior vein of left ventricle', SCV: 'Small cardiac vein',
} as const;

const atlasNote = 'Static atlas reconstruction based on the Visible Human. Segmentation, wall thickness, normal anatomy and cardiac-cycle phase have not been validated in this project.';
const chamberNote = `${atlasNote} The original geometry includes outer and inner tissue surfaces; no separate blood-pool mesh is provided.`;
const valveNote = 'Original static valve mesh. Individual leaflets, chordae tendineae and commissures are not separately classified. Anatomical review and validation of valve dynamics remain incomplete.';
const muscleNote = 'Original surfaces and classification are preserved. Attachments and detailed terminology require separate expert review.';
const vesselNote = 'Original mesh in the same male atlas coordinate system. Only proximal meshes already separated in the source were selected; no cutting, additional branches or registration deformation was applied. Lumen continuity and vessel origins await review.';
const coronaryNote = 'Original vessel surface from the same atlas. Origins, continuity and coronary dominance await review. This mesh set has no separately named LCx structure.';
export const anatomyNotes: Record<keyof typeof anatomyLabels, string> = {
  RA: chamberNote, LA: chamberNote, RV: chamberNote, LV: chamberNote, IVS: atlasNote,
  MV: valveNote, TV: valveNote, AV: valveNote, PVvalve: valveNote,
  PM_ANT: 'The source crosswalk identifies this as an anterior papillary muscle of the left ventricle (FMA:7264), but its surface lies toward the right ventricle, suggesting an assignment conflict. It has not been arbitrarily reassigned to the right ventricle; the ontology ID and ventricular assignment remain unresolved.',
  PM_AL: muscleNote, PM_SEPT: muscleNote, PM_POST: muscleNote, PM_PM: muscleNote,
  AO: vesselNote, ARCH: vesselNote, BCA: vesselNote, LCCA: vesselNote, LSA: vesselNote,
  DAO: vesselNote, PT: vesselNote, LPA: vesselNote, RPA: vesselNote,
  RIPV: vesselNote, RSPV: vesselNote, LIPV: vesselNote, LSPV: vesselNote, SVC: vesselNote, IVC: vesselNote,
  LM: coronaryNote,
  LAD: 'The source node is named left_anterior_descending_artery, but the crosswalk FMA:8636 and label conflict by identifying an anterior descending branch of the left pulmonary artery. The displayed name provisionally follows the source node; the correct ontology mapping and anatomical connections await review.',
  RCA: coronaryNote, RM: coronaryNote, RPDA: coronaryNote, DIAG1: coronaryNote,
  DIAG2: 'This name exists in the source as a mesh separate from the other diagonal branch. It has not been renamed based on an assumption that it represents the LCx. The vessel course and annotation correspondence await review.',
  LMARG: coronaryNote, GCV: coronaryNote, MCV: coronaryNote, OVLA: coronaryNote,
  ACV: coronaryNote, CS: coronaryNote, PVLV: coronaryNote, SCV: coronaryNote,
};

export function structureLabel(item: { id: string; label: string }, locale: Locale) {
  return locale === 'ko' ? item.label : anatomyLabels[item.id as keyof typeof anatomyLabels];
}
export function structureNote(item: { id: string; note: string }, locale: Locale) {
  return locale === 'ko' ? item.note : anatomyNotes[item.id as keyof typeof anatomyLabels];
}
