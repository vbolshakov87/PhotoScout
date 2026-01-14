import { useCallback } from 'react';
import type { NativeBridgeMessage } from '@photoscout/shared';

function postNativeMessage(message: NativeBridgeMessage): boolean {
  if (window.webkit?.messageHandlers?.nativeBridge) {
    window.webkit.messageHandlers.nativeBridge.postMessage(message);
    return true;
  }
  return false;
}

export function useNativeBridge() {
  const isNative = !!window.webkit?.messageHandlers?.nativeBridge;

  const share = useCallback((content: string, title?: string) => {
    if (!postNativeMessage({ action: 'share', payload: { content, title } })) {
      // Fallback to Web Share API
      if (navigator.share) {
        navigator.share({ title, text: content }).catch((e) => console.warn('Share failed:', e));
      }
    }
  }, []);

  const haptic = useCallback((style: 'light' | 'medium' | 'heavy') => {
    postNativeMessage({ action: 'haptic', payload: { style } });
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    if (!postNativeMessage({ action: 'copyToClipboard', payload: { text } })) {
      navigator.clipboard.writeText(text).catch((e) => console.warn('Clipboard write failed:', e));
    }
  }, []);

  return {
    isNative,
    share,
    haptic,
    copyToClipboard,
  };
}
