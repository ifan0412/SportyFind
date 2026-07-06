import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `服務條款 | ${SITE.name}`,
  description: `${SITE.name} 服務條款 — 使用本平台須遵守的規則與條件。`,
};

export default function TermsOfServicePage() {
  return (
    <LegalDocument title="服務條款" titleEn="Terms of Service">
      <section>
        <h2>1. 接受條款</h2>
        <p>
          歡迎使用 {SITE.name}。當您註冊帳戶、瀏覽或使用本平台任何服務，
          即表示您同意受本服務條款、我們的
          <Link href="/privacy"> 私隱政策</Link> 及
          <Link href="/cookies"> Cookie 政策</Link> 約束。
          若您不同意，請勿使用本平台。
        </p>
      </section>

      <section>
        <h2>2. 服務說明</h2>
        <p>
          {SITE.name} 是一個運動社群網絡平台，提供運動員配對、隊伍管理、
          教練及物理治療師服務展示、活動報名、站內通訊等功能。
          我們保留隨時修改、暫停或終止部分或全部服務的權利。
        </p>
      </section>

      <section>
        <h2>3. 帳戶註冊及資格</h2>
        <ul>
          <li>您須年滿 16 歲方可註冊使用本平台</li>
          <li>您須提供真實、準確及完整的註冊資料，並及時更新</li>
          <li>您須對帳戶下的所有活動負責，並妥善保管登入憑證</li>
          <li>每人不得註冊多個帳戶以規避平台規則或濫用功能</li>
          <li>我們有權拒絕、暫停或終止任何違反條款的帳戶</li>
        </ul>
      </section>

      <section>
        <h2>4. 用戶行為準則</h2>
        <p>使用本平台時，您同意不會：</p>
        <ul>
          <li>發布虛假、誤導、誹謗、騷擾、歧視、暴力或非法內容</li>
          <li>冒充他人或虛報身份、資歷或專業資格</li>
          <li>發送垃圾訊息、未經請求的推廣或惡意軟件</li>
          <li>試圖未經授權存取平台、其他用戶帳戶或系統</li>
          <li>抓取、複製或商業利用平台內容（除非獲得書面許可）</li>
          <li>利用平台從事任何違反適用法律的活动</li>
        </ul>
        <p>
          我們的站內訊息系統設有初次洽詢防濫用機制；違反規則的帳戶可能被限制或封禁。
        </p>
      </section>

      <section>
        <h2>5. 用戶內容</h2>
        <p>
          您保留對您上傳內容（文字、圖片、影片等）的所有權。
          透過上傳內容，您授予 {SITE.name} 一項非獨家、全球性、免版稅的許可，
          以在平台內展示、儲存及傳輸該內容，從而提供服務。
        </p>
        <p>
          您聲明您擁有或有权分享所上傳的內容，且內容不侵犯第三方權利。
          我們有權（但無義務）移除違反條款或法律的內容。
        </p>
      </section>

      <section>
        <h2>6. 教練、治療師及商業服務</h2>
        <p>
          本平台允許教練及物理治療師展示服務資訊並接收諮詢。
          <strong>{SITE.name} 不是醫療或專業服務的提供者</strong>，
          亦不對用戶之間的線下交易、受傷風險或服務品質作出保證。
          用戶應自行核實對方的資歷並謹慎作出決定。
        </p>
      </section>

      <section>
        <h2>7. 活動及隊伍</h2>
        <p>
          活動主辦方及隊伍管理員對其發布的內容及活動安排負責。
          我們不對活動期間的人身安全、財產損失或爭議承擔責任，
          除非法律另有規定。
        </p>
      </section>

      <section>
        <h2>8. 知識產權</h2>
        <p>
          本平台的品牌、設計、軟件及原創內容（不包括用戶內容）歸 {SITE.name} 或其授權方所有。
          未經書面許可，不得複製、修改或分發。
        </p>
      </section>

      <section>
        <h2>9. 免責聲明</h2>
        <p>
          本平台按「現狀」（as is）提供，不作任何明示或暗示的保證，
          包括但不限於適銷性、特定用途適用性及不侵權。
          我們不保證服務不間斷、無錯誤或完全安全。
        </p>
      </section>

      <section>
        <h2>10. 責任限制</h2>
        <p>
          在法律允許的最大範圍內，{SITE.name} 及其營運方不對任何間接、
          附帶、特殊或懲罰性損害，或利潤、資料損失承擔責任。
          我們的總責任以您於過去 12 個月內向本平台支付的費用為上限
          （如適用；目前大部分功能為免費）。
        </p>
      </section>

      <section>
        <h2>11. 帳戶終止</h2>
        <p>
          您可隨時於「帳戶管理」刪除帳戶。我們亦可在您違反條款時暫停或終止您的帳戶。
          終止後，您的存取權將被撤銷，相關資料將按私隱政策處理。
        </p>
      </section>

      <section>
        <h2>12. 適用法律</h2>
        <p>
          本條款受香港特別行政區法律管轄。
          任何爭議應首先透過善意協商解決；協商不成時，
          提交香港法院專屬管轄（除非法律另有強制規定）。
        </p>
      </section>

      <section>
        <h2>13. 條款修訂</h2>
        <p>
          我們可能修訂本條款。修訂後繼續使用服務即視為接受新條款。
          重大變更將於平台公布。
        </p>
      </section>

      <section>
        <h2>14. 聯絡我們</h2>
        <p>
          條款查詢：<a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
        </p>
      </section>
    </LegalDocument>
  );
}
