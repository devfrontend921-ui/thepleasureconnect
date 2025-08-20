import { createClient } from '@/lib/supabase/server';

interface AuditLog {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  created_at: string;
}

export async function logAudit(
  userId: string,
  tableName: string,
  recordId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  const supabase = await createClient();
  
  await supabase.from('audit_log').insert({
    user_id: userId,
    table_name: tableName,
    record_id: recordId,
    action,
    old_data: oldData,
    new_data: newData
  });
}