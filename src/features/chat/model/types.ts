import type { Notification } from '../../../shared/api/greenApi';
import type { MessageStatus } from './messageStatus';

export type Message = {
  id: string;
  text: string;
  createdAt: string;
  incoming: boolean;
  status?: MessageStatus;
};
export type Conversation = {
  key: string;
  phone?: string;
  chatId?: string;
  name: string;
  messages: Message[];
};
export type ChatState = {
  chats: Conversation[];
  statuses: Record<string, MessageStatus>;
};
export type ChatAction =
  | { type: 'create'; phone: string; chatId?: string }
  | { type: 'sent'; key: string; message: Message }
  | { type: 'notification'; notification: Notification };
