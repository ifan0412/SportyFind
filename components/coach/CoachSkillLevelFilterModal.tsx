"use client";

import { CategoryFilterModal } from "@/components/CategoryFilterModal";
import { COACH_SKILL_LEVELS } from "@/lib/coach-skill-levels";

const options = COACH_SKILL_LEVELS.map((level) => ({
  id: level.id,
  label: level.labelZh,
}));

interface CoachSkillLevelFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLevels: string[];
  onApply: (selected: string[]) => void;
}

export function CoachSkillLevelFilterModal({
  isOpen,
  onClose,
  selectedLevels,
  onApply,
}: CoachSkillLevelFilterModalProps) {
  return (
    <CategoryFilterModal
      isOpen={isOpen}
      onClose={onClose}
      title="篩選適合程度"
      subtitle={`可多選 · 已選 ${selectedLevels.length} 項`}
      options={options}
      selected={selectedLevels}
      onApply={onApply}
      accent="orange"
    />
  );
}
