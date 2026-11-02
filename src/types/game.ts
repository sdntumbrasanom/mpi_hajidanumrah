export type WorshipType = 'umrah' | 'tamattu' | 'qiran' | 'ifrad';

export type GenderType = 'putra' | 'putri';

export type StationKind =
  | 'miqat'
  | 'ihram_haji_hotel'
  | 'ihram_tanah_halal'
  | 'tawaf'
  | 'tawaf_wada'
  | 'sai'
  | 'tawaf_sai_gabung'
  | 'tahallul_umrah_lepas'
  | 'tahallul_awal'
  | 'tahallul_tsani'
  | 'tahallul'
  | 'tahallul_dan_wada'
  | 'wukuf'
  | 'mabit_muzdalifah'
  | 'jumrah_aqabah'
  | 'jumrah_tasyrik'
  | 'bayar_dam';

export type BadgeEmblem =
  | 'ihram'
  | 'kaaba'
  | 'sai'
  | 'dam'
  | 'arafah'
  | 'jumrah'
  | 'crown';

export interface VideoScene {
  title: string;
  narration: string;
  arabicText?: string;
  arabicMeaning?: string;
  visualType:
    | 'ihram_change'
    | 'kaaba_orbit'
    | 'sai_hills'
    | 'arafah_sun'
    | 'mina_pebbles'
    | 'tahallul_scissors'
    | 'dam_gift';
  durationSec: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  emblem: BadgeEmblem;
  accentHex: string;
}

export interface StationConfig {
  stepNumber: number;
  id: string;
  kind: StationKind;
  title: string;
  shortLabel: string;
  locationName: string;
  worldPos: [number, number, number];
  summary: string;
  childInstruction: string;
  targetCount: number;
  pointsReward: number;
  badge: BadgeInfo;
  videoScenes: VideoScene[];
  quiz: QuizQuestion[];
}

export interface WorshipProgram {
  id: WorshipType;
  name: string;
  subtitle: string;
  niatArabic: string;
  niatLatin: string;
  niatMeaning: string;
  damRule: string;
  colorHex: string;
  stations: StationConfig[];
}

export interface LeaderboardEntry {
  id: string;
  studentName: string;
  teacherPhone?: string;
  gender: GenderType;
  worshipType: WorshipType;
  points: number;
  completedStationIds: string[];
  totalStations: number;
  badges: BadgeEmblem[];
  updatedAt: number;
  completedAt?: number;
  isCurrentPlayer?: boolean;
}

export interface TeacherConfig {
  teacherName: string;
  teacherPhone: string;
  schoolName: string;
}

export type GameScreen = 'title' | 'playing' | 'victory';

export interface LiveSimulationProgress {
  stationId: string | null;
  stationKind: StationKind | null;
  currentCount: number;
  targetCount: number;
  subStepLabel: string;
  hintMessage: string;
  warningMessage: string | null;
  canTriggerAction: boolean;
  actionButtonLabel: string | null;
  distanceToActiveStation: number;
  nearStationPortal: boolean;
}
