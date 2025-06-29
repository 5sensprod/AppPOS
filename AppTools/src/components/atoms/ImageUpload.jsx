// src/components/atoms/ImageUpload.jsx
import React, { useState } from 'react';
import { Upload, RefreshCw } from 'lucide-react';

const ImageUpload = ({
  onUpload,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFileSize = 5 * 1024 * 1024, // 5MB
  buttonText = 'Télécharger une image',
  buttonClass = '',
  disabled = false,
  isLoading = false,
  onError,
  children,
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);

  const formatFileSize = (bytes) => {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation du type
    if (!acceptedTypes.includes(file.type)) {
      const error = `Type non supporté. Acceptés: ${acceptedTypes.map((t) => t.split('/')[1]).join(', ')}`;
      onError?.(error);
      return;
    }

    // Validation de la taille
    if (file.size > maxFileSize) {
      const error = `Fichier trop volumineux. Max: ${formatFileSize(maxFileSize)}`;
      onError?.(error);
      return;
    }

    // Simulation de progression
    setUploadProgress(10);
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      await onUpload(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 500);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      onError?.(error.message || 'Erreur upload');
    }

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={disabled || isLoading}
        />

        {children || (
          <button
            type="button"
            className={`
              inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 
              rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 
              bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              ${buttonClass}
            `}
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Upload...' : buttonText}
          </button>
        )}
      </div>

      {/* Barre de progression */}
      {uploadProgress > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Informations de format */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Formats: {acceptedTypes.map((t) => t.split('/')[1].toUpperCase()).join(', ')} • Max:{' '}
        {formatFileSize(maxFileSize)}
      </div>
    </div>
  );
};

export default ImageUpload;
