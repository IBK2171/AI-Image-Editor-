
export type Theme = 'light' | 'dark';

export interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string; // base64 encoded string
  };
}

export interface TextPart {
  text: string;
}

export type ContentPart = ImagePart | TextPart;
