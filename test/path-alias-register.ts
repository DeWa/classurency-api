import { resolve } from 'node:path';
import { register } from 'tsconfig-paths';

register({
  baseUrl: resolve(__dirname, '..'),
  paths: {
    '@common/*': ['src/common/*'],
    '@modules/*': ['src/modules/*'],
  },
});
