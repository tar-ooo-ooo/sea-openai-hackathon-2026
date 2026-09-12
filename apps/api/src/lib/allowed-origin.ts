export function isAllowedOrigin(origin: string | null): boolean {
  const origins = process.env.NODE_ENV === "production"
    ? (process.env.USER_AUTH_ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean)
    : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3003"];
  return !!origin && origins.includes(origin);
}
