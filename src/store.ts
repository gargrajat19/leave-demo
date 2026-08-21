import { create } from 'zustand';

export interface LeaveFormData {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface LeaveStoreState {
  formData: LeaveFormData;
  updateField: (field: keyof LeaveFormData, value: string) => void;
  resetForm: () => void;
}

const emptyFormData: LeaveFormData = { employeeName: '', leaveType: 'Sick Leave', startDate: '', endDate: '', reason: '' };

export const useLeaveStore = create<LeaveStoreState>()((set) => ({
  formData: emptyFormData,
  updateField: (field, value) => set((state) => ({ formData: { ...state.formData, [field]: value } })),
  resetForm: () => set({ formData: emptyFormData }),
}));