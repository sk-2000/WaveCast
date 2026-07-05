import { Room, Member, Track, PlaybackState } from '../types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  createRoom(): Room {
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newRoom: Room = {
      id: roomId,
      hostId: '',
      members: [],
      queue: [],
      isQueueLocked: false,
      playbackState: {
        status: 'unstarted',
        trackId: null,
        position: 0,
        timestamp: Date.now()
      }
    };
    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId: string, member: Member): { success: boolean, room?: Room, error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.members.length === 0) {
      room.hostId = member.id; // First to join is host
    }

    room.members.push(member);
    this.socketToRoom.set(member.id, roomId);

    return { success: true, room };
  }

  leaveRoom(socketId: string): { room?: Room, member?: Member, newHostId?: string, isDeleted: boolean } {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return { isDeleted: false };

    const room = this.rooms.get(roomId);
    if (!room) return { isDeleted: false };

    const memberIndex = room.members.findIndex(m => m.id === socketId);
    if (memberIndex === -1) return { isDeleted: false };

    const member = room.members[memberIndex];
    room.members.splice(memberIndex, 1);
    this.socketToRoom.delete(socketId);

    let newHostId: string | undefined;
    let isDeleted = false;

    if (room.members.length === 0) {
      this.rooms.delete(roomId);
      isDeleted = true;
    } else if (room.hostId === socketId) {
      room.hostId = room.members[0].id;
      newHostId = room.hostId;
    }

    return { room, member, newHostId, isDeleted };
  }

  getRoomId(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  updatePlaybackState(roomId: string, state: Partial<PlaybackState>): PlaybackState | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.playbackState = {
      ...room.playbackState,
      ...state
    };
    return room.playbackState;
  }
}
