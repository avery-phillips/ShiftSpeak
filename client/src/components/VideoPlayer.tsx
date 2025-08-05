import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, Maximize, Upload, Link } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface VideoPlayerProps {
  onAudioCapture?: (stream: MediaStream) => void;
  onFileUpload?: (file: File) => void;
  onUrlLoad?: (url: string) => void;
  isCapturing?: boolean;
}

export function VideoPlayer({ 
  onAudioCapture, 
  onFileUpload, 
  onUrlLoad,
  isCapturing = false 
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [url, setUrl] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    const newTime = value[0];
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's audio or video
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      toast({
        title: "Invalid File",
        description: "Please select an audio or video file.",
        variant: "destructive",
      });
      return;
    }

    // Create object URL for local playback
    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
    }

    // Also notify parent component
    onFileUpload?.(file);
    
    toast({
      title: "File Loaded",
      description: `${file.name} has been loaded successfully.`,
    });
  };

  const handleUrlLoad = () => {
    if (!url.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }

    if (videoRef.current) {
      videoRef.current.src = url;
    }

    onUrlLoad?.(url);
    
    toast({
      title: "URL Loaded",
      description: "Media URL has been loaded successfully.",
    });
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Set up audio capture when video starts playing
  useEffect(() => {
    if (!videoRef.current || !isPlaying || !onAudioCapture) return;

    try {
      // Create audio context and capture stream from video element
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(videoRef.current);
      
      // Create a destination for capturing
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioContext.destination); // Also connect to speakers
      
      onAudioCapture(destination.stream);
      
      return () => {
        audioContext.close();
      };
    } catch (error) {
      console.error("Error setting up audio capture:", error);
      toast({
        title: "Audio Capture Error",
        description: "Failed to capture audio from video.",
        variant: "destructive",
      });
    }
  }, [isPlaying, onAudioCapture]);

  return (
    <Card className="overflow-hidden">
      {/* Media Upload/URL Input */}
      <div className="p-4 border-b space-y-4">
        <div className="space-y-2">
          <Label>Upload Audio/Video File</Label>
          <div className="flex space-x-2">
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*,video/*"
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Or Enter Media URL</Label>
          <div className="flex space-x-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
            />
            <Button onClick={handleUrlLoad} variant="outline">
              <Link className="h-4 w-4 mr-2" />
              Load
            </Button>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          crossOrigin="anonymous"
        />
        
        {/* Video Controls Overlay */}
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-60 rounded-lg p-3">
          <div className="space-y-2">
            {/* Progress Bar */}
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={togglePlay}
                  className="text-white hover:text-gray-300"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                {isCapturing && (
                  <div className="flex items-center space-x-1 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs">Capturing</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Volume2 className="h-4 w-4 text-white" />
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:text-gray-300"
                  onClick={() => videoRef.current?.requestFullscreen()}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
