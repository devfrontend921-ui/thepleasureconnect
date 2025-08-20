
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from '@/components/ui/button';
import Link from 'next/link';



export default async function DashboardPage() {

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

        const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .order('name');

    console.log('clients', clients)
  
    
    // Si hay clientes, los mostramos en una lista
    if (!clients || clients.length === 0) {
        return (
            <div className="container mx-auto p-4">
                <div className="text-center py-12">
                    <div className="text-gray-500 mb-4">No hay clientes registrados</div>
                    <Link href="/dashboard/clients/new">
                        <Button>Agregar primer cliente</Button>
                    </Link>
                </div>
            </div>
        );
    }
   
  

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Link href="/dashboard/clients/new">
          <Button>Nuevo Cliente</Button>
        </Link>
      </div>

      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {client.name}
                  </h3>
                  <p className="text-gray-600">{client.email}</p>
                  {client.phone && (
                    <p className="text-gray-500 text-sm mt-1">
                      📞 {client.phone}
                    </p>
                  )}
                  {client.address && (
                    <p className="text-gray-500 text-sm mt-1">
                      📍 {client.address}
                    </p>
                  )}
                    {client.status && (
                        <p className="text-gray-500 text-sm mt-1">
                            {client.status === 'active' ? '🟢' : '🔴'} {client.status}
                        </p>
                    )}
                </div>
                <div className="flex space-x-2">
                  <Link href={`/dashboard/clients/${client.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Creado: {new Date(client.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}