import { useState } from "react";

interface FileUploadProps {
  accept?: string[];
  multiple?: boolean;
  maxSize?: number;
  onUpload: (files: File[]) => void;
  className?: string;
}

export function FileUpload({ accept = [], multiple = false, maxSize = 10, onUpload, className = "" }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const selected = Array.from(fileList);
    const filtered = accept.length > 0
      ? selected.filter((f) => accept.some((ext) => f.name.endsWith(ext)))
      : selected;
    const valid = filtered.filter((f) => f.size <= maxSize * 1024 * 1024);
    setFiles(valid);
    if (valid.length > 0) {
      onUpload(valid);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
        dragOver ? "border-accent bg-institutional" : "border-gray-300"
      } ${className}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        multiple={multiple}
        accept={accept.join(",")}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <p className="text-sm text-gray-600">
          Drag & drop files here, or <span className="text-accent">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Max file size: {maxSize} MB
        </p>
      </label>
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm"
            >
              <span className="truncate">{file.name}</span>
              <span className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
