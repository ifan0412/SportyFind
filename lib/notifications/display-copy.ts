import type { Notification } from "@/components/notifications/notification-types";
import { getPushNotificationCopy } from "@/lib/push/notification-copy";
import {
  inferNotificationType,
  normalizeNotificationLike,
  normalizeNotificationType,
  type NotificationLike,
} from "@/lib/notifications/normalize";

export interface NotificationDisplayMessage {
  highlight: string | null;
  message: string;
}

function displayFromPushCopy(notif: NotificationLike): NotificationDisplayMessage {
  const push = getPushNotificationCopy({
    ...notif,
    type: (normalizeNotificationType(notif.type) ||
      inferNotificationType(notif) ||
      "unknown") as Notification["type"],
  });

  const body = push.body?.trim();
  if (!body) {
    return { highlight: null, message: "您有一則新通知" };
  }

  const name = notif.sender?.full_name?.trim();
  if (name && body.startsWith(name)) {
    return {
      highlight: name,
      message: body.slice(name.length),
    };
  }

  if (body.startsWith("系統通知")) {
    return { highlight: "系統通知", message: body.slice("系統通知".length) };
  }

  return { highlight: null, message: body };
}

export function getNotificationDisplayMessage(notif: NotificationLike): NotificationDisplayMessage {
  const normalized = normalizeNotificationLike(notif);
  const name = normalized.sender?.full_name?.trim() || "某人";
  const type = normalizeNotificationType(normalized.type) || inferNotificationType(normalized);

  switch (type) {
    case "friend_request":
      return { highlight: name, message: " 想與你成為好友" };
    case "friend_accepted":
      return { highlight: name, message: " 接受了你的好友請求 🎉" };
    case "team_join_request":
      return { highlight: name, message: " 申請加入您的球隊" };
    case "team_request_accepted":
      return { highlight: "系統通知", message: "：您的加入申請已被接受 🎉" };
    case "team_request_rejected":
      return { highlight: "系統通知", message: "：您的加入申請已被拒絕" };
    case "team_member_left":
      return { highlight: name, message: " 已離開您的球隊" };
    case "event_registration":
      return { highlight: name, message: " 報名了您主辦的活動" };
    case "event_waitlist_signup":
      return { highlight: name, message: " 加入了您主辦活動的候補名單" };
    case "event_waitlist_promoted":
      return { highlight: "系統通知", message: "：您已從候補名單升級，成功加入活動 🎉" };
    case "event_waitlist_promoted_host":
      return { highlight: name, message: " 從候補名單加入您的活動 🎉" };
    case "event_leave":
      return { highlight: name, message: " 退出了您主辦的活動" };
    case "event_kicked":
      return { highlight: "系統通知", message: "：您已被主辦方移除出某活動的參賽名單" };
    case "event_accepted":
      return { highlight: "系統通知", message: "：您的主辦活動參賽申請已獲批准 🎉" };
    case "event_joined":
      return { highlight: "系統通知", message: "：您已成功加入活動 🎉" };
    case "event_cancelled":
      return { highlight: "系統通知", message: "：您報名的活動已被主辦方取消" };
    case "coach_enquiry":
      return { highlight: name, message: " 向您發送了一份課程諮詢單 📬" };
    case "coach_enquiry_withdrawn":
      return { highlight: name, message: " 撤回了課程諮詢單" };
    case "coach_review":
      return { highlight: name, message: " 為您的課程留下了一則評價 ⭐" };
    case "physio_enquiry":
      return { highlight: name, message: " 向您發送了一份診療諮詢單 📬" };
    case "physio_enquiry_withdrawn":
      return { highlight: name, message: " 撤回了診療諮詢單" };
    case "physio_review":
      return { highlight: name, message: " 為您的診療項目留下了一則評價 ⭐" };
    case "discussion_new_post":
      return { highlight: name, message: " 在討論區發佈了新貼文" };
    case "discussion_post_like":
      return { highlight: name, message: " 讚好了您的貼文" };
    case "discussion_post_comment":
      return { highlight: name, message: " 留言了您的貼文" };
    case "discussion_comment_like":
      return { highlight: name, message: " 讚好了您的留言" };
    case "account_reactivated":
      return { highlight: "系統通知", message: "：您的帳戶已恢復，歡迎回來！ 🎉" };
    case "admin_team_removed":
      return { highlight: "系統通知", message: "：您管理的群組已被網站管理員移除" };
    case "admin_event_removed":
      return { highlight: "系統通知", message: "：您主辦的活動已被網站管理員移除" };
    case "direct_message":
    case "message":
    case "new_message":
      return { highlight: name, message: " 傳送了一則訊息 💬" };
    default:
      return displayFromPushCopy(normalized);
  }
}
