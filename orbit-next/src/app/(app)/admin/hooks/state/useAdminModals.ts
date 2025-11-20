"use client";

import { useState } from "react";

export type ModalState = {
  isBanUserModalOpen: boolean;
  setIsBanUserModalOpen: (value: boolean) => void;
  isUnavailableModalOpen: boolean;
  setIsUnavailableModalOpen: (value: boolean) => void;
  isMakeAvailableModalOpen: boolean;
  setIsMakeAvailableModalOpen: (value: boolean) => void;
  isScheduleReportModalOpen: boolean;
  setIsScheduleReportModalOpen: (value: boolean) => void;
  isFaqModalOpen: boolean;
  setIsFaqModalOpen: (value: boolean) => void;
  editingFaqId: string | null;
  setEditingFaqId: (id: string | null) => void;
  isEditingSystemAlert: boolean;
  setIsEditingSystemAlert: (value: boolean) => void;
};

export function useAdminModals(): ModalState {
  const [isBanUserModalOpen, setIsBanUserModalOpen] = useState(false);
  const [isUnavailableModalOpen, setIsUnavailableModalOpen] = useState(false);
  const [isMakeAvailableModalOpen, setIsMakeAvailableModalOpen] = useState(false);
  const [isScheduleReportModalOpen, setIsScheduleReportModalOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [isEditingSystemAlert, setIsEditingSystemAlert] = useState(false);

  return {
    isBanUserModalOpen,
    setIsBanUserModalOpen,
    isUnavailableModalOpen,
    setIsUnavailableModalOpen,
    isMakeAvailableModalOpen,
    setIsMakeAvailableModalOpen,
    isScheduleReportModalOpen,
    setIsScheduleReportModalOpen,
    isFaqModalOpen,
    setIsFaqModalOpen,
    editingFaqId,
    setEditingFaqId,
    isEditingSystemAlert,
    setIsEditingSystemAlert,
  };
}
