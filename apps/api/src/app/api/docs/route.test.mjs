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
    "/api/admin/care-cases",
    "/api/admin/care-cases/{caseId}",
    "/api/admin/care-cases/{caseId}/assessments",
    "/api/admin/triages",
    "/api/application-intakes/{id}",
    "/api/case-drafts/{id}",
    "/api/cases",
    "/api/cases/{id}",
    "/api/chat/history",
    "/api/database/clear",
    "/api/health",
    "/api/profile",
    "/api/user-auth/login",
    "/api/user-auth/logout",
    "/api/user-auth/register",
    "/api/user-auth/session",
    "/chat",
  ]);
  assert.deepEqual(document.components.schemas.ChatRequest.required, ["message"]);
  assert.ok(document.paths["/api/application-intakes/{id}"].get);
  assert.ok(document.paths["/api/application-intakes/{id}"].post.responses["200"]);
  assert.ok(document.paths["/chat"].post.responses["401"]);
  assert.ok(document.paths["/chat"].post.responses["403"]);
  assert.match(document.paths["/chat"].post.description, /洩漏提示詞/);
  assert.ok(document.paths["/api/application-intakes/{id}"].get);
  assert.ok(document.paths["/api/application-intakes/{id}"].post);
  assert.ok(document.paths["/api/profile"].get);
  assert.ok(document.paths["/api/profile"].put);
  assert.ok(document.components.schemas.ApplicationIntakeData);
  assert.ok(document.components.schemas.ProfileInput);
  assert.ok(document.components.schemas.ProfileResponse);
  assert.ok(document.paths["/api/admin/care-cases"].get.responses["200"]);
  assert.equal(document.paths["/api/admin/care-cases"].post, undefined);
  assert.equal(document.components.schemas.CreateCareCaseRequest, undefined);
  assert.ok(document.paths["/api/admin/care-cases/{caseId}/assessments"].post.responses["201"]);
  assert.equal(document.components.securitySchemes.adminSession.name, "care_admin_session");
  const triages = document.paths["/api/admin/triages"].get;
  assert.deepEqual(triages.security, [{ adminSession: [] }]);
  assert.deepEqual(triages.responses["200"].content["application/json"].schema.properties.triages.items.properties.urgency.enum, ["emergency", "follow_up"]);
});
