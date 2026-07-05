import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { motion } from 'framer-motion';
import { Player } from '../components/Player';
import { HostControls } from '../components/HostControls';
import { Queue } from '../components/Queue';

export const RoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const username = searchParams.get('username');
  const navigate = useNavigate();
  const { room, joinRoom, leaveRoom, isHost } = useRoom();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !username) {
      navigate('/');
      return;
    }

    joinRoom(id, username).then(res => {
      if (!res.success) {
        setError(res.error || 'Failed to join room');
      }
    });

    return () => {
      leaveRoom();
    };
  }, [id, username]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass-panel p-8 text-center text-red-400">
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-white underline">Go Home</button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-16 h-16 rounded-full bg-[var(--color-electric-cyan)] blur-md"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen p-4 md:p-8 relative">
      {/* Morphing Background */}
      <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-20 bg-[var(--color-electric-cyan)]"
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-pink-500">Wavecast</h1>
          <p className="text-sm text-gray-400">Room: <span className="font-mono text-white tracking-widest">{room.id}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">
            {room.members.length} {room.members.length === 1 ? 'Listener' : 'Listeners'}
          </span>
          <button 
            onClick={() => navigate('/')}
            className="text-xs bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition"
          >
            Leave
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col relative w-full aspect-video rounded-2xl overflow-hidden">
            <Player />
            {isHost && (
              <span className="absolute top-4 left-4 bg-[var(--color-electric-cyan)] text-[var(--color-void)] text-xs font-bold px-2 py-1 rounded z-20 pointer-events-none">
                YOU ARE HOST
              </span>
            )}
          </div>
          <HostControls />
          
          <div className="glass-panel p-6">
            <h2 className="font-semibold mb-4">Listeners</h2>
            <div className="flex flex-wrap gap-2">
              {room.members.map(m => (
                <div key={m.id} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.id === room.hostId ? 'bg-[var(--color-electric-cyan)] shadow-[0_0_8px_#00E5FF]' : 'bg-white/30'}`}></div>
                  {m.username}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="glass-panel p-6 flex flex-col max-h-[70vh]">
          <Queue />
        </div>
      </main>
    </div>
  );
};
