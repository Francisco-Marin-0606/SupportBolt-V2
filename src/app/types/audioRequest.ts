export type AudioRequestStatus = 'pending' | 'created' | 'sended' | 'completed' | 'error' | 'review';

interface AdditionalData {
  formName: string;
  name: string;
  gender: string;
  [key: string]: unknown;
}

export interface AudioRequestStats {
  totalRequests: number;
  byStatus: {
    pending: number;
    created: number;
    sended: number;
    completed: number;
    error: number;
    review: number;
  }
}

export interface QuestionAnswer {
  question: string;
  answer: string;
}

export interface AudioItem {
  audioID: number;
  format: string;
  path: string;
  text: string;
  textHistorial: string[];
  static: boolean;
  transcription?: string | null;
  completed: boolean;
  [key: string]: unknown;
}

export interface GeneratedSection {
  sectionID: number;
  questions: QuestionAnswer[];
  texts: string[];
  path: string;
  audios: AudioItem[];
  completed: boolean;
  [key: string]: unknown;
}

export interface AudioMotive {
  voice: string;
  export: string;
  frontAnalysis?: string;
  fullAnalysis?: string;
  postHypnosis?: string;
  questions: QuestionAnswer[];
  generatedText?: Array<{ texts: string[] }> | string[] | null;
  generatedSections?: GeneratedSection[] | null;
  [key: string]: unknown;
}

export interface RetrySectionTextUpdate {
  index: number;
  textToUse?: string | null;
  regen: boolean;
}

export interface RetrySection {
  sectionId: number;
  remakeALL: boolean;
  texts: RetrySectionTextUpdate[];
}

export interface RetryConfig {
  sections: RetrySection[];
}

export interface LabSectionSettings {
  assistant: string;
  questions: number[];
  preprocessors: unknown[];
  shouldBeMoreOrEqualTo: number;
}

export interface ToggleAnalysisSettings {
  assistant: string;
  questions: number[];
  enabled: boolean;
}

export interface LabSettings {
  sections: LabSectionSettings[];
  frontAnalysis: ToggleAnalysisSettings;
  fullAnalysis: ToggleAnalysisSettings;
  _v?: number;
}

export interface EffectsSettings {
  useReverb: boolean;
  reverbIntensity: number;
}

export interface SectionSettings {
  startTime: number;
  endTime: number;
  msSilenceBeforeNextSection: number;
  effectsSettings: EffectsSettings;
}

export interface ExportSettings {
  _id?: string;
  userLevel?: number;
  backgroundMusicFormat?: string;
  sectionsSettings: SectionSettings[];
  language: "es" | "en";
  audioImg?: string;
  _v?: number;
}

export interface AppQuestionSetting {
  question: string;
  description?: string;
  referenceQuestion?: string;
  type: string;
  templateHandler: boolean;
  customizable: boolean;
  optional?: boolean;
  options: unknown[];
}

export interface GenderImages {
  base: string;
  male: string;
  female: string;
  femaleGray?: string;
  maleGray?: string;
}

export interface GenderTitle {
  base: string;
  male: string;
  female: string;
}

export interface GenderAudioDescription {
  base: string;
  male: string;
  female: string;
}

export interface FormSettings {
  backgroundColor: string;
  imagePlayer: string;
  genderImage: GenderImages;
  genderTitle: GenderTitle;
  genderAudioDescription: GenderAudioDescription;
}

export interface AppSettings {
  questions: AppQuestionSetting[];
  formSettings: FormSettings;
  _v?: number;
  questionsFemale: unknown[];
  questionsMale: unknown[];
}

export interface GenerativeFormSettings {
  assistant: string;
}

export interface TemplateSettings {
  templates: string;
}

export interface CustomizationPostHypnosis {
  assistant: string;
  genderImage: {
    base: string;
    male: string;
    female: string;
  }
}

export interface CustomizationSettings {
  frontAnalysis?: ToggleAnalysisSettings;
  postHypnosis?: CustomizationPostHypnosis;
}

export interface Settings {
  userLevel?: string;
  year?: string | number;
  month?: string | number;
  labSettings?: LabSettings;
  exportSettings?: ExportSettings;
  appSettings?: AppSettings;
  generativeFormSettings?: GenerativeFormSettings;
  templateSettings?: TemplateSettings;
  customization?: CustomizationSettings;
  _id?: { $oid: string } | string;
  createdAt?: { $date: string } | string;
  updatedAt?: { $date: string } | string;
}

export interface UserDataLite {
  _id: string;
  email: string;
  names: string;
  lastnames: string;
  wantToBeCalled: string;
  gender: string;
  birthdate: string;
  language?: "es" | "en";
  [key: string]: unknown;
}

export interface ErrorAudioFailure {
  audio: AudioItem;
  error: string;
}

export interface ErrorAdditionalInfo {
  taskID: string;
  section?: GeneratedSection;
  successfulAudios?: AudioItem[];
  failedAudios?: ErrorAudioFailure[];
  traceback?: string;
  failedSection?: GeneratedSection;
  [key: string]: unknown;
}

export interface AudioRequestErrorStatus {
  status: string;
  source: string;
  action: string;
  message: string;
  date: string;
  additionalInfo?: ErrorAdditionalInfo;
}

export interface AudioRequest {
  // Identificación básica
  id?: string;
  _id?: string;
  userId: string;
  email: string;

  // Fechas principales (acepta string/Date por compatibilidad)
  requestDate: string | Date;
  membershipDate: string | Date;
  publicationDate?: string | Date;

  // Estado
  status: AudioRequestStatus;
  version?: string;

  // Datos de contenido
  title?: string;
  audioUrl?: string;
  audioUrlPlay?: string;

  // Datos adicionales del formulario
  additionalData?: AdditionalData;

  // Motivo y generación de contenido
  audioMotive: AudioMotive | null;

  // Datos de usuario y nivel
  userLevel?: string;
  userData?: UserDataLite;

  // Configuraciones
  settings?: Settings | null;
  retry?: RetryConfig;

  // Errores y trazas
  errorStatus?: AudioRequestErrorStatus[] | null;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };

  // Metadatos
  createdAt?: string | Date;
  updatedAt?: string | Date;

  [key: string]: unknown; // Compatibilidad con Record<string, unknown>
}

/* Ejemplo de documento recibido (recortado) basado en el nuevo esquema provisto por backend */