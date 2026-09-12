"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Printer } from "lucide-react";
import { errorText, Notice, useSandbox } from "../../ui";

export default function HomePage() {
  const service = useSandbox();
  const router = useRouter();
  const [error, setError] = useState("");

  function begin() {
    try {
      router.push(`/apply/${service.createCase().id}`);
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <article className="official-portal-article">
      <header className="portal-article-heading">
        <h1>申請長照服務</h1>
        <div className="portal-article-tools">
          <span>長期照顧服務申請說明</span>
          <button type="button" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            友善列印
          </button>
        </div>
      </header>

      <section
        id="service-intro"
        className="portal-introduction"
        aria-labelledby="service-intro-title"
      >
        <h2 id="service-intro-title">什麼是長期照顧服務</h2>
        <p className="portal-title-subline">
          讓有照顧需要的民眾與家庭，獲得適合的支持
        </p>
        <p>
          當本人或家人因身心狀況，預期或已持續六個月以上需要他人協助日常生活，
          可以提出長照服務需求，由所在地的長期照顧管理中心安排評估。
        </p>
        <p>
          長照資源包含照顧及專業服務、交通接送、輔具與居家無障礙環境改善，以及喘息服務。
          家中已有照顧者，也可以向照管中心說明照顧上的困難，討論可使用的資源。
        </p>
      </section>

      <section
        id="eligibility"
        className="portal-article-section"
        aria-labelledby="eligibility-title"
      >
        <h2 id="eligibility-title">長照服務對象</h2>
        <div className="portal-section-body">
          <p>
            經照管中心評估達長照需要等級第 2
            級以上，且符合下列任一類別者，可依評估結果銜接服務：
          </p>
          <ul className="portal-eligibility-list">
            <li>年滿 65 歲的長者。</li>
            <li>年滿 55 歲的原住民。</li>
            <li>失智症者（115 年 1 月 1 日起，納入未滿 50 歲者）。</li>
            <li>失能的身心障礙者。</li>
            <li>急性後期整合照護計畫收案對象（115 年 1 月 1 日起新增）。</li>
          </ul>
          <p className="portal-paragraph-note">
            線上填表是提出需求的第一步；是否符合服務條件，仍須由照管中心評估確認。
          </p>
        </div>
      </section>

      <section
        id="application-process"
        className="portal-article-section"
        aria-labelledby="application-process-title"
      >
        <h2 id="application-process-title">申請流程</h2>
        <div className="portal-section-body">
          <ol className="portal-process-list">
            <li>
              <span className="portal-step-number" aria-hidden="true">
                1
              </span>
              <div>
                <h3>申請長照服務</h3>
                <p>
                  可撥打
                  1966、洽當地照管中心，或透過縣市政府的線上申請管道提出需求。
                  住院中的民眾，也可請院內出院準備團隊協助銜接。
                </p>
              </div>
            </li>
            <li>
              <span className="portal-step-number" aria-hidden="true">
                2
              </span>
              <div>
                <h3>到府評估</h3>
                <p>
                  照管專員聯繫並安排評估，了解身體功能、生活協助需求與家庭照顧情況，確認長照需要等級。
                </p>
              </div>
            </li>
            <li>
              <span className="portal-step-number" aria-hidden="true">
                3
              </span>
              <div>
                <h3>擬定照顧計畫</h3>
                <p>
                  個案管理員與本人及家屬討論服務項目，依需求擬定照顧計畫，協助連結合適的服務資源。
                </p>
              </div>
            </li>
            <li>
              <span className="portal-step-number" aria-hidden="true">
                4
              </span>
              <div>
                <h3>接受長照服務</h3>
                <p>
                  由特約單位依照顧計畫提供服務，後續可依照顧情況變化提出調整需求。
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section
        id="online-application"
        className="portal-article-section"
        aria-labelledby="online-application-title"
      >
        <h2 id="online-application-title">線上申請</h2>
        <div className="portal-section-body">
          <p>
            請先閱讀下列事項，再進入申請表。已有草稿或已送出案件者，請至案件查詢繼續辦理。
          </p>
          <ol className="portal-preparation-list">
            <li>
              <strong>備妥基本資料及聯絡方式：</strong>
              填寫被照顧者姓名、出生日期、實際居住地址，以及可聯繫的申請人資料。
            </li>
            <li>
              <strong>說明目前照顧情況：</strong>
              包括需要協助的日常活動、照顧者安排，以及近期住院或預計出院情形。
            </li>
            <li>
              <strong>確認資料及代為申請權限：</strong>
              代為申請者請先確認授權；送出前仍可檢閱及修改，收到補件通知後可再次補充。
            </li>
          </ol>

          {error && <Notice warning>{error}</Notice>}
          <div className="portal-application-actions">
            <button
              type="button"
              className="portal-apply-button"
              onClick={begin}
              data-agent-action="start-application"
            >
              開始申請
              <ArrowRight size={19} aria-hidden="true" />
            </button>
            <Link className="portal-query-button" href="/cases">
              查詢案件
              <ArrowRight size={19} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
