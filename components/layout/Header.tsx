'use client';

import { useRouter } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import { Button } from '@/components/ui/button';
import { PowerIcon } from '@heroicons/react/24/outline';

export default function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 header-custom">
      <div className="flex justify-between items-center px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">The Pleasure Connect</h2>
        <Button variant="secondary" onClick={handleLogout} className="flex items-center gap-2">
          <PowerIcon className="h-5 w-5" />
          <span className='desktop-only'>Cerrar Sesión</span>
        </Button>
      </div>
    </header>
  );
}