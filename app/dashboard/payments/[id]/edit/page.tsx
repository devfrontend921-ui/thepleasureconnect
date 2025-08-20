"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
);

export default function EditPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const paymentId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    description: '',
    due_date: '',
    status: 'pending' as 'pending' | 'paid' | 'overdue',
    payment_method: ''
  });

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
        fetchPayment();
        fetchClients();
      } catch (err) {
        console.error('Error en autenticación:', err);
        router.push('/auth/login');
      }
    };
    
    checkAuth();
  }, [router]);

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

  const fetchPayment = async () => {
    try {
      setLoading(true);
      console.log("Obteniendo pago con ID:", paymentId);
      
      // Intentar obtener el pago con relación a cliente
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          client:clients(id, name)
        `)
        .eq('id', paymentId)
        .single();

      if (error) {
        console.error("Error al obtener pago con relación:", error);
        console.log("Intentando obtener pago sin relación...");
        
        // Si falla la relación, obtener el pago sin relación
        const { data: paymentWithoutRelation, error: errorWithoutRelation } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .single();
        
        if (errorWithoutRelation) {
          console.error("Error al obtener pago sin relación:", errorWithoutRelation);
          throw errorWithoutRelation;
        }
        
        console.log("Pago sin relación:", paymentWithoutRelation);
        setPayment(paymentWithoutRelation);
        
        // Establecer los datos del formulario
        setFormData({
          client_id: paymentWithoutRelation.client_id || '',
          amount: paymentWithoutRelation.amount?.toString() || '',
          description: paymentWithoutRelation.description || '',
          due_date: paymentWithoutRelation.due_date || '',
          status: paymentWithoutRelation.status || 'pending',
          payment_method: paymentWithoutRelation.payment_method || ''
        });
        return;
      }
      
      console.log("Pago obtenido:", data);
      setPayment(data);
      
      // Establecer los datos del formulario
      setFormData({
        client_id: data.client_id || '',
        amount: data.amount?.toString() || '',
        description: data.description || '',
        due_date: data.due_date || '',
        status: data.status || 'pending',
        payment_method: data.payment_method || ''
      });
    } catch (err: any) {
      console.error('Error al cargar pago:', err);
      setError(err.message || 'Error al cargar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Verificar nuevamente la sesión antes de enviar
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("Sesión no válida. Por favor inicia sesión nuevamente.");
      }
      
      console.log("Enviando formulario:", formData);
      console.log("Usuario actual:", user);
      
      // Validar que el client_id no esté vacío
      if (!formData.client_id) {
        throw new Error("Debes seleccionar un cliente");
      }
      
      // Validar que el amount sea un número válido
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("El monto debe ser un número positivo");
      }
      
      // Validar que la fecha no esté vacía
      if (!formData.due_date) {
        throw new Error("La fecha de vencimiento es obligatoria");
      }
      
      // Preparar los datos del pago
      const paymentData: any = {
        client_id: formData.client_id,
        amount: amount,
        description: formData.description,
        due_date: formData.due_date,
        status: formData.status,
        payment_method: formData.payment_method || null
      };
      
      // Verificar si necesitamos agregar el user_id
      try {
        const { data: userIdCheck } = await supabase
          .from('payments')
          .select('user_id')
          .limit(1);
        
        if (userIdCheck && userIdCheck.length > 0 && userIdCheck[0].user_id !== null) {
          paymentData.user_id = user.id;
        }
      } catch (err) {
        console.warn("No se pudo verificar la columna user_id, intentando sin user_id");
      }
      
      console.log("Datos a enviar:", paymentData);
      
      const { data, error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', paymentId)
        .select();

      if (error) {
        console.error("Error al actualizar pago:", error);
        
        // Si el error es por la columna user_id, intentar sin ella
        if (error.message.includes('user_id') || error.code === '42703') {
          console.log("Intentando actualizar sin user_id");
          delete paymentData.user_id;
          
          const { data: retryData, error: retryError } = await supabase
            .from('payments')
            .update(paymentData)
            .eq('id', paymentId)
            .select();
            
          if (retryError) {
            console.error("Error al actualizar pago sin user_id:", retryError);
            throw retryError;
          }
          
          console.log("Pago actualizado sin user_id:", retryData);
          setSuccess(true);
          setTimeout(() => {
            router.push('/dashboard/payments');
          }, 1500);
          return;
        }
        
        throw error;
      }
      
      console.log("Pago actualizado:", data);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/payments');
      }, 1500);
    } catch (err: any) {
      console.error('Error updating payment:', err);
      setError(err.message || 'Error al actualizar el pago');
    } finally {
      setSaving(false);
    }
  };

  // Función para formatear el ID
  const formatId = (id: any) => {
    const idString = String(id);
    return idString.substring(0, 8) + '...';
  };

  // Función para obtener el nombre del cliente
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : `Cliente no encontrado (${formatId(clientId)})`;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando pago...</div>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard/payments">
            <Button variant="outline">← Volver a Pagos</Button>
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/payments">
          <Button variant="outline">← Volver a Pagos</Button>
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Editar Pago</h1>
      
      {success ? (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          ¡Pago actualizado exitosamente! Redirigiendo...
        </div>
      ) : null}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {payment && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <select
              id="client_id"
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecciona un cliente</option>
              {clients.map((client) => (
                <option key={formatId(client.id)} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Monto *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de vencimiento *
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado *
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="overdue">Vencido</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <select
              id="payment_method"
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecciona un método</option>
              <option value="efectivo">Efectivo</option>
              <option value="deposito">Depósito</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            
            <Link href="/dashboard/payments">
              <Button
                type="button"
                variant="outline"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}