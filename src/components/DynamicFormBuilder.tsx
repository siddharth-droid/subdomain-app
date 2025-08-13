'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

export interface InputField {
  id: string;
  name: string;
  type: string;
  display_name?: string;
  placeholder?: string;
  required: boolean;
  value?: any;
  list?: boolean;
  multiline?: boolean;
  password?: boolean;
  options?: string[];
  temp_file?: boolean;
  info?: string;
}

export interface FlowFormData {
  [key: string]: any;
}

export interface UploadedFile {
  file_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
}

interface UploadProgress {
  [fileName: string]: number;
}


export interface DynamicFormBuilderProps {
  fields: InputField[];
  onSubmit: (data: FlowFormData, files: { [key: string]: File }) => Promise<void>;
  onReset?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  resetLabel?: string;
  className?: string;
  apiKey?: string;
}

export default function DynamicFormBuilder({
  fields,
  onSubmit,
  onReset,
  isSubmitting = false,
  submitLabel = "Execute Flow",
  resetLabel = "Reset",
  className = "",
  apiKey
}: DynamicFormBuilderProps) {
  const [formData, setFormData] = useState<FlowFormData>({});
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [fileInputMode, setFileInputMode] = useState<{ [key: string]: 'upload' | 'path' }>({});
  
  // Enhanced file upload states
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File[] }>({});
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: UploadProgress }>({});
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: UploadedFile[] }>({});
  const [dragActive, setDragActive] = useState<{ [key: string]: boolean }>({});
  const [copiedFiles, setCopiedFiles] = useState<{ [key: string]: boolean }>({});

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Initialize form data with default values
  useEffect(() => {
    const initialData: FlowFormData = {};
    fields.forEach(field => {
      if (field.value !== undefined) {
        initialData[field.id] = field.value;
      } else if (field.list) {
        initialData[field.id] = [];
      } else {
        initialData[field.id] = "";
      }
    });
    setFormData(initialData);
  }, [fields]);



  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleFileChange = (fieldId: string, file: File | null) => {
    if (file) {
      setFiles(prev => ({
        ...prev,
        [fieldId]: file
      }));
    } else {
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[fieldId];
        return newFiles;
      });
    }
    
    // Clear error when file is selected
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Enhanced file handling for bulk upload
  const handleFilesSelected = (fieldId: string, newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(newFiles).forEach(file => {
      // Validate file type
      const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.xls'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (allowedTypes.includes(fileExtension)) {
        // Validate file size (100MB limit)
        if (file.size <= 100 * 1024 * 1024) {
          validFiles.push(file);
        } else {
          errors.push(`${file.name} is too large (max 100MB)`);
        }
      } else {
        errors.push(`${file.name} is not a supported file type`);
      }
    });

    // File validation errors are now handled silently

    if (validFiles.length > 0) {
      setSelectedFiles(prev => ({
        ...prev,
        [fieldId]: [...(prev[fieldId] || []), ...validFiles]
      }));
    }
  };

  const removeSelectedFile = (fieldId: string, index: number) => {
    setSelectedFiles(prev => ({
      ...prev,
      [fieldId]: prev[fieldId]?.filter((_, i) => i !== index) || []
    }));
  };

  const clearSelectedFiles = (fieldId: string) => {
    setSelectedFiles(prev => ({
      ...prev,
      [fieldId]: []
    }));
  };

  const uploadFiles = async (fieldId: string) => {
    const filesToUpload = selectedFiles[fieldId];
    if (!filesToUpload || filesToUpload.length === 0) {
      return;
    }

    if (!apiKey) {
      return;
    }

    setUploading(prev => ({ ...prev, [fieldId]: true }));
    
    // Initialize progress tracking with smooth animation
    const initialProgress: UploadProgress = {};
    filesToUpload.forEach(file => {
      initialProgress[file.name] = 0;
    });
    setUploadProgress(prev => ({ ...prev, [fieldId]: initialProgress }));

    // Start smooth progress animation for all files
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += 0.5;
      if (currentProgress <= 99) {
        const updatedProgress: UploadProgress = {};
        filesToUpload.forEach(file => {
          updatedProgress[file.name] = Math.floor(currentProgress);
        });
        setUploadProgress(prev => ({ ...prev, [fieldId]: updatedProgress }));
      }
    }, 80); // Smooth increment every 80ms for ~16 second duration
    
    try {
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/files/bulk', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Upload failed');
      }

      const result = await response.json();
      const uploadedFileResults = result.files || [];
      
      // Clear progress interval and set to 100%
      clearInterval(progressInterval);
      const finalProgress: UploadProgress = {};
      filesToUpload.forEach(file => {
        finalProgress[file.name] = 100;
      });
      setUploadProgress(prev => ({ ...prev, [fieldId]: finalProgress }));

      // Pause briefly at 100% before clearing
      setTimeout(() => {
        // Update uploaded files state
        setUploadedFiles(prev => ({
          ...prev,
          [fieldId]: [...(prev[fieldId] || []), ...uploadedFileResults]
        }));

        // Automatically update form data with uploaded file paths
        const allUploadedFiles = [...(uploadedFiles[fieldId] || []), ...uploadedFileResults];
        const filePaths = allUploadedFiles.map(file => file.file_path).join('\n');
        
        setFormData(prev => ({
          ...prev,
          [fieldId]: filePaths
        }));

        // Clear selected files
        setSelectedFiles(prev => ({
          ...prev,
          [fieldId]: []
        }));

        console.log('[DynamicFormBuilder] Files uploaded successfully:', uploadedFileResults);
        console.log('[DynamicFormBuilder] Auto-updated form data with file paths:', filePaths);
      }, 500);

    } catch (err) {
      console.error('[DynamicFormBuilder] Upload error:', err);
      clearInterval(progressInterval);
      
      // Show user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const isTimeoutError = errorMessage.includes('504') || errorMessage.includes('timeout') || errorMessage.includes('Gateway');
      
      if (isTimeoutError) {
        alert('Upload failed: Request timed out. Your files may be too large or the server is busy. Please try again with smaller files or wait a moment.');
      } else {
        alert(`Upload failed: ${errorMessage}. Please try again.`);
      }
    } finally {
      setTimeout(() => {
        setUploading(prev => ({ ...prev, [fieldId]: false }));
        setUploadProgress(prev => ({ ...prev, [fieldId]: {} }));
      }, 1000); // Clean up after showing completion
    }
  };

  const copyToClipboard = async (text: string, fileName: string, fileId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Show "Copied!" feedback on the button
      setCopiedFiles(prev => ({ ...prev, [fileId]: true }));
      
      // Remove the feedback after 2 seconds
      setTimeout(() => {
        setCopiedFiles(prev => ({ ...prev, [fileId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [fieldId]: true }));
  };

  const handleDragLeave = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [fieldId]: false }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [fieldId]: false }));
    
    const droppedFiles = e.dataTransfer.files;
    handleFilesSelected(fieldId, droppedFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleListAdd = (fieldId: string) => {
    const currentList = formData[fieldId] || [];
    setFormData(prev => ({
      ...prev,
      [fieldId]: [...currentList, ""]
    }));
  };

  const handleListRemove = (fieldId: string, index: number) => {
    const currentList = formData[fieldId] || [];
    const newList = currentList.filter((_: any, i: number) => i !== index);
    setFormData(prev => ({
      ...prev,
      [fieldId]: newList
    }));
  };

  const handleListItemChange = (fieldId: string, index: number, value: string) => {
    const currentList = [...(formData[fieldId] || [])];
    currentList[index] = value;
    setFormData(prev => ({
      ...prev,
      [fieldId]: currentList
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    fields.forEach(field => {
      if (field.required) {
        const value = formData[field.id];
        const hasFile = files[field.id];
        const hasUploadedFiles = uploadedFiles[field.id]?.length > 0;
        
        if (field.temp_file) {
          const currentMode = fileInputMode[field.id] || 'upload';
          if (currentMode === 'upload' && !hasFile && !hasUploadedFiles) {
            newErrors[field.id] = `${field.display_name || field.name} is required`;
          } else if (currentMode === 'path' && (!value || !value.trim())) {
            newErrors[field.id] = `${field.display_name || field.name} is required`;
          }
        } else if (!field.temp_file && (!value || (Array.isArray(value) && value.length === 0))) {
          newErrors[field.id] = `${field.display_name || field.name} is required`;
        } else if (Array.isArray(value) && value.some((item: string) => !item.trim())) {
          newErrors[field.id] = `All items in ${field.display_name || field.name} must be filled`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onSubmit(formData, files);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Check if any field has content
  const hasAnyFieldContent = (): boolean => {
    // Check regular form data
    for (const [fieldId, value] of Object.entries(formData)) {
      const field = fields.find(f => f.id === fieldId);
      
      if (field?.temp_file) {
        // For file fields, check if there are files or uploaded files
        const hasFile = files[fieldId];
        const hasUploadedFiles = uploadedFiles[fieldId]?.length > 0;
        const hasTextPaths = value && typeof value === 'string' && value.trim();
        
        if (hasFile || hasUploadedFiles || hasTextPaths) {
          return true;
        }
      } else if (field?.list) {
        // For list fields, check if array has content
        if (Array.isArray(value) && value.length > 0 && value.some(item => item && item.trim())) {
          return true;
        }
      } else {
        // For regular fields, check if value exists and is not empty
        if (value && typeof value === 'string' && value.trim()) {
          return true;
        }
      }
    }
    
    return false;
  };

  const handleReset = () => {
    const resetData: FlowFormData = {};
    fields.forEach(field => {
      if (field.list) {
        resetData[field.id] = [];
      } else {
        resetData[field.id] = field.value || "";
      }
    });
    setFormData(resetData);
    setFiles({});
    setErrors({});
    setSelectedFiles({});
    setUploadedFiles({});
    setFileInputMode({});
    onReset?.();
  };

  const renderField = (field: InputField) => {
    const fieldId = field.id;
    const displayName = field.display_name || field.name;
    const hasError = !!errors[fieldId];
    const errorMessage = errors[fieldId];

    const baseInputClasses = `w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground bg-background/50 backdrop-blur-sm ${
      hasError ? 'border-destructive/50 bg-destructive/10' : 'border-input hover:border-accent-foreground focus:bg-background/80'
    }`;

    if (field.temp_file) {
      const currentMode = fileInputMode[fieldId] || 'upload';
      const fieldSelectedFiles = selectedFiles[fieldId] || [];
      const fieldUploadedFiles = uploadedFiles[fieldId] || [];
      const isUploading = uploading[fieldId] || false;
      const isDragActive = dragActive[fieldId] || false;
      
      const toggleFileInputMode = () => {
        setFileInputMode(prev => ({
          ...prev,
          [fieldId]: currentMode === 'upload' ? 'path' : 'upload'
        }));
        // Clear any existing file or path value when switching modes
        if (currentMode === 'upload') {
          handleFileChange(fieldId, null);
          clearSelectedFiles(fieldId);
        } else {
          handleInputChange(fieldId, '');
        }
      };

      return (
        <div key={fieldId} className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-foreground">
              {displayName}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="flex items-center space-x-2">
              {currentMode === 'upload' && (
                <div className="group relative">
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <div className="invisible group-hover:visible absolute right-0 top-full mt-1 w-64 p-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg z-10 border border-border">
                    Supports PDF, DOC, DOCX files (max 100MB each)
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={toggleFileInputMode}
                className="text-xs px-4 py-1 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground border border-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 shadow-sm"
                disabled={isSubmitting}
                style={{ fontSize: '13px', fontWeight: 500 }}
              >
                {currentMode === 'upload' ? '📁 Switch to file path' : '⬆️ Switch to upload'}
              </button>
            </div>
          </div>
          {field.info && (
            <p className="text-sm text-muted-foreground">{field.info}</p>
          )}
          {currentMode === 'upload' ? (
            <div className="space-y-4">
              {/* Drag & Drop Upload Area - made more compact */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
                  isDragActive ? 'border-primary bg-primary/10' : 
                  hasError ? 'border-red-300 bg-red-50' : 
                  'border-input hover:border-accent-foreground bg-muted/50/50'
                }`}
                style={{ minHeight: '120px', maxWidth: '100%' }}
                onDragEnter={(e) => handleDragEnter(e, fieldId)}
                onDragLeave={(e) => handleDragLeave(e, fieldId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, fieldId)}
              >
                <input
                  ref={(el) => { fileInputRefs.current[fieldId] = el; }}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                  onChange={(e) => handleFilesSelected(fieldId, e.target.files)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading || isSubmitting}
                />
                <div className="space-y-2">
                  <div className="w-10 h-10 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground mb-1">
                      {isDragActive ? 'Drop files here' : 'Drag or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PDF, DOC, DOCX files (max 100MB each)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[fieldId]?.click()}
                    className="inline-flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors text-sm"
                    disabled={isUploading || isSubmitting}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Browse Files</span>
                  </button>
                </div>
              </div>

              {/* Selected Files */}
              {fieldSelectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">
                      Selected Files ({fieldSelectedFiles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => clearSelectedFiles(fieldId)}
                      className="text-sm text-red-600 hover:text-red-700 transition-colors"
                      disabled={isUploading || isSubmitting}
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {fieldSelectedFiles.map((file, index) => {
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-primary/10 border border-primary/20 rounded-lg">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                              </div>
                              <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">({formatFileSize(file.size)})</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSelectedFile(fieldId, index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-all duration-200 flex-shrink-0 ml-2 group"
                              disabled={isUploading || isSubmitting}
                              title="Remove file"
                            >
                              <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Consolidated progress bar for all files */}
                  {isUploading && uploadProgress[fieldId] && Object.keys(uploadProgress[fieldId]).length > 0 && (
                    <div className="mt-3 mb-4">
                      <div className="text-xs mb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Uploading files...</span>
                          <span className="text-muted-foreground">
                            {Math.round(Object.values(uploadProgress[fieldId]).reduce((sum: number, progress: number) => sum + progress, 0) / Object.values(uploadProgress[fieldId]).length)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ 
                            width: `${Math.round(Object.values(uploadProgress[fieldId]).reduce((sum: number, progress: number) => sum + progress, 0) / Object.values(uploadProgress[fieldId]).length)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => uploadFiles(fieldId)}
                    disabled={isUploading || isSubmitting || !apiKey}
                    className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-9 min-h-[36px] px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>Upload Files</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Successfully Uploaded Files */}
              {fieldUploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-primary">
                      Successfully Uploaded ({fieldUploadedFiles.length})
                    </span>
                  </div>
                  
                  {/* Success tip */}
                  <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>Tip:</strong> Execute flow with uploaded files or switch to file path mode.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {fieldUploadedFiles.map((file, index) => (
                      <div key={file.file_id || index} className="p-2 bg-primary/5 border border-primary/10 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2 flex-1 min-w-0">
                            <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground break-words">{file.file_name}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(file.file_path, file.file_name, file.file_id || `${index}`)}
                            className={`flex items-center space-x-1 text-xs px-2 py-1 rounded transition-colors flex-shrink-0 ml-2 ${
                              copiedFiles[file.file_id || `${index}`] 
                                ? 'text-green-600 bg-green-50 border border-green-200' 
                                : 'text-primary hover:text-primary/80 hover:bg-primary/10'
                            }`}
                            title={copiedFiles[file.file_id || `${index}`] ? "Copied!" : "Copy file path"}
                          >
                            {copiedFiles[file.file_id || `${index}`] ? (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={formData[fieldId] || ''}
              onChange={(e) => handleInputChange(fieldId, e.target.value)}
              placeholder="Enter file paths (one per line) or file IDs from recently uploaded files..."
              rows={3}
              className={baseInputClasses + " resize-y"}
              disabled={isSubmitting}
            />
          )}
          
          {hasError && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      );
    }

    if (field.list) {
      const currentList = formData[fieldId] || [];
      return (
        <div key={fieldId} className="space-y-4">
          <label className="block text-sm font-semibold text-foreground">
            {displayName}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.info && (
            <p className="text-sm text-muted-foreground">{field.info}</p>
          )}
          <div className="space-y-2">
            {currentList.map((item: string, index: number) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleListItemChange(fieldId, index, e.target.value)}
                  placeholder={field.placeholder}
                  className={baseInputClasses}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => handleListRemove(fieldId, index)}
                  className="px-3 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleListAdd(fieldId)}
              className="w-full px-4 py-3 border-2 border-dashed border-input hover:border-primary text-foreground hover:text-primary rounded-xl transition-colors"
              disabled={isSubmitting}
            >
              + Add Item
            </button>
          </div>
          {hasError && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      );
    }

    if (field.options) {
      return (
        <div key={fieldId} className="space-y-4">
          <label className="block text-sm font-semibold text-foreground">
            {displayName}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.info && (
            <p className="text-sm text-muted-foreground">{field.info}</p>
          )}
          <select
            value={formData[fieldId]}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            className={baseInputClasses}
            disabled={isSubmitting}
          >
            <option value="">Select an option...</option>
            {field.options.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {hasError && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      );
    }

    if (field.multiline) {
      return (
        <div key={fieldId} className="space-y-4">
          <label className="block text-sm font-semibold text-foreground">
            {displayName}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.info && (
            <p className="text-sm text-muted-foreground">{field.info}</p>
          )}
          <textarea
            value={formData[fieldId]}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseInputClasses + " resize-y"}
            disabled={isSubmitting}
          />
          {hasError && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      );
    }

    if (
      field.type === 'str' &&
      !field.multiline &&
      !field.password &&
      !field.list &&
      !field.options
    ) {
      return (
        <div key={fieldId} className="space-y-4">
          <label className="block text-sm font-semibold text-foreground">
            {displayName}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.info && (
            <p className="text-sm text-muted-foreground">{field.info}</p>
          )}
          <input
            type="text"
            value={formData[fieldId]}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            placeholder="Enter text..."
            className={baseInputClasses}
            disabled={isSubmitting}
          />
          {hasError && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      );
    }

    // Default text/password input
    return (
      <div key={fieldId} className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">
          {displayName}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.info && (
          <p className="text-sm text-muted-foreground">{field.info}</p>
        )}
        <input
          type={field.password ? "password" : "text"}
          value={formData[fieldId]}
          onChange={(e) => handleInputChange(fieldId, e.target.value)}
          placeholder={field.placeholder}
          className={baseInputClasses}
          disabled={isSubmitting}
        />
        {hasError && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
      </div>
    );
  };

  const hasContent = hasAnyFieldContent();

  return (
    <div className={`space-y-8 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-8">
        {fields.map(renderField)}
        <div className="flex gap-3 pt-8">
          <button
            type="submit"
            disabled={isSubmitting || !hasContent}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 min-h-[36px] px-4 rounded-md transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-[15px]"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2"></div>
                Processing...
              </div>
            ) : (
              submitLabel
            )}
          </button>
          {onReset && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting || !hasContent}
              className="px-4 h-9 min-h-[36px] bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold rounded-md transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-[15px]"
            >
              {resetLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}