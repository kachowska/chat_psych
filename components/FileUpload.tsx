import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFileSelect(files);
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFileSelect(files);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
      <div 
        className={`
          w-full max-w-lg p-10 rounded-2xl border transition-all duration-300 ease-out
          flex flex-col items-center gap-6
          ${isDragging 
            ? 'border-white/20 bg-white/5 scale-[1.02]' 
            : 'border-white/10 bg-black/20 hover:bg-black/40 hover:border-white/20'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-3">
            <h2 className="text-xl font-light text-white tracking-wide">Загрузка чата</h2>
            <p className="text-neutral-400 text-sm font-light">
                Перетащите файл 
                <span className="text-neutral-200 mx-1">WhatsApp (.txt)</span>
                или
                <span className="text-neutral-200 mx-1">Telegram (.html/.json)</span>
            </p>
        </div>

        <label className="cursor-pointer group relative overflow-hidden bg-white text-black font-medium py-2.5 px-6 rounded-lg transition-all hover:bg-neutral-200 active:scale-95">
            <span className="relative z-10 text-sm">Выбрать файлы</span>
            <input 
                type="file" 
                className="hidden" 
                accept=".txt,.json,.html" 
                multiple
                onChange={handleFileInput}
                disabled={isProcessing}
            />
        </label>
        
        {isProcessing && (
           <p className="text-sm text-neutral-400 animate-pulse font-light">Обработка данных...</p>
        )}

        <div className="mt-8 text-xs text-neutral-500 text-left w-full border-t border-white/5 pt-4">
            <ul className="space-y-1.5 font-light">
                <li>• <b>WhatsApp</b>: Используйте файл <code>_chat.txt</code>.</li>
                <li>• <b>Telegram</b>: Выберите все файлы <code>messages.html</code>.</li>
                <li>• Обработка происходит локально в браузере.</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;