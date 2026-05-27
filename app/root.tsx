import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import type { Route } from './+types/root';
import './app.css';

export function meta() {
  return [
    { charset: 'utf-8' },
    { title: 't4t Gateway' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    {
      name: 'description',
      content:
        'OpenAI-compatible API on Token4Token. 50 xBZZ welcome credit, no wallet needed.',
    },
  ];
}

export const links: Route.LinksFunction = () => [
  {
    rel: 'preload',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    as: 'style',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    crossOrigin: 'anonymous',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className='scroll-smooth'>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className='container mx-auto p-4 pt-16'>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className='w-full overflow-x-auto p-4'>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
