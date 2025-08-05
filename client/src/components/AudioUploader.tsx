import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AudioUploaderProps {
  onFileSelect?: (file: File) => void;
  onUploadComplete?: (result: any) => void;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
}

export function AudioUploader({
  onFileSelect,
  onUploadComplete,
  accept = "audio/*,video/*",
  maxSize = 100 * 1024 * 1024, // 100MB default
  multiple = false,
  className,
}: AudioUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: 'pending' | 'uploading' | 'success' | 'error' }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(1)}MB)`;
    }

    const acceptedTypes = accept.split(',').map(type => type.trim());
    const isValidType = acceptedTypes.some(type => {
      if (type === 'audio/*') return file.type.startsWith('audio/');
      if (type === 'video/*') return file.type.startsWith('video/');
      return file.type === type;
    });

    if (!isValidType) {
      return `File type "${file.type}" is not supported`;
    }

    return null;
  };

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Invalid File",
          description: `${file.name}: ${error}`,
          variant: "destructive",
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    if (!multiple) {
      setFiles([validFiles[0]]);
      onFileSelect?.(validFiles[0]);
    } else {
      setFiles(prev => [...prev, ...validFiles]);
      validFiles.forEach(file => onFileSelect?.(file));
    }

    // Initialize upload status
    validFiles.forEach(file => {
      setUploadStatus(prev => ({ ...prev, [file.name]: 'pending' }));
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(file => file.name !== fileName));
    setUploadProgress(prev => {
      const { [fileName]: removed, ...rest } = prev;
      return rest;
    });
    setUploadStatus(prev => {
      const { [fileName]: removed, ...rest } = prev;
      return rest;
    });
  };

  const uploadFile = async (file: File) => {
    setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));
    
    try {
      const formData = new FormData();
      formData.append('audio', file);

      // Simulate upload progress
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }));
            const result = JSON.parse(xhr.responseText);
            onUploadComplete?.(result);
            resolve(result);
          } else {
            setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', '/api/transcribe/file');
        xhr.send(formData);
      });
    } catch (error) {
      setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
      throw error;
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(file => uploadStatus[file.name] === 'pending');
    
    for (const file of pendingFiles) {
      try {
        await uploadFile(file);
        toast({
          title: "Upload Complete",
          description: `${file.name} has been processed successfully.`,
        });
      } catch (error) {
        toast({
          title: "Upload Failed",
          description: `Failed to process ${file.name}`,
          variant: "destructive",
        });
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload Audio or Video Files
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Drag and drop files here, or click to select files
          </p>
          <Button onClick={() => fileInputRef.current?.click()}>
            Choose Files
          </Button>
          <p className="text-xs text-gray-400 mt-2">
            Supports: MP3, WAV, MP4, WebM, etc. Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
          </p>
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Selected Files</h4>
              {files.some(file => uploadStatus[file.name] === 'pending') && (
                <Button size="sm" onClick={uploadAllFiles}>
                  Upload All
                </Button>
              )}
            </div>
            
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center space-x-3 p-3 border rounded-lg"
              >
                {getStatusIcon(uploadStatus[file.name])}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  {uploadStatus[file.name] === 'uploading' && (
                    <Progress 
                      value={uploadProgress[file.name] || 0} 
                      className="mt-2 h-1"
                    />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {uploadStatus[file.name] === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => uploadFile(file)}
                    >
                      Upload
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(file.name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
