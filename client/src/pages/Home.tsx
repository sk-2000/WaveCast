import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SoundEngine } from '../utils/SoundEngine';

export const Home: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    SoundEngine.init();
    SoundEngine.playClick();
    if (!username.trim()) return alert('Please enter a username');
    try {
      const URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${URL}/api/rooms`, { method: 'POST' });
      const data = await res.json();
      if (data.roomId) {
        navigate(`/room/${data.roomId}?username=${encodeURIComponent(username)}`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to create room');
    }
  };

  const handleJoinRoom = () => {
    SoundEngine.init();
    SoundEngine.playClick();
    if (!username.trim()) return alert('Please enter a username');
    if (!roomId.trim()) return alert('Please enter a room code');
    navigate(`/room/${roomId}?username=${encodeURIComponent(username)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen p-6 relative">
      {/* Morphing Background */}
      <div className="absolute inset-0 z-[-1] overflow-hidden">
        <motion.div 
          className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[80px] opacity-40 bg-[var(--color-electric-cyan)]"
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[80px] opacity-30 bg-[var(--color-liquid-pink)]"
          animate={{ x: [0, -40, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="glass-panel p-8 w-full max-w-md flex flex-col gap-6">
        <h1 className="text-4xl font-bold text-center tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-pink-500 pb-2">
          Wavecast
        </h1>
        <p className="text-center text-sm text-gray-300">Listen together, perfectly in sync.</p>

        <div className="flex flex-col gap-4 mt-4">
          <input 
            type="text" 
            placeholder="Your Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-[var(--color-electric-cyan)] transition-colors"
          />
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Room Code (optional)" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="flex-1 bg-black/30 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-[var(--color-liquid-pink)] transition-colors uppercase"
            />
            <motion.button 
              whileTap={{ scale: 0.95, scaleY: 0.9 }}
              onClick={handleJoinRoom}
              className="bg-[var(--color-liquid-pink)] text-white font-medium rounded-2xl px-6 py-3 shadow-[0_0_15px_rgba(255,0,127,0.4)]"
            >
              Join
            </motion.button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-white/30 text-sm">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <motion.button 
            whileTap={{ scale: 0.95, scaleX: 1.02 }}
            onClick={handleCreateRoom}
            className="w-full bg-[var(--color-electric-cyan)] text-[var(--color-void)] font-bold rounded-2xl px-4 py-3 shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          >
            Create New Room
          </motion.button>
        </div>
      </div>
    </div>
  );
};
