import { create } from 'zustand';

const useProfileStore = create((set) => ({
  profile: null,
  setProfile: (data) => set({ profile: data }),
  clearProfile: () => set({ profile: null }),
}));

export default useProfileStore;
