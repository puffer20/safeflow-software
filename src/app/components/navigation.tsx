import { useState } from 'react';
import { Shield, LayoutDashboard, Globe, AlertTriangle, Menu, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Page = 'dashboard' | 'websites' | 'alerts';

interface NavigationProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- 1. THE LOGOUT LOGIC ---
  const handleLogout = () => {
    // A. Remove the authentication key (Must match the one in App.tsx)
    localStorage.removeItem('cyber_auth');
    localStorage.removeItem('cyber_current_page');
    
    // B. Force a hard refresh to take the user back to the Login Screen
    window.location.href = '/';
  };

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'websites' as Page, label: 'Websites', icon: Globe },
    { id: 'alerts' as Page, label: 'Alerts', icon: AlertTriangle },
  ];

  const handleNavClick = (page: Page) => {
    onPageChange(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="relative">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 rounded-xl bg-white border-2 border-gray-200 shadow-lg flex items-center justify-center text-gray-900 hover:bg-gray-50 transition-colors"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <nav
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-72 bg-white border-r-2 border-gray-200 flex flex-col
          shadow-2xl lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-xl bg-red-500 -z-10"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">CyberShield</h1>
              <p className="text-xs text-gray-500">AI Security Platform</p>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 rounded-xl"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`} />
                <span className={`font-medium relative z-10 ${isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer & Logout */}
        <div className="p-4 border-t-2 border-gray-200">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute w-3 h-3 rounded-full bg-green-500"
                />
                <div className="w-2 h-2 rounded-full bg-green-500 relative z-10" />
              </div>
              <span className="text-sm font-semibold text-gray-900">System Active</span>
            </div>
            <p className="text-xs text-gray-600">All protection systems operational</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-white rounded-full h-1.5 overflow-hidden">
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="h-full w-1/3 bg-gradient-to-r from-transparent via-green-500 to-transparent"
                />
              </div>
              <span className="text-xs font-semibold text-gray-600">99.9%</span>
            </div>
          </div>

          {/* 👇 THIS WAS MISSING THE onClick HANDLER 👇 */}
          <button 
            onClick={handleLogout} 
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all border-2 border-gray-200 hover:border-red-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}