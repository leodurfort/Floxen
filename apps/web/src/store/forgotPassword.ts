import { create } from 'zustand';

export type ForgotPasswordStep = 'email' | 'verify' | 'reset';

interface ForgotPasswordState {
  step: ForgotPasswordStep;
  email: string;
  code: string;
  verified: boolean;

  setStep: (step: ForgotPasswordStep) => void;
  setEmail: (email: string) => void;
  setCode: (code: string) => void;
  setVerified: (verified: boolean) => void;
  reset: () => void;
}

export const useForgotPassword = create<ForgotPasswordState>((set) => ({
  step: 'email',
  email: '',
  code: '',
  verified: false,

  setStep: (step) => set({ step }),
  setEmail: (email) => set({ email }),
  setCode: (code) => set({ code }),
  setVerified: (verified) => set({ verified }),
  reset: () => set({ step: 'email', email: '', code: '', verified: false }),
}));
