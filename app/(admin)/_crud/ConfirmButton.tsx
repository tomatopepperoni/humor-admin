"use client";

/** A submit button that asks first. Used for every delete in the admin area. */
export default function ConfirmButton({
  message,
  children,
  className = "text-[13px] font-medium text-stop hover:underline",
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
