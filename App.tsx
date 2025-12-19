import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import MusicPlayer from './components/MusicPlayer';
import { AnalysisData } from './types';
import { parseChatFiles } from './services/parser';

const App: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await parseChatFiles(files);
      if (Object.keys(data.users).length === 0) {
        throw new Error("Пользователи не найдены. Проверьте формат файла.");
      }
      setAnalysisData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ошибка обработки. Убедитесь, что это корректный экспорт чата.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen font-sans bg-[#050505] text-neutral-200 selection:bg-white/20 selection:text-white relative">
      
      {/* Global Music Player */}
      <MusicPlayer />

      {!analysisData ? (
        <div className="min-h-screen flex flex-col items-center justify-center">
            
            <main className="w-full max-w-2xl px-6 flex flex-col items-center">
                <div className="text-center mb-12 space-y-6">
                     <h1 className="text-xs font-bold tracking-[0.2em] text-neutral-500 uppercase">
                        ChatPsych v1.0
                    </h1>
                    <h2 className="text-4xl md:text-6xl font-light text-white tracking-tight leading-tight">
                        Расшифруй свой <br/>
                        <span className="font-bold">стиль общения</span>
                    </h2>
                    <p className="text-neutral-400 text-sm md:text-base font-light max-w-md mx-auto leading-relaxed">
                        Загрузи историю чата для создания глубокого психологического профиля и цифрового двойника с помощью ИИ.
                    </p>
                </div>

                <div className="w-full">
                    <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                </div>
                
                {error && (
                    <div className="mt-8 text-xs text-red-400 bg-red-900/10 border border-red-900/20 px-4 py-2 rounded">
                         <p>{error}</p>
                    </div>
                )}
            </main>

            <footer className="absolute bottom-6 text-center text-neutral-700 text-[10px] uppercase tracking-widest">
                <p>Локальная обработка • Конфиденциальность</p>
            </footer>
        </div>
      ) : (
        <Dashboard data={analysisData} onReset={handleReset} />
      )}
    </div>
  );
};

export default App;