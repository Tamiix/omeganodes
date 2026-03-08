/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your OmegaNodes verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://mmkornqvbafkricqixgk.supabase.co/storage/v1/object/public/email-assets/omega-logo-new.png"
          width="40"
          height="40"
          alt="OmegaNodes"
          style={{ display: 'block', marginBottom: '28px' }}
        />
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use this code to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. If you didn't request it, ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#0f0f1a', fontFamily: "'Inter', system-ui, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 28px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: '0 0 12px',
}
const text = {
  fontSize: '14px',
  color: '#a0a3b1',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const codeStyle = {
  fontFamily: "'JetBrains Mono', Courier, monospace",
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#7C6FF7',
  margin: '0 0 32px',
  letterSpacing: '4px',
}
const footer = { fontSize: '12px', color: '#555555', margin: '40px 0 0', borderTop: '1px solid #2a2a40', paddingTop: '20px' }
