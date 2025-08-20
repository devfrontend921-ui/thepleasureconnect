"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Client, Payment } from '@/types';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
);

export default function PaymentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Verificando autenticación...");
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error("Error de autenticación:", error);
          throw error;
        }
        
        if (!user) {
          console.log("No hay usuario, redirigiendo a login");
          router.push('/auth/login');
          return;
        }
        
        console.log("Usuario autenticado:", user);
        // Map Supabase user to local User type
        setUser({
          id: user.id,
          email: user.email ?? '', // fallback to empty string if undefined
          // Add other fields as required by your local User type
        });
        setAuthChecked(true);
        
        // Cargar datos iniciales
        fetchPayments();
        fetchClients();
      } catch (err) {
        console.error('Error en autenticación:', err);
        router.push('/auth/login');
      }
    };
    
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (authChecked) {
      fetchPayments();
    }
  }, [selectedMonth, selectedClient, authChecked]);

  const fetchClients = async () => {
    try {
      console.log("Obteniendo clientes...");
      const { data, error } = await supabase.from('clients').select('id, name').order('name');
      
      if (error) {
        console.error("Error al obtener clientes:", error);
        throw error;
      }
      
      console.log("Clientes obtenidos:", data);
      setClients(data || []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setError('Error al cargar los clientes');
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Iniciando fetchPayments con filtros:", { selectedMonth, selectedClient });
      
      // Obtener pagos con relación a clientes
      let query = supabase
        .from('payments')
        .select(`
          *,
          client:clients(id, name)
        `)
        .order('due_date', { ascending: false });

      // Filtrar por mes si está seleccionado
      if (selectedMonth) {
        // Calcular correctamente el inicio y fin del mes
        const [year, month] = selectedMonth.split('-').map(Number);
        
        // Primer día del mes
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        
        // Último día del mes
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        
        console.log(`Fechas calculadas: Inicio: ${startDate}, Fin: ${endDate}`);
        
        query = query.gte('due_date', startDate).lte('due_date', endDate);
      }

      // Filtrar por cliente si está seleccionado
      if (selectedClient !== 'all') {
        console.log(`Filtrando por cliente: ${selectedClient}`);
        query = query.eq('client_id', selectedClient);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error al obtener pagos con relación:", error);
        console.log("Intentando obtener pagos sin relación...");
        
        // Si falla la relación, obtener pagos sin relación
        const { data: paymentsWithoutRelation, error: errorWithoutRelation } = await supabase
          .from('payments')
          .select('*')
          .order('due_date', { ascending: false });
        
        if (errorWithoutRelation) {
          console.error("Error al obtener pagos sin relación:", errorWithoutRelation);
          throw errorWithoutRelation;
        }
        
        console.log("Pagos sin relación:", paymentsWithoutRelation);
        
        // Aplicar filtros manualmente a los pagos sin relación
        let filteredPayments = paymentsWithoutRelation || [];
        
        // Filtrar por mes
        if (selectedMonth) {
          const [year, month] = selectedMonth.split('-').map(Number);
          const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
          
          filteredPayments = filteredPayments.filter(payment => {
            const paymentDate = new Date(payment.due_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return paymentDate >= start && paymentDate <= end;
          });
        }
        
        // Filtrar por cliente
        if (selectedClient !== 'all') {
          filteredPayments = filteredPayments.filter(payment => payment.client_id === selectedClient);
        }
        
        console.log("Pagos filtrados manualmente:", filteredPayments);
        setPayments(filteredPayments);
        return;
      }
      
      console.log("Pagos con relación y filtros:", data);
      setPayments(data || []);
    } catch (err: any) {
      console.error('Error en fetchPayments:', err);
      setError(err.message || 'Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (paymentToDelete) {
      try {
        const { error } = await supabase
          .from('payments')
          .delete()
          .eq('id', paymentToDelete);
        
        if (error) throw error;
        
        fetchPayments();
        setShowConfirmModal(false);
        setPaymentToDelete(null);
      } catch (err) {
        console.error('Error deleting payment:', err);
        setError('Error al eliminar el pago');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  // Función para formatear el ID
  const formatId = (id: string): string => {
    return id.substring(0, 8) + '...';
  };

  // Función para obtener el nombre del cliente
  const getClientName = (payment: Payment): string => {
    if (payment.client && payment.client.name) {
      return payment.client.name;
    }
    
    // Si no hay cliente en la relación, intentar obtenerlo por separado
    const client = clients.find(c => c.id === payment.client_id);
    return client ? client.name : `Cliente no encontrado (${formatId(payment.client_id)})`;
  };

  // Estados de carga
  if (!authChecked) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Verificando autenticación...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">No estás autenticado</div>
          <Link href="/auth/login">
            <Button>Iniciar sesión</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <Link href="/dashboard/payments/create">
          <Button>Nuevo Pago</Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
            Mes
          </label>
          <input
            type="month"
            id="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
            Cliente
          </label>
          <select
            id="client"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Todos los clientes</option>
            {clients.map((client) => (
              <option key={formatId(client.id)} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-end">
          <Button
            onClick={() => {
              setSelectedMonth(new Date().toISOString().slice(0, 7));
              setSelectedClient('all');
            }}
            variant="outline"
          >
            Limpiar filtros
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Cargando pagos...</div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No hay pagos registrados para los filtros seleccionados</div>
          <Link href="/dashboard/payments/create">
            <Button>Agregar primer pago</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Vista de tarjetas para móviles */}
          <div className="md:hidden space-y-4">
            {payments.map((payment) => (
              <div key={formatId(payment.id)} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{getClientName(payment)}</h3>
                    <p className="text-sm text-gray-500">{formatId(payment.id)}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                    {payment.status === 'paid' ? 'Pagado' : payment.status === 'pending' ? 'Pendiente' : 'Vencido'}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Descripción:</span>
                    <span className="text-sm font-medium">{payment.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Monto:</span>
                    <span className="text-sm font-medium">{formatCurrency(payment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Fecha vencimiento:</span>
                    <span className="text-sm font-medium">{formatDate(payment.due_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Método pago:</span>
                    <span className="text-sm font-medium">{payment.payment_method || '-'}</span>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Link href={`/dashboard/payments/${payment.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPaymentToDelete(payment.id);
                      setShowConfirmModal(true);
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Vista de tabla para desktop */}
          <div className="hidden md:block bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de vencimiento
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Método de pago
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={formatId(payment.id)} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatId(payment.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getClientName(payment)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status === 'paid' ? 'Pagado' : payment.status === 'pending' ? 'Pendiente' : 'Vencido'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.payment_method || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link href={`/dashboard/payments/${payment.id}/edit`}>
                            <Button variant="outline" size="sm">
                              Editar
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPaymentToDelete(payment.id);
                              setShowConfirmModal(true);
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      
      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-4">Confirmar eliminación</h2>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar este pago? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}