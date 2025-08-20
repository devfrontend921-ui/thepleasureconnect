import { createClient } from '@/lib/supabase/server';

export async function PaymentSummary({ userId }: { userId: string }) {
  const supabase = await createClient();
  
  // Obtener estadísticas de pagos
  const { data: payments } = await supabase
    .from('payments')
    .select('status, amount')
    .eq('user_id', userId);

  // Calcular totales
  const totalPaid = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalPending = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalOverdue = payments?.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0) || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-green-600">Pagados</h3>
        <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-yellow-600">Pendientes</h3>
        <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-red-600">Vencidos</h3>
        <p className="text-2xl font-bold">${totalOverdue.toFixed(2)}</p>
      </div>
    </div>
  );
}