import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SocketProvider } from './context/SocketContext'; // 👈 IMPORT THIS
import { Dashboard } from './components/dashboard';
import { Websites } from './components/websites';
import { Alerts } from './components/alerts';
import { Navigation } from './components/navigation';
import { WebsiteOwnerLogin } from './components/website-owner-login';

type Page = 'dashboard' | 'websites' | 'alerts';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    return (localStorage.getItem('cyber_current_page') as Page) || 'dashboard';
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('cyber_auth') === 'true';
  });

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const handleLogin = () => {
    localStorage.setItem('cyber_auth', 'true');
    setIsAuthenticated(true);
  };

  const handlePageChange = (page: Page) => {
    localStorage.setItem('cyber_current_page', page);
    setCurrentPage(page);
  };

  if (!isAuthenticated) {
    return <WebsiteOwnerLogin onLogin={handleLogin} />;
  }

  return (
    // 🛡️ WRAP EVERYTHING IN SOCKET PROVIDER
    <SocketProvider>
      <div className="min-h-screen bg-white">
        <div className="flex h-screen overflow-hidden">
          <Navigation currentPage={currentPage} onPageChange={handlePageChange} />

          <main className="flex-1 overflow-auto bg-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                {currentPage === 'dashboard' && <Dashboard />}
                {currentPage === 'websites' && <Websites />}
                {currentPage === 'alerts' && <Alerts />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SocketProvider>
  );
}