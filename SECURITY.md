# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅ Aktuální        |

## Reporting a Vulnerability

Pokud najdeš bezpečnostní chybu, **prosím neotevírej public issue**.

Pošli email na: `security@snemovna-cr.cz` (nebo přímo maintainerovi přes GitHub).

Odpovíme do 48 hodin a pracujeme na opravě v soukromém kanálu.

## Best Practices v kódu

- Žádné `dangerouslySetInnerHTML` bez sanitizace
- Všechny DB dotazy jdou přes Drizzle (žádný string concatenation)
- Auth.js v5 s CSRF protection, secure cookies
- CSP hlavičky v `next.config.ts`
- Žádné service keys v klient kódu