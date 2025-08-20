'use client';


import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewClientComponent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
    const supabase = createClient();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    install_date: '',
    monthly_fee: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error: insertError } = await supabase.from('clients').insert([{
      ...formData,
      monthly_fee: parseFloat(formData.monthly_fee),
      created_by: user?.id,
    }]);

    if (insertError) {
      setError(insertError.message);
    } else {
      router.push('/dashboard');
    }

    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Nuevo Cliente</CardTitle>
          <CardDescription>
            Llene los campos para insertar un nuevo cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="install_date">Fecha de instalación</Label>
                <Input
                    name="install_date"
                    type="date"
                    value={formData.install_date}
                    onChange={handleChange}
                    required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="monthly_fee">Mensualidad ($)</Label>
                <Input
                    name="monthly_fee"
                    type="number"
                    step="1"
                    value={formData.monthly_fee}
                    onChange={handleChange}
                    required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Estado"
                >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                </select>
                </div>
                
                {error && <p className="text-red-600 mb-4">{error}</p>}
                
                <div className="flex gap-4">
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Cliente'}
                    </Button>
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => router.back()}
                    >
                        Cancelar
                    </Button>
                </div>
                </div>
          </form>
        </CardContent>
      </Card>
    </div>
      
     
  );
}