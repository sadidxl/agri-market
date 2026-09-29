import { apiPost } from '@/lib/api';

// history: [{ role: 'user'|'assistant', content: string }, ...]
export const sendChatMessage = async (message, history = []) => apiPost('/chatbot/message', { message, history });
