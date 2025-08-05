export interface TranscriptionResult {
  originalText: string;
  translatedText?: string;
  speakerLabel?: string;
  timestamp: number;
  confidence?: number;
}

export interface CaptionStyle {
  position: 'top' | 'bottom' | 'center';
  fontSize: 'small' | 'medium' | 'large';
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  opacity: number;
}

/**
 * Caption renderer that can overlay captions on any web page
 * Used by both web app and Chrome extension
 */
export class CaptionRenderer {
  private container: HTMLElement | null = null;
  private style: CaptionStyle;
  private fadeTimeout: number | null = null;

  constructor(style: CaptionStyle) {
    this.style = style;
    this.createContainer();
  }

  private createContainer(): void {
    // Remove existing container if it exists
    this.removeContainer();

    this.container = document.createElement('div');
    this.container.id = 'shift-speak-captions';
    this.container.style.cssText = `
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      ${this.style.position === 'top' ? 'top: 20px;' : ''}
      ${this.style.position === 'bottom' ? 'bottom: 20px;' : ''}
      ${this.style.position === 'center' ? 'top: 50%; transform: translate(-50%, -50%);' : ''}
      background-color: ${this.style.backgroundColor};
      color: ${this.style.textColor};
      padding: 12px 16px;
      border-radius: 8px;
      font-family: ${this.style.fontFamily};
      font-size: ${this.getFontSize()};
      max-width: 80vw;
      text-align: center;
      z-index: 999999;
      opacity: ${this.style.opacity};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s ease-in-out;
      pointer-events: none;
      display: none;
    `;

    document.body.appendChild(this.container);
  }

  private getFontSize(): string {
    switch (this.style.fontSize) {
      case 'small': return '14px';
      case 'medium': return '16px';
      case 'large': return '20px';
      default: return '16px';
    }
  }

  showCaption(result: TranscriptionResult, showOriginal: boolean = true, showTranslation: boolean = true): void {
    if (!this.container) return;

    let captionText = '';
    
    if (showOriginal && result.originalText) {
      captionText += result.originalText;
    }
    
    if (showTranslation && result.translatedText) {
      if (captionText) captionText += '\n';
      captionText += result.translatedText;
    }

    if (result.speakerLabel) {
      captionText = `${result.speakerLabel}: ${captionText}`;
    }

    if (captionText.trim()) {
      this.container.textContent = captionText;
      this.container.style.display = 'block';
      this.container.style.opacity = String(this.style.opacity);

      // Clear existing fade timeout
      if (this.fadeTimeout) {
        clearTimeout(this.fadeTimeout);
      }

      // Auto-hide after 5 seconds
      this.fadeTimeout = window.setTimeout(() => {
        this.hideCaption();
      }, 5000);
    }
  }

  hideCaption(): void {
    if (!this.container) return;

    this.container.style.opacity = '0';
    setTimeout(() => {
      if (this.container) {
        this.container.style.display = 'none';
      }
    }, 300);

    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
  }

  updateStyle(newStyle: Partial<CaptionStyle>): void {
    this.style = { ...this.style, ...newStyle };
    this.createContainer();
  }

  removeContainer(): void {
    const existing = document.getElementById('shift-speak-captions');
    if (existing) {
      existing.remove();
    }
    this.container = null;

    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
  }

  destroy(): void {
    this.removeContainer();
  }
}