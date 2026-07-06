import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Cookie 政策 | ${SITE.name}`,
  description: `${SITE.name} Cookie 政策 — 我們如何使用 Cookie 及類似技術。`,
};

export default function CookiePolicyPage() {
  return (
    <LegalDocument title="Cookie 政策" titleEn="Cookie Policy">
      <section>
        <h2>1. 什麼是 Cookie？</h2>
        <p>
          Cookie 是當您瀏覽網站時，儲存在您裝置上的小型文字檔案。
          類似技術還包括本地儲存（localStorage）及工作階段儲存。
          它們幫助網站記住您的偏好、維持登入狀態及確保安全運作。
        </p>
      </section>

      <section>
        <h2>2. 我們如何使用 Cookie</h2>
        <p>
          {SITE.name} 目前主要使用<strong>嚴格必要（Strictly Necessary）</strong>的 Cookie 及儲存技術，
          以提供核心功能。我們不使用第三方廣告或行銷追蹤 Cookie。
        </p>
      </section>

      <section>
        <h2>3. Cookie 及儲存項目一覽</h2>

        <h3>嚴格必要 — 無需事先同意</h3>
        <p>這些項目對網站運作不可或缺，無法關閉。</p>
        <ul>
          <li>
            <strong>Supabase 身份驗證 Cookie</strong>（例如 <code className="text-zinc-400">sb-*-auth-token</code>）
            <br />
            用途：維持您的登入工作階段、保護帳戶安全
            <br />
            有效期：工作階段或按 Supabase 設定
            <br />
            提供者：Supabase
          </li>
          <li>
            <strong>網站存取 Cookie</strong>（<code className="text-zinc-400">site_access</code>，如適用）
            <br />
            用途：於測試/預覽階段控制網站存取
            <br />
            有效期：最長 7 天
          </li>
        </ul>

        <h3>功能偏好 — 經您同意後儲存</h3>
        <ul>
          <li>
            <strong>Cookie 同意紀錄</strong>（<code className="text-zinc-400">sportyfind-cookie-consent</code>，localStorage）
            <br />
            用途：記錄您已閱讀並接受 Cookie 通知
            <br />
            有效期：直至您清除瀏覽器資料
          </li>
        </ul>
      </section>

      <section>
        <h2>4. 第三方 Cookie</h2>
        <p>當您使用以下功能時，相關第三方可能設定 Cookie：</p>
        <ul>
          <li>
            <strong>Google 登入：</strong>若您選擇「Continue with Google」，
            Google 可能設定其自身的 Cookie。請參閱
            <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer"> Google Cookie 說明</a>。
          </li>
        </ul>
      </section>

      <section>
        <h2>5. 如何管理 Cookie</h2>
        <p>您可以透過以下方式管理 Cookie：</p>
        <ul>
          <li>
            <strong>瀏覽器設定：</strong>大多數瀏覽器允許您封鎖或刪除 Cookie。
            請注意，封鎖必要 Cookie 可能導致無法登入或使用部分功能。
          </li>
          <li>
            <strong>清除本地儲存：</strong>在瀏覽器開發者工具或設定中清除網站資料，
            將重設 Cookie 同意橫幅及相關偏好。
          </li>
          <li>
            <strong>登出帳戶：</strong>登出可結束當前身份驗證工作階段。
          </li>
        </ul>
        <p>常見瀏覽器說明：</p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
          <li><a href="https://support.apple.com/zh-hk/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
          <li><a href="https://support.mozilla.org/zh-TW/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer">Firefox</a></li>
        </ul>
      </section>

      <section>
        <h2>6. 您的同意</h2>
        <p>
          首次造訪時，我們會顯示 Cookie 通知橫幅。
          點擊「接受並繼續」即表示您確認已閱讀本政策並同意我們按所述方式使用 Cookie。
          嚴格必要的 Cookie 在提供服務時即會使用，無需額外同意。
        </p>
      </section>

      <section>
        <h2>7. 政策更新</h2>
        <p>
          若我們新增非必要 Cookie（例如分析工具），將更新本政策並在適用時重新徵求您的同意。
        </p>
      </section>

      <section>
        <h2>8. 聯絡我們</h2>
        <p>
          有關 Cookie 的查詢，請聯絡：
          <a href={`mailto:${SITE.contactEmail}`}> {SITE.contactEmail}</a>
        </p>
      </section>
    </LegalDocument>
  );
}
