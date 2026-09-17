import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_SERVER_URL_KEY = '@squad_server_url';

// Production cloud backend URL on Render
export const CLOUD_BACKEND_URL = 'https://squad-ai-backend-owgi.onrender.com';

export let API_BASE_URL = CLOUD_BACKEND_URL;

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 45000,
});

// Load saved custom server URL from storage on startup
export const loadSavedServerUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_SERVER_URL_KEY);
    if (saved && saved.trim()) {
      await setApiBaseUrl(saved.trim(), false);
      return saved.trim();
    }
  } catch (err) {
    console.warn('[API] Could not load saved server URL:', err);
  }
  return API_BASE_URL;
};

// Update active server URL dynamically and persist to storage
export const setApiBaseUrl = async (newUrl: string, persist: boolean = true): Promise<string> => {
  let cleaned = newUrl.trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned}`;
  }
  API_BASE_URL = cleaned;
  apiClient.defaults.baseURL = `${cleaned}/api`;

  if (persist) {
    try {
      await AsyncStorage.setItem(STORAGE_SERVER_URL_KEY, cleaned);
      console.log('[API] Server URL updated and saved to:', cleaned);
    } catch (err) {
      console.warn('[API] Could not persist server URL:', err);
    }
  }
  return cleaned;
};

// Quick health check to verify connectivity to server
export const testServerConnection = async (testUrl?: string): Promise<{ success: boolean; message: string }> => {
  try {
    let target = (testUrl || API_BASE_URL).trim();
    if (target.endsWith('/')) {
      target = target.slice(0, -1);
    }
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `http://${target}`;
    }
    const res = await axios.get(`${target}/api/health`, { timeout: 6000 });
    if (res.data?.status === 'ok') {
      return { success: true, message: 'Server is online & reachable!' };
    }
    return { success: true, message: `Server replied with status ${res.status}` };
  } catch (err: any) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return { success: false, message: 'Connection timed out. Check IP and port 4000.' };
    }
    return { success: false, message: err.message || 'Cannot reach server.' };
  }
};

let socket: Socket | null = null;

export const initSquadSocket = (
  squadId: string,
  onNewMessage?: (msg: any) => void,
  onAchievementVerified?: (data: any) => void,
  onChatCleared?: () => void
): Socket => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(API_BASE_URL, {
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to backend');
    socket?.emit('join_squad', squadId);
  });

  if (onNewMessage) {
    socket.on('new_message', (message) => {
      onNewMessage(message);
    });
  }

  if (onAchievementVerified) {
    socket.on('achievement_verified', onAchievementVerified);
  }

  if (onChatCleared) {
    socket.on('chat_cleared', onChatCleared);
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// API Services
export const authApi = {
  loginOrRegister: async (email: string, name: string, goals: string[] = []) => {
    const res = await apiClient.post('/auth/login', { email, name, goals });
    return res.data;
  },
  getProfile: async (userId: string) => {
    const res = await apiClient.get(`/auth/profile/${userId}`);
    return res.data;
  },
};

export const squadApi = {
  create: async (name: string, creatorUserId: string) => {
    const res = await apiClient.post('/squads/create', { name, creatorUserId });
    return res.data;
  },
  join: async (inviteCode: string, userId: string) => {
    const res = await apiClient.post('/squads/join', { inviteCode, userId });
    return res.data;
  },
  getDetails: async (squadId: string) => {
    const res = await apiClient.get(`/squads/${squadId}`);
    return res.data;
  },
  leave: async (squadId: string, userId: string) => {
    const res = await apiClient.post('/squads/leave', { squadId, userId });
    return res.data;
  },
};

export const chatApi = {
  getMessages: async (squadId: string) => {
    const res = await apiClient.get(`/chat/${squadId}`);
    return res.data;
  },
  sendMessage: async (squadId: string, userId: string, content: string) => {
    const res = await apiClient.post('/chat', { squadId, userId, content });
    return res.data;
  },
  clearMessages: async (squadId: string) => {
    const res = await apiClient.delete(`/chat/${squadId}/clear`);
    return res.data;
  },
};

export const insightsApi = {
  getPersonalCoachAdvice: async (params: { userId: string; squadId?: string; question?: string }) => {
    const res = await apiClient.post('/insights/personal-coach', params);
    return res.data;
  },
};

export const achievementApi = {
  create: async (formData: FormData) => {
    const res = await apiClient.post('/achievements', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  verify: async (achievementId: string, verifierId: string) => {
    const res = await apiClient.post(`/achievements/${achievementId}/verify`, { verifierId });
    return res.data;
  },
  getBySquad: async (squadId: string) => {
    const res = await apiClient.get(`/achievements/squad/${squadId}`);
    return res.data;
  },
};
