
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { editImage } from '../services/geminiService';

/**
 * Helper function to convert a base64 image from one MIME type to another using a Canvas.
 * This is necessary if the model returns an image in a format different from the user's preference.
 * @param base64Data The base64 encoded image data (without "data:mime/type;base64," prefix).
 * @param sourceMimeType The MIME type of the input base64 data.
 * @param targetMimeType The desired MIME type for the output.
 * @returns A promise that resolves with the base64 encoded string of the converted image.
 */
const convertImageToBase64 = (
  base64Data: string,
  sourceMimeType: string,
  targetMimeType: 'image/png' | 'image/jpeg',
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (sourceMimeType === targetMimeType) {
      resolve(base64Data);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context for conversion.'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        // JPEG quality can be adjusted, 0.9 is a good balance
        const quality = targetMimeType === 'image/jpeg' ? 0.9 : undefined;
        const convertedDataUrl = canvas.toDataURL(targetMimeType, quality);
        resolve(convertedDataUrl.split(',')[1]); // Return only the base64 part
      } catch (e) {
        reject(new Error(`Failed to convert image to ${targetMimeType}: ${e instanceof Error ? e.message : String(e)}`));
      }
    };
    img.onerror = (e) => {
      reject(new Error(`Failed to load image for conversion: ${e instanceof Event ? e.type : String(e)}`));
    };
    img.src = `data:${sourceMimeType};base64,${base64Data}`;
  });
};


const ImageEditor: React.FC = () => {
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [outputFormatPreference, setOutputFormatPreference] = useState<'image/png' | 'image/jpeg'>('image/png');


  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setEditedImageUrl(null);
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedImageFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImageFile(null);
      setPreviewImageUrl(null);
    }
  }, []);

  const handleEditImage = useCallback(async () => {
    if (!selectedImageFile || !prompt.trim()) {
      setError('Please select an image and enter a prompt.');
      return;
    }

    setLoading(true);
    setError(null);
    setEditedImageUrl(null); // Clear previous edited image

    const reader = new FileReader();
    reader.readAsDataURL(selectedImageFile);

    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = selectedImageFile.type;

        const result = await editImage(base64Data, mimeType, prompt);

        if (result && result.data && result.mimeType) {
          // Convert the image to the user's preferred output format
          const convertedBase64 = await convertImageToBase64(
            result.data,
            result.mimeType,
            outputFormatPreference
          );
          setEditedImageUrl(`data:${outputFormatPreference};base64,${convertedBase64}`);
        } else {
          setError('No edited image was returned or it was incomplete.');
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during image editing.',
        );
        console.error('Image editing failed:', err);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setLoading(false);
      setError('Failed to read image file.');
    };
  }, [selectedImageFile, prompt, outputFormatPreference]);

  // Cleanup effect for preview URL object URLs if used
  useEffect(() => {
    return () => {
      if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }
      if (editedImageUrl && editedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(editedImageUrl);
      }
    };
  }, [previewImageUrl, editedImageUrl]);


  return (
    <div className="flex flex-col items-center p-4 sm:p-6 md:p-8 bg-white dark:bg-gray-900 rounded-lg shadow-xl transition-colors duration-300 ease-in-out w-full max-w-4xl mx-auto">
      <h2 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-6 text-center transition-colors duration-300 ease-in-out">
        AI Image Editor
      </h2>

      {/* Image Upload and Prompt Input */}
      <div className="flex flex-col sm:flex-row gap-6 w-full mb-8">
        <div className="flex-1 flex flex-col items-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-emerald-500 transition-colors duration-300 ease-in-out cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            aria-label="Upload image"
          />
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-h-64 object-contain rounded-lg shadow-md transition-all duration-300 ease-in-out mb-4"
            />
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center flex flex-col items-center justify-center h-full">
              <svg
                className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                ></path>
              </svg>
              <p className="text-lg font-medium">Click to upload an image</p>
              <p className="text-sm">PNG, JPG, GIF up to 10MB</p>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          <textarea
            className="w-full p-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 outline-none transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none h-32 mb-4"
            placeholder="e.g., 'Add a retro filter', 'Remove the person in the background'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            aria-label="Image editing prompt"
          ></textarea>

          <div className="flex items-center gap-2 mb-4">
            <label htmlFor="output-format" className="text-gray-700 dark:text-gray-300 font-medium">
              Output Format:
            </label>
            <select
              id="output-format"
              value={outputFormatPreference}
              onChange={(e) => setOutputFormatPreference(e.target.value as 'image/png' | 'image/jpeg')}
              className="flex-grow p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 outline-none transition-all duration-300 ease-in-out"
              aria-label="Select output image format"
            >
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
            </select>
          </div>

          <button
            onClick={handleEditImage}
            disabled={!selectedImageFile || !prompt.trim() || loading}
            className="w-full px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:focus:ring-emerald-400"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Editing...
              </span>
            ) : (
              'Edit Image'
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="bg-red-100 dark:bg-red-800 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded relative w-full mb-6 transition-all duration-300 ease-in-out"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}

      {/* Edited Image Display */}
      {editedImageUrl && (
        <div className="w-full text-center">
          <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mb-4 transition-colors duration-300 ease-in-out">
            Edited Image:
          </h3>
          <img
            src={editedImageUrl}
            alt="Edited"
            className="max-h-96 object-contain rounded-lg shadow-lg mx-auto transition-all duration-500 ease-in-out transform hover:scale-105"
          />
        </div>
      )}
    </div>
  );
};

export default ImageEditor;
