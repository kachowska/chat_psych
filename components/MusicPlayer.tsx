import React, { useState, useRef, useEffect } from 'react';

// Royalty-free Lo-Fi track (Pixabay: "Empty Mind" by Lofi_Hour)
const MUSIC_URL = "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3";

const MusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2); // Start with low volume
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Handle browser autoplay policies
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log("Autoplay prevented:", error);
          });
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 flex items-center gap-4 transition-all duration-500 ease-out"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <audio 
        ref={audioRef} 
        src={MUSIC_URL} 
        loop 
        preload="auto"
      />

      {/* Volume Slider (Reveals on hover) */}
      <div 
        className={`
            bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 h-10 flex items-center transition-all duration-300 overflow-hidden
            ${isHovered ? 'w-32 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-8 pointer-events-none'}
        `}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
        />
      </div>

      {/* Main Player Button */}
      <button
        onClick={togglePlay}
        className={`
            relative h-12 flex items-center gap-3 px-5 rounded-full border backdrop-blur-md transition-all duration-300 group
            ${isPlaying 
                ? 'bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                : 'bg-black/80 border-white/10 text-neutral-500 hover:border-white/30 hover:text-white'
            }
        `}
      >
        {/* Status Indicator / Visualizer */}
        <div className="flex items-center gap-1 h-3">
            {isPlaying ? (
                <>
                    <span className="w-0.5 bg-current rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ height: '40%' }}></span>
                    <span className="w-0.5 bg-current rounded-full animate-[music-bar_1.1s_ease-in-out_infinite_0.1s]" style={{ height: '80%' }}></span>
                    <span className="w-0.5 bg-current rounded-full animate-[music-bar_1s_ease-in-out_infinite_0.2s]" style={{ height: '50%' }}></span>
                    <span className="w-0.5 bg-current rounded-full animate-[music-bar_0.9s_ease-in-out_infinite_0.3s]" style={{ height: '70%' }}></span>
                </>
            ) : (
                <div className="w-2 h-2 rounded-full bg-neutral-700 group-hover:bg-neutral-500 transition-colors"></div>
            )}
        </div>

        <div className="flex flex-col items-start">
            <span className="text-[9px] uppercase tracking-widest leading-none mb-1 font-bold">
                {isPlaying ? 'Lo-Fi Radio' : 'Music Off'}
            </span>
            <span className="text-[8px] uppercase tracking-widest leading-none opacity-60 font-light">
                {isPlaying ? 'Live Stream' : 'Click to Play'}
            </span>
        </div>
      </button>

      {/* Inline Styles for Animation since Tailwind config is in HTML */}
      <style>{`
        @keyframes music-bar {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
      `}</style>
    </div>
  );
};

export default MusicPlayer;