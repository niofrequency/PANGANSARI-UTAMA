import React from 'react';
import { LegalPageShell } from './LegalPageShell';
import { PRIVACY_POLICY_SECTIONS } from '../../data/legalContent';

export function PrivacyPolicyPage() {
  return <LegalPageShell titleKey="legal.privacyTitle" sections={PRIVACY_POLICY_SECTIONS} activeHref="/privacy" />;
}
