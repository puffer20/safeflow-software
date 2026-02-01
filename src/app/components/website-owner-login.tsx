import { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Mail, Globe, Check, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface WebsiteOwnerLoginProps {
  onLogin: () => void;
}

export function WebsiteOwnerLogin({ onLogin }: WebsiteOwnerLoginProps) {
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setErrorMsg(null);
    
    try {
        // 1. CALL THE REAL BACKEND
        const response = await axios.post('http://localhost:3001/api/login', {
            email,
            password,
            domain // Optional: Auto-registers this site
        });

        if (response.data.success) {
            // 2. SAVE SESSION DATA
            localStorage.setItem('cyber_user_email', email);
            localStorage.setItem('cyber_user_id', response.data.userId);
            
            // 3. PROCEED
            onLogin();
        }
    } catch (err: any) {
        // Handle Login Error
        setErrorMsg(err.response?.data?.error || "Connection failed. Is the server running?");
        setIsAuthenticating(false);
    }
  };

  const isFormValid = domain.length > 0 && email.length > 0 && password.length > 0;

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Subtle Animated Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #ff5757 1px, transparent 1px),
            linear-gradient(to bottom, #ff5757 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Floating Cyber Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ y: ['0vh', '100vh'], opacity: [0, 0.3, 0] }}
            transition={{ duration: Math.random() * 15 + 10, repeat: Infinity, delay: Math.random() * 5, ease: 'linear' }}
            className="absolute w-0.5 h-12 bg-gradient-to-b from-transparent via-red-400 to-transparent -top-12"
            style={{ left: `${(i * 6.7 + Math.random() * 3)}%` }}
          />
        ))}
      </div>

      {/* Main Container */}
      <div className="relative z-10 min-h-screen">
        <nav className="px-6 md:px-12 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CyberShield</h1>
                <p className="text-xs text-gray-500">Security Platform</p>
              </div>
            </div>
          </div>
        </nav>

        {/* Login Section */}
        <div className="px-6 md:px-12 py-12 md:py-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              
              {/* Left Side - Hero Content */}
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm mb-6">
                  <Sparkles className="w-4 h-4" />
                  <span>AI-Powered Protection</span>
                </div>
                
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  Secure Your
                  <span className="block text-red-600 mt-2">Digital Assets</span>
                </h2>
                
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Monitor, detect, and protect your website from cyber threats in real-time with our advanced AI-powered security platform.
                </p>

                {/* Feature List */}
                <div className="space-y-4 mb-8">
                  {['Real-time threat detection', 'AI-powered anomaly analysis', 'Automated incident response', '24/7 continuous monitoring'].map((feature, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * idx + 0.3, duration: 0.4 }} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Right Side - Login Form */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="order-1 lg:order-2">
                <div className="relative bg-white rounded-3xl shadow-2xl shadow-gray-200/70 border border-gray-100 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-red-500 via-red-600 to-pink-600" />
                    <div className="p-8 md:p-10">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Welcome Back</h3>
                        <p className="text-gray-600">Sign in to your security dashboard</p>
                      </div>

                      {/* ERROR MESSAGE */}
                      {errorMsg && (
                          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                              <AlertCircle className="w-5 h-5 flex-shrink-0" />
                              <span className="text-sm font-medium">{errorMsg}</span>
                          </div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="relative">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Website Domain</label>
                          <div className="relative group">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500" />
                            <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} onFocus={() => setFocusedField('domain')} onBlur={() => setFocusedField(null)} placeholder="example.com" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-red-500 outline-none transition-all" />
                          </div>
                        </div>

                        <div className="relative">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} placeholder="you@example.com" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-red-500 outline-none transition-all" />
                          </div>
                        </div>

                        <div className="relative">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500" />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-red-500 outline-none transition-all" />
                          </div>
                        </div>

                        <motion.button type="submit" disabled={!isFormValid || isAuthenticating} whileHover={{ scale: isFormValid ? 1.02 : 1 }} whileTap={{ scale: isFormValid ? 0.98 : 1 }} className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-lg ${isFormValid ? 'bg-gradient-to-r from-red-500 to-red-600 hover:shadow-red-500/30' : 'bg-gray-300 cursor-not-allowed'}`}>
                          {isAuthenticating ? (
                            <div className="flex items-center justify-center gap-2">
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Shield className="w-5 h-5" /></motion.div>
                              <span>Authenticating...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                                <span>Sign In to Dashboard</span>
                                <ArrowRight className="w-5 h-5" />
                            </div>
                          )}
                        </motion.button>
                      </form>
                    </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}