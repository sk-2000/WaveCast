import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { socket } from '../socket';
import type { Room, Member, PlaybackState, Track } from '../types';

interface RoomContextProps {
  room: Room | null;
  me: Member | null;
  joinRoom: (roomId: string, username: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  isHost: boolean;
}

const RoomContext = createContext<RoomContextProps | undefined>(undefined);

export const RoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<Member | null>(null);

  useEffect(() => {
    socket.on('room_state_sync', (syncedRoom: Room) => {
      setRoom(syncedRoom);
    });

    socket.on('member_joined', (member: Member) => {
      setRoom(prev => prev ? { ...prev, members: [...prev.members, member] } : null);
    });

    socket.on('member_left', (member: Member) => {
      setRoom(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== member.id) } : null);
    });

    socket.on('playback_updated', (state: PlaybackState) => {
      setRoom(prev => prev ? { ...prev, playbackState: state } : null);
    });

    socket.on('queue_updated', (queue: Track[], isQueueLocked: boolean) => {
      setRoom(prev => prev ? { ...prev, queue, isQueueLocked } : null);
    });

    socket.on('host_transferred', (newHostId: string) => {
      setRoom(prev => prev ? { ...prev, hostId: newHostId } : null);
    });

    return () => {
      socket.off('room_state_sync');
      socket.off('member_joined');
      socket.off('member_left');
      socket.off('playback_updated');
      socket.off('queue_updated');
      socket.off('host_transferred');
    };
  }, []);

  const joinRoom = (roomId: string, username: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      socket.connect();
      socket.emit('join_room', roomId, username, (response: any) => {
        if (response.success) {
          setRoom(response.room);
          setMe({ id: socket.id!, username });
          resolve({ success: true });
        } else {
          socket.disconnect();
          resolve({ success: false, error: response.error });
        }
      });
    });
  };

  const leaveRoom = () => {
    socket.emit('leave_room');
    socket.disconnect();
    setRoom(null);
    setMe(null);
  };

  const isHost = Boolean(room && me && room.hostId === me.id);

  return (
    <RoomContext.Provider value={{ room, me, joinRoom, leaveRoom, isHost }}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};
