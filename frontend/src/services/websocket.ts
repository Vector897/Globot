import { useState, useRef } from "react";

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const ws = useRef<WebSocket | null>(null);

  const connect = (url: string) => {
    if (ws.current) {
        ws.current.close();
    }
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      // 发送播放命令
      ws.current?.send(JSON.stringify({ action: "play" }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket event:", data);
        setEvents((prev) => [...prev, data]);
        // 根据事件类型触发UI更新 logic can be added here or in the component depending on state
      } catch (e) {
        console.error("Error parsing websocket message", e);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.current.onclose = () => {
      console.log("WebSocket closed");
      setIsConnected(false);
    };
  };

  const send = (data: any) => {
    console.log('[WebSocket] Attempting to send:', data);
    console.log('[WebSocket] Current state:', ws.current ? ws.current.readyState : 'null');
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(data);
      console.log('[WebSocket] Sending JSON:', message);
      ws.current.send(message);
      console.log('[WebSocket] Message sent successfully');
    } else {
      console.warn("[WebSocket] Cannot send - not connected. ReadyState:", ws.current?.readyState);
    }
  };

  return { connect, isConnected, events, send };
};
