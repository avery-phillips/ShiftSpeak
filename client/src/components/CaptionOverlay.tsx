import { cn } from "@/lib/utils";
import { Mic } from "lucide-react";

interface CaptionOverlayProps {
  originalText?: string;
  translatedText?: string;
  speakerLabel?: string;
  showOriginal?: boolean;
  showTranslation?: boolean;
  position?: 'bottom' | 'top' | 'center';
  fontSize?: 'small' | 'medium' | 'large' | 'xlarge';
  isLive?: boolean;
  className?: string;
}

export function CaptionOverlay({
  originalText,
  translatedText,
  speakerLabel,
  showOriginal = true,
  showTranslation = true,
  position = 'bottom',
  fontSize = 'medium',
  isLive = false,
  className,
}: CaptionOverlayProps) {
  if (!originalText && !translatedText) {
    return null;
  }

  const positionClasses = {
    bottom: 'bottom-20',
    top: 'top-20',
    center: 'top-1/2 -translate-y-1/2',
  };

  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl',
  };

  return (
    <div className={cn(
      "fixed left-1/2 -translate-x-1/2 z-50 max-w-4xl mx-4",
      positionClasses[position],
      className
    )}>
      <div className="bg-black bg-opacity-90 backdrop-blur-sm rounded-lg p-4 space-y-2 shadow-lg border border-gray-700">
        {/* Original Text */}
        {showOriginal && originalText && (
          <div className="text-white">
            <span className="text-xs text-gray-300 block mb-1">
              Original {speakerLabel && `(${speakerLabel})`}
            </span>
            <p className={cn("leading-relaxed", fontSizeClasses[fontSize])}>
              {originalText}
            </p>
          </div>
        )}
        
        {/* Translated Text */}
        {showTranslation && translatedText && (
          <div className="text-green-400">
            <span className="text-xs text-green-300 block mb-1">Translation</span>
            <p className={cn("leading-relaxed", fontSizeClasses[fontSize])}>
              {translatedText}
            </p>
          </div>
        )}

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-600">
          <div className="flex items-center space-x-2">
            {speakerLabel && <span>{speakerLabel}</span>}
          </div>
          {isLive && (
            <div className="flex items-center space-x-1">
              <Mic className="h-3 w-3 animate-pulse" />
              <span>Live</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
