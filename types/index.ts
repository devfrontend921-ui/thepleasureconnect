// types.ts
export interface User {
  id: string;
  email: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Payment {
  id: string;
  client_id: string;
  user_id?: string;
  amount: number;
  description: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  payment_method?: string;
  created_at: string;
  updated_at?: string;
  client?: Client;
}

export interface PaymentStatusData {
  name: string;
  value: number;
  color: string;
}

export interface ClientMonthlyData {
  month: string;
  client: string;
  paidOnTime: number;
  paidLate: number;
  overdue: number;
}