import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Search, Plus, Trash2, GripVertical, Lock, Unlock } from 'lucide-react';
import { useRoom } from '../context/RoomContext';
import { socket } from '../socket';
import type { Track } from '../types';
import { motion } from 'framer-motion';
import { SoundEngine } from '../utils/SoundEngine';

export const Queue: React.FC = () => {
  const { room, isHost } = useRoom();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  if (!room) return null;

  const canEdit = isHost || !room.isQueueLocked;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${URL}/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.items) {
        setSearchResults(data.items);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const addTrack = (track: Track) => {
    if (!canEdit) return;
    SoundEngine.playClick();
    socket.emit('add_track', track);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeTrack = (trackId: string) => {
    if (!canEdit) return;
    SoundEngine.playClick();
    socket.emit('remove_track', trackId);
  };

  const onDragEnd = (result: DropResult) => {
    if (!canEdit) return;
    if (!result.destination) return;

    const items = Array.from(room.queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Optimistic update could go here, but server broadcast is fast enough usually
    socket.emit('reorder_queue', items);
  };

  const toggleLock = () => {
    if (!isHost) return;
    if (room.isQueueLocked) SoundEngine.playToggleOff();
    else SoundEngine.playToggleOn();
    socket.emit('toggle_queue_lock', !room.isQueueLocked);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search Area */}
      {canEdit && (
        <form onSubmit={handleSearch} className="relative mb-4 shrink-0">
          <input
            type="text"
            placeholder="Search YouTube..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-[var(--color-electric-cyan)] transition-colors text-sm"
          />
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-white/50" />
        </form>
      )}

      {searchResults.length > 0 && (
        <div className="bg-black/80 rounded-2xl border border-white/10 p-2 mb-4 shrink-0 max-h-60 overflow-y-auto">
          <div className="flex justify-between items-center px-2 mb-2">
            <span className="text-xs text-white/50">Search Results</span>
            <button onClick={() => setSearchResults([])} className="text-xs text-white/50 hover:text-white">Close</button>
          </div>
          {searchResults.map(track => (
            <div key={track.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl group transition-colors">
              <img src={track.thumbnail} alt="" className="w-12 h-12 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{track.title}</p>
                <p className="text-xs text-white/50 truncate">{track.channel}</p>
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => addTrack(track)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-electric-cyan)] hover:bg-[var(--color-electric-cyan)] hover:text-black"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>
          ))}
        </div>
      )}

      {/* Queue Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          Up Next
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/70">{room.queue.length}</span>
        </h2>
        {isHost && (
          <button 
            onClick={toggleLock} 
            className="text-white/50 hover:text-white transition-colors"
            title={room.isQueueLocked ? "Unlock Queue" : "Lock Queue"}
          >
            {room.isQueueLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-2">
        {room.queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm italic p-4 text-center">
            Queue is empty. <br/> {canEdit ? 'Search to add tracks.' : 'Wait for host to add tracks.'}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="queue-list" isDropDisabled={!canEdit}>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-2">
                  {room.queue.map((track, index) => (
                    <Draggable key={track.id + index} draggableId={track.id + index} index={index} isDragDisabled={!canEdit}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${
                            snapshot.isDragging 
                              ? 'bg-[#170B3B] border-[var(--color-electric-cyan)] shadow-[0_0_15px_rgba(0,229,255,0.3)] z-50' 
                              : 'bg-black/20 border-white/5 hover:bg-white/5'
                          } ${room.playbackState.trackId === track.id ? 'border-[var(--color-liquid-pink)] bg-pink-900/10' : ''}`}
                        >
                          <div {...provided.dragHandleProps} className={`text-white/20 hover:text-white/50 p-1 ${!canEdit && 'hidden'}`}>
                            <GripVertical className="w-4 h-4" />
                          </div>
                          
                          <img src={track.thumbnail} alt="" className="w-10 h-10 object-cover rounded-lg" />
                          
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${room.playbackState.trackId === track.id ? 'text-[var(--color-liquid-pink)]' : ''}`}>
                              {track.title}
                            </p>
                            <p className="text-xs text-white/50 truncate">{track.channel}</p>
                          </div>

                          {canEdit && (
                            <button 
                              onClick={() => removeTrack(track.id)}
                              className="text-white/20 hover:text-red-400 p-2 transition-colors rounded-full hover:bg-red-400/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
};
