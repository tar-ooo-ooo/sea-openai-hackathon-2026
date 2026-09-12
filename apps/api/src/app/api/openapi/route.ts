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
    "/chat": {
      post: {
        tags: ["Chat"],
        summary: "與長照 Agent 對話",
        description: "設定 Accept: application/x-ndjson 可逐行接收 progress、result 或 error 事件。",
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
          "502": { $ref: "#/components/responses/BadGateway" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
  },
  components: {
    schemas: {
      ChatRequest: {
        type: "object",
        additionalProperties: false,
        required: ["message"],
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
        description: "AI 服務暫時無法使用",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ServiceUnavailable: {
        description: "尚未設定 AI 服務",
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
