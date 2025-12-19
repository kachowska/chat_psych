export interface ChatMessage {
  date: Date;
  author: string;
  content: string;
}

export interface ChatStats {
  totalMessages: number;
  averageLength: number;
  capsLockCount: number;
  questionMarkCount: number;
  exclamationCount: number;
  dotsEndCount: number;
  emojiCount: Record<string, number>;
  topWords: Record<string, number>;
  messagesByHour: Record<number, number>;
  initiations: number; // Placeholder for logic
}

export interface UserProfile {
  name: string;
  stats: ChatStats;
  messages: ChatMessage[];
}

export interface AnalysisData {
  users: Record<string, UserProfile>;
  chatName: string;
}

export interface BigFiveTrait {
    score: number;
    explanation: string;
}

export interface BigFive {
    openness: BigFiveTrait;
    conscientiousness: BigFiveTrait;
    extraversion: BigFiveTrait;
    agreeableness: BigFiveTrait;
    neuroticism: BigFiveTrait;
}

export interface ToxicityAnalysis {
    score: number; // 0-100
    level: string; // e.g., "Экологичный", "Пассивно-агрессивный", "Токсичный"
    traits: string[]; // e.g., ["Sarcasm", "Gaslighting"]
    explanation: string; // Detailed reason
    specificForms: { form: string; example: string }[]; // New: Specific aggression types with quotes
}

// Gemini AI Response Types
export interface PsychologicalProfile {
  archetype: string;
  archetypeDescription: string;
  personalityTraits: string[];
  mbti: string; // New: Myers-Briggs Type Indicator estimate
  bigFive: BigFive; // New: Big Five Personality Traits
  communicationStyle: {
    tone: string;
    speed: string;
    complexity: string;
    vocabulary: string; // New: Vocabulary level assessment
  };
  emotionalProfile: {
    positivity: number; // 0-100
    toxicity: number; // 0-100 (Legacy/Simple)
    empathy: number; // 0-100
  };
  toxicityAnalysis: ToxicityAnalysis; // New: Detailed toxicity report
  hiddenDrives: string[]; // New: Subconscious motivators
  summary: string;
  systemInstruction: string;
}

export interface CompatibilityAnalysis {
  score: number; // 0-100
  relationshipHeader: string; // Creative title (e.g. "Fire and Ice")
  synergy: string[];
  conflicts: string[];
  summary: string;
}

export enum FileType {
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  UNKNOWN = 'UNKNOWN',
}