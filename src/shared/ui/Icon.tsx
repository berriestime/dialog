type Props = {
  name: 'plus' | 'back' | 'send' | 'logout' | 'search' | 'sun' | 'moon';
  size?: number;
};
const paths = {
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z',
  plus: 'M12 5v14M5 12h14',
  back: 'm14 6-6 6 6 6M8 12h12',
  send: 'm4 4 17 8-17 8 3-8-3-8Zm3 8h14',
  logout: 'M10 5H5v14h5m4-14 7 7-7 7m-5-7h12',
  search: 'm16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
};
export function Icon({ name, size = 20 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
