import styles from './admin.module.css';

export default function Loading() {
  return (
    <main>
      <p className={styles.empty}>loading…</p>
    </main>
  );
}
