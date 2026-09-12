import assert from "node:assert/strict";
import { test } from "node:test";

import { GET as getDocs } from "./route.ts";
import { GET as getOpenApi } from "../openapi/route.ts";

test("Swagger UI 使用本機 OpenAPI 文件並列出所有 API", async () => {
  const docsResponse = getDocs();
  const openApiResponse = getOpenApi();
  const html = await docsResponse.text();
  const document = await openApiResponse.json();

  assert.match(docsResponse.headers.get("content-type") ?? "", /^text\/html/);
  assert.match(html, /SwaggerUIBundle/);
  assert.match(html, /\/api\/openapi/);
  assert.equal(document.openapi, "3.1.0");
  assert.deepEqual(Object.keys(document.paths).sort(), [
    "/api/database/clear",
    "/api/health",
    "/api/user-auth/login",
    "/api/user-auth/logout",
    "/api/user-auth/register",
    "/api/user-auth/session",
    "/chat",
  ]);
  assert.deepEqual(document.components.schemas.ChatRequest.required, ["message", "userId"]);
  assert.ok(document.paths["/chat"].post.responses["401"]);
  assert.ok(document.paths["/chat"].post.responses["403"]);
});
