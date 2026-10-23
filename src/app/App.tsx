import { useState } from 'react';
import { useTheme } from '../features/theme/model/useTheme';
import { ThemeToggle } from '../features/theme/ui/ThemeToggle';
import './styles.css';
import { CredentialForm } from '../features/auth/ui/CredentialForm';
import { ChatWorkspace } from './ui/ChatWorkspace';
import type { Credentials } from '../shared/api/types';
import { readSession, saveSession, clearSession } from './model/session';

const App = () => {
  const { theme, toggleTheme } = useTheme();
  const [credentials, setCredentials] = useState<Credentials | null>(
    () => readSession()?.credentials ?? null,
  );
  return (
    <>
      <div className="app-toolbar">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <main className="content">
        {credentials ? (
          <ChatWorkspace
            credentials={credentials}
            onLogout={() => {
              clearSession();
              setCredentials(null);
            }}
          />
        ) : (
          <CredentialForm
            onSubmit={(value) => {
              saveSession(value);
              setCredentials(value);
            }}
          />
        )}
      </main>
    </>
  );
};
export default App;
