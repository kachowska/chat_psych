import React, { useState } from 'react';
import { AnalysisData, UserProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import AiAnalysis from './AiAnalysis';
import ComparisonView from './ComparisonView';

interface DashboardProps {
  data: AnalysisData;
  onReset: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(Object.keys(data.users)[0]);
  const [viewMode, setViewMode] = useState<'individual' | 'compare'>('individual');
  
  const currentUser = data.users[selectedUserId];

  if (!currentUser) return <div>Ошибка загрузки</div>;

  if (viewMode === 'compare') {
      return <ComparisonView data={data} onBack={() => setViewMode('individual')} />;
  }

  // Format activity data
  const hourlyData = Object.entries(currentUser.stats.messagesByHour).map(([hour, count]) => ({
    hour: `${hour}:00`,
    messages: count
  }));

  // Format emoji
  const topEmojis = Object.entries(currentUser.stats.emojiCount)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([emoji, count]) => ({ emoji, count: count as number }));

    // Format word cloud
    const topWords = Object.entries(currentUser.stats.topWords)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 12);

  return (
    <div className="min-h-screen bg-black text-neutral-200 pb-20 font-sans selection:bg-white selection:text-black">
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold tracking-[0.2em] text-white uppercase">ChatPsych</span>
                <span className="text-[10px] text-neutral-600 uppercase tracking-widest">{data.chatName}</span>
            </div>
            
            <div className="flex items-center gap-8">
                 <button 
                    onClick={() => setViewMode('compare')}
                    className="text-[10px] font-medium text-neutral-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                 >
                    Сравнение
                 </button>

                 <div className="flex items-center gap-2">
                    <div className="relative group">
                        <select 
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="appearance-none bg-transparent text-white text-xs font-medium uppercase tracking-wider pr-4 py-1 outline-none cursor-pointer hover:text-neutral-300 transition-colors text-right"
                        >
                            {Object.keys(data.users).map(user => (
                                <option key={user} value={user} className="bg-black text-white">{user}</option>
                            ))}
                        </select>
                    </div>
                 </div>
                 
                <button 
                    onClick={onReset}
                    className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors uppercase tracking-widest"
                >
                    Выход
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        
        {/* KPI Grid - Clean Lines */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-y border-white/10 divide-x divide-white/10">
            <StatCard label="Сообщений" value={currentUser.stats.totalMessages.toLocaleString()} />
            <StatCard label="Ср. длина" value={currentUser.stats.averageLength.toFixed(1)} />
            <StatCard label="Caps Lock" value={currentUser.stats.capsLockCount} />
            <StatCard label="Серьезность" value={`${((currentUser.stats.dotsEndCount / currentUser.stats.totalMessages) * 100).toFixed(1)}%`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:divide-x divide-white/10 border-b border-white/10 pb-12">
            {/* Left Column: Visuals */}
            <div className="lg:col-span-2 space-y-0">
                 {/* Activity Chart */}
                 <div className="p-8 border-b border-white/10">
                    <h3 className="text-[10px] font-medium text-neutral-500 mb-8 uppercase tracking-widest">Активность по часам</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                                <XAxis dataKey="hour" stroke="#333" fontSize={10} tickMargin={15} minTickGap={30} tickLine={false} axisLine={false} />
                                <YAxis stroke="#333" fontSize={10} tickLine={false} axisLine={false} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #222', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="step" dataKey="messages" stroke="#fff" strokeWidth={1} dot={false} activeDot={{ r: 3, fill: '#fff' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-white/10">
                    {/* Top Emojis */}
                    <div className="p-8">
                        <h3 className="text-[10px] font-medium text-neutral-500 mb-6 uppercase tracking-widest">Топ эмодзи</h3>
                        <div className="space-y-4">
                            {topEmojis.length > 0 ? topEmojis.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0">{item.emoji}</span>
                                        <div className="h-px bg-neutral-900 w-24 overflow-hidden relative">
                                            <div 
                                                className="absolute inset-y-0 left-0 bg-white" 
                                                style={{ width: `${(item.count / (topEmojis[0]?.count || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-neutral-500 font-mono text-[10px]">{item.count}</span>
                                </div>
                            )) : <p className="text-neutral-600 text-xs">Нет данных.</p>}
                        </div>
                    </div>

                    {/* Vocabulary */}
                    <div className="p-8">
                        <h3 className="text-[10px] font-medium text-neutral-500 mb-6 uppercase tracking-widest">Частые слова</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 leading-relaxed">
                            {topWords.length > 0 ? topWords.map(([word, count], idx) => (
                                <span 
                                    key={word} 
                                    className="text-sm text-neutral-400 hover:text-white transition-colors cursor-default"
                                    style={{ fontSize: `${Math.max(0.75, 1 - idx * 0.03)}rem`, opacity: Math.max(0.4, 1 - idx * 0.05) }}
                                >
                                    {word}
                                </span>
                            )) : <p className="text-neutral-600 text-xs">Нет данных.</p>}
                        </div>
                    </div>
                 </div>
            </div>

            {/* Right Column: AI Analysis */}
            <div className="lg:col-span-1 border-t lg:border-t-0 border-white/10">
                <AiAnalysis user={currentUser} chatContext={data.chatName} />
            </div>
        </div>

      </main>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string, value: string | number }) => (
    <div className="p-8 flex flex-col items-start justify-center hover:bg-white/[0.02] transition-colors">
        <p className="text-3xl font-light text-white mb-2">{value}</p>
        <p className="text-neutral-600 text-[10px] uppercase tracking-widest">{label}</p>
    </div>
);

export default Dashboard;