import { worldVars } from '@/lib/theme';
import { MaskIcon } from '@/components/MaskIcon';
import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={`themed ${styles.page}`} style={worldVars('personal')}>
      <div className={styles.col}>
        <div className={styles.brand}>
          <MaskIcon size={18} color="var(--accent)" />
          unsaid
        </div>
        <div className={styles.card} aria-hidden="true" />
      </div>
    </div>
  );
}
