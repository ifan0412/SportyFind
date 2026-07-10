"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AnnouncementEditor } from "@/components/admin/AnnouncementEditor";

export default function NewAnnouncementPage() {
  return (
    <AdminShell title="新增 Pop-up 公告">
      <AnnouncementEditor />
    </AdminShell>
  );
}
