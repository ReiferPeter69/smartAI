import { useEffect } from 'react';

interface PhaseUpdateEvent {
  projectId: string;
  phase: string;
  status: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export function useEventStream(projectId: string, onEvent: (event: PhaseUpdateEvent) => void) {
  useEffect(() => {
    if (!projectId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(`/api/events/stream/${projectId}`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'connected') {
          onEvent(data);
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [projectId, onEvent]);
}
