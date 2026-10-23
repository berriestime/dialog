import { isRecord } from '../../../shared/lib/isRecord';
import { isMessageStatus, mergeStatus } from './messageStatus';

import type { ChatState, ChatAction, Message } from './types';

export const initialChatState: ChatState = { chats: [], statuses: {} };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  if (action.type === 'create') {
    const existing = state.chats.find(
      (chat) =>
        chat.phone === action.phone ||
        (action.chatId && chat.chatId === action.chatId),
    );
    if (existing)
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.key === existing.key
            ? {
                ...chat,
                phone: action.phone,
                chatId: action.chatId ?? chat.chatId,
              }
            : chat,
        ),
      };
    return {
      ...state,
      chats: [
        ...state.chats,
        {
          key: action.phone,
          phone: action.phone,
          chatId: action.chatId,
          name: `+${action.phone}`,
          messages: [],
        },
      ],
    };
  }
  if (action.type === 'sent') {
    return {
      ...state,
      chats: state.chats.map((chat) =>
        chat.key !== action.key
          ? chat
          : {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  ...action.message,
                  status: state.statuses[action.message.id] ?? 'accepted',
                },
              ],
            },
      ),
    };
  }
  const body = action.notification.body;
  if (
    body.typeWebhook === 'outgoingMessageStatus' &&
    typeof body.idMessage === 'string' &&
    isMessageStatus(body.status)
  ) {
    const id = body.idMessage;
    const status = mergeStatus(state.statuses[id] ?? 'accepted', body.status);
    return {
      chats: state.chats.map((chat) => ({
        ...chat,
        messages: chat.messages.map((message) =>
          !message.incoming && message.id === id
            ? { ...message, status }
            : message,
        ),
      })),
      statuses: { ...state.statuses, [id]: status },
    };
  }
  const sender = body.senderData;
  const data = body.messageData;
  if (
    body.typeWebhook !== 'incomingMessageReceived' ||
    !isRecord(sender) ||
    !isRecord(data) ||
    typeof sender.chatId !== 'string' ||
    typeof body.idMessage !== 'string' ||
    typeof body.timestamp !== 'number'
  )
    return state;
  // Только личные текстовые чаты входят в объём задания.
  if (
    (sender.chatType && sender.chatType !== 'user') ||
    sender.chatId.startsWith('-')
  )
    return state;
  const content =
    data.typeMessage === 'textMessage'
      ? data.textMessageData
      : data.typeMessage === 'extendedTextMessage'
        ? data.extendedTextMessageData
        : undefined;
  const text = isRecord(content)
    ? (content.textMessage ?? content.text)
    : undefined;
  const date = new Date(body.timestamp * 1000);
  if (typeof text !== 'string' || Number.isNaN(date.getTime())) return state;
  const phone = String(sender.senderPhoneNumber ?? '').replace(/[^0-9]/g, '');
  const validPhone = /^\d{10,15}$/.test(phone) ? phone : undefined;
  const existing = state.chats.find(
    (chat) =>
      chat.chatId === sender.chatId ||
      (validPhone && chat.phone === validPhone) ||
      (chat.phone && sender.chatId === `${chat.phone}@c.us`),
  );
  const message: Message = {
    id: body.idMessage,
    text,
    createdAt: date.toISOString(),
    incoming: true,
  };
  if (!existing) {
    return {
      ...state,
      chats: [
        ...state.chats,
        {
          key: `telegram:${sender.chatId}`,
          chatId: sender.chatId,
          phone: validPhone,
          name:
            typeof sender.senderName === 'string' && sender.senderName
              ? sender.senderName
              : sender.chatId,
          messages: [message],
        },
      ],
    };
  }
  if (existing.messages.some((item) => item.incoming && item.id === message.id))
    return state;
  return {
    ...state,
    chats: state.chats.map((chat) =>
      chat.key === existing.key
        ? {
            ...chat,
            chatId: sender.chatId as string,
            messages: [...chat.messages, message],
          }
        : chat,
    ),
  };
}
