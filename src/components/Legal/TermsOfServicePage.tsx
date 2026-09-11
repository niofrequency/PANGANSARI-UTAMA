import React from 'react';
import { LegalPageShell } from './LegalPageShell';
import { TERMS_SECTIONS } from '../../data/legalContent';

export function TermsOfServicePage() {
  return <LegalPageShell titleKey="legal.termsTitle" sections={TERMS_SECTIONS} activeHref="/terms" />;
}
