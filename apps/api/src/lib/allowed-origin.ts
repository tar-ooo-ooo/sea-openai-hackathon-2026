function _allowedOrigins(environmentVariable: string, developmentOrigins: string[]) {
  return process.env.NODE_ENV === "production"
    ? (process.env[environmentVariable] ?? "").split(",").map((value) => value.trim()).filter(Boolean)
    : developmentOrigins;
}

export function isAllowedOrigin(origin: string | null): boolean {
  const origins = _allowedOrigins("USER_AUTH_ALLOWED_ORIGINS", [
    "http://localhost:3000",
    "http://localhost:3001",
  ]);
  return !!origin && origins.includes(origin);
}

export function isAllowedAdminOrigin(origin: string | null): boolean {
  const origins = _allowedOrigins("ADMIN_ALLOWED_ORIGINS", ["http://localhost:3001"]);
  return !!origin && origins.includes(origin);
}
