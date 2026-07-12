import type { Notification } from "@/components/notifications/notification-types";
import { getNotificationHref } from "@/components/notifications/notification-routing";

type NotifLike = Pick<
  Notification,
  "type" | "sender" | "team_id" | "event_id" | "friendship_id"
>;

export function getPushNotificationCopy(notif: NotifLike): { title: string; body: string } {
  const name = notif.sender?.full_name?.trim() || "某人";

  switch (notif.type) {
    case "friend_request":
      return { title: "新的好友請求", body: `${name} 想與你成為好友` };
    case "friend_accepted":
      return { title: "好友請求已接受", body: `${name} 接受了你的好友請求` };
    case "team_join_request":
      return { title: "球隊加入申請", body: `${name} 申請加入您的球隊` };
    case "team_request_accepted":
      return { title: "加入申請已通過", body: "您的球隊加入申請已被接受" };
    case "team_request_rejected":
      return { title: "加入申請未通過", body: "您的球隊加入申請已被拒絕" };
    case "team_member_left":
      return { title: "球隊成員變動", body: `${name} 已離開您的球隊` };
    case "event_registration":
      return { title: "活動新報名", body: `${name} 報名了您主辦的活動` };
    case "event_waitlist_signup":
      return { title: "候補名單更新", body: `${name} 加入了您主辦活動的候補名單` };
    case "event_waitlist_promoted":
      return { title: "候補升級", body: `您已從候補名單加入 ${name} 的活動` };
    case "event_waitlist_promoted_host":
      return { title: "候補升級", body: `${name} 從候補名單加入您的活動` };
    case "event_leave":
      return { title: "活動參與者退出", body: `${name} 退出了您主辦的活動` };
    case "event_kicked":
      return { title: "活動名單更新", body: "您已被主辦方移除出某活動的參賽名單" };
    case "event_accepted":
      return { title: "活動申請已批准", body: "您的主辦活動參賽申請已獲批准" };
    case "event_joined":
      return { title: "成功加入活動", body: "您已成功加入活動" };
    case "event_cancelled":
      return { title: "活動已取消", body: "您報名的活動已被主辦方取消" };
    case "coach_enquiry":
      return { title: "新的課程諮詢", body: `${name} 向您發送了一份課程諮詢單` };
    case "coach_enquiry_withdrawn":
      return { title: "諮詢單已撤回", body: `${name} 撤回了課程諮詢單` };
    case "coach_review":
      return { title: "新的課程評價", body: `${name} 為您的課程留下了一則評價` };
    case "physio_enquiry":
      return { title: "新的診療諮詢", body: `${name} 向您發送了一份診療諮詢單` };
    case "physio_enquiry_withdrawn":
      return { title: "諮詢單已撤回", body: `${name} 撤回了診療諮詢單` };
    case "physio_review":
      return { title: "新的診療評價", body: `${name} 為您的診療項目留下了一則評價` };
    case "account_reactivated":
      return { title: "帳戶已恢復", body: "您的 SportyFind 帳戶已恢復，歡迎回來！" };
    case "admin_team_removed":
      return { title: "球隊已被移除", body: "您管理的群組已被網站管理員移除" };
    case "admin_event_removed":
      return { title: "活動已被移除", body: "您主辦的活動已被網站管理員移除" };
    case "direct_message":
      return { title: "新訊息", body: `${name} 傳送了一則訊息` };
    default:
      return { title: "SportyFind 通知", body: "您有一則新通知" };
  }
}

export function getPushPayloadForNotification(notif: NotifLike & { id?: string }) {
  const { title, body } = getPushNotificationCopy(notif);
  const href = getNotificationHref(notif as Notification);
  return {
    title,
    body,
    url: href,
    tag: notif.id ? `notif-${notif.id}` : `notif-${notif.type}`,
  };
}
