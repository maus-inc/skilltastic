import { Button } from "../ui/Button";
import { CloseIcon } from "../ui/icons";
import { ModalShell } from "../ui/ModalShell";

interface UnsavedCloseModalProps {
  skillName: string;
  onSaveAndClose: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/** VS Code-style guard for closing a dirty editor tab. */
export function UnsavedCloseModal({
  skillName,
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
        and close the tab.
      </div>
      <div className="modal-footer">
        <Button variant="ghost" size="sm" onClick={onCancel} aria-label="keep editing">
          keep editing
        </Button>
        <span className="footer-spacer" />
        <Button variant="destructive" size="sm" onClick={onDiscard} aria-label="discard changes">
          discard
        </Button>
        <Button variant="default" size="sm" onClick={onSaveAndClose} aria-label="save and close">
          save & close
        </Button>
      </div>
    </ModalShell>
  );
}
