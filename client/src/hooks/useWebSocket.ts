import { useEffect, useRef, useState, useCallback } from "react";
import type { WebSocketMessage } from "@/types/transcription";

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    reconnectDelay = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      // Don't try to reconnect if already connecting
      if (wsRef.current?.readyState === WebSocket.CONNECTING) {
        // Wait for existing connection attempt
        const checkConnection = () => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            resolve();
          } else if (wsRef.current?.readyState === WebSocket.CLOSED) {
            reject(new Error("WebSocket connection failed"));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      setIsConnecting(true);
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setIsConnecting(false);
        onConnect?.();
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        onError?.(error);
        setIsConnecting(false);
        reject(error);
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
        onDisconnect?.();

        // Only auto-reconnect if it wasn't a normal closure and auto-reconnect is enabled
        if (autoReconnect && event.code !== 1000) {
          console.log(`Reconnecting in ${reconnectDelay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect().catch(() => {}); // Silently handle reconnection failures
          }, reconnectDelay);
        }
      };

      // Set a timeout for connection attempt
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          reject(new Error("WebSocket connection timeout"));
        }
      }, 5000);
    });
  }, [onMessage, onError, onConnect, onDisconnect, autoReconnect, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect'); // Normal closure
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  // Don't auto-connect, let the caller decide when to connect
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
  };
}
