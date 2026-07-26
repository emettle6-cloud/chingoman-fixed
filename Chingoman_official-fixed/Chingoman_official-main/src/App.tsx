import { AuthProvider } from '@/context/AuthContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HomePage } from '@/pages/HomePage';
import { BrowsePage } from '@/pages/BrowsePage';
import { VehicleDetailPage } from '@/pages/VehicleDetailPage';
import { CIFCalculatorPage } from '@/pages/CIFCalculatorPage';
import { SellPage } from '@/pages/SellPage';
import { ImportGuidePage } from '@/pages/ImportGuidePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AboutPage } from '@/pages/AboutPage';

function PageRouter() {
  const { route } = useRouter();

  switch (route.name) {
    case 'home': return <HomePage />;
    case 'browse': return <BrowsePage />;
    case 'vehicle': return <VehicleDetailPage vehicleId={route.id} />;
    case 'cif': return <CIFCalculatorPage />;
    case 'sell': return <SellPage />;
    case 'guide': return <ImportGuidePage />;
    case 'dashboard': return <DashboardPage />;
    case 'about': return <AboutPage />;
    default: return <HomePage />;
  }
}

function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Header />
          <main className="flex-1">
            <PageRouter />
          </main>
          <Footer />
        </div>
      </RouterProvider>
    </AuthProvider>
  );
}

export default App;
