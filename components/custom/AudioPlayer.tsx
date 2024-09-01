import React, { useEffect, useRef, useState } from "react";
import { useWavesurfer } from "@wavesurfer/react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  onTranscribe: () => void;
}

export function AudioPlayer({ audioUrl, onTranscribe }: AudioPlayerProps) {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);

  const { wavesurfer, isReady, isPlaying } = useWavesurfer({
    container: waveformRef,
    url: audioUrl,
    waveColor: "#6366f1",
    progressColor: "#4f46e5",
    height: 100,
  });

  useEffect(() => {
    if (wavesurfer) {
      const handleReady = () => {
        setIsAudioReady(true);
      };

      const handleError = (error: any) => {
        console.error("Wavesurfer error:", error);
        setIsAudioReady(false);
      };

      wavesurfer.on("ready", handleReady);
      wavesurfer.on("error", handleError);

      return () => {
        wavesurfer.unAll();
        if (isReady) {
          wavesurfer.destroy();
        }
      };
    }
  }, [wavesurfer]);

  const onPlayPause = () => {
    if (wavesurfer && isAudioReady) {
      wavesurfer.playPause();
    } else {
      console.log("Wavesurfer not ready or audio not loaded");
    }
  };

  return (
    <>
      <div className="relative">
        <div ref={waveformRef} />
        {!isAudioReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}
      </div>
      <div className="flex justify-between mt-2">
        <Button onClick={onPlayPause} disabled={!isAudioReady}>
          {isPlaying ? (
            <Pause className="h-4 w-4 mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <Button onClick={onTranscribe}>Transcribe</Button>
      </div>
    </>
  );
}
