const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_EMAIL_MESSAGE = 'Enter correct mail ID.';

function buildValidationResult(data) {
  const deliverability = data?.email_deliverability?.status || 'unknown';
  const isDisposable = Boolean(data?.email_quality?.is_disposable);
  const isFormatValid = data?.email_deliverability?.is_format_valid !== false;
  const isMxValid = data?.email_deliverability?.is_mx_valid !== false;
  const isSmtpValid = data?.email_deliverability?.is_smtp_valid !== false;

  const valid =
    deliverability === 'deliverable' &&
    isFormatValid &&
    isMxValid &&
    isSmtpValid &&
    !isDisposable;

  return {
    valid,
    message: valid ? '' : INVALID_EMAIL_MESSAGE,
    deliverability,
    disposable: isDisposable,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ valid: false, message: 'Method not allowed.' }),
    };
  }

  let body = {};

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ valid: false, message: INVALID_EMAIL_MESSAGE }),
    };
  }

  const email = String(body.email || '').trim().toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ valid: false, message: INVALID_EMAIL_MESSAGE }),
    };
  }

  const apiKey = process.env.ABSTRACT_EMAIL_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        valid: false,
        message: 'Email validation service is not configured.',
      }),
    };
  }

  const requestUrl =
    `https://emailreputation.abstractapi.com/v1/?api_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}`;

  try {
    const response = await fetch(requestUrl, {
      headers: { Accept: 'application/json' },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          valid: false,
          message: data?.error?.message || 'Could not verify email right now.',
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(buildValidationResult(data)),
    };
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({
        valid: false,
        message: 'Could not verify email right now.',
      }),
    };
  }
};
