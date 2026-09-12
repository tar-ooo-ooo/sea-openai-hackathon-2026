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
  ],
  paths: {
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
        description: "userId 必須與登入 cookie 內的使用者一致。設定 Accept: application/x-ndjson 可逐行接收 progress、result 或 error 事件。",
        security: [{ userSession: [] }],
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
      AuthRequest: {
        type: "object",
        additionalProperties: false,
        required: ["nationalId", "password"],
        properties: {
          nationalId: { type: "string", pattern: "^[A-Z][12][0-9]{8}$", example: "A123456789" },
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
      ChatRequest: {
        type: "object",
        additionalProperties: false,
        required: ["message", "userId"],
        properties: {
          message: { type: "string", minLength: 1, maxLength: 4000 },
          userId: { type: "string", format: "uuid" },
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
