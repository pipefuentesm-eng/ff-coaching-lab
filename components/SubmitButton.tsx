'use client';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

/** Botón que se deshabilita mientras se envía (evita doble clic) y opcionalmente pide confirmación. */
export default function SubmitButton({
  children,
  className = 'btn btn-primary',
  confirm,
  name,
  value,
  pendingText = 'Guardando…',
}: {
  children: ReactNode;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      name={name}
      value={value}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
