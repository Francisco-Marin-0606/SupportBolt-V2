import { AudioRequest } from "./audioRequest";

export interface AudioItem {
  audioUrl: string;
  audioRequestId: string;
  title: string;
  description?: string;
  formattedDuration?: string;
  imageUrl?: string;
  userLevel?: string;
  publicationDate?: Date;
  customData: {
    name: string
  };
  [key: string]: unknown;
}

export interface Audio {
  _id: string;
  userId: string;
  audios: AudioItem[];
  createdAt?: Date;
  updatedAt?: Date;
} 

export interface UnifiedAudioRequest extends AudioRequest {
  imageUrl?: string;
  formattedDuration?: string;
  customData?: any;
}