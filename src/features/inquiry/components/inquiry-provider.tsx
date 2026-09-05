"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import InquiryModal from "./inquiry-modal";

interface InquiryContextValue {
  openInquiry: (context?: string) => void;
  closeInquiry: () => void;
}

const InquiryContext = createContext<InquiryContextValue>({
  openInquiry: () => {},
  closeInquiry: () => {},
});

export function InquiryProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState("");

  const openInquiry = useCallback((label?: string) => {
    setContext(label || "");
    setIsOpen(true);
  }, []);

  const closeInquiry = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ openInquiry, closeInquiry }), [openInquiry, closeInquiry]);

  return (
    <InquiryContext.Provider value={value}>
      {children}
      <InquiryModal isOpen={isOpen} context={context} onClose={closeInquiry} />
    </InquiryContext.Provider>
  );
}

export function useInquiry() {
  return useContext(InquiryContext);
}