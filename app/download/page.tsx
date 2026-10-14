import type { Metadata } from 'next';
import { MacDownload } from '@/components/MacDownload';
import windowsRelease from '@/lib/windows-release.json';
import styles from './download.module.css';

export const metadata: Metadata = { title: 'Download Morrow for Mac', description: 'Install the Morrow private beta on your Mac, then enter your invitation and subscribe. Setup video and fixes for common problems.' };

// Videos live in published-home/media and are copied to the site root at build time.
const fixes = [
  { id: 'help-permissions', title: 'Morrow can\'t hear you, or can\'t click and type', video: 'fix-permissions', steps: ['Open System Settings, then Privacy & Security.', 'Under Microphone, turn on Morrow.', 'Under Accessibility, turn on Morrow, and Morrow Island for the shortcut.', 'Under Screen & System Audio Recording, turn on Morrow Island. If macOS asks, choose Quit & Reopen.', 'For computer control, keep the official ChatGPT or Codex desktop app installed and running.', 'In Morrow, open Settings > Permissions and choose Check connection.', 'If it says Service connection permission needed, choose Allow service connection and select the IPC folder shown by macOS. Then check again.'] },
  { id: 'help-keychain', title: 'Morrow keeps asking for your Keychain password', video: 'fix-keychain', steps: ['Type your Mac login password and click Always Allow.', 'If it keeps coming back, don\'t reset your Keychain. Quit any extra copies of Morrow and open the one in Applications.', 'If you see macOS status -34018, this build is missing a signing permission. Contact support for a replacement build.', 'Never send your password to support.'] },
  { id: 'help-paid', title: 'You paid, but Morrow on your Mac is still locked', video: 'fix-paid-locked', steps: ['Don\'t pay again. On the payment page, press Check payment status.', 'If the sign-in expired, press Continue to subscription and sign in with the same account.', 'Already paid? Choose Already paid? Sign in.', 'If it says your account is connected to another computer, contact Morrow support to reset the device.'] },
  { id: 'help-chatgpt', title: 'Invite code, ChatGPT sign-in or cooldown', video: 'fix-chatgpt', steps: ['Invitation code not accepted? Check it letter by letter, then try again.', 'ChatGPT sign-in timed out? Press Try again and finish signing in in your browser.', 'Seeing ChatGPT cooldown? ChatGPT has paused requests for a few minutes. Your Morrow subscription is fine.', 'When the countdown ends, send your request again. Morrow doesn\'t resend it for you.'] },
];

export default function DownloadPage() {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.top}>
        <div className={styles.wrap}>
          <div className={styles.bar}>
            <a href="/" aria-label="Morrow home"><img src="/wordmark-sm.png" width={360} height={120} alt="Morrow" /></a>
            <a href="/subscribe?view=subscription">Manage your account ↗</a>
          </div>
          <div className={styles.hero}>
            <div>
              <p className={styles.meta}>Private paid beta · Apple silicon Mac · macOS 13 or later</p>
              <h1 className={styles.title}>Start on your Mac.</h1>
            </div>
            <div className={styles.side}>
              <p>Download first. Your invitation and subscription are handled inside Morrow.</p>
              <MacDownload />
              <a className={`button ${styles.windows}`} href={windowsRelease.downloadUrl} download>Download Morrow for Windows</a>
              <p className={styles.windowsNote}>Windows 10 or 11, 64-bit. The installer isn&apos;t code-signed yet, so Windows may warn before it runs: choose More info, then Run anyway.</p>
            </div>
          </div>
          <ol className={styles.steps}>
            <li>Open the DMG and drag Morrow to Applications.</li>
            <li>Open Morrow and enter the invitation code you received.</li>
            <li>Sign in and pay ₹2,999/month + 18% GST through Razorpay.</li>
            <li>Morrow continues automatically. Connect your ChatGPT account and follow the Mac walkthrough.</li>
          </ol>
          <p className={styles.note}>Computer control needs the official ChatGPT or Codex desktop app installed and running. In Morrow, use Settings &gt; Permissions to check the connection and allow the requested macOS access.</p>
        </div>
      </section>

      <section className={styles.setup} aria-labelledby="setup-title">
        <div className={styles.wrap}>
          <h2 className={styles.h2} id="setup-title">The whole setup,<br />in 90 seconds.</h2>
          <div className={styles.player}>
            <video controls playsInline preload="none" poster="/media/morrow-install-poster.jpg" width={1920} height={1080}>
              <source src="/media/morrow-install-1080.mp4" type="video/mp4" />
              Your browser can&apos;t play this video. <a href="/media/morrow-install-1080.mp4">Download the setup video</a>.
            </video>
          </div>
          <p className={styles.note}>Morrow app and website screens are real. macOS prompts, System Settings, the Razorpay checkout and Morrow Island are recreated. Narration is an AI voice. Music: &quot;Voxel Revolution&quot; Kevin MacLeod (incompetech.com), CC BY 4.0.</p>
        </div>
      </section>

      <section className={styles.help} aria-labelledby="help-title">
        <div className={styles.wrap}>
          <div className={styles.helpHead}>
            <h2 className={styles.h2} id="help-title">Stuck? Start here.</h2>
            <p>The four problems beta users hit most, each with a short video and the exact steps.</p>
          </div>
          {fixes.map((f) => (
            <article className={styles.fix} id={f.id} key={f.id}>
              <div>
                <h3>{f.title}</h3>
                <ol>{f.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              </div>
              <div className={styles.small}>
                <video controls playsInline preload="none" poster={`/media/${f.video}-poster.jpg`} width={1280} height={720}>
                  <source src={`/media/${f.video}-720.mp4`} type="video/mp4" />
                  Your browser can&apos;t play this video. <a href={`/media/${f.video}-720.mp4`}>Download it</a>.
                </video>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.foot}>
        <div className={styles.wrap}>
          <p>Downloading does not start billing. Full refund within 7 days of your first payment. ChatGPT usage requires your own compatible account and is separate.</p>
          <p>Beta software may have bugs. Use Report a problem in Morrow or contact <a href="mailto:support@aestrum.in">support@aestrum.in</a>. Never send passwords or payment OTPs.</p>
          <nav className={styles.legal} aria-label="Policies"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/refunds">Refunds</a><a href="/subscribe?view=subscription">Already subscribed? Manage your account</a></nav>
        </div>
      </footer>
    </main>
  );
}
