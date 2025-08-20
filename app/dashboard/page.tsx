"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { User, Client, Payment, PaymentStatusData, ClientMonthlyData } from '@/types';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
);

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  
  // Datos para las gráficas
  const [paymentStatusData, setPaymentStatusData] = useState<PaymentStatusData[]>([]);
  const [clientMonthlyData, setClientMonthlyData] = useState<ClientMonthlyData[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

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
        setUser(user);
        setAuthChecked(true);
        
        // Cargar datos iniciales
        fetchDashboardData();
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
      fetchDashboardData();
    }
  }, [selectedMonth, authChecked]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from('clients').select('id, name').order('name');
      
      if (error) {
        console.error("Error al obtener clientes:", error);
        throw error;
      }
      
      setClients(data || []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Obteniendo datos del dashboard para el mes:", selectedMonth);
      
      // Calcular fechas para el mes seleccionado
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      
      console.log(`Fechas del mes: ${startDate} a ${endDate}`);
      
      // Obtener pagos del mes seleccionado
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .gte('due_date', startDate)
        .lte('due_date', endDate);
      
      if (paymentsError) {
        console.error("Error al obtener pagos:", paymentsError);
        throw paymentsError;
      }
      
      console.log("Pagos obtenidos:", payments);
      
      // Procesar datos para la gráfica de estados de pago
      const statusCounts = {
        paid: 0,
        pending: 0,
        overdue: 0,
      };
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      payments?.forEach(payment => {
        const dueDate = new Date(payment.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        if (payment.status === 'paid') {
          statusCounts.paid += 1;
        } else if (dueDate < today) {
          statusCounts.overdue += 1;
        } else {
          statusCounts.pending += 1;
        }
      });
      
      const statusData: PaymentStatusData[] = [
        { name: 'Pagados', value: statusCounts.paid, color: '#10B981' },
        { name: 'Pendientes', value: statusCounts.pending, color: '#FBBF24' },
        { name: 'Vencidos', value: statusCounts.overdue, color: '#EF4444' },
      ];
      
      setPaymentStatusData(statusData);
      
      // Obtener datos para la gráfica mensual por cliente (últimos 6 meses)
      const monthlyData: ClientMonthlyData[] = [];
      const currentDate = new Date();
      
      // Generar los últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthYear = `${monthDate.getFullYear()}-${(monthDate.getMonth() + 1).toString().padStart(2, '0')}`;
        
        // Calcular fecha límite de pago (día 2 del mes siguiente)
        const limitDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 2);
        
        clients.forEach(client => {
          // Obtener pagos del cliente para este mes
          const clientPayments = payments?.filter(p => {
            const paymentDate = new Date(p.due_date);
            return (
              p.client_id === client.id &&
              paymentDate.getFullYear() === monthDate.getFullYear() &&
              paymentDate.getMonth() === monthDate.getMonth()
            );
          }) || [];
          
          const paidOnTime = clientPayments.filter(p => {
            return p.status === 'paid' && new Date(p.created_at) <= limitDate;
          }).length;
          
          const paidLate = clientPayments.filter(p => {
            return p.status === 'paid' && new Date(p.created_at) > limitDate;
          }).length;
          
          const overdue = clientPayments.filter(p => {
            return p.status !== 'paid' && new Date(p.due_date) < new Date();
          }).length;
          
          monthlyData.push({
            month: monthYear,
            client: client.name,
            paidOnTime,
            paidLate,
            overdue,
          });
        });
      }
      
      setClientMonthlyData(monthlyData);
      
    } catch (err: any) {
      console.error('Error al cargar datos del dashboard:', err);
      setError(err.message || 'Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear el nombre del mes
  const formatMonth = (monthYear: string): string => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Pagos</h1>
        <div className="flex space-x-2">
          <Link href="/dashboard/payments">
            <Button>Ver Pagos</Button>
          </Link>
          <Link href="/dashboard/clients">
            <Button>Ver Clientes</Button>
          </Link>
        </div>
      </div>

      {/* Selector de mes */}
      <div className="mb-6 flex items-center space-x-4">
        <label htmlFor="month" className="text-sm font-medium text-gray-700">
          Mes:
        </label>
        <input
          type="month"
          id="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        <Button
          onClick={() => {
            setSelectedMonth(new Date().toISOString().slice(0, 7));
          }}
          variant="outline"
        >
          Mes actual
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Cargando datos del dashboard...</div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Gráfica de estados de pago */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Estado de Pagos - {formatMonth(selectedMonth)}</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica mensual por cliente */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Historial de Pagos por Cliente</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={clientMonthlyData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 70,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                    tickFormatter={formatMonth}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value}`, 'Pagos']}
                    labelFormatter={(label) => `Mes: ${formatMonth(label)}`}
                  />
                  <Legend />
                  <Bar dataKey="paidOnTime" name="Pagados a tiempo" stackId="a" fill="#10B981" />
                  <Bar dataKey="paidLate" name="Pagados con retraso" stackId="a" fill="#FBBF24" />
                  <Bar dataKey="overdue" name="Vencidos" stackId="a" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resumen numérico */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentStatusData.map((item) => (
              <div key={item.name} className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2" style={{ color: item.color }}>
                  {item.name}
                </h3>
                <p className="text-3xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}