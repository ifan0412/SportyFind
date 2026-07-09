"use client";

import { DiscussionBoard } from "@/components/discussion/DiscussionBoard";

interface EventLobbyBoardProps {
  eventId: string;
  currentUser: { id: string } | null;
  isOrganizer?: boolean;
  returnTo?: string;
}

/** Event discussion lobby — wraps unified DiscussionBoard. */
export default function EventLobbyBoard({
  eventId,
  currentUser,
  isOrganizer,
  returnTo,
}: EventLobbyBoardProps) {
  return (
    <DiscussionBoard
      contextType="event"
      contextId={eventId}
      currentUser={currentUser}
      isModerator={isOrganizer}
      canParticipate
      returnTo={returnTo}
      title="活動討論大廳"
      emptyHint="尚無人發言，快來搶第一條留言吧！"
      inputPlaceholder="詢問球路資訊、尋找共乘夥伴..."
      className="mt-8"
    />
  );
}
