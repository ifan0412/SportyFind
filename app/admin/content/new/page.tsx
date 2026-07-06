"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { ContentEditor } from "@/components/admin/ContentEditor";

export default function AdminContentNewPage() {
  return (
    <AdminShell title="新增文章">
      <ContentEditor />
    </AdminShell>
  );
}
