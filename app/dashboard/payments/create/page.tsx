// app/dashboard/payments/create/page.tsx
"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // Cambiamos a @supabase/ssr
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
);

export default function CreatePaymentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
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
          console.error("Error al obtener usuario:", error);
          throw error;
        }
        
        if (!user) {
          console.log("No hay usuario activo, redirigiendo a login");
          router.push('/auth/login');
          return;
        }
        
        console.log("Usuario encontrado:", user);
        setUser(user);
        setAuthChecked(true);
        fetchClients();
      } catch (err) {
        console.error('Error checking auth:', err);
        setError('Error de autenticación. Por favor inicia sesión nuevamente.');
        router.push('/auth/login');
      }
    };
    
    checkAuth();
  }, [router]);

  // ... resto del código igual que antes ...

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      console.log("Obteniendo clientes...");
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error("Error de Supabase:", error);
        throw error;
      }
      
      console.log("Clientes obtenidos:", data);
      
      if (!data || data.length === 0) {
        setClients([]);
        return;
      }
      
      const mappedClients = data.map(client => ({
        id: client.id,
        name: client.name
        
      }));
      
      setClients(mappedClients);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Error al cargar los clientes');
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
    
    // Agregar user_id solo si existe la columna
    // Esto evita errores si la columna no existe
    try {
      // Intentar obtener la información de la tabla para verificar si tiene user_id
      const { data: tableInfo, error: tableError } = await supabase
        .from('payments')
        .select('id')
        .limit(1);
      
      if (!tableError) {
        // Si la consulta funciona, asumimos que la tabla existe
        // Agregamos user_id a los datos
        paymentData.user_id = user.id;
      }
    } catch (err) {
      console.warn("No se pudo verificar la estructura de la tabla, intentando sin user_id");
    }
    
    console.log("Datos a enviar:", paymentData);
    
    // Intentar insertar el pago
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select();

    if (error) {
      console.error("Error al crear pago:", error);
      
      // Si el error es por la columna user_id, intentar sin ella
      if (error.message.includes('user_id') || error.code === '42703') {
        console.log("Intentando insertar sin user_id");
        delete paymentData.user_id;
        
        const { data: retryData, error: retryError } = await supabase
          .from('payments')
          .insert([paymentData])
          .select();
          
        if (retryError) {
          console.error("Error al crear pago sin user_id:", retryError);
          throw retryError;
        }
        
        console.log("Pago creado sin user_id:", retryData);
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/payments');
        }, 1500);
        return;
      }
      
      throw error;
    }
    
    console.log("Pago creado:", data);
    
    setSuccess(true);
    setTimeout(() => {
      router.push('/dashboard/payments');
    }, 1500);
  } catch (err: any) {
    console.error('Error creating payment:', err);
    setError(err.message || 'Error al crear el pago');
  } finally {
    setSaving(false);
  }
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
        <div className="text-lg">Cargando clientes...</div>
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
      
      <h1 className="text-2xl font-bold mb-6">Nuevo Pago</h1>
      
      {success ? (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          ¡Pago creado exitosamente! Redirigiendo...
        </div>
      ) : null}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {clients.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6">
          <p className="font-medium">No hay clientes disponibles</p>
          <p className="mt-2">Necesitas crear al menos un cliente antes de poder agregar pagos.</p>
          <div className="mt-4">
            <Link href="/dashboard/clients">
              <Button>Ir a Clientes</Button>
            </Link>
          </div>
        </div>
      ) : (
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
                <option key={client.id} value={client.id}>
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
              {saving ? 'Guardando...' : 'Crear Pago'}
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