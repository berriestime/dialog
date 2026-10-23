import { isRecord } from '../lib/isRecord';
import type { Credentials } from './types';

export function normalizeApiUrl(value: string): string {
  const url = new URL(value.trim());
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !(
      url.hostname === 'green-api.com' ||
      url.hostname.endsWith('.green-api.com')
    ) ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'Укажите HTTPS-адрес apiUrl из кабинета GREEN-API без пути и параметров.',
    );
  }
  return url.origin;
}

async function request(
  credentials: Credentials,
  method: string,
  body?: object,
  options: { signal?: AbortSignal; httpMethod?: string; suffix?: string } = {},
): Promise<unknown> {
  const base = normalizeApiUrl(credentials.apiUrl);
  const operation =
    {
      getStateInstance: 'Проверка инстанса',
      checkAccount: 'Поиск получателя',
      sendMessage: 'Отправка сообщения',
      receiveNotification: 'Получение сообщений',
      deleteNotification: 'Подтверждение уведомления',
    }[method] ?? 'Запрос GREEN-API';
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 30000);
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();

  try {
    let response: Response;
    let text: string;
    try {
      response = await fetch(
        `${base}/waInstance${encodeURIComponent(credentials.idInstance)}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}${options.suffix ?? ''}`,
        {
          method: options.httpMethod ?? (body ? 'POST' : 'GET'),
          ...(body
            ? {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              }
            : {}),
          signal: controller.signal,
        },
      );
      text = await response.text();
    } catch {
      if (options.signal?.aborted)
        throw new DOMException('Запрос отменён', 'AbortError');
      const reason = timedOut
        ? 'сервер не ответил за 30 секунд'
        : 'браузер не смог прочитать ответ сервера (сеть, адрес API или блокировка CORS)';
      throw new Error(
        `${operation}: ${reason}. Сервер: ${base}.${method === 'sendMessage' ? ' Перед повторной отправкой проверьте Telegram.' : ''}`,
      );
    }
    if (!response.ok) {
      if (response.status === 466) {
        let quota: unknown;
        try {
          quota = JSON.parse(text);
        } catch {
          /* Не выводим необработанный ответ, содержащий данные аккаунта. */
        }
        const details = isRecord(quota)
          ? [
              quota.correspondentsStatus,
              quota.invokeStatus,
              quota.quotaData,
            ].find(isRecord)
          : undefined;
        const used = isRecord(details) ? Number(details.used) : NaN;
        const total = isRecord(details) ? Number(details.total) : NaN;
        const counts =
          Number.isFinite(used) && Number.isFinite(total)
            ? ` Использовано ${used} из ${total}.`
            : '';
        throw new Error(
          `${operation}: исчерпана квота тарифа GREEN-API (HTTP 466).${counts} Проверьте лимиты в личном кабинете. Повторная отправка не сбрасывает квоту.`,
        );
      }
      const hint =
        response.status === 401 || response.status === 403
          ? 'Проверьте idInstance и apiTokenInstance.'
          : response.status === 429
            ? 'Превышена частота запросов. Подождите перед повторной попыткой.'
            : method === 'receiveNotification' && response.status === 400
              ? 'Проверьте, что webhookUrl пустой, а входящие уведомления включены.'
              : 'Проверьте параметры инстанса и ограничения тарифа.';
      throw new Error(`${operation}: HTTP ${response.status}. ${hint}`);
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        `${operation}: сервер вернул ответ не в формате JSON. Проверьте apiUrl.`,
      );
    }
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

export async function checkInstance(credentials: Credentials): Promise<void> {
  const data = await request(credentials, 'getStateInstance');
  if (
    !data ||
    typeof data !== 'object' ||
    !('stateInstance' in data) ||
    typeof data.stateInstance !== 'string'
  ) {
    throw new Error('GREEN-API вернул неожиданный ответ.');
  }
  if (data.stateInstance !== 'authorized') {
    throw new Error(
      `Инстанс не готов: ${data.stateInstance}. Проверьте его состояние в личном кабинете.`,
    );
  }
}

export async function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
): Promise<string> {
  const data = await request(credentials, 'sendMessage', {
    chatId,
    message,
  });
  if (
    !data ||
    typeof data !== 'object' ||
    !('idMessage' in data) ||
    typeof data.idMessage !== 'string'
  ) {
    throw new Error(
      'Не получен идентификатор сообщения. Проверьте Telegram перед повторной отправкой.',
    );
  }
  return data.idMessage;
}

export async function resolveChatId(
  credentials: Credentials,
  phone: string,
  signal: AbortSignal,
): Promise<string> {
  const data = await request(
    credentials,
    'checkAccount',
    { phoneNumber: Number(phone) },
    { signal },
  );
  if (isRecord(data) && data.status === false) {
    const details = isRecord(data.data) ? data.data : data;
    if (
      details.reason === 'rate_limit_exceeded' ||
      details.reason === 'Rate limited by messenger'
    ) {
      throw new Error(
        'Telegram ограничил поиск получателей. Не повторяйте поиск сейчас; дождитесь снятия ограничения.',
      );
    }
    if (details.reason === 'instance is starting or not authorized') {
      throw new Error(
        'Инстанс запускается или не авторизован. Проверьте его состояние в кабинете GREEN-API.',
      );
    }
    throw new Error(
      'GREEN-API не смог выполнить поиск получателя. Проверьте состояние инстанса и повторите позже.',
    );
  }
  if (isRecord(data) && data.exist === false) {
    throw new Error(
      'Telegram не нашёл аккаунт по этому номеру: номер неверен или скрыт настройками приватности получателя.',
    );
  }
  if (
    !isRecord(data) ||
    data.exist !== true ||
    typeof data.chatId !== 'string' ||
    !data.chatId
  ) {
    throw new Error(
      'Не удалось найти Telegram-аккаунт по номеру. Проверьте номер, настройки приватности и ограничения инстанса.',
    );
  }
  return data.chatId;
}

export type Notification = { receiptId: number; body: Record<string, unknown> };

export async function receiveNotification(
  credentials: Credentials,
  signal: AbortSignal,
): Promise<Notification | null> {
  const data = await request(credentials, 'receiveNotification', undefined, {
    signal,
    suffix: '?receiveTimeout=5',
  });
  if (data === null) return null;
  if (
    !isRecord(data) ||
    !Number.isSafeInteger(data.receiptId) ||
    !isRecord(data.body)
  ) {
    throw new Error('Неожиданный формат уведомления GREEN-API.');
  }
  return { receiptId: data.receiptId as number, body: data.body };
}

export async function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal: AbortSignal,
): Promise<boolean> {
  const data = await request(credentials, 'deleteNotification', undefined, {
    signal,
    httpMethod: 'DELETE',
    suffix: `/${receiptId}`,
  });
  if (!isRecord(data) || typeof data.result !== 'boolean') {
    throw new Error(
      'GREEN-API вернул некорректное подтверждение обработки уведомления.',
    );
  }
  // false также возвращается, когда уведомление уже удалено другим клиентом.
  return data.result;
}
