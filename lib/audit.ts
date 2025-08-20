// lib/audit.ts
import { createClient } from './supabase/server';

export async function logAudit(
  userId: string,
  tableName: string,
  recordId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  oldData?: any,
  newData?: any
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