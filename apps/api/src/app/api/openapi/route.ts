function _detailPath(kind: "case" | "draft") {
  return { get: {
    tags: ["Cases"], summary: kind === "case" ? "查詢本人單筆案件" : "查詢本人收集中草稿",
    description: "只回傳本人資料；他人或不存在的 ID 一律 404。草稿完成轉為案件後，原收集中草稿端點回傳 404。",
    security: [{ userSession: [] }],
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
    responses: {
      "200": { description: "詳細資料；Cache-Control: no-store", content: { "application/json": { schema: {
        type: "object", required: ["kind", "item"], properties: {
          kind: { type: "string", const: kind }, item: { $ref: `#/components/schemas/${kind === "case" ? "UserCase" : "CaseDraft"}` },
        },
      } } } },
      "400": { description: "ID 格式錯誤或包含不支援的 query" },
      "401": { description: "未登入" }, "403": { description: "角色或 CORS 來源不允許" },
      "404": { description: "找不到此案件或草稿" }, "503": { description: "無法驗證或讀取資料" },
    },
  } };
}

const _openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Sea × OpenAI Hackathon API",
    version: "0.1.0",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Health" },
    { name: "Database" },
    { name: "Auth" },
    { name: "Chat" },
    { name: "Cases" },
  ],
  paths: {
    "/api/profile": {
      get: {
        tags: ["Auth"], summary: "讀取本人個人檔案", security: [{ userSession: [] }],
        description: "不接受 query。未建立時 profile 為 null；所有回應 Cache-Control: no-store。",
        responses: {
          "200": { description: "本人資料或 null", content: { "application/json": { schema: { $ref: "#/components/schemas/ProfileResponse" } } } },
          "400": { description: "不接受 query" }, "401": { description: "未登入" },
          "403": { description: "角色或來源不允許" }, "503": { description: "資料服務不可用" },
        },
      },
      put: {
        tags: ["Auth"], summary: "儲存本人完整個人檔案", security: [{ userSession: [] }],
        description: "使用者手動儲存；四項必填，不接受 userId 或其他欄位及 query。要求可信 Origin。依 session 建立或覆寫本人檔案；不更新案件、不授權送件，不供 Agent 自動覆寫。",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProfileInput" } } } },
        responses: {
          "200": { description: "儲存成功；Cache-Control: no-store", content: { "application/json": { schema: { $ref: "#/components/schemas/ProfileResponse" } } } },
          "400": { description: "欄位、日期、JSON 或 query 錯誤" }, "401": { description: "未登入" },
          "403": { description: "角色或 Origin 不允許" }, "503": { description: "資料服務不可用" },
        },
      },
    },
    "/api/cases/{id}": _detailPath("case"),
    "/api/case-drafts/{id}": _detailPath("draft"),
    "/api/cases": {
      get: {
        tags: ["Cases"], summary: "查詢登入使用者的申請草稿與案件",
        description: "不接受 query 參數；依 session 讀取本人資料，依 updatedAt 新至舊排序，案件服務依 position 排序。未分頁，不包含身分證、聯絡資料或完整草稿。建立案件不代表已送出申請。",
        security: [{ userSession: [] }],
        responses: {
          "200": { description: "查詢成功；無資料時回傳空陣列，Cache-Control: no-store", content: { "application/json": { schema: {
            type: "object", required: ["drafts", "cases"], properties: {
              drafts: { type: "array", items: { $ref: "#/components/schemas/CaseDraft" } },
              cases: { type: "array", items: { $ref: "#/components/schemas/UserCase" } },
            },
          } } } },
          "400": { description: "不接受查詢參數" },
          "401": { description: "未登入或 session 已過期" },
          "403": { description: "角色或 CORS 來源不允許" },
          "503": { description: "無法驗證登入或讀取案件" },
        },
      },
    },
    "/api/chat/history": {
      get: {
        tags: ["Chat"],
        summary: "取得登入使用者最近 20 則聊天紀錄（由舊至新）",
        security: [{ userSession: [] }],
        responses: {
          "200": {
            description: "聊天紀錄；Cache-Control: no-store",
            content: { "application/json": { schema: {
              type: "object", required: ["messages"], properties: { messages: {
                type: "array", maxItems: 20, items: {
                  type: "object", required: ["role", "content"], properties: {
                    role: { type: "string", enum: ["user", "assistant"] }, content: { type: "string" },
                  },
                },
              } },
            } } },
          },
          "401": { description: "未登入或 session 已過期" },
          "403": { description: "CORS 來源不允許" },
          "503": { description: "無法驗證登入或讀取紀錄" },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "檢查 API 狀態",
        responses: {
          "200": {
            description: "API 正常運作",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", const: "ok" } },
                },
              },
            },
          },
        },
      },
    },
    "/api/database/clear": {
      post: {
        tags: ["Database"],
        summary: "清空 public schema 內所有資料",
        description: "保留資料表結構與 Drizzle migration 紀錄。MVP 版本沒有驗證。",
        responses: {
          "200": {
            description: "清空成功",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["cleared"],
                  properties: { cleared: { type: "boolean", const: true } },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/user-auth/register": {
      post: {
        tags: ["Auth"],
        summary: "註冊使用者",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AuthRequest" } },
          },
        },
        responses: {
          "201": {
            description: "註冊成功並設定 session cookie",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { $ref: "#/components/responses/Conflict" },
          "413": { $ref: "#/components/responses/PayloadTooLarge" },
          "415": { $ref: "#/components/responses/UnsupportedMediaType" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/api/user-auth/login": {
      post: {
        tags: ["Auth"],
        summary: "登入使用者",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AuthRequest" } },
          },
        },
        responses: {
          "200": {
            description: "登入成功並設定 session cookie",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "413": { $ref: "#/components/responses/PayloadTooLarge" },
          "415": { $ref: "#/components/responses/UnsupportedMediaType" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/api/user-auth/session": {
      get: {
        tags: ["Auth"],
        summary: "取得目前登入使用者",
        responses: {
          "200": {
            description: "未登入時 user 為 null",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/SessionResponse" } },
            },
          },
          "403": { $ref: "#/components/responses/Forbidden" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/api/user-auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "登出並清除 session cookie",
        responses: {
          "200": {
            description: "登出成功",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/OkResponse" } },
            },
          },
          "403": { $ref: "#/components/responses/Forbidden" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/chat": {
      post: {
        tags: ["Chat"],
        summary: "與長照 Agent 對話",
        security: [{ userSession: [] }],
        description: "必須登入；身分由 care_user_session cookie 決定。設定 Accept: application/x-ndjson 可逐行接收 progress、result 或 error 事件。串流開始後的錯誤以 error 事件回傳，HTTP 狀態仍為 200。",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChatRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Agent 回覆",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatResponse" },
              },
              "application/x-ndjson": {
                schema: { type: "string" },
                example: "{\"type\":\"progress\",\"progress\":{\"id\":\"analysis\",\"label\":\"正在整理回覆\",\"status\":\"active\"}}\n{\"type\":\"result\",\"result\":{\"reply\":\"您好\"}}\n",
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "502": { $ref: "#/components/responses/BadGateway" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      userSession: {
        type: "apiKey",
        in: "cookie",
        name: "care_user_session",
      },
    },
    schemas: {
      ProfileInput: {
        type: "object", additionalProperties: false, required: ["name", "birthDate", "area", "phone"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          birthDate: { type: "string", format: "date", description: "有效曆日，1900-01-01 至臺灣當日日期" },
          area: { type: "string", minLength: 1, maxLength: 100 },
          phone: { type: "string", minLength: 6, maxLength: 20, description: "至少六位數字，允許開頭 +、空白、括號及連字號" },
        },
      },
      ProfileResponse: {
        type: "object", required: ["profile"], properties: { profile: {
          oneOf: [
            { type: "null" },
            { type: "object", required: ["name", "birthDate", "area", "phone", "updatedAt"], properties: {
              name: { type: "string" }, birthDate: { type: "string", format: "date" },
              area: { type: "string" }, phone: { type: "string" }, updatedAt: { type: "string", format: "date-time" },
            } },
          ],
        } },
      },
      AuthRequest: {
        type: "object",
        additionalProperties: false,
        required: ["nationalId", "password"],
        properties: {
          nationalId: { type: "string", pattern: "^[A-Z][12][0-9]{8}$", example: "A123456789", description: "使用者登入與註冊在 development 僅檢查格式；其他環境另驗證加權檢查碼。" },
          password: { type: "string", format: "password", minLength: 8, maxLength: 128 },
        },
      },
      AuthUser: {
        type: "object",
        required: ["id", "role"],
        properties: {
          id: { type: "string", format: "uuid" },
          role: { type: "string", const: "user" },
        },
      },
      AuthResponse: {
        type: "object",
        required: ["user"],
        properties: { user: { $ref: "#/components/schemas/AuthUser" } },
      },
      SessionResponse: {
        type: "object",
        required: ["user"],
        properties: {
          user: {
            oneOf: [{ $ref: "#/components/schemas/AuthUser" }, { type: "null" }],
          },
        },
      },
      OkResponse: {
        type: "object",
        required: ["ok"],
        properties: { ok: { type: "boolean", const: true } },
      },
      CareOverview: {
        type: "array", description: "僅單筆詳情提供；已保存的照顧描述，非醫療診斷。無關聯草稿時為空陣列，未記錄欄位 value 為 null。",
        items: { type: "object", required: ["title", "items"], properties: {
          title: { type: "string" }, items: { type: "array", items: { type: "object", required: ["label", "value"], properties: {
            label: { type: "string" }, value: { type: ["string", "null"] },
          } } },
        } },
      },
      CaseDraft: {
        type: "object", required: ["id", "status", "targetName", "jurisdiction", "summary", "missingFields", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid" }, status: { type: "string", const: "collecting" },
          targetName: { type: ["string", "null"] }, jurisdiction: { type: ["string", "null"] },
          summary: { type: ["string", "null"] }, missingFields: { type: "array", items: { type: "string" } },
          updatedAt: { type: "string", format: "date-time" }, careOverview: { $ref: "#/components/schemas/CareOverview" },
        },
      },
      UserCase: {
        type: "object", required: ["id", "targetName", "summary", "createdAt", "updatedAt", "services"],
        properties: {
          careOverview: { $ref: "#/components/schemas/CareOverview" },
          id: { type: "string", format: "uuid" }, targetName: { type: "string" }, summary: { type: "string" },
          createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
          services: { type: "array", items: {
            type: "object", required: ["id", "position", "category", "name", "reason", "status"],
            properties: {
              id: { type: "string", format: "uuid" }, position: { type: "integer", minimum: 0, maximum: 7 },
              category: { type: "string", enum: ["照顧及專業服務", "交通接送服務", "輔具及居家無障礙環境改善", "喘息服務"] },
              name: { type: "string" }, reason: { type: "string" }, status: { type: "string", enum: ["尚未申請", "已送出"] },
            },
          } },
        },
      },
      ChatRequest: {
        type: "object",
        additionalProperties: false,
        required: ["message"],
        properties: {
          message: { type: "string", minLength: 1, maxLength: 4000 },
          userId: { type: "string", format: "uuid", deprecated: true, description: "不需傳入；若傳入必須與 session 使用者一致" },
        },
      },
      ChatResponse: {
        type: "object",
        required: ["reply"],
        properties: { reply: { type: "string" } },
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
      },
    },
    responses: {
      BadRequest: {
        description: "輸入格式錯誤",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      BadGateway: {
        description: "資料庫或 AI 服務暫時無法使用",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Forbidden: {
        description: "來源不允許，或 userId 與登入使用者不一致",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Unauthorized: {
        description: "帳密、session 或登入狀態無效",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Conflict: {
        description: "帳號已存在",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      PayloadTooLarge: {
        description: "request body 超過 2048 bytes",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      UnsupportedMediaType: {
        description: "Content-Type 不是 application/json",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      TooManyRequests: {
        description: "嘗試次數過多",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ServiceUnavailable: {
        description: "服務暫時無法使用或尚未完成設定",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      InternalServerError: {
        description: "資料庫操作失敗",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
};

export function GET() {
  return Response.json(_openApiDocument);
}
