import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  

  // if (!session) {
  //   redirect('/login');
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6 pt-[150px] md:pt-6">{children}</main>
        
      </div>
    </div>
  );
}
