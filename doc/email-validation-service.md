# Email Validation Service

This project now supports external email deliverability checks before the contact form sends.

## Provider

- Abstract API Email Validation

## Required environment variable

- `ABSTRACT_EMAIL_API_KEY`

## Supported serverless paths

- Vercel: `/api/validate-email`
- Netlify: `/.netlify/functions/validate-email`

## What the form checks

- Email format
- Deliverability status must be `deliverable`
- Disposable emails are rejected
- MX and SMTP validation must pass

## Notes

- If the validation endpoint is not deployed or the API key is missing, the frontend falls back to format-only validation so local development does not break.
- For production, add `ABSTRACT_EMAIL_API_KEY` in your hosting provider's environment settings.
