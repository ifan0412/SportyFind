import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `私隱政策 | ${SITE.name}`,
  description: `${SITE.name} 私隱政策 — 我們如何收集、使用及保護您的個人資料。`,
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="私隱政策" titleEn="Privacy Policy">
      <section>
        <h2>1. 簡介</h2>
        <p>
          歡迎使用 {SITE.name}（「本平台」、「我們」）。我們致力保障您的個人資料私隱。
          本私隱政策說明當您使用我們的網站及服務時，我們如何收集、使用、儲存、披露及保護您的個人資料。
        </p>
        <p>
          本政策適用於香港《個人資料（私隱）條例》（PDPO）及相關適用法律。
          若您位於其他司法管轄區（例如歐盟/英國），您可能享有額外權利，詳見第 9 節。
        </p>
      </section>

      <section>
        <h2>2. 資料控制者</h2>
        <p>
          就本政策而言，{SITE.name} 為個人資料的控制者（Data Controller）。
          如有私隱相關查詢，請聯絡：
          <a href={`mailto:${SITE.contactEmail}`}> {SITE.contactEmail}</a>
        </p>
      </section>

      <section>
        <h2>3. 我們收集的個人資料</h2>
        <p>視乎您使用的功能，我們可能收集以下類別的資料：</p>
        <h3>帳戶及身份資料</h3>
        <ul>
          <li>電郵地址、密碼（經加密儲存）、姓名、帳號代稱（handle）</li>
          <li>透過 Google 等第三方登入時，由該服務提供的識別資料（如姓名、電郵、頭像）</li>
          <li>您選擇的角色（運動員、教練、物理治療師等）</li>
        </ul>
        <h3>個人檔案及公開資料</h3>
        <ul>
          <li>個人簡介、頭像、地區、運動專長、身高體重（若您選擇公開）</li>
          <li>聯絡方式（電郵、電話、地址 — 僅在您主動填寫並選擇公開時）</li>
          <li>社交媒體連結、賽場相片及影片</li>
        </ul>
        <h3>平台活動資料</h3>
        <ul>
          <li>好友關係、站內訊息、通知紀錄</li>
          <li>隊伍加入申請、活動報名、教練課程諮詢及評價</li>
          <li>教練/治療師名片、服務項目及收費資訊（若您以該身份使用平台）</li>
        </ul>
        <h3>技術及使用資料</h3>
        <ul>
          <li>登入工作階段識別碼、Cookie（詳見 <a href="/cookies">Cookie 政策</a>）</li>
          <li>裝置類型、瀏覽器類型、IP 位址（由託管及基礎設施服務商記錄）</li>
        </ul>
      </section>

      <section>
        <h2>4. 收集方式</h2>
        <ul>
          <li><strong>您直接提供：</strong>註冊、編輯個人檔案、發送訊息、報名活動等</li>
          <li><strong>自動收集：</strong>透過 Cookie 及類似技術維持登入與安全（見 Cookie 政策）</li>
          <li><strong>第三方：</strong>當您使用 Google 登入時，我們從 Google 接收您授權的資料</li>
        </ul>
      </section>

      <section>
        <h2>5. 使用目的及法律依據</h2>
        <p>我們使用您的個人資料用於：</p>
        <ul>
          <li>提供及維運平台功能（建立帳戶、個人檔案、配對、通訊）</li>
          <li>處理好友請求、隊伍申請、活動報名及教練諮詢</li>
          <li>發送與帳戶及平台活動相關的通知</li>
          <li>保障平台安全、防止濫用及欺詐</li>
          <li>遵守法律義務及回應合法要求</li>
          <li>在您同意下，改善服務體驗</li>
        </ul>
        <p>
          法律依據包括：履行與您的合約（服務條款）、合法利益（平台安全與營運）、
          以及您在適用情況下给予的同意。
        </p>
      </section>

      <section>
        <h2>6. 資料分享及第三方服務</h2>
        <p>我們不會出售您的個人資料。我們可能在以下情況分享資料：</p>
        <ul>
          <li>
            <strong>基礎設施及託管：</strong>Supabase（資料庫、身份驗證、檔案儲存）、
            網站託管服務商（如 Vercel）— 僅為提供服務所需
          </li>
          <li>
            <strong>身份驗證：</strong>Google（若您選擇 Google 登入）
          </li>
          <li>
            <strong>其他用戶：</strong>您公開的個人檔案、訊息及活動參與資訊，
            將按平台設定向其他用戶顯示
          </li>
          <li>
            <strong>法律要求：</strong>當法律、法院命令或政府機關要求時
          </li>
        </ul>
        <p>
          第三方服務商受其自身私隱政策約束。我們建議您查閱
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer"> Supabase 私隱政策</a>
          及
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"> Google 私隱政策</a>。
        </p>
      </section>

      <section>
        <h2>7. 資料保留</h2>
        <p>
          我們在提供服務所需期間內保留您的個人資料。若您刪除帳戶，
          我們將在合理時間內刪除或匿名化您的個人資料，惟法律要求保留的紀錄除外。
          站內訊息及公開內容可能因備份而短暫留存。
        </p>
      </section>

      <section>
        <h2>8. 資料安全</h2>
        <p>
          我們採取合理的技術及組織措施保護個人資料，包括加密傳輸（HTTPS）、
          存取控制及安全的身份驗證。然而，互聯網傳輸無法保證絕對安全。
        </p>
      </section>

      <section>
        <h2>9. 您的權利</h2>
        <p>根據適用法律，您可能享有以下權利：</p>
        <ul>
          <li>查閱我們持有的您的個人資料</li>
          <li>更正不準確的資料（可於個人檔案自行更新）</li>
          <li>要求刪除帳戶及相關資料（可於「帳戶管理」操作）</li>
          <li>反對或限制特定處理方式</li>
          <li>撤回同意（不影響撤回前處理的合法性）</li>
          <li>向相關監管機構提出投訴（香港：個人資料私隱專員公署）</li>
        </ul>
        <p>
          行使權利請聯絡 <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>。
          我們將於合理時間內回覆。
        </p>
      </section>

      <section>
        <h2>10. 兒童私隱</h2>
        <p>
          本平台不針對 16 歲以下人士。我們不會故意收集兒童的個人資料。
          若您認為我們誤收了兒童資料，請立即聯絡我們。
        </p>
      </section>

      <section>
        <h2>11. 跨境傳輸</h2>
        <p>
          您的資料可能儲存於您所在國家/地區以外的伺服器（例如雲端託管設施）。
          我們確保此類傳輸受適當保障措施約束。
        </p>
      </section>

      <section>
        <h2>12. 政策更新</h2>
        <p>
          我們可能不時更新本政策。重大變更將於本平台公布。
          繼續使用服務即表示您接受更新後的政策。
        </p>
      </section>

      <section>
        <h2>13. 聯絡我們</h2>
        <p>
          私隱查詢：<a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
          <br />
          一般支援：<a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
        </p>
      </section>
    </LegalDocument>
  );
}
