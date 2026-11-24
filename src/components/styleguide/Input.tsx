import { useId, type InputHTMLAttributes } from "react";
import styles from "./controls.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, id, ...props }: InputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={fieldId} className={styles.fieldLabel}>
        {label}
      </label>
      <input id={fieldId} className={styles.field} {...props} />
    </div>
  );
}
