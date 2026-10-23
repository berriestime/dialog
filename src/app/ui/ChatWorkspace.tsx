import '../../features/chat/ui/chat.css';
import { useEffect, useReducer, useRef, useState } from 'react';
import { resolveChatId, sendMessage } from '../../shared/api/greenApi';
import {
  chatReducer,
  initialChatState,
} from '../../features/chat/model/chatReducer';
import { useNotifications } from '../../features/chat/model/useNotifications';
import type { Credentials } from '../../shared/api/types';
import { Chat } from '../../features/chat/ui/Chat';
import { NewChatForm } from '../../features/chat/ui/NewChatForm';
import { readSession, saveSession } from '../model/session';
import { Icon } from '../../shared/ui/Icon';

type Props = { credentials: Credentials; onLogout: () => void };

export function ChatWorkspace({ credentials, onLogout }: Props) {
  const [restored] = useState(() => {
    const session = readSession();
    return session?.credentials.idInstance === credentials.idInstance &&
      session.credentials.apiUrl === credentials.apiUrl &&
      session.credentials.apiTokenInstance === credentials.apiTokenInstance
      ? session.workspace
      : undefined;
  });
  const [state, dispatch] = useReducer(
    chatReducer,
    restored?.state ?? initialChatState,
  );
  const [activeKey, setActiveKey] = useState<string | null>(
    restored?.activeKey ?? null,
  );
  const [creating, setCreating] = useState(restored?.creating ?? true);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    restored?.drafts ?? {},
  );
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(!restored?.activeKey);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const sendingKeys = useRef(new Set<string>());
  const lifecycle = useRef<AbortController | null>(null);
  const notifications = useNotifications(credentials, dispatch);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    // Снимок не содержит временных состояний отправки и сетевых ошибок.
    const saved = saveSession(credentials, {
      state,
      activeKey,
      creating,
      drafts,
    });
    // Проверка хранилища не должна мешать работе чата.
    void Promise.resolve().then(() =>
      setStorageError(
        saved
          ? ''
          : 'Не удалось сохранить сеанс: хранилище недоступно или заполнено. После обновления последние изменения могут потеряться.',
      ),
    );
  }, [credentials, state, activeKey, creating, drafts]);
  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    return () => controller.abort();
  }, []);
  const active = state.chats.find((chat) => chat.key === activeKey);

  async function createChat(phone: string) {
    const existing = state.chats.find((chat) => chat.phone === phone);
    dispatch({ type: 'create', phone });
    setActiveKey(existing?.key ?? phone);
    setCreating(false);
    setShowList(false);
    const signal = lifecycle.current?.signal;
    if (!signal || existing?.chatId) return;
    try {
      const chatId = await resolveChatId(credentials, phone, signal);
      if (!signal.aborted) dispatch({ type: 'create', phone, chatId });
    } catch {
      /* Получение по номеру или отдельному входящему chatId продолжает работать. */
    }
  }

  async function send() {
    if (!active || sendingKeys.current.has(active.key)) return;
    const chat = active;
    const text = (drafts[chat.key] ?? '').trim();
    if (!text || text.length > 4096) return;
    const signal = lifecycle.current?.signal;
    sendingKeys.current.add(chat.key);
    setSending((previous) => ({ ...previous, [chat.key]: true }));
    setErrors((previous) => ({ ...previous, [chat.key]: '' }));
    try {
      // Форматы phone@c.us и chatId расходуют отдельные квоты Developer.
      // Для чата с известным номером сохраняем исходный формат отправки.
      const recipient = chat.phone ? `${chat.phone}@c.us` : chat.chatId;
      if (!recipient) throw new Error('Не определён получатель сообщения.');
      const id = await sendMessage(credentials, recipient, text);
      if (signal?.aborted) return;
      dispatch({
        type: 'sent',
        key: chat.key,
        message: {
          id,
          text,
          incoming: false,
          createdAt: new Date().toISOString(),
        },
      });
      setDrafts((previous) => ({ ...previous, [chat.key]: '' }));
    } catch (error) {
      if (!signal?.aborted)
        setErrors((previous) => ({
          ...previous,
          [chat.key]:
            error instanceof Error ? error.message : 'Ошибка отправки.',
        }));
    } finally {
      sendingKeys.current.delete(chat.key);
      if (!signal?.aborted)
        setSending((previous) => ({ ...previous, [chat.key]: false }));
    }
  }

  return (
    <section
      className={`chat-layout ${showList ? 'mobile-list' : 'mobile-conversation'}`}
      aria-label="Чаты Telegram"
    >
      <aside className="chat-sidebar">
        <div className="sidebar-heading">
          <h2>Диалог</h2>
          <span className="service-label">Telegram</span>
        </div>
        <div className="sidebar-actions">
          <button
            onClick={() => {
              setCreating(true);
              setShowList(false);
            }}
          >
            <Icon name="plus" />
            Новый чат
          </button>
          <button className="secondary-button" onClick={onLogout}>
            <Icon name="logout" />
            Выйти
          </button>
        </div>
        <label className="chat-search">
          <Icon name="search" />
          <span className="visually-hidden">Поиск чата</span>
          <input
            type="search"
            placeholder="Поиск"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <nav aria-label="Список чатов">
          {state.chats.length === 0 && (
            <p className="sidebar-empty">Пока нет чатов</p>
          )}
          {state.chats
            .filter((chat) =>
              `${chat.phone ?? ''} ${chat.name}`
                .toLowerCase()
                .includes(search.trim().toLowerCase()),
            )
            .map((chat) => (
              <button
                className={`chat-item${!creating && chat.key === activeKey ? ' selected-chat' : ''}`}
                key={chat.key}
                aria-current={
                  !creating && chat.key === activeKey ? 'page' : undefined
                }
                onClick={() => {
                  setActiveKey(chat.key);
                  setCreating(false);
                  setShowList(false);
                }}
              >
                <span className="avatar" aria-hidden="true">
                  {(chat.phone ?? chat.name).slice(-2)}
                </span>
                <span className="chat-preview">
                  <strong>{chat.phone ? `+${chat.phone}` : chat.name}</strong>
                  <span>
                    {chat.messages[chat.messages.length - 1]?.text ??
                      'Нет сообщений'}
                  </span>
                </span>
                {chat.messages.length > 0 && (
                  <time className="chat-time">
                    {new Date(
                      chat.messages[chat.messages.length - 1].createdAt,
                    ).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                )}
              </button>
            ))}
        </nav>
      </aside>
      <section className="chat-panel">
        <header className="chat-header">
          <button
            className="back-button"
            aria-label="Назад к списку чатов"
            onClick={() => setShowList(true)}
          >
            <Icon name="back" />
          </button>
          <span className="avatar header-avatar" aria-hidden="true">
            {creating ? (
              <Icon name="plus" />
            ) : (
              (active?.phone ?? active?.name ?? 'Ч').slice(-2)
            )}
          </span>
          <div>
            <h1>
              {creating
                ? 'Новый чат'
                : active
                  ? active.phone
                    ? `+${active.phone}`
                    : active.name
                  : 'Выберите чат'}
            </h1>
            <p>
              Telegram ·{' '}
              {notifications.connected ? 'подключено' : 'подключение…'}
            </p>
          </div>
        </header>
        {creating ? (
          <div className="new-chat-panel">
            <NewChatForm onCreateChat={(phone) => void createChat(phone)} />
            {active && (
              <button
                className="secondary-button"
                onClick={() => setCreating(false)}
              >
                Отмена
              </button>
            )}
          </div>
        ) : active ? (
          <Chat
            key={active.key}
            chat={active}
            draft={drafts[active.key] ?? ''}
            onDraftChange={(text) =>
              setDrafts((previous) => ({ ...previous, [active.key]: text }))
            }
            onSend={() => void send()}
            isSending={Boolean(sending[active.key])}
            error={errors[active.key] ?? ''}
          />
        ) : (
          <p className="empty-chat">Выберите чат слева</p>
        )}
        {storageError && (
          <p className="send-error" role="alert">
            {storageError}
          </p>
        )}
        {notifications.error && (
          <div className="receiving-error">
            <p role="alert">{notifications.error}</p>
            <button onClick={notifications.reconnect}>Переподключиться</button>
          </div>
        )}
      </section>
    </section>
  );
}
