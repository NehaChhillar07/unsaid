import type { Metadata } from 'next';
import Link from 'next/link';
import { worldVars } from '@/lib/theme';
import { MaskIcon } from '@/components/MaskIcon';
import { sendMagicLink } from './actions';
import { AnonSignInButton } from './AnonSignInButton';
import styles from './auth.module.css';

export const metadata: Metadata = {
  title: 'get in quietly',
};

const ERRORS: Record<string, string> = {
  invalid: "that doesn't look like an email. try again?",
  send: "the link didn't send — give it another go in a moment.",
  link: 'that link expired or was already used. send a fresh one below.',
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const sent = params.sent === '1';
  const error = params.error ? (ERRORS[params.error] ?? ERRORS.send) : null;

  return (
    <div className={`themed ${styles.page}`} style={worldVars('personal')}>
      <div className={styles.panel}>
        <Link href="/" className={styles.brand}>
          <MaskIcon size={22} color="var(--accent)" />
          unsaid
        </Link>

        {sent ? (
          <>
            <h1 className={styles.title}>check your inbox 🤍</h1>
            <p className={styles.copy}>
              we sent you a magic link. tap it and you&rsquo;re in — quietly. it expires after a
              little while, so don&rsquo;t wait too long.
            </p>
            <Link href="/" className={styles.ghostLink}>
              back to the feed
            </Link>
          </>
        ) : (
          <>
            <h1 className={styles.title}>get in quietly</h1>
            <p className={styles.copy}>
              the quietest way in: no email, no password, nothing at all.
            </p>
            <AnonSignInButton />
            <p className={styles.copy} style={{ marginTop: 18 }}>
              or drop an email for a magic link — handy if you ever switch phones and want your
              spills back.
            </p>
            {error && <p className={styles.error}>{error}</p>}
            <form action={sendMagicLink} className={styles.form}>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@somewhere.quiet"
                className={styles.input}
              />
              <button type="submit" className={styles.submit}>
                send the link
              </button>
            </form>
            <p className={styles.fineprint}>
              we never ask for your real name. your email is only for getting in and is never shown
              to anyone — <Link href="/legal/anonymous">here&rsquo;s exactly what we hold</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
