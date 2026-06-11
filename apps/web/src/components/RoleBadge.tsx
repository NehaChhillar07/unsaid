import { MaskIcon } from './MaskIcon';
import styles from './badges.module.css';

export function RoleBadge({ role, flat = false }: { role: string; flat?: boolean }) {
  return (
    <span className={`${styles.roleBadge}${flat ? ` ${styles.flat}` : ''}`}>
      <MaskIcon size={13} />
      {role}
    </span>
  );
}
