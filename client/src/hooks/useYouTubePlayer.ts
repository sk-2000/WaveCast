import { useEffect, useRef, useState, useCallback } from 'react';

// Extend window for YouTube API
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export type PlayerState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';

export const useYouTubePlayer = (containerId: string) => {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>('unstarted');

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    function initPlayer() {
      playerRef.current = new window.YT.Player(containerId, {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0, // hide native controls
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0
        },
        events: {
          onReady: () => setIsReady(true),
          onStateChange: (event: any) => {
            const states = {
              '-1': 'unstarted',
              '0': 'ended',
              '1': 'playing',
              '2': 'paused',
              '3': 'buffering',
              '5': 'cued'
            };
            setPlayerState(states[event.data as keyof typeof states] as PlayerState || 'unstarted');
          }
        }
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [containerId]);

  const loadVideo = useCallback((videoId: string, startSeconds: number = 0) => {
    if (playerRef.current && isReady) {
      playerRef.current.loadVideoById({ videoId, startSeconds });
    }
  }, [isReady]);

  const play = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.playVideo();
    }
  }, [isReady]);

  const pause = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.pauseVideo();
    }
  }, [isReady]);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current && isReady) {
      playerRef.current.seekTo(seconds, true);
    }
  }, [isReady]);

  const getCurrentTime = useCallback((): number => {
    if (playerRef.current && isReady) {
      return playerRef.current.getCurrentTime() || 0;
    }
    return 0;
  }, [isReady]);

  const getDuration = useCallback((): number => {
    if (playerRef.current && isReady) {
      return playerRef.current.getDuration() || 0;
    }
    return 0;
  }, [isReady]);

  return {
    isReady,
    playerState,
    loadVideo,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration
  };
};
