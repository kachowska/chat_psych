import { ChatMessage, ChatStats, AnalysisData, UserProfile } from '../types';

// Regex for WhatsApp: [dd.mm.yy, hh:mm:ss] Author: Message OR dd/mm/yyyy, hh:mm - Author: Message
const WA_REGEX_STRICT = /^\[?(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?)\]?\s(.*?):\s(.*)$/;
const WA_REGEX_LOOSE = /^(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s(\d{1,2}:\d{2})\s-\s(.*?):\s(.*)$/;

// Helper to check if string contains emojis
const EMOJI_REGEX = /\p{Emoji_Presentation}/gu;
const WORD_REGEX = /\b[\p{L}]+\b/gu;

const STOP_WORDS = new Set(['the', 'and', 'is', 'in', 'to', 'of', 'it', 'for', 'on', 'with', 'as', 'this', 'that', 'but', 'be', 'at', 'by', 'not', 'are', 'from', 'or', 'an', 'if', 'would', 'could', 'should', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'will', 'a', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'me', 'him', 'us', 'them', 'нет', 'да', 'не', 'и', 'в', 'на', 'с', 'по', 'к', 'у', 'что', 'как', 'это', 'я', 'ты', 'он', 'она', 'мы', 'они', 'все', 'так', 'же', 'но', 'за', 'то', 'из', 'от', 'до', 'для', 'о', 'об', 'или', 'если']);

export const parseChatFiles = async (files: File[]): Promise<AnalysisData> => {
  if (files.length === 0) throw new Error("No files provided");
  
  // Sort files to try and maintain order for HTML parts if they have numbers (messages.html, messages2.html)
  // This helps slightly with context if needed, though dates are primary sort key.
  const sortedFiles = [...files].sort((a, b) => {
      const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
  });

  const firstFile = sortedFiles[0];
  let messages: ChatMessage[] = [];
  let chatName = firstFile.name.replace('.txt', '').replace('.json', '').replace('.html', '');

  if (firstFile.name.endsWith('.html')) {
     const result = await parseTelegramHtml(sortedFiles);
     messages = result.messages;
     chatName = result.chatName || chatName;
  } else if (firstFile.name.endsWith('.json')) {
     const result = await parseTelegramJson(firstFile);
     messages = result.messages;
     chatName = result.chatName || chatName;
  } else {
     // WhatsApp or generic text files: Process ALL provided .txt files
     for (const file of sortedFiles) {
         if (file.name.endsWith('.txt')) {
             const fileMsgs = await parseWhatsAppTxt(file);
             messages = messages.concat(fileMsgs);
         }
     }
  }

  // Deduplicate messages based on date+author+content just in case of file overlaps
  // (Naive approach: create a signature)
  const uniqueMessages: ChatMessage[] = [];
  const signatures = new Set<string>();
  
  // Also sort by date strictly
  messages.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const m of messages) {
      const sig = `${m.date.getTime()}-${m.author}-${m.content.length}`;
      if (!signatures.has(sig)) {
          signatures.add(sig);
          uniqueMessages.push(m);
      }
  }

  return processMessages(uniqueMessages, chatName);
};

const parseTelegramHtml = async (files: File[]): Promise<{messages: ChatMessage[], chatName: string}> => {
    let allMessages: ChatMessage[] = [];
    let foundChatName = "";
    let lastAuthor = "Unknown"; // Persist author across files for split archives

    for (const file of files) {
        if (!file.name.endsWith('.html')) continue;
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        
        // Attempt to find chat name (usually in page head or header)
        if (!foundChatName) {
            // Telegram export usually puts chat name in title or a specific header
            // <div class="page_header"> <div class="text bold">Chat Name</div> </div>
            const headerObj = doc.querySelector('.page_header .text.bold');
            if (headerObj && headerObj.textContent) {
                foundChatName = headerObj.textContent.trim();
            }
        }

        // Broad selector to capture messages
        const messageNodes = doc.querySelectorAll('.message.default');
        
        messageNodes.forEach((node) => {
            // Check if it's a service message
            if (node.classList.contains('service')) return;

            // Author
            // Standard: <div class="from_name">Name</div>
            const fromNode = node.querySelector('.from_name');
            if (fromNode && fromNode.textContent) {
                lastAuthor = fromNode.textContent.trim();
            }
            
            // Date
            // <div class="date details" title="18.12.2025 23:19:05">...</div>
            const dateNode = node.querySelector('.date.details');
            const dateTitle = dateNode?.getAttribute('title');

            // Text or Content
            const textNode = node.querySelector('.text');
            let content = textNode?.textContent?.trim() || "";

            // Handle Media/Stickers if text is empty
            if (!content) {
                if (node.querySelector('.media_photo')) content = '[Photo]';
                else if (node.querySelector('.media_video')) content = '[Video]';
                else if (node.querySelector('.media_voice_message')) content = '[Voice Message]';
                else if (node.querySelector('.media_file')) content = '[File]';
                else if (node.querySelector('.sticker')) content = '[Sticker]';
            }

            if (dateTitle) {
                 const date = parseDateStrict(dateTitle);
                 
                 // Only add if we have a valid date
                 if (date) {
                     allMessages.push({
                         date,
                         author: lastAuthor, // Uses persisted author if from_name is missing (joined messages)
                         content: content || '[Unknown Attachment]'
                     });
                 }
            }
        });
    }

    return { messages: allMessages, chatName: foundChatName };
}

