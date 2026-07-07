"use client";

import { CategoryFilterModal } from "@/components/CategoryFilterModal";
import { PHYSIO_SERVICE_TYPES } from "@/lib/physio-service-types";

const options = PHYSIO_SERVICE_TYPES.map((type) => ({ id: type, label: type }));

interface PhysioServiceTypeFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTypes: string[];
  onApply: (selected: string[]) => void;
}

export function PhysioServiceTypeFilterModal({
  isOpen,
  onClose,
  selectedTypes,
  onApply,
}: PhysioServiceTypeFilterModalProps) {
  return (
    <CategoryFilterModal
      isOpen={isOpen}
      onClose={onClose}
      title="篩選診療類別"
      subtitle={`可多選 · 已選 ${selectedTypes.length} 項`}
      options={options}
      selected={selectedTypes}
      onApply={onApply}
      accent="amber"
    />
  );
}
