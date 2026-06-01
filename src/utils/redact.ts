const SECRET_KEY_RE =
  /(TOKEN|SECRET|PASSWORD|PASS|KEY|PRIVATE|CREDENTIAL|AUTH|COOKIE|SESSION|CERT|SSH|AWS_|AZURE_|GCP_|GOOGLE_|NPM_|PYPI_|DOCKER_)/i;

const SECRET_VALUE_RE =
  /(gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+PRIVATE KEY-----|[A-Za-z0-9_-]{32,})/;

export function isSecretLikeKey(key: string): boolean {
  return SECRET_KEY_RE.test(key);
}

export function isSecretLikeValue(value: unknown): boolean {
  return typeof value === "string" && SECRET_VALUE_RE.test(value);
}

export function redactValue(key: string, value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const stringValue = String(value);
  if (isSecretLikeKey(key) || isSecretLikeValue(stringValue)) {
    return "[redacted]";
  }

  return stringValue;
}

export function redactText(value: string): string {
  return value
    .replace(/\$\{\{\s*secrets\.([A-Za-z0-9_]+)\s*\}\}/g, "${{ secrets.$1 }}")
    .replace(SECRET_VALUE_RE, "[redacted]");
}
