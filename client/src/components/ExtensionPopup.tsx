import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mic, Settings, Download, CheckCircle, Loader2 } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/types/transcription";
import { useToast } from "@/hooks/use-toast";

interface ExtensionPopupProps {
  isActive: boolean;
  onToggleActive: (active: boolean) => void;
  sourceLanguage: string;
  onSourceLanguageChange: (language: string) => void;
  targetLanguage: string;
  onTargetLanguageChange: (language: string) => void;
  showOriginal: boolean;
  onShowOriginalChange: (show: boolean) => void;
  showTranslation: boolean;
  onShowTranslationChange: (show: boolean) => void;
  speakerLabels: boolean;
  onSpeakerLabelsChange: (enabled: boolean) => void;
  onSaveTranscript: () => void;
  onOpenSettings: () => void;
  apiStatus: {
    lemonfox: 'connected' | 'disconnected' | 'loading';
    translation: 'connected' | 'disconnected' | 'loading';
  };
}

export function ExtensionPopup({
  isActive,
  onToggleActive,
  sourceLanguage,
  onSourceLanguageChange,
  targetLanguage,
  onTargetLanguageChange,
  showOriginal,
  onShowOriginalChange,
  showTranslation,
  onShowTranslationChange,
  speakerLabels,
  onSpeakerLabelsChange,
  onSaveTranscript,
  onOpenSettings,
  apiStatus,
}: ExtensionPopupProps) {
  const { toast } = useToast();

  const handleToggleActive = (checked: boolean) => {
    onToggleActive(checked);
    toast({
      title: checked ? "Transcription Started" : "Transcription Stopped",
      description: checked 
        ? "Real-time transcription is now active"
        : "Real-time transcription has been paused",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-red-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'loading':
        return 'Connecting...';
      default:
        return 'Disconnected';
    }
  };

  return (
    <Card className="w-80 shadow-lg">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mic className="h-5 w-5" />
            <span className="font-medium">Shift Speak</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span className="text-xs">{isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Toggle Control */}
        <div className="flex items-center justify-between">
          <Label htmlFor="enable-transcription" className="text-sm font-medium">
            Enable Transcription
          </Label>
          <Switch
            id="enable-transcription"
            checked={isActive}
            onCheckedChange={handleToggleActive}
          />
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Source Language</Label>
          <Select value={sourceLanguage} onValueChange={onSourceLanguageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Translate to</Label>
          <Select value={targetLanguage} onValueChange={onTargetLanguageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.filter(lang => lang.code !== 'auto').map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Caption Options */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Caption Display</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-original" className="text-sm">Show Original</Label>
              <Switch
                id="show-original"
                checked={showOriginal}
                onCheckedChange={onShowOriginalChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-translation" className="text-sm">Show Translation</Label>
              <Switch
                id="show-translation"
                checked={showTranslation}
                onCheckedChange={onShowTranslationChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="speaker-labels" className="text-sm">Speaker Labels</Label>
              <Switch
                id="speaker-labels"
                checked={speakerLabels}
                onCheckedChange={onSpeakerLabelsChange}
              />
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="border-t pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Lemonfox API</span>
              <div className="flex items-center space-x-1">
                {getStatusIcon(apiStatus.lemonfox)}
                <span className="text-xs">{getStatusText(apiStatus.lemonfox)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Translation API</span>
              <div className="flex items-center space-x-1">
                {getStatusIcon(apiStatus.translation)}
                <span className="text-xs">{getStatusText(apiStatus.translation)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-4">
          <Button 
            onClick={onSaveTranscript} 
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Save Transcript
          </Button>
          <Button 
            onClick={onOpenSettings} 
            variant="outline" 
            className="w-full"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Advanced Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
