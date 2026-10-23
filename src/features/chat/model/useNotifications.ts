import { useEffect, useState, type Dispatch } from 'react';
import {
  deleteNotification,
  receiveNotification,
} from '../../../shared/api/greenApi';
import type { Credentials } from '../../../shared/api/types';
import type { ChatAction } from './types';

export function useNotifications(
  credentials: Credentials,
  dispatch: Dispatch<ChatAction>,
) {
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      let delay = 500;
      try {
        const notification = await receiveNotification(credentials, signal);
        if (signal.aborted) return;
        if (notification) {
          dispatch({ type: 'notification', notification });
          await deleteNotification(credentials, notification.receiptId, signal);
        }
        if (!signal.aborted) {
          setConnected(true);
          setError('');
        }
      } catch (error) {
        if (signal.aborted) return;
        setConnected(false);
        setError(
          error instanceof Error
            ? error.message
            : 'Ошибка получения сообщений.',
        );
        delay = 5000;
      }
      if (!signal.aborted) timer = setTimeout(() => void poll(), delay);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [credentials, dispatch, attempt]);
  return {
    error,
    connected,
    reconnect: () => setAttempt((value) => value + 1),
  };
}
