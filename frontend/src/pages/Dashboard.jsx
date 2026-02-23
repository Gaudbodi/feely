import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import HealthGraph from '../components/HealthGraph';
import Mascot from '../components/Mascot';
import { LogOut, Plus, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [readings, setReadings] = useState([]);
  const [newReading, setNewReading] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReadings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/readings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReadings(response.data.readings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/readings', 
        { reading_type: 'Blood Pressure', value: newReading, timestamp: new Date().toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewReading('');
      fetchReadings();
    } catch (err) {
      alert("Failed to save reading");
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Mascot size={60} />
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>Hello, {user?.email.split('@')[0]}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Welcome back to Feely.ai</p>
          </div>
        </div>
        <button onClick={logout} className="flex-center" style={{ background: 'none', border: 'none', color: 'var(--error)', gap: '0.5rem' }}>
          <LogOut size={20} /> Logout
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Input Card */}
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={24} color="var(--primary)" /> New Reading
          </h2>
          <form onSubmit={handleSave} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="BP (e.g. 120/80)" 
              value={newReading}
              onChange={(e) => setNewReading(e.target.value)}
              style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #ddd', minWidth: '200px' }}
              required
            />
            <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
              Save Reading
            </button>
          </form>
        </motion.div>

        {/* Graph Card */}
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} color="var(--primary)" /> Health Trends
          </h2>
          {readings.length > 0 ? (
            <HealthGraph readings={readings} />
          ) : (
            <div className="flex-center" style={{ height: '300px', flexDirection: 'column', color: 'var(--text-muted)' }}>
              <Mascot size={100} mood="thinking" />
              <p>No readings yet. Add your first one above!</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
