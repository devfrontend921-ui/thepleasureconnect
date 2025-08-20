export interface Client {
  id: number;
  name: string;
  address: string;
  phone: string;
  install_date: string;
  monthly_fee: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  description: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  payment_method?: string;
  created_at: string;
  client?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuditLog {
  id: number;
  table_name: string;
  record_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: any;
  new_values: any;
  changed_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  role: 'admin' | 'visor';
}

export interface NewUser {
  email: string;
  password: string;
  role: 'admin' | 'visor';
}