import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import path from 'path';

const baseDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { rules: { '@next/next/no-page-custom-font': 'off', '@next/next/no-img-element': 'off' } },
];
