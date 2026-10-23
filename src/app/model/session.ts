import { normalizeApiUrl } from '../../shared/api/greenApi';
import { isRecord } from '../../shared/lib/isRecord';
import type { ChatState, Message } from '../../features/chat/model/types';
import { isMessageStatus } from '../../features/chat/model/messageStatus';
import type { Credentials } from '../../shared/api/types';

const KEY = 'green-api.telegram.session.v1';
export type WorkspaceSnapshot = {
  state: ChatState;
  activeKey: string | null;
  creating: boolean;
  drafts: Record<string, string>;
};
export type SavedSession = {
  version: 1;
  credentials: Credentials;
  workspace?: WorkspaceSnapshot;
};

function isMessage(value: unknown): value is Message {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.incoming === 'boolean' &&
    (value.status === undefined || isMessageStatus(value.status))
  );
}
function isWorkspace(value: unknown): value is WorkspaceSnapshot {
  if (
    !isRecord(value) ||
    !isRecord(value.state) ||
    !Array.isArray(value.state.chats) ||
    !isRecord(value.state.statuses) ||
    !isRecord(value.drafts) ||
    !Object.values(value.drafts).every((draft) => typeof draft === 'string') ||
    typeof value.creating !== 'boolean' ||
    (value.activeKey !== null && typeof value.activeKey !== 'string')
  )
    return false;
  if (!Object.values(value.state.statuses).every(isMessageStatus)) return false;
  return value.state.chats.every(
    (chat) =>
      isRecord(chat) &&
      typeof chat.key === 'string' &&
      typeof chat.name === 'string' &&
      (chat.phone === undefined || typeof chat.phone === 'string') &&
      (chat.chatId === undefined || typeof chat.chatId === 'string') &&
      Array.isArray(chat.messages) &&
      chat.messages.every(isMessage),
  );
}

export function readSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== 1 || !isRecord(data.credentials))
      return null;
    const credentials = data.credentials;
    if (
      typeof credentials.apiUrl !== 'string' ||
      typeof credentials.idInstance !== 'string' ||
      !credentials.idInstance ||
      typeof credentials.apiTokenInstance !== 'string' ||
      !credentials.apiTokenInstance
    )
      return null;
    normalizeApiUrl(credentials.apiUrl);
    return {
      version: 1,
      credentials: credentials as Credentials,
      ...(isWorkspace(data.workspace) ? { workspace: data.workspace } : {}),
    };
  } catch {
    return null;
  }
}

export function saveSession(
  credentials: Credentials,
  workspace?: WorkspaceSnapshot,
): boolean {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, credentials, workspace }),
    );
    return true;
  } catch {
    return false;
  }
}
export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* Хранилище может быть отключено браузером. */
  }
}
