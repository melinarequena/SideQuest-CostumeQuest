export function isAdminOrigin(request: Request): boolean {
  const url = new URL(request.url);
  const expected = `${url.protocol}//${request.headers.get("host") || url.host}`;
  return request.headers.get("origin") === expected && request.headers.get("sec-fetch-site") !== "cross-site";
}
