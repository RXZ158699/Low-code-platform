import { createContext, useContext, useMemo, useState } from "react";
import MemberModal from "./MemberModal.jsx";

const MembershipContext = createContext(null);

export function MembershipProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const value = useMemo(
    () => ({ open, setOpen, reason, setReason }),
    [open, reason],
  );
  return (
    <MembershipContext.Provider value={value}>
      {children}
      <MemberModal open={open} onClose={() => setOpen(false)} reason={reason} />
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (!context) {
    return { open: false, setOpen: () => {}, reason: "", setReason: () => {} };
  }
  return context;
}
