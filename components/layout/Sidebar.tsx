'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Clientes', href: '/dashboard/clients', icon: UserGroupIcon },
  { name: 'Pagos', href: '/dashboard/payments', icon: CurrencyDollarIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed lg:inset-y-0 lg:flex w-full md:w-auto lg:w-64 lg:flex-col top-[68px] md:top-0">
      <div className="flex min-h-0 flex-1 lg:flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 flex-shrink-0 items-center px-4 desktop-only">
          <h1 className="text-xl font-bold text-gray-900">Control de Pagos</h1>
        </div>
        <div className="flex flex-1 lg:flex-col overflow-y-auto lg:pt-5 lg:pb-4">
          <nav className="lg:mt-5 flex-1 space-y-1 px-2 flex lg:block items-center">
            {navigation.map((item) => {
              const isActive = item.href !== '/dashboard'
                ? pathname.startsWith(item.href)
                : pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 flex-shrink-0 ${
                      isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}