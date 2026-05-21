import React, { useCallback, useState } from 'react';
import { propertyService } from '@shared/api/properties.service';
import styles from './ImageUploader.module.css';

interface ImageUploaderProps {
  images: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onChange,
  maxFiles = 10,
  maxSizeMB = 10,
}) => {
  const [previews, setPreviews] = useState<string[]>(images);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError('');
    const fileArray = Array.from(files);

    if (previews.length + fileArray.length > maxFiles) {
      setError(`Max ${maxFiles} files allowed`);
      return;
    }

    for (const file of fileArray) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File ${file.name} too large. Max ${maxSizeMB}MB`);
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError(`File ${file.name} has unsupported type. Use JPG, PNG, or WebP`);
        return;
      }
    }

    setIsUploading(true);
    try {
      const newUrls = await propertyService.uploadImages(fileArray);
      const allUrls = [...previews, ...newUrls];
      setPreviews(allUrls);
      onChange(allUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [previews, onChange, maxFiles, maxSizeMB]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeImage = useCallback((index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onChange(newPreviews);
  }, [previews, onChange]);

  return (
    <div className={styles.container}>
      <div
        className={styles.dropZone}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {isUploading ? (
          <div className={styles.uploading}>Uploading...</div>
        ) : (
          <label className={styles.label}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Drop images here or click to select</span>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className={styles.fileInput}
            />
          </label>
        )}
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {previews.length > 0 && (
        <div className={styles.previews}>
          {previews.map((url, index) => (
            <div key={index} className={styles.preview}>
              <img src={url} alt={`Upload ${index + 1}`} className={styles.previewImg} />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeImage(index)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
