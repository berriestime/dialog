import { Icon } from '../../../shared/ui/Icon';

type Props = { theme: 'light' | 'dark'; onToggle: () => void };
export function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-pressed={theme === 'dark'}
      aria-label="Тёмная тема"
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
    </button>
  );
}
