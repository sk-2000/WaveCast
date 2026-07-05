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

export interface ServerToClientEvents {
  room_state_sync: (room: Room) => void;
  member_joined: (member: Member) => void;
  member_left: (member: Member) => void;
  playback_updated: (state: PlaybackState) => void;
  queue_updated: (queue: Track[], isLocked: boolean) => void;
  host_transferred: (newHostId: string) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  join_room: (roomId: string, username: string, callback: (response: { success: boolean, room?: Room, error?: string }) => void) => void;
  leave_room: () => void;
  host_play: (position: number, timestamp: number) => void;
  host_pause: (position: number, timestamp: number) => void;
  host_seek: (position: number, timestamp: number) => void;
  add_track: (track: Track) => void;
  remove_track: (trackId: string) => void;
  reorder_queue: (newQueueArray: Track[]) => void;
  toggle_queue_lock: (isLocked: boolean) => void;
  transfer_host: (newHostId: string) => void;
  play_next_track: () => void;
}
