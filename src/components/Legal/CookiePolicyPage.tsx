import React from 'react';
import { LegalPageShell } from './LegalPageShell';
import { COOKIES_SECTIONS } from '../../data/legalContent';

export function CookiePolicyPage() {
  return <LegalPageShell titleKey="legal.cookiesTitle" sections={COOKIES_SECTIONS} activeHref="/cookies" />;
}
