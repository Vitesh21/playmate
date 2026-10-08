import { create } from 'zustand';

type AppState = {
  isLoading: boolean;
  isOnline: boolean;
  activeTab: string;
  setLoading: (loading: boolean) => void;
  setOnline: (online: boolean) => void;
  setActiveTab: (tab: string) => void;
  toggleLoading: () => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  isLoading: false,
  isOnline: true,
  activeTab: 'Home',

  setLoading: (loading) => set({ isLoading: loading }),
  setOnline: (online) => set({ isOnline: online }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleLoading: () => set({ isLoading: !get().isLoading }),
}));

export default useAppStore;
