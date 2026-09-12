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
    { name: "Admin" },
    { name: "Chat" },
    { name: "Cases" },
    { name: "Applications" },
  ],
  paths: {
    "/api/admin/cases": {
      get: {
        tags: ["Admin"], summary: "專員查詢已產生的申請資料",
        description: "不含收集中且尚無申請資料的草稿。現有資料未區分正式送出，僅供唯讀參考，不可據此接案。",
        security: [{ adminSession: [] }],
        responses: {
          "200": { description: "申請列表；Cache-Control: no-store", content: { "application/json": { schema: {
            type: "object", required: ["cases"], properties: { cases: { type: "array", items: { $ref: "#/components/schemas/AdminApplication" } } },
          } } } },
          "401": { description: "未登入專員帳號" }, "403": { description: "非專員" }, "503": { description: "服務暫時無法使用" },
        },
      },
    },
    "/api/admin/cases/{caseId}": {
      get: {
        tags: ["Admin"], summary: "專員查詢完整申請內容",
        description: "包含摘要、服務與目前完整表單（非正式送出快照）。沒有關聯表單時 intake 為 null；缺漏欄位顯示尚未提供。",
        security: [{ adminSession: [] }],
        parameters: [{ name: "caseId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "申請明細；Cache-Control: no-store", content: { "application/json": { schema: {
            type: "object", required: ["case"], properties: { case: { allOf: [
              { $ref: "#/components/schemas/AdminApplication" },
              { type: "object", required: ["services", "intake"], properties: {
                services: { type: "array", items: { type: "object", required: ["id", "position", "category", "name", "reason", "status"], properties: {
                  id: { type: "string", format: "uuid" }, position: { type: "integer" }, category: { type: "string" },
                  name: { type: "string" }, reason: { type: "string" }, status: { type: "string" },
                } } },
                intake: { oneOf: [{ type: "null" }, { type: "object", required: ["id", "updatedAt", "sections"], properties: {
                  id: { type: "string", format: "uuid" }, updatedAt: { type: "string", format: "date-time" },
                  sections: { type: "array", items: { type: "object", required: ["title", "fields"], properties: {
                    title: { type: "string" }, fields: { type: "array", items: { type: "object", required: ["label", "value"], properties: {
                      label: { type: "string" }, value: { type: "string" },
                    } } },
                  } } },
                } }] },
              } },
            ] } },
          } } } },
          "400": { description: "無效的申請編號" }, "401": { description: "未登入專員帳號" },
          "403": { description: "非專員" }, "404": { description: "找不到申請" }, "503": { description: "服務暫時無法使用" },
        },
      },
    },
    "/api/application-intakes/{id}": {
      get: {
        tags: ["Applications"], summary: "讀取 Agent 已收整的申請草稿",
        description: "只回傳登入使用者本人尚未正式送出的草稿；若已完成表單分析，只包含核准預填的欄位，供申請頁檢視與修改。",
        security: [{ userSession: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "草稿資料；Cache-Control: no-store", content: { "application/json": { schema: {
            type: "object", required: ["intake"], properties: { intake: {
              type: "object", required: ["id", "data"], properties: {
                id: { type: "string", format: "uuid" }, data: { $ref: "#/components/schemas/ApplicationIntakeData" },
              },
            } },
          } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "找不到本人尚未送出的草稿" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
      post: {
        tags: ["Applications"], summary: "確認並送出 Agent 已收整的申請",
        description: "以登入使用者身分合併表單資料；只有必填資料完整且 confirmed 為 true 時，才建立 application_packages 與 application_services，並將 intake 標記為 packaged。相同 intake 重試時回傳既有案件 ID。",
        security: [{ userSession: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: {
          type: "object", additionalProperties: false, required: ["confirmed", "data"], properties: {
            confirmed: { type: "boolean", const: true },
            data: { $ref: "#/components/schemas/ApplicationIntakeData" },
          },
        } } } },
        responses: {
          "200": { description: "正式案件已建立或先前已建立", content: { "application/json": { schema: {
            type: "object", required: ["applicationPackageId"], properties: {
              applicationPackageId: { type: "string", format: "uuid" },
            },
          } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "找不到本人草稿" },
          "413": { description: "申請資料超過 50 KB" },
          "415": { $ref: "#/components/responses/UnsupportedMediaType" },
          "422": { description: "必填資料尚未完整" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
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
    "/api/admin/triages": {
      get: {
        tags: ["Admin"], summary: "專員查詢緊急與追蹤分流紀錄",
        description: "僅限專員。緊急優先，同程度依建立時間新至舊。聯絡資料來自使用者目前的 profile，非被照顧者或事件快照。沒有處理狀態、症狀或申請關聯。",
        security: [{ adminSession: [] }],
        responses: {
          "200": { description: "成功；Cache-Control: no-store；無資料回傳空陣列", content: { "application/json": { schema: {
            type: "object", required: ["triages"], properties: { triages: { type: "array", items: {
              type: "object", required: ["id", "userId", "urgency", "createdAt", "name", "phone", "area"], properties: {
                id: { type: "string", format: "uuid" }, userId: { type: "string", format: "uuid" },
                urgency: { type: "string", enum: ["emergency", "follow_up"] }, createdAt: { type: "string", format: "date-time" },
                name: { type: ["string", "null"] }, phone: { type: ["string", "null"] }, area: { type: ["string", "null"] },
              },
            } } },
          } } } },
          "401": { description: "未以專員身分登入" }, "403": { description: "來源不允許" }, "503": { description: "驗證或資料服務無法使用" },
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
    "/api/admin/care-cases": {
      get: {
        tags: ["Admin"],
        summary: "查詢既有已接案個案",
        description: "目前僅提供 GET。聊天需求轉接案已停用；正式申請接案待 application 資料來源串接後另行提供。既有個案與評估資料保留。",
        security: [{ adminSession: [] }],
        responses: {
          "200": { description: "Care cases" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/api/admin/care-cases/{caseId}": {
      get: {
        tags: ["Admin"],
        summary: "Read a formal care case and its Case 360 read model",
        security: [{ adminSession: [] }],
        parameters: [{
          name: "caseId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        }],
        responses: {
          "200": { description: "Care case" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/api/admin/care-cases/{caseId}/assessments": {
      post: {
        tags: ["Admin"],
        summary: "Save a care-case assessment snapshot",
        security: [{ adminSession: [] }],
        parameters: [{
          name: "caseId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateAssessmentRequest" } },
          },
        },
        responses: {
          "201": { description: "Assessment snapshot created" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "413": { $ref: "#/components/responses/PayloadTooLarge" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/chat": {
      post: {
        tags: ["Chat"],
        summary: "與長照 Agent 對話",
        security: [{ userSession: [] }],
        description: "必須登入；身分由 care_user_session cookie 決定。舊版 userId 若與 session 不符會回傳 403。明確要求忽略既有指令、冒充 system/developer 或洩漏提示詞的訊息會以 400 拒絕。設定 Accept: application/x-ndjson 可逐行接收 progress、result 或 error 事件。串流開始後的錯誤以 error 事件回傳，HTTP 狀態仍為 200。",
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
      adminSession: {
        type: "apiKey",
        in: "cookie",
        name: "care_admin_session",
      },
    },
    schemas: {
      AdminApplication: {
        type: "object", required: ["id", "targetName", "summary", "serviceCount", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid" }, targetName: { type: "string" }, summary: { type: "string" },
          serviceCount: { type: "integer" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
        },
      },
      ApplicationIntakeData: {
        type: "object", additionalProperties: false,
        properties: {
          jurisdiction: { type: "string" },
          applicantRole: { type: "string", enum: ["SELF", "FAMILY_PROXY", "PROFESSIONAL_PROXY", "OTHER_PROXY"] },
          currentSituation: { type: "string", enum: ["HOME", "HOSPITAL_DISCHARGE", "INSTITUTION", "OTHER"] },
          applicant: { type: "object", additionalProperties: false, properties: {
            name: { type: "string" }, nationalId: { type: "string" }, phone: { type: "string" },
            email: { type: "string" }, relationship: { type: "string" },
          } },
          recipient: { type: "object", additionalProperties: false, properties: {
            name: { type: "string" }, nationalId: { type: "string" }, birthDate: { type: "string", format: "date" },
            currentAddress: { type: "string" }, registeredAddress: { type: "string" },
          } },
          careContext: { type: "object", additionalProperties: false, properties: {
            recentEvent: { type: "string" }, mobility: { type: "string" }, bathing: { type: "string" },
            eating: { type: "string" }, toileting: { type: "string" }, daytimeCaregiverAvailability: { type: "string" },
            primaryCaregiver: { type: "string" }, caregiverBurden: { type: "string" },
            environmentRisks: { type: "string" }, currentServices: { type: "string" }, goal: { type: "string" },
          } },
          intake: { type: "object", additionalProperties: false, properties: {
            sex: { type: "string" }, language: { type: "string" }, livingArrangement: { type: "string" },
            hiredCaregiver: { type: "string" }, hospitalizedRecently: { type: "string" }, transfers: { type: "string" },
            dressing: { type: "string" }, referralSource: { type: "string" },
            requestedServices: { type: "array", maxItems: 7, items: { type: "string", enum: ["照顧服務", "專業服務／復能", "交通接送", "輔具服務", "居家無障礙環境改善", "喘息服務", "尚不確定，請協助評估"] } },
          } },
          consent: { type: "object", additionalProperties: false, properties: {
            privacyAccepted: { type: "boolean" }, proxyConfirmed: { type: "boolean" },
          } },
          precheck: { type: "object", additionalProperties: false, properties: {
            disability: { type: "boolean" }, dementia: { type: "boolean" },
            indigenous: { type: "boolean" }, pac: { type: "boolean" },
          } },
        },
      },
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
        type: "object", required: ["id", "targetName", "summary", "caseStatus", "createdAt", "updatedAt", "services"],
        properties: {
          careOverview: { $ref: "#/components/schemas/CareOverview" },
          id: { type: "string", format: "uuid" }, targetName: { type: "string" }, summary: { type: "string" },
          caseStatus: { type: ["string", "null"], enum: ["new", "assessing", "plan_review", "matching", "following_up", "closed", null] },
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
      CreateAssessmentRequest: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: {
          cmsLevel: { type: "integer", minimum: 0, maximum: 99 },
          summary: { type: "string", minLength: 1, maxLength: 4000 },
        },
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
      NotFound: {
        description: "Resource not found",
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