// Helper to parse dates like "18.12.2025 23:19:05" or "18.12.2025"
const parseDateStrict = (dateStr: string): Date | null => {
    // 1. Try ISO/Native first (covers YYYY-MM-DD)
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;

    // 2. Try DD.MM.YYYY HH:mm:ss (Common Telegram Desktop export)
    // Regex handles . / or - separators
    // Matches: 18.12.2025 23:19:05 OR 18.12.2025 23:19 OR 18.12.2025
    const match = dateStr.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (match) {
        const [_, day, month, year, h, m, s] = match;
        // Construct ISO string for parsing: YYYY-MM-DDTHH:mm:ss
        // Pad components to ensure ISO compatibility
        const iso = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${(h||'00').padStart(2,'0')}:${(m||'00').padStart(2,'0')}:${(s||'00').padStart(2,'0')}`;
        date = new Date(iso);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

const parseTelegramJson = async (file: File): Promise<{messages: ChatMessage[], chatName: string}> => {
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      const chatName = json.name || "Telegram Chat";
      let messages: ChatMessage[] = [];
      if (json.messages && Array.isArray(json.messages)) {
        messages = json.messages
          .filter((m: any) => m.type === 'message' && m.from && m.text)
          .map((m: any) => {
            let content = '';
            if (Array.isArray(m.text)) {
              content = m.text.map((t: any) => (typeof t === 'string' ? t : t.text)).join('');
            } else {
              content = m.text;
            }
            return {
              date: new Date(m.date_unixtime ? m.date_unixtime * 1000 : m.date),
              author: m.from,
              content: content,
            };
          });
      }
      return { messages, chatName };
    } catch (e) {
      console.error('Failed to parse JSON', e);
      throw new Error('Invalid JSON format for Telegram export.');
    }
}

const parseWhatsAppTxt = async (file: File): Promise<ChatMessage[]> => {
    const text = await file.text();
    const lines = text.split('\n');
    return lines.reduce<ChatMessage[]>((acc, line) => {
      const cleanLine = line.trim();
      let match = cleanLine.match(WA_REGEX_STRICT) || cleanLine.match(WA_REGEX_LOOSE);
      
      if (match) {
        let dateStr = `${match[1]} ${match[2]}`;
        // Normalize for generic date parsing if needed, but Date() usually handles / well
        dateStr = dateStr.replace(/\./g, '/').replace(/,/g, '');
        const date = new Date(dateStr);
        
        acc.push({
          date: isNaN(date.getTime()) ? new Date() : date,
          author: match[3],
          content: match[4],
        });
      } else if (acc.length > 0) {
        acc[acc.length - 1].content += `\n${cleanLine}`;
      }
      return acc;
    }, []);
}

const processMessages = (messages: ChatMessage[], chatName: string): AnalysisData => {
  const users: Record<string, UserProfile> = {};

  for (const msg of messages) {
    if (!users[msg.author]) {
      users[msg.author] = {
        name: msg.author,
        messages: [],
        stats: {
          totalMessages: 0,
          averageLength: 0,
          capsLockCount: 0,
          questionMarkCount: 0,
          exclamationCount: 0,
          dotsEndCount: 0,
          emojiCount: {},
          topWords: {},
          messagesByHour: Array(24).fill(0).reduce((a,_,i) => ({...a, [i]: 0}), {}),
          initiations: 0
        }
      };
    }
    
    const u = users[msg.author];
    u.messages.push(msg);
    u.stats.totalMessages++;
    
    const hour = msg.date.getHours();
    u.stats.messagesByHour[hour] = (u.stats.messagesByHour[hour] || 0) + 1;

    const content = msg.content;
    const cleanContent = content.trim();

    if (cleanContent.length > 3 && cleanContent === cleanContent.toUpperCase() && /[A-ZА-Я]/.test(cleanContent)) {
      u.stats.capsLockCount++;
    }

    if (cleanContent.includes('?')) u.stats.questionMarkCount++;
    if (cleanContent.includes('!')) u.stats.exclamationCount++;
    if (cleanContent.endsWith('.')) u.stats.dotsEndCount++;

    const emojis = content.match(EMOJI_REGEX) || [];
    for (const emoji of emojis) {
      u.stats.emojiCount[emoji] = (u.stats.emojiCount[emoji] || 0) + 1;
    }

    const words = content.toLowerCase().match(WORD_REGEX) || [];
    for (const word of words) {
      if (word.length > 2 && !STOP_WORDS.has(word)) {
        u.stats.topWords[word] = (u.stats.topWords[word] || 0) + 1;
      }
    }
  }

  Object.values(users).forEach(user => {
    const totalLen = user.messages.reduce((sum, m) => sum + m.content.length, 0);
    user.stats.averageLength = totalLen / (user.stats.totalMessages || 1);
  });

  return { chatName, users };
};