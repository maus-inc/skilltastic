import { Button } from "../ui/Button";
import { CloseIcon } from "../ui/icons";
import { ModalShell } from "../ui/ModalShell";

interface UnsavedCloseModalProps {
  skillName: string;
  /** label for the save action — "save & close" when closing the tab,
   *  "save & leave" when navigating away from a dirty editor */
  saveLabel?: string;
  /** surfaced when the save write failed; keeps the guard open */
  error?: string | null;
  onSaveAndClose: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/** VS Code-style guard for a dirty editor — raised both when closing its
 *  tab and when navigating away from it. Never silently discards. */
export function UnsavedCloseModal({
  skillName,
  saveLabel = "save & close",
  error = null,
  onSaveAndClose,
  onDiscard,
  onCancel,
}: UnsavedCloseModalProps) {
  return (
    <ModalShell className="unsaved-modal" onClose={onCancel}>
      <div className="modal-header">
        <span className="title">unsaved changes</span>
        <Button variant="ghost" size="icon-sm" onClick={onCancel} aria-label="close">
          <CloseIcon />
        </Button>
      </div>
      <div className="unsaved-body">
        “{skillName}” has edits that are not saved yet. Save them, or discard
        them.
      </div>
      {error && <div className="unsaved-error">couldn't save: {error}</div>}
      <div className="modal-footer">
        <Button variant="ghost" size="sm" onClick={onCancel} aria-label="keep editing">
          keep editing
        </Button>
        <span className="footer-spacer" />
        <Button variant="destructive" size="sm" onClick={onDiscard} aria-label="discard changes">
          discard
        </Button>
        <Button variant="default" size="sm" onClick={onSaveAndClose} aria-label="save and close">
          {saveLabel}
        </Button>
      </div>
    </ModalShell>
  );
}
