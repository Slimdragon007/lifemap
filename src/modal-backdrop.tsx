import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Shared dialog shell: renders the dimmed backdrop, closes on Escape and on a
// click outside the panel, moves focus into the dialog on open, traps Tab while
// open, and restores focus to the trigger on close. Every modal wraps its
// <section role="dialog"> in this so keyboard and screen-reader users are not
// stranded inside an undismissable layer.
function ModalBackdrop({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        trapFocus(event, backdropRef.current);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const dialog =
      backdropRef.current?.querySelector<HTMLElement>("[role='dialog']");
    dialog?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Hand focus back to whatever opened the dialog (a11y: no lost focus).
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) {
    return;
  }
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE),
  ).filter((node) => node.offsetParent !== null);
  if (focusable.length === 0) {
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export default ModalBackdrop;
