import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TRANSLATION_SERVICES } from "@/types/transcription";
import type { UserSettings } from "@/types/transcription";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings['settings'];
  onSave: (settings: UserSettings['settings']) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: SettingsModalProps) {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSave(localSettings);
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      transcriptionDelay: 500,
      useEuServers: false,
      showOriginal: true,
      showTranslation: true,
      speakerLabels: false,
      fontSize: 'medium' as const,
      captionPosition: 'bottom' as const,
      translationService: 'openai' as const,
      defaultSourceLanguage: 'auto',
      defaultTargetLanguage: 'english',
    };
    setLocalSettings(defaultSettings);
  };

  const updateSetting = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="languages">Languages</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Configure your API keys and service preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lemonfox-key">Lemonfox API Key</Label>
                  <Input
                    id="lemonfox-key"
                    type="password"
                    placeholder="lf_••••••••••••••••"
                    value={localSettings.lemonfoxApiKey || ''}
                    onChange={(e) => updateSetting('lemonfoxApiKey', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Translation Service</Label>
                  <Select 
                    value={localSettings.translationService || 'openai'} 
                    onValueChange={(value) => updateSetting('translationService', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSLATION_SERVICES.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Use EU Servers</Label>
                    <p className="text-sm text-muted-foreground">
                      Process data within the EU (20% surcharge)
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.useEuServers || false}
                    onCheckedChange={(checked) => updateSetting('useEuServers', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Settings</CardTitle>
                <CardDescription>
                  Adjust transcription timing and processing options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Transcription Delay: {localSettings.transcriptionDelay || 500}ms</Label>
                  <Slider
                    value={[localSettings.transcriptionDelay || 500]}
                    onValueChange={(value) => updateSetting('transcriptionDelay', value[0])}
                    max={2000}
                    min={100}
                    step={100}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>100ms (Fast)</span>
                    <span>2000ms (Slower, more accurate)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="display" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Caption Display</CardTitle>
                <CardDescription>
                  Customize how captions appear on screen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Show Original Text</Label>
                    <Switch
                      checked={localSettings.showOriginal ?? true}
                      onCheckedChange={(checked) => updateSetting('showOriginal', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Show Translation</Label>
                    <Switch
                      checked={localSettings.showTranslation ?? true}
                      onCheckedChange={(checked) => updateSetting('showTranslation', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Speaker Labels</Label>
                    <Switch
                      checked={localSettings.speakerLabels || false}
                      onCheckedChange={(checked) => updateSetting('speakerLabels', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select 
                    value={localSettings.fontSize || 'medium'} 
                    onValueChange={(value) => updateSetting('fontSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="xlarge">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Caption Position</Label>
                  <Select 
                    value={localSettings.captionPosition || 'bottom'} 
                    onValueChange={(value) => updateSetting('captionPosition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="languages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Default Languages</CardTitle>
                <CardDescription>
                  Set your preferred source and target languages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Source Language</Label>
                  <Select 
                    value={localSettings.defaultSourceLanguage || 'auto'} 
                    onValueChange={(value) => updateSetting('defaultSourceLanguage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="german">German</SelectItem>
                      <SelectItem value="chinese">Chinese</SelectItem>
                      <SelectItem value="japanese">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default Target Language</Label>
                  <Select 
                    value={localSettings.defaultTargetLanguage || 'english'} 
                    onValueChange={(value) => updateSetting('defaultTargetLanguage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="german">German</SelectItem>
                      <SelectItem value="chinese">Chinese</SelectItem>
                      <SelectItem value="japanese">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
