// Tipos específicos para la página de detalle de audio

export interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export interface AlertState {
  show: boolean;
  type: "success" | "error";
  message: string;
}

export interface EditingAudioData {
  blockIndex: number;
  originalScript: string;
  transcription: string;
  currentText: string;
  audioNumber: string;
  sectionIdx?: number;
  audioIdx?: number;
}

export interface RetryTextData {
  audioID?: number;
  index?: number;
  textToUse?: string | null;
  regen: boolean;
}

export interface RetrySectionData {
  sectionId: number;
  remakeALL: boolean;
  texts: RetryTextData[];
}

export interface RetryData {
  sections: RetrySectionData[];
  additionalProp1?: any;
}

export interface ScriptSectionProps {
  script: string[];
  time: string;
  index: number;
  correcciones?: any[];
}

// Acciones del reducer de script
export type ScriptAction =
  | { type: "INIT_SCRIPT"; index: number; script: string[] }
  | { type: "UPDATE_TEXT"; index: number; textIndex: number; value: string }
  | { type: "SET_EDITING"; index: number; isEditing: boolean }
  | { type: "RESTORE_SCRIPT"; index: number; script: string[] };

// Estado del script
export interface ScriptState {
  scripts: { [key: number]: string[] };
  editing: { [key: number]: boolean };
}

// Constantes para los tabs
export const TABS = [
  { id: "questions-answers", label: "Preguntas y respuestas" },
  { id: "script", label: "Guión" },
  { id: "errors", label: "Errores" },
  { id: "history", label: "Historial de Hipnosis" },
] as const;

export type TabId = typeof TABS[number]["id"];

// Constantes para meses
export const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;
