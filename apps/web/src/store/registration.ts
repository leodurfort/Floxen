import { create } from 'zustand';

export type RegistrationStep = 'email' | 'verify' | 'password' | 'profile' | 'welcome';

interface RegistrationState {
  step: RegistrationStep;
  email: string;
  verified: boolean;

  // Actions
  setStep: (step: RegistrationStep) => void;
  setEmail: (email: string) => void;
  setVerified: (verified: boolean) => void;
  reset: () => void;
}

export const useRegistration = create<RegistrationState>((set) => ({
  step: 'email',
  email: '',
  verified: false,

  setStep: (step) => set({ step }),

  setEmail: (email) => set({ email: email.toLowerCase().trim() }),

  setVerified: (verified) => set({ verified }),

  reset: () => set({
    step: 'email',
    email: '',
    verified: false,
  }),
}));
