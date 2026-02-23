import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Mascot from '../components/Mascot';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signup } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) await login(email, password);
      else await signup(email, password);
    } catch (err) {
      alert("Auth failed: " + (err.response?.data?.detail || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <motion.div 
        className="card" 
        style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <Mascot size={100} className="flex-center" style={{ margin: '0 auto 1.5rem' }} />
        <h1 style={{ marginBottom: '0.5rem' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {isLogin ? 'Monitor your vitals with Pulse.' : 'Start your health journey today.'}
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #ddd' }}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #ddd' }}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              background: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              padding: '1rem', 
              borderRadius: 'var(--radius-sm)', 
              fontWeight: '600',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
           <button 
            onClick={() => {/* Mock Google Login */}}
            style={{ width: '100%', background: 'white', color: 'var(--text-main)', border: '1px solid #ddd', padding: '0.8rem', borderRadius: 'var(--radius-sm)', fontWeight: '500', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
           >
             <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px' }} />
             Continue with Google
           </button>

           <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
             {isLogin ? "Don't have an account?" : "Already have an account?"} {' '}
             <span 
              onClick={() => setIsLogin(!isLogin)} 
              style={{ color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }}
             >
               {isLogin ? 'Sign Up' : 'Sign In'}
             </span>
           </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
