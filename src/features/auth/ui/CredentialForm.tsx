import { useState, type SubmitEvent } from 'react';
import { checkInstance, normalizeApiUrl } from '../../../shared/api/greenApi';
import type { Credentials } from '../../../shared/api/types';

type CredentialFormProps = {
  onSubmit: (credentials: Credentials) => void;
};

const CredentialForm = ({ onSubmit }: CredentialFormProps) => {
  const [apiUrl, setApiUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isConnecting) return;

    if (!apiUrl.trim() || !idInstance.trim() || !apiTokenInstance.trim()) {
      setError('Заполните apiUrl, idInstance и apiTokenInstance.');
      return;
    }

    setError('');

    setIsConnecting(true);
    try {
      const credentials = {
        apiUrl: normalizeApiUrl(apiUrl),
        idInstance: idInstance.trim(),
        apiTokenInstance: apiTokenInstance.trim(),
      };
      await checkInstance(credentials);
      onSubmit(credentials);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка подключения.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Диалог</h1>
      <p>Чат в Telegram через GREEN-API</p>
      <label htmlFor="apiUrl">apiUrl из личного кабинета</label>
      <input
        id="apiUrl"
        type="url"
        value={apiUrl}
        disabled={isConnecting}
        onChange={(event) => {
          setApiUrl(event.target.value);
          setError('');
        }}
      />
      <label htmlFor="idInstance">id инстанса</label>
      <input
        disabled={isConnecting}
        id="idInstance"
        type="text"
        inputMode="numeric"
        value={idInstance}
        onChange={(event) => {
          setIdInstance(event.target.value);
          setError('');
        }}
      />
      <label htmlFor="apiTokenInstance">apiTokenInstance</label>
      <input
        disabled={isConnecting}
        id="apiTokenInstance"
        type="password"
        value={apiTokenInstance}
        onChange={(event) => {
          setApiTokenInstance(event.target.value);
          setError('');
        }}
      />
      <button type="submit" disabled={isConnecting}>
        {isConnecting ? 'Проверяем…' : 'Подключиться'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
};

export { CredentialForm, type CredentialFormProps };
