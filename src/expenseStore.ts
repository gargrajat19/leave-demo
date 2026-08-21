import { create } from 'zustand';

export interface ExpenseFormData {
  employeeName: string;
  vendor: string;
  category: string;
  amount: string;
  expenseDate: string;
  description: string;
}

interface ExpenseStoreState {
  formData: ExpenseFormData;
  updateField: (field: keyof ExpenseFormData, value: string) => void;
  resetForm: () => void;
}

const emptyFormData: ExpenseFormData = {
  employeeName: '',
  vendor: '',
  category: 'Travel',
  amount: '',
  expenseDate: '',
  description: '',
};

export const useExpenseStore = create<ExpenseStoreState>()((set) => ({
  formData: emptyFormData,
  updateField: (field, value) => set((state) => ({ formData: { ...state.formData, [field]: value } })),
  resetForm: () => set({ formData: emptyFormData }),
}));
