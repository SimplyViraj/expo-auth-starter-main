import { getPublicDemo } from '@/server/demo/demo-handler';

export function GET() {
  return getPublicDemo();
}
