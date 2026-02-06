
export enum InteractionMode {
  TEXT = 'TEXT',
  VOICE = 'VOICE'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
}
