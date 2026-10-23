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
    let unconfirmedReceipt: number | undefined;
    let unconfirmedAttempts = 0;
    async function poll() {
      let delay = 500;
      try {
        const notification = await receiveNotification(credentials, signal);
        if (signal.aborted) return;
        if (notification) {
          dispatch({ type: 'notification', notification });
          const confirmed = await deleteNotification(
            credentials,
            notification.receiptId,
            signal,
          );
          if (!confirmed) {
            unconfirmedAttempts =
              unconfirmedReceipt === notification.receiptId
                ? unconfirmedAttempts + 1
                : 1;
            unconfirmedReceipt = notification.receiptId;
            if (unconfirmedAttempts >= 3) {
              throw new Error(
                'Не удаётся подтвердить обработку входящего уведомления. Закройте другие вкладки приложения с этим инстансом, в том числе localhost, и переподключитесь.',
              );
            }
            // Снова читаем очередь: уже удалённое уведомление больше не придёт.
          } else {
            unconfirmedReceipt = undefined;
            unconfirmedAttempts = 0;
          }
        } else {
          unconfirmedReceipt = undefined;
          unconfirmedAttempts = 0;
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
