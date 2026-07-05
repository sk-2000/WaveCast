import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { RoomManager } from './socket/roomManager';
import { ClientToServerEvents, ServerToClientEvents, Track } from './types';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: 'Query is required' });

    // In a real app we'd fetch duration too, but search API doesn't return duration directly.
    // We would need to make a second call to videos API, or we can mock duration for this prototype.
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q,
        type: 'video',
        videoCategoryId: '10', // Music
        maxResults: 10,
        key: process.env.YOUTUBE_API_KEY
      }
    });

    const items = response.data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.default.url,
      duration: '3:00' // Mock duration for prototype to save API quota
    }));

    res.json({ items });
  } catch (error) {
    console.error('YouTube API Error:', error);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

app.post('/api/rooms', (req, res) => {
  const room = roomManager.createRoom();
  res.json({ roomId: room.id });
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_room', (roomId, username, callback) => {
    const { success, room, error } = roomManager.joinRoom(roomId, { id: socket.id, username });
    if (!success || !room) {
      callback({ success: false, error });
      return;
    }

    socket.join(roomId);
    callback({ success: true, room });

    // Broadcast to others
    socket.to(roomId).emit('member_joined', { id: socket.id, username });
  });

  socket.on('host_play', (position, timestamp) => {
    const roomId = roomManager.getRoomId(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (room?.hostId !== socket.id) return;

    const newState = roomManager.updatePlaybackState(roomId, { status: 'playing', position, timestamp });
    if (newState) {
      io.to(roomId).emit('playback_updated', newState);
    }
  });

  socket.on('host_pause', (position, timestamp) => {
    const roomId = roomManager.getRoomId(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (room?.hostId !== socket.id) return;

    const newState = roomManager.updatePlaybackState(roomId, { status: 'paused', position, timestamp });
    if (newState) {
      io.to(roomId).emit('playback_updated', newState);
    }
  });

  socket.on('host_seek', (position, timestamp) => {
    const roomId = roomManager.getRoomId(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (room?.hostId !== socket.id) return;

    const newState = roomManager.updatePlaybackState(roomId, { position, timestamp });
    if (newState) {
      io.to(roomId).emit('playback_updated', newState);
    }
  });

  socket.on('add_track', (track: Track) => {
    const roomId = roomManager.getRoomId(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    if (room.isQueueLocked && room.hostId !== socket.id) return;

    room.queue.push(track);
    // Auto start if queue was empty and nothing is playing
    if (room.queue.length === 1 && room.playbackState.status === 'unstarted') {
       room.playbackState.trackId = track.id;
       room.playbackState.status = 'playing';
       room.playbackState.timestamp = Date.now();
       room.playbackState.position = 0;
       io.to(roomId).emit('playback_updated', room.playbackState);
    }

    io.to(roomId).emit('queue_updated', room.queue, room.isQueueLocked);
  });

  socket.on('remove_track', (trackId: string) => {
     const roomId = roomManager.getRoomId(socket.id);
     if (!roomId) return;
     const room = roomManager.getRoom(roomId);
     if (!room) return;
     
     if (room.isQueueLocked && room.hostId !== socket.id) return;

     room.queue = room.queue.filter(t => t.id !== trackId);
     io.to(roomId).emit('queue_updated', room.queue, room.isQueueLocked);
  });

  socket.on('reorder_queue', (newQueue: Track[]) => {
     const roomId = roomManager.getRoomId(socket.id);
     if (!roomId) return;
     const room = roomManager.getRoom(roomId);
     if (!room) return;
     
     if (room.isQueueLocked && room.hostId !== socket.id) return;

     room.queue = newQueue;
     io.to(roomId).emit('queue_updated', room.queue, room.isQueueLocked);
  });

  socket.on('toggle_queue_lock', (isLocked: boolean) => {
     const roomId = roomManager.getRoomId(socket.id);
     if (!roomId) return;
     const room = roomManager.getRoom(roomId);
     if (!room || room.hostId !== socket.id) return;

     room.isQueueLocked = isLocked;
     io.to(roomId).emit('queue_updated', room.queue, room.isQueueLocked);
  });

  socket.on('transfer_host', (newHostId: string) => {
     const roomId = roomManager.getRoomId(socket.id);
     if (!roomId) return;
     const room = roomManager.getRoom(roomId);
     if (!room || room.hostId !== socket.id) return;

     const newHost = room.members.find(m => m.id === newHostId);
     if (newHost) {
       room.hostId = newHostId;
       io.to(roomId).emit('host_transferred', newHostId);
     }
  });

  socket.on('play_next_track', () => {
     const roomId = roomManager.getRoomId(socket.id);
     if (!roomId) return;
     const room = roomManager.getRoom(roomId);
     if (!room || room.hostId !== socket.id) return;

     if (room.queue.length > 0) {
       // Find current index
       const currentIndex = room.queue.findIndex(t => t.id === room.playbackState.trackId);
       const nextIndex = currentIndex + 1;
       
       if (nextIndex < room.queue.length) {
         room.playbackState.trackId = room.queue[nextIndex].id;
         room.playbackState.status = 'playing';
         room.playbackState.position = 0;
         room.playbackState.timestamp = Date.now();
         io.to(roomId).emit('playback_updated', room.playbackState);
       } else {
         // Reached the end
         room.playbackState.status = 'ended';
         io.to(roomId).emit('playback_updated', room.playbackState);
       }
     }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const { room, member, newHostId, isDeleted } = roomManager.leaveRoom(socket.id);
    if (room && member) {
      socket.to(room.id).emit('member_left', member);
      if (newHostId) {
        socket.to(room.id).emit('host_transferred', newHostId);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
