import React, { useEffect, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { socket } from '../socket';
import { Play, Pause, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';
import { SoundEngine } from '../utils/SoundEngine';

export const HostControls: React.FC = () => {
  const { room, isHost } = useRoom();
  const [localProgress, setLocalProgress] = useState(0);

  useEffect(() => {
    if (!room) return;
    
    // Smooth progress bar update when playing
    let animationFrameId: number;
    let lastTime = Date.now();
    let currentPos = room.playbackState.position;

    const updateProgress = () => {
      if (room.playbackState.status === 'playing') {
        const now = Date.now();
        currentPos += (now - lastTime) / 1000;
        lastTime = now;
        setLocalProgress(currentPos);
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        setLocalProgress(room.playbackState.position);
      }
    };

    if (room.playbackState.status === 'playing') {
       animationFrameId = requestAnimationFrame(updateProgress);
    } else {
       setLocalProgress(room.playbackState.position);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [room?.playbackState]);

  if (!room || !isHost) return null;

  const togglePlay = () => {
    SoundEngine.playClick();
    const timestamp = Date.now();
    if (room.playbackState.status === 'playing') {
      socket.emit('host_pause', localProgress, timestamp);
    } else {
      socket.emit('host_play', localProgress, timestamp);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPos = parseFloat(e.target.value);
    setLocalProgress(newPos);
    socket.emit('host_seek', newPos, Date.now());
  };
  
  const currentTrack = room.queue.find(t => t.id === room.playbackState.trackId);
  // Example duration, ideally parsed from YT duration string (PT4M33S)
  // For now, assuming duration is passed or we default to 100% logic
  const durationSecs = currentTrack ? 300 : 0; // Temporary mock

  const handleSkip = () => {
    SoundEngine.playClick();
    socket.emit('play_next_track');
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4 mt-4 w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Host Controls</h3>
      </div>
      
      <div className="flex items-center gap-4">
        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={togglePlay}
          className="w-12 h-12 flex items-center justify-center bg-[var(--color-electric-cyan)] rounded-full text-[var(--color-void)] shadow-[0_0_15px_rgba(0,229,255,0.4)]"
        >
          {room.playbackState.status === 'playing' ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
        </motion.button>

        <div className="flex-1">
          <input 
            type="range" 
            min={0} 
            max={durationSecs || 100} 
            value={localProgress}
            onChange={handleSeek}
            className="w-full"
          />
        </div>

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={handleSkip}
          className="p-2 text-white/70 hover:text-white"
        >
          <SkipForward />
        </motion.button>
      </div>
    </div>
  );
};
