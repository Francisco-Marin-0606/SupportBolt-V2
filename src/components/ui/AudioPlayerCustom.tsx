import { formatTime } from "@/app/utils/audioDetailUtils";
import { useEffect, useRef } from "react";
import AudioPlayer, { RHAP_UI } from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";

interface AudioPlayerCustomProps {
  src?: string;
  timeStart?: number;
  timeEnd?: number;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}

export const AudioPlayerCustom = ({ 
  src, 
  timeStart = 0, 
  timeEnd, 
  onTimeUpdate,
  className = ""
}: AudioPlayerCustomProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (audioRef.current && timeEnd) {
        const currentTime = audioRef.current.currentTime;
        
        if (onTimeUpdate) {
          onTimeUpdate(currentTime);
        }
        
        // Pausar cuando llegue al timeEnd
        if (currentTime >= timeEnd) {
          audioRef.current.pause();
        }
      }
    };

    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [timeEnd, onTimeUpdate]);

  const handleRestart = () => {
    if (audioRef.current && timeStart !== undefined) {
      audioRef.current.currentTime = timeStart;
      audioRef.current.play();
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div>
        <AudioPlayer
          src={src}
          showJumpControls={false}
          showFilledVolume={false}
          autoPlayAfterSrcChange={false}
          autoPlay={false}
          layout="horizontal-reverse"
          showSkipControls={false}
          showDownloadProgress={true}
          showFilledProgress={false}
          onLoadedData={(e) => {
            const audio = e.target as HTMLAudioElement;
            audioRef.current = audio;
            audio.currentTime = timeStart;
          }}
          customControlsSection={[
            RHAP_UI.MAIN_CONTROLS,
            RHAP_UI.PROGRESS_BAR,
          ]}
          customProgressBarSection={[
            RHAP_UI.CURRENT_TIME,
            <div key="separator" className="mx-1">/</div>,
            <div key="custom-duration" className="text-sm">
              {timeEnd ? formatTime(timeEnd - timeStart) : "0:00"}
            </div>,
          ]}
          customIcons={{
            play: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ),
            pause: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ),
            volume: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            ),
            volumeMute: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 9v6h4l5 5V4l-5 5H7z" />
              </svg>
            ),
          }}
          style={{
            background: "transparent",
            boxShadow: "none",
          }}
          className="audio-player-custom"
        />
      </div>
      <button
        onClick={handleRestart}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
        title="Reiniciar fragmento"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
        </svg>
      </button>
    </div>
  );
};
