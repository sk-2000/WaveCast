import React, { useEffect, useRef, useState } from 'react';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { useRoom } from '../context/RoomContext';
import { socket } from '../socket';
import type { PlaybackState } from '../types';

export const Player: React.FC = () => {
  const { isReady, playerState, loadVideo, play, pause, seekTo, getCurrentTime } = useYouTubePlayer('yt-player');
  const { room, isHost } = useRoom();
  const prevTrackIdRef = useRef<string | null>(null);
  const syncIntervalRef = useRef<any>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  // 1. Handle Track Changes
  useEffect(() => {
    if (!room || !isReady) return;
    
    if (room.playbackState.trackId && room.playbackState.trackId !== prevTrackIdRef.current) {
      prevTrackIdRef.current = room.playbackState.trackId;
      loadVideo(room.playbackState.trackId, room.playbackState.position);
    }
  }, [room?.playbackState.trackId, isReady, loadVideo]);

  // 2. Host Logic: Broadcast State Changes
  useEffect(() => {
    if (!room || !isHost || !isReady) return;

    const currentPosition = getCurrentTime();
    const timestamp = Date.now();

    if (playerState === 'playing' && room.playbackState.status !== 'playing') {
      socket.emit('host_play', currentPosition, timestamp);
    } else if (playerState === 'paused' && room.playbackState.status !== 'paused') {
      socket.emit('host_pause', currentPosition, timestamp);
    } else if (playerState === 'ended') {
      socket.emit('play_next_track');
    }
  }, [playerState, isHost, room?.playbackState.status, getCurrentTime, isReady]);

  // 3. Follower Logic: Sync & Drift Correction
  useEffect(() => {
    if (!room || isHost || !isReady) return;

    const { status, position, timestamp } = room.playbackState;

    if (status === 'playing') {
      if (playerState !== 'playing' && playerState !== 'buffering') {
        play();
        // Fallback for autoplay blocks
        setTimeout(() => {
           if (playerState !== 'playing') {
              setNeedsInteraction(true);
           }
        }, 1000);
      }

      // Drift correction interval
      syncIntervalRef.current = setInterval(() => {
        const expectedTime = position + (Date.now() - timestamp) / 1000;
        const actualTime = getCurrentTime();
        
        if (Math.abs(expectedTime - actualTime) > 0.5) { // 500ms threshold
           seekTo(expectedTime);
        }
      }, 2000);

    } else if (status === 'paused') {
      if (playerState === 'playing') {
        pause();
      }
      seekTo(position); // Ensure we're at the exact pause spot
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    }

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [room?.playbackState, isHost, isReady, playerState, play, pause, seekTo, getCurrentTime]);

  // Handle Autoplay Block Recovery
  const handleInteraction = () => {
    setNeedsInteraction(false);
    play();
    if (room?.playbackState.status === 'playing') {
      const expectedTime = room.playbackState.position + (Date.now() - room.playbackState.timestamp) / 1000;
      seekTo(expectedTime);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[300px] bg-black rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
      <div id="yt-player" className="w-full h-full absolute inset-0 pointer-events-none" />
      
      {needsInteraction && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 backdrop-blur-sm">
          <button 
            onClick={handleInteraction}
            className="bg-[var(--color-electric-cyan)] text-[var(--color-void)] px-6 py-3 rounded-full font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)] hover:scale-105 transition"
          >
            Tap to Sync Playback
          </button>
        </div>
      )}
      
      {/* Cover overlay to prevent native clicks, especially for host */}
      <div className="absolute inset-0 z-0"></div>
    </div>
  );
};
