export interface Member {
  id: string; // Socket ID
  username: string;
}

export interface Track {
  id: string; // YouTube Video ID
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

export interface PlaybackState {
  status: 'unstarted' | 'playing' | 'paused' | 'buffering' | 'ended';
  trackId: string | null;
  position: number; // in seconds
  timestamp: number; // Server timestamp when position was recorded
}

export interface Room {
  id: string; // 4-5 char code
  hostId: string;
  members: Member[];
  queue: Track[];
  isQueueLocked: boolean;
  playbackState: PlaybackState;
}
