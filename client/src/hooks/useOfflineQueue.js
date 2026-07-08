import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';

const STORAGE_KEY = 'pb_offline_message_queue';

const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
};

const writeQueue = (queue) => localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

/**
 * Queues outgoing text messages when the browser is offline and
 * automatically flushes them (sending via the normal API, which itself
 * falls back to simulated SMS for offline recipients) once connectivity
 * returns.
 */
export const useOfflineQueue = (isOnline) => {
  const [queue, setQueue] = useState(readQueue);

  const enqueue = useCallback((chatId, text) => {
    setQueue((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), chatId, text, queuedAt: new Date().toISOString() }];
      writeQueue(next);
      return next;
    });
  }, []);

  const flush = useCallback(async (onSent) => {
    const current = readQueue();
    if (current.length === 0) return;

    const remaining = [];
    for (const item of current) {
      try {
        const formData = new FormData();
        formData.append('text', item.text);
        formData.append('contentType', 'text');
        const { data } = await api.post(`/chats/${item.chatId}/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onSent?.(item.chatId, data.message);
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    setQueue(remaining);
  }, []);

  useEffect(() => {
    if (isOnline) flush();
  }, [isOnline, flush]);

  return { queue, enqueue, flush };
};
