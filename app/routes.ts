import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/_index.tsx'),
  route('signup', 'routes/signup.tsx'),
  route('verify', 'routes/verify.tsx'),
] satisfies RouteConfig;
