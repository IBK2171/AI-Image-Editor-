
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ContentPart } from "../types";

/**
 * Edits an image using the Gemini 2.5 Flash Image model based on a text prompt.
 *
 * @param base64ImageData The base64 encoded string of the original image.
 * @param mimeType The MIME type of the original image (e.g., 'image/png', 'image/jpeg').
 * @param prompt The text prompt describing the desired image edit.
 * @returns A promise that resolves with an object containing the base64 encoded string and MIME type of the edited image, or null if an error occurs.
 */
export const editImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
): Promise<{ data: string; mimeType: string } | null> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set in environment variables.");
  }

  // CRITICAL: Create a new GoogleGenAI instance right before making an API call
  // to ensure it always uses the most up-to-date API key from the dialog.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const contents: ContentPart[] = [
    {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType,
      },
    },
    {
      text: prompt,
    },
  ];

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: contents },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const editedImagePart = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.mimeType?.startsWith('image/'),
    );

    if (editedImagePart?.inlineData?.data && editedImagePart.inlineData.mimeType) {
      return {
        data: editedImagePart.inlineData.data,
        mimeType: editedImagePart.inlineData.mimeType,
      };
    } else {
      console.error("Gemini API response did not contain image data or mimeType.", response);
      return null;
    }
  } catch (error) {
    console.error("Error editing image with Gemini API:", error);
    throw new Error(`Failed to edit image: ${error instanceof Error ? error.message : String(error)}`);
  }
};
