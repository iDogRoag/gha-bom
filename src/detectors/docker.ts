export function looksLikeDockerPublish(value: string): boolean {
  return /\bdocker\s+push\b|\bdocker\/build-push-action\b|\bghcr\.io\b|\bdocker\.io\b/i.test(value);
}
