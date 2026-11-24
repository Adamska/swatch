interface RegistrationMarkProps {
  size?: number;
  className?: string;
}

export function RegistrationMark({ size = 22, className = "" }: RegistrationMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 0.5v23M0.5 12h23" />
    </svg>
  );
}
