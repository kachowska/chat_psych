import React, { useState, useEffect } from 'react';
import { UserProfile, PsychologicalProfile } from '../types';
import { analyzeUserProfile } from '../services/geminiService';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip as RechartsTooltip } from 'recharts';

interface AiAnalysisProps {
  user: UserProfile;
  chatContext: string;
}

const AiAnalysis: React.FC<AiAnalysisProps> = ({ user, chatContext }) => {
  const [profile, setProfile] = useState<PsychologicalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset profile when user changes
  useEffect(() => {
    setProfile(null);
    setError(null);
    setCopied(false);
  }, [user.name]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeUserProfile(user, chatContext);
      setProfile(result);
    } catch (err) {
      setError("Ошибка анализа.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (profile?.systemInstruction) {
      navigator.clipboard.writeText(profile.systemInstruction);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-px bg-white/20 overflow-hidden mb-4 relative">
             <div className="absolute inset-0 bg-white animate-[shimmer_1.5s_infinite]"></div>
        </div>
        <p className="text-neutral-500 text-[10px] uppercase tracking-widest animate-pulse">Создание профиля...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8">
        <div className="max-w-xs space-y-6">
            <h3 className="text-[10px] text-neutral-600 uppercase tracking-[0.2em]">Психологический Портрет</h3>
            <button 
                onClick={handleAnalyze}
                className="w-full border border-white/20 text-white hover:bg-white hover:text-black hover:border-white text-xs uppercase tracking-widest py-4 px-6 transition-all duration-300"
            >
                Сгенерировать
            </button>
            {error && <p className="text-red-500 text-[10px]">{error}</p>}
        </div>
      </div>
    );
  }

  const bigFiveData = [
    { subject: 'Open', A: profile.bigFive.openness.score, fullMark: 100 },
    { subject: 'Cons', A: profile.bigFive.conscientiousness.score, fullMark: 100 },
    { subject: 'Extra', A: profile.bigFive.extraversion.score, fullMark: 100 },
    { subject: 'Agree', A: profile.bigFive.agreeableness.score, fullMark: 100 },
    { subject: 'Neuro', A: profile.bigFive.neuroticism.score, fullMark: 100 },
  ];

  const bigFiveList = [
      { label: 'Открытость', ...profile.bigFive.openness },
      { label: 'Добросовестность', ...profile.bigFive.conscientiousness },
      { label: 'Экстраверсия', ...profile.bigFive.extraversion },
      { label: 'Доброжелательность', ...profile.bigFive.agreeableness },
      { label: 'Невротизм', ...profile.bigFive.neuroticism },
  ];

  // Helper for toxicity color
  const getToxicityColor = (score: number) => {
      if (score < 30) return 'from-green-500/50 to-emerald-900/10';
      if (score < 60) return 'from-yellow-500/50 to-orange-900/10';
      return 'from-red-600/50 to-red-950/10';
  };
  
  const getToxicityTextColor = (score: number) => {
      if (score < 30) return 'text-green-400';
      if (score < 60) return 'text-yellow-400';
      return 'text-red-400';
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700">
       <div className="p-8 border-b border-white/10">
            <div className="flex justify-between items-start mb-4">
                <span className="text-[9px] text-neutral-600 uppercase tracking-[0.2em]">Профиль</span>
            </div>
            <h2 className="text-2xl font-light text-white mb-2">{profile.archetype}</h2>
            <p className="text-neutral-500 text-xs font-light leading-relaxed">"{profile.archetypeDescription}"</p>
       </div>

       <div className="flex-grow overflow-y-auto custom-scrollbar">
            
            {/* MBTI & Stats */}
            <div className="grid grid-cols-2 border-b border-white/10">
                <div className="p-6 border-r border-white/10 flex flex-col justify-center items-center text-center">
                    <span className="text-[9px] text-neutral-600 uppercase tracking-widest mb-2">MBTI</span>
                    <span className="text-xl font-light text-white">{profile.mbti}</span>
                </div>
                <div className="p-6 flex flex-col justify-center space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="text-[9px] text-neutral-600 uppercase">Лексика</span>
                        <span className="text-[10px] text-neutral-300">{profile.communicationStyle.vocabulary}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[9px] text-neutral-600 uppercase">Сложность</span>
                        <span className="text-[10px] text-neutral-300">{profile.communicationStyle.complexity}</span>
                     </div>
                </div>
            </div>

            {/* Radar & Big Five Breakdown */}
            <div className="border-b border-white/10">
                <div className="h-64 w-full p-6 relative">
                    <p className="absolute top-6 left-6 text-[9px] uppercase tracking-widest text-neutral-600">Big Five</p>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="55%" outerRadius="70%" data={bigFiveData}>
                            <PolarGrid stroke="#262626" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#525252', fontSize: 9 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar
                                name={user.name}
                                dataKey="A"
                                stroke="#fff"
                                strokeWidth={1}
                                fill="#fff"
                                fillOpacity={0.1}
                            />
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#000', borderColor: '#333', fontSize: '10px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Text Explanations */}
                <div className="px-8 pb-8 space-y-4">
                    {bigFiveList.map((trait, idx) => (
                        <div key={idx} className="group">
                             <div className="flex items-end justify-between mb-1">
                                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">{trait.label}</span>
                                <span className="text-[10px] text-white font-mono">{trait.score}</span>
                             </div>
                             <div className="h-px w-full bg-neutral-900 mb-2">
                                <div className="h-full bg-white/30" style={{ width: `${trait.score}%` }}></div>
                             </div>
                             <p className="text-[10px] text-neutral-500 leading-relaxed font-light opacity-80 group-hover:opacity-100 transition-opacity">
                                 {trait.explanation}
                             </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toxicity Analysis Block */}
            {profile.toxicityAnalysis && (
                <div className="p-8 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                         <h4 className="text-[9px] text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                            Анализ Токсичности
                            {profile.toxicityAnalysis.score > 50 && (
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                            )}
                         </h4>
                         <span className={`text-[10px] font-medium ${getToxicityTextColor(profile.toxicityAnalysis.score)}`}>
                             {profile.toxicityAnalysis.score}%
                         </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden mb-6">
                        <div 
                            className={`h-full bg-gradient-to-r ${getToxicityColor(profile.toxicityAnalysis.score)} transition-all duration-1000`}
                            style={{ width: `${profile.toxicityAnalysis.score}%` }}
                        ></div>
                    </div>

                    <div className="mb-6">
                        <h5 className={`text-sm mb-2 font-light ${getToxicityTextColor(profile.toxicityAnalysis.score)}`}>
                            {profile.toxicityAnalysis.level}
                        </h5>
                        <p className="text-xs text-neutral-400 font-light leading-relaxed mb-4">
                            {profile.toxicityAnalysis.explanation}
                        </p>
                         <div className="flex flex-wrap gap-2">
                            {profile.toxicityAnalysis.traits.map((trait, i) => (
                                <span 
                                    key={i} 
                                    className={`
                                        px-2 py-1 text-[9px] uppercase tracking-wider border rounded-sm
                                        ${profile.toxicityAnalysis.score > 50 ? 'border-red-900/30 text-red-400/80 bg-red-900/5' : 'border-neutral-800 text-neutral-500 bg-neutral-900/30'}
                                    `}
                                >
                                    {trait}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Specific Forms (Quotes) */}
                    {profile.toxicityAnalysis.specificForms && profile.toxicityAnalysis.specificForms.length > 0 && (
                        <div className="space-y-3 bg-neutral-900/30 p-4 rounded border border-white/5">
                            <h5 className="text-[9px] text-neutral-500 uppercase tracking-widest mb-2">Детализация и Примеры</h5>
                            {profile.toxicityAnalysis.specificForms.map((item, idx) => (
                                <div key={idx} className="flex flex-col gap-1 border-l border-white/10 pl-3">
                                    <span className={`text-[10px] uppercase font-medium ${getToxicityTextColor(profile.toxicityAnalysis.score)}`}>
                                        {item.form}
                                    </span>
                                    <p className="text-xs text-neutral-400 italic font-serif opacity-80">
                                        "{item.example}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Lists */}
            <div className="p-8 space-y-8">
                <div>
                    <h4 className="text-[9px] text-neutral-600 uppercase tracking-widest mb-4">
                        Скрытые мотивы
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {profile.hiddenDrives.map((drive, i) => (
                            <span key={i} className="px-2 py-1 text-neutral-400 text-[10px] border border-white/10 rounded-sm">
                                {drive}
                            </span>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-[9px] text-neutral-600 uppercase tracking-widest mb-4">
                        Резюме ИИ
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed font-light">
                        {profile.summary}
                    </p>
                </div>
            </div>

            {/* Prompt Footer */}
            <div className="bg-neutral-900/30 p-8 border-t border-white/10">
                 <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[9px] text-neutral-500 uppercase tracking-widest">
                        Системный промт
                    </h4>
                    <button 
                        onClick={handleCopy}
                        className={`text-[9px] uppercase tracking-widest transition-colors ${copied ? 'text-white' : 'text-neutral-500 hover:text-white'}`}
                    >
                        {copied ? 'Скопировано' : 'Копировать'}
                    </button>
                 </div>
                 <div className="font-mono text-[10px] text-neutral-500 leading-relaxed max-h-48 overflow-y-auto custom-scrollbar select-text">
                    {profile.systemInstruction}
                 </div>
            </div>
       </div>
    </div>
  );
};

const ProfileBar = ({ label, value }: { label: string, value: number }) => (
    <div className="flex items-center gap-4">
        <span className="w-16 text-[9px] text-neutral-600 uppercase tracking-wider">{label}</span>
        <div className="flex-1 h-px bg-neutral-800">
            <div className="h-full bg-white" style={{ width: `${value}%` }}></div>
        </div>
        <span className="w-6 text-[9px] text-right text-neutral-500">{value}</span>
    </div>
);

export default AiAnalysis;