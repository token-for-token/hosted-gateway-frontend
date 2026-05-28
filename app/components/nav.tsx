import { NavLink } from 'react-router';

const ITEMS = [
  { to: '/chat', label: 'Chat' },
  { to: '/account', label: 'Account' },
  { to: '/bee', label: 'Bee' },
];

export function Nav() {
  return (
    <nav className='border-b border-neutral-200 bg-white'>
      <div className='mx-auto flex max-w-3xl items-center justify-between px-6 py-3'>
        <a href='/' className='text-sm font-semibold tracking-tight'>
          t4t Gateway
        </a>
        <ul className='flex gap-1'>
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
