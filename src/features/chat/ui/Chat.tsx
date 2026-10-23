import { useEffect, useRef, type SubmitEvent } from 'react';
import type { Conversation } from '../model/types';
import { statusLabels } from '../model/messageStatus';
import { Icon } from '../../../shared/ui/Icon';

type ChatProps = {
  chat: Conversation;
  draft: string;
  onDraftChange: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  error: string;
};

export function Chat({
  chat,
  draft,
  onDraftChange,
  onSend,
  isSending,
  error,
}: ChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [chat.messages]);
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend();
  };
  return (
    <>
      <div className="messages" role="log" aria-label="Сообщения">
        {chat.messages.length === 0 && (
          <p className="empty-chat">Напишите первое сообщение</p>
        )}
        {chat.messages.map((message) => (
          <article
            className={`message${message.incoming ? ' message-incoming' : ''}`}
            key={`${message.incoming}-${message.id}`}
          >
            <p>{message.text}</p>
            <footer>
              <time dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
              <span
                className={`message-status message-status-${message.status ?? 'received'}`}
              >
                {message.incoming
                  ? 'Получено'
                  : statusLabels[message.status ?? 'accepted']}
              </span>
            </footer>
          </article>
        ))}
        <div ref={endRef} />
      </div>
      {error && (
        <p className="send-error" role="alert">
          {error}
        </p>
      )}
      <form className="message-form" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="message">
          Сообщение
        </label>
        <textarea
          id="message"
          rows={1}
          maxLength={4096}
          placeholder="Напишите сообщение…"
          value={draft}
          disabled={isSending}
          onChange={(event) => onDraftChange(event.target.value)}
        />
        <button type="submit" disabled={!draft.trim() || isSending}>
          <Icon name="send" />
          <span className="visually-hidden">
            {isSending ? 'Отправляем…' : 'Отправить'}
          </span>
        </button>
      </form>
    </>
  );
}
