import { useState, type SubmitEvent } from 'react';

type NewChatFormProps = {
  onCreateChat: (phone: string) => void;
};

const NewChatForm = ({ onCreateChat }: NewChatFormProps) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = phone.replace(/[\s()+-]/g, '');

    if (!/^\d{10,15}$/.test(normalizedPhone)) {
      setError('Введите номер в международном формате: от 10 до 15 цифр.');
      return;
    }

    setError('');
    onCreateChat(normalizedPhone);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Новый чат</h1>
      <label htmlFor="recipientPhone">Номер телефона получателя</label>
      <input
        id="recipientPhone"
        type="tel"
        autoComplete="tel"
        placeholder="+7 999 123-45-67"
        value={phone}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'phoneError' : undefined}
        onChange={(event) => {
          setPhone(event.target.value);
          setError('');
        }}
      />
      <button type="submit">Создать чат</button>
      {error && (
        <p id="phoneError" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export { NewChatForm };
