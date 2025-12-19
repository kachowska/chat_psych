import React, { useState } from 'react';
import { UserProfile, AnalysisData, PsychologicalProfile, CompatibilityAnalysis } from '../types';
import { analyzeUserProfile, analyzeCompatibility } from '../services/geminiService';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface ComparisonViewProps {
  data: AnalysisData;
  onBack: () => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ data, onBack }) => {
  const users = Object.keys(data.users);
  const [user1Id, setUser1Id] = useState<string>(users[0]);
  const [user2Id, setUser2Id] = useState<string>(users.length > 1 ? users[1] : users[0]);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<{
      p1: PsychologicalProfile;
      p2: PsychologicalProfile;
      compatibility: CompatibilityAnalysis;
  } | null>(null);

  const handleCompare = async () => {
    if (user1Id === user2Id) return;
    setLoading(true);
    setResult(null);

    try {
        const u1 = data.users[user1Id];
        const u2 = data.users[user2Id];

        // 1. Analyze both users individually (parallel)
        setStatus(`Анализ профилей: ${u1.name} и ${u2.name}...`);
        
        const [p1, p2] = await Promise.all([
            analyzeUserProfile(u1, data.chatName),
            analyzeUserProfile(u2, data.chatName)
        ]);

        // 2. Compare them
        setStatus('Вычисление совместимости и поиск конфликтов...');
        const comp = await analyzeCompatibility(u1, p1, u2, p2);

        setResult({ p1, p2, compatibility: comp });
    } catch (error) {
        console.error(error);
        alert("Ошибка анализа. Попробуйте позже или выберите других пользователей.");
    } finally {
        setLoading(false);
        setStatus('');
    }
  };

  const u1Name = user1Id;
  const u2Name = user2Id;

  // Prepare Chart Data
  const chartData = result ? [
    { subject: 'Открытость', A: result.p1.bigFive.openness, B: result.p2.bigFive.openness, fullMark: 100 },
    { subject: 'Добросовестность', A: result.p1.bigFive.conscientiousness, B: result.p2.bigFive.conscientiousness, fullMark: 100 },
    { subject: 'Экстраверсия', A: result.p1.bigFive.extraversion, B: result.p2.bigFive.extraversion, fullMark: 100 },
    { subject: 'Доброжелательность', A: result.p1.bigFive.agreeableness, B: result.p2.bigFive.agreeableness, fullMark: 100 },
    { subject: 'Невротизм', A: result.p1.bigFive.neuroticism, B: result.p2.bigFive.neuroticism, fullMark: 100 },
  ] : [];

  return (
    <div className="min-h-screen bg-black text-neutral-200 p-6 animate-in fade-in duration-700 font-light">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-6">
                <button 
                    onClick={onBack}
                    className="group flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-neutral-500 hover:text-white transition-colors"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    Назад
                </button>
                <h1 className="text-sm font-normal tracking-[0.3em] text-white uppercase">Режим сравнения</h1>
            </div>

            {/* Selection Controls */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mb-16 relative z-10">
                <UserSelect value={user1Id} options={users} onChange={setUser1Id} align="right" />
                
                <div className="flex flex-col items-center justify-center gap-4 relative">
                    <div className="absolute inset-0 bg-black blur-xl -z-10"></div>
                    <span className="text-4xl font-thin text-white/20 select-none italic font-serif">vs</span>
                    
                    <button 
                        onClick={handleCompare}
                        disabled={loading || user1Id === user2Id}
                        className={`
                            relative overflow-hidden group px-8 py-3 rounded-full text-xs uppercase tracking-widest transition-all duration-300
                            ${loading || user1Id === user2Id 
                                ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800' 
                                : 'bg-white text-black hover:bg-neutral-200 border border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                            }
                        `}
                    >
                        {loading ? (
                             <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce delay-150"></span>
                             </span>
                        ) : 'Анализировать'}
                    </button>
                    
                    {/* Status Text */}
                    <div className={`absolute -bottom-10 w-64 text-center transition-opacity duration-300 ${loading ? 'opacity-100' : 'opacity-0'}`}>
                        <p className="text-[10px] text-neutral-500 animate-pulse">{status}</p>
                    </div>
                </div>

                <UserSelect value={user2Id} options={users} onChange={setUser2Id} align="left" />
            </div>

            {/* Results Area */}
            {result && (
                <div className="space-y-0 animate-in slide-in-from-bottom-8 duration-700">
                    
                    {/* Hero Result */}
                    <div className="grid grid-cols-1 md:grid-cols-3 border-t border-white/10">
                        {/* Profile A Summary */}
                        <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/[0.02] transition-colors">
                            <h3 className="text-2xl font-light text-white mb-2">{u1Name}</h3>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-6">{result.p1.mbti} • {result.p1.archetype}</p>
                            <div className="flex flex-wrap gap-2">
                                {result.p1.personalityTraits.slice(0,4).map(t => (
                                    <span key={t} className="text-[10px] text-neutral-400 border border-white/10 px-2 py-1 rounded-full">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>

                         {/* Compatibility Score */}
                         <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center text-center hover:bg-white/[0.02] transition-colors relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="text-[9px] text-neutral-600 uppercase tracking-[0.3em] mb-4">Совместимость</span>
                            <div className="text-7xl md:text-8xl font-thin text-white mb-4 tracking-tighter">
                                {result.compatibility.score}<span className="text-2xl text-neutral-600 align-top ml-1">%</span>
                            </div>
                            <h4 className="text-sm font-medium text-neutral-300 tracking-wide">"{result.compatibility.relationshipHeader}"</h4>
                        </div>

                        {/* Profile B Summary */}
                        <div className="p-8 md:p-12 hover:bg-white/[0.02] transition-colors text-right">
                             <h3 className="text-2xl font-light text-white mb-2">{u2Name}</h3>
                             <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-6">{result.p2.archetype} • {result.p2.mbti}</p>
                             <div className="flex flex-wrap gap-2 justify-end">
                                {result.p2.personalityTraits.slice(0,4).map(t => (
                                    <span key={t} className="text-[10px] text-neutral-400 border border-white/10 px-2 py-1 rounded-full">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Deep Dive Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-white/10">
                        
                        {/* Radar Chart */}
                        <div className="lg:col-span-1 p-8 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-center">
                            <h4 className="text-[10px] text-neutral-600 uppercase tracking-widest mb-8 text-center">Карта Личности</h4>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                        <PolarGrid stroke="#262626" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#525252', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        {/* User 1: White filled */}
                                        <Radar name={u1Name} dataKey="A" stroke="#fff" strokeWidth={1} fill="#fff" fillOpacity={0.2} />
                                        {/* User 2: Grey filled - changed from transparent stroke to filled for "Rose" look */}
                                        <Radar name={u2Name} dataKey="B" stroke="#737373" strokeWidth={1} fill="#737373" fillOpacity={0.2} />
                                        <Legend 
                                            wrapperStyle={{ fontSize: '10px', paddingTop: '20px', letterSpacing: '1px', textTransform: 'uppercase' }} 
                                            iconType="circle"
                                        />
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333', fontSize: '11px', textTransform: 'capitalize' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Analysis Text */}
                        <div className="lg:col-span-2 grid grid-rows-[auto_1fr]">
                            
                            {/* Summary Text */}
                            <div className="p-8 border-b border-white/10">
                                <h4 className="text-[10px] text-neutral-600 uppercase tracking-widest mb-4">Резюме</h4>
                                <p className="text-sm text-neutral-300 leading-7 font-light max-w-2xl">{result.compatibility.summary}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2">
                                {/* Synergy */}
                                <div className="p-8 border-b md:border-b-0 md:border-r border-white/10 bg-gradient-to-b from-green-950/[0.05] to-transparent">
                                    <h4 className="text-[10px] text-green-700 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        Плюсы
                                    </h4>
                                    <ul className="space-y-4">
                                        {result.compatibility.synergy.map((s, i) => (
                                            <li key={i} className="text-xs text-neutral-400 font-light flex gap-3">
                                                <span className="text-green-800 font-serif italic text-lg leading-none">+</span> 
                                                <span className="leading-5">{s}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Conflicts */}
                                <div className="p-8 bg-gradient-to-b from-red-950/[0.05] to-transparent">
                                    <h4 className="text-[10px] text-red-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        Риски
                                    </h4>
                                    <ul className="space-y-4">
                                        {result.compatibility.conflicts.map((s, i) => (
                                            <li key={i} className="text-xs text-neutral-400 font-light flex gap-3">
                                                <span className="text-red-900 font-serif italic text-lg leading-none">!</span> 
                                                <span className="leading-5">{s}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

const UserSelect = ({ value, options, onChange, align = 'left' }: { value: string, options: string[], onChange: (s: string) => void, align?: 'left' | 'right' }) => (
    <div className={`flex flex-col gap-3 w-full max-w-[200px] ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
        <div className="relative w-full group">
            <select 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`
                    w-full appearance-none bg-transparent text-white text-xl font-light py-2 outline-none cursor-pointer transition-colors border-b border-neutral-800 group-hover:border-white/40
                    ${align === 'right' ? 'text-right pr-2' : 'text-left pl-2'}
                `}
            >
                {options.map(user => (
                    <option key={user} value={user} className="bg-neutral-900 text-neutral-300 text-sm">{user}</option>
                ))}
            </select>
             <div className={`pointer-events-none absolute inset-y-0 flex items-center text-neutral-700 ${align === 'right' ? 'left-0' : 'right-0'}`}>
                <svg width="8" height="8" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
        </div>
    </div>
);

export default ComparisonView;