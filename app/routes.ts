import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/_index.tsx'),
  route('signup', 'routes/signup.tsx'),
  route('verify', 'routes/verify.tsx'),
  route('login', 'routes/login.tsx'),
  route('account', 'routes/account.tsx'),
] satisfies RouteConfig;
