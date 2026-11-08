"use client";

/**
 * Bottone di submit che chiede conferma prima di inviare il form.
 * Usato per le azioni distruttive (elimina tabella / elimina allenamento).
 */
export default function ConfirmButton({
  message,
  children,
  className,
  style,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="submit"
      className={className}
      style={style}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
