import { getProtectedDemo } from '@/server/demo/demo-handler';

export function GET(request: Request) {
  return getProtectedDemo(request);
}
