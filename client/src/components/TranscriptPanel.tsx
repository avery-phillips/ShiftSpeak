import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Trash2, Download, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranscriptionEntry } from "@/types/transcription";
import { useToast } from "@/hooks/use-toast";

interface TranscriptPanelProps {
  entries: TranscriptionEntry[];
  isListening?: boolean;
  onClear?: () => void;
  onExport?: (format: 'txt' | 'srt' | 'vtt') => void;
  showOriginal?: boolean;
  showTranslation?: boolean;
  className?: string;
}

export function TranscriptPanel({
  entries,
  isListening = false,
  onClear,
  onExport,
  showOriginal = true,
  showTranslation = true,
  className,
}: TranscriptPanelProps) {
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [entries]);

  const handleCopy = async () => {
    try {
      const text = entries
        .map(entry => {
          let result = '';
          if (showOriginal && entry.originalText) {
            result += `${entry.speakerLabel ? `[${entry.speakerLabel}] ` : ''}${entry.originalText}`;
          }
          if (showTranslation && entry.translatedText) {
            if (result) result += '\n';
            result += `[Translation] ${entry.translatedText}`;
          }
          return result;
        })
        .join('\n\n');

      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to Clipboard",
        description: "Transcript has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy transcript to clipboard.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (timestamp: number) => {
    // Convert timestamp to duration from start
    const firstTimestamp = entries[0]?.timestamp || timestamp;
    const duration = Math.max(0, timestamp - firstTimestamp);
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Transcript</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={entries.length === 0}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={entries.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExport?.('srt')}
              disabled={entries.length === 0}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-80" ref={scrollAreaRef}>
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border-l-2 border-blue-500 pl-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-500">
                    {formatDuration(entry.timestamp)}
                    {entry.speakerLabel && ` - ${entry.speakerLabel}`}
                  </div>
                  {entry.confidence && (
                    <div className="text-xs text-gray-400">
                      {entry.confidence}% confidence
                    </div>
                  )}
                </div>
                
                {showOriginal && entry.originalText && (
                  <p className="text-sm text-gray-800 mb-1 leading-relaxed">
                    {entry.originalText}
                  </p>
                )}
                
                {showTranslation && entry.translatedText && (
                  <p className="text-sm text-green-600 leading-relaxed">
                    {entry.translatedText}
                  </p>
                )}
              </div>
            ))}
            
            {/* Listening indicator */}
            {isListening && (
              <div className="border-l-2 border-gray-300 pl-3 py-2">
                <div className="flex items-center text-xs text-gray-400">
                  <Mic className="h-3 w-3 mr-1 animate-pulse" />
                  Listening...
                </div>
              </div>
            )}
            
            {/* Empty state */}
            {entries.length === 0 && !isListening && (
              <div className="text-center py-8 text-gray-500">
                <Mic className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No transcript entries yet</p>
                <p className="text-sm">Start transcription to see results here</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
