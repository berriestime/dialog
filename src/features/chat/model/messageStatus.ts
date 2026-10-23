export type MessageStatus =
  'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount';

export const statusLabels: Record<MessageStatus, string> = {
  accepted: 'В очереди',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
  noAccount: 'Получатель недоступен',
};

export function isMessageStatus(value: unknown): value is MessageStatus {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(statusLabels, value)
  );
}

export function mergeStatus(
  previous: MessageStatus,
  next: MessageStatus,
): MessageStatus {
  // Повторные и запоздавшие уведомления не понижают подтверждённый статус.
  if (previous === 'read') return previous;
  if (previous === 'delivered') return next === 'read' ? next : previous;
  if (previous === 'failed' || previous === 'noAccount') return previous;
  if (next === 'accepted') return previous;
  return next;
}
