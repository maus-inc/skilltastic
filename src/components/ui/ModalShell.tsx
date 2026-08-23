import { useEffect, type ReactNode } from "react";
import { motion } from "motion/react";

interface ModalShellProps {
  /** extra class on the .modal element, e.g. "create-modal" */
  className?: string;
  onClose: () => void;
  children: ReactNode;
}

/** The chrome every modal shares: Escape closes, clicking the overlay
 *  closes, clicks inside the dialog do not. Entrance is spring-animated. */
export function ModalShell({ className, onClose, children }: ModalShellProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <motion.div
        className={className ? `modal ${className}` : "modal"}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.9 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
