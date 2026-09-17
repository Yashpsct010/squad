import React, { createContext, useContext, useState } from 'react';
import { authApi, squadApi } from '../api/client';
import CustomAlertModal, { AlertConfig, AlertButton } from '../components/CustomAlertModal';

export type { AlertConfig, AlertButton };

export interface UserGoal {
  id?: string;
  title: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  streakDays: number;
  goals: UserGoal[];
  memberships?: any[];
}

export interface AppSquad {
  id: string;
  name: string;
  inviteCode: string;
  maxMembers: number;
  members?: any[];
  achievements?: any[];
}

interface AppContextType {
  currentUser: AppUser | null;
  currentSquad: AppSquad | null;
  loading: boolean;
  loginUser: (email: string, name: string, goals?: string[]) => Promise<AppUser>;
  createNewSquad: (name: string, specificUserId?: string) => Promise<AppSquad>;
  joinExistingSquad: (inviteCode: string, specificUserId?: string) => Promise<AppSquad>;
  refreshSquadData: () => Promise<void>;
  leaveCurrentSquad: () => Promise<void>;
  logout: () => void;
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentSquad, setCurrentSquad] = useState<AppSquad | null>(null);
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);

  const showAlert = (config: AlertConfig) => {
    setAlertConfig(config);
  };

  const hideAlert = () => {
    setAlertConfig(null);
  };

  const loginUser = async (email: string, name: string, goals: string[] = []): Promise<AppUser> => {
    setLoading(true);
    try {
      const res = await authApi.loginOrRegister(email.trim(), name.trim(), goals);
      const user = res.user;
      setCurrentUser({
        id: user.id,
        email: user.email,
        name: user.name,
        streakDays: user.streakDays || 0,
        goals: user.goals || [],
      });

      // If user is already in a squad, load it
      if (user.memberships && user.memberships.length > 0) {
        const squad = user.memberships[0].squad;
        setCurrentSquad(squad);
      } else {
        setCurrentSquad(null);
      }
      return user;
    } finally {
      setLoading(false);
    }
  };

  const createNewSquad = async (name: string, specificUserId?: string): Promise<AppSquad> => {
    const targetUserId = specificUserId || currentUser?.id;
    if (!targetUserId) throw new Error('User must be logged in first');
    setLoading(true);
    try {
      const res = await squadApi.create(name.trim(), targetUserId);
      setCurrentSquad(res.squad);
      return res.squad;
    } finally {
      setLoading(false);
    }
  };

  const joinExistingSquad = async (inviteCode: string, specificUserId?: string): Promise<AppSquad> => {
    const targetUserId = specificUserId || currentUser?.id;
    if (!targetUserId) throw new Error('User must be logged in first');
    setLoading(true);
    try {
      const res = await squadApi.join(inviteCode.trim().toUpperCase(), targetUserId);
      setCurrentSquad(res.membership.squad);
      return res.membership.squad;
    } finally {
      setLoading(false);
    }
  };

  const refreshSquadData = async () => {
    if (!currentSquad) return;
    try {
      const res = await squadApi.getDetails(currentSquad.id);
      if (res.success) {
        setCurrentSquad(res.squad);
      }
    } catch (err) {
      console.error('Failed to refresh squad data:', err);
    }
  };

  const leaveCurrentSquad = async () => {
    if (currentSquad && currentUser) {
      try {
        await squadApi.leave(currentSquad.id, currentUser.id);
      } catch (err) {
        console.error('Failed to leave squad on backend:', err);
      }
    }
    setCurrentSquad(null);
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentSquad(null);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentSquad,
        loading,
        loginUser,
        createNewSquad,
        joinExistingSquad,
        refreshSquadData,
        leaveCurrentSquad,
        logout,
        showAlert,
        hideAlert,
      }}
    >
      {children}
      <CustomAlertModal config={alertConfig} onClose={hideAlert} />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
