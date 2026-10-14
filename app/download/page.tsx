import type { Metadata } from 'next';
import { DownloadTrialProvider, LegacySetupVideo } from '@/components/DownloadGuide';
import { PlatformDownload } from '@/components/PlatformDownload';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import styles from './download.module.css';

export const metadata: Metadata = { title: 'Download Morrow', description: 'Install Morrow on your Mac or Windows PC, then create your account and review your plan. Install steps and fixes for common problems.' };

// Videos live in published-home/media and are copied to the site root at build time.
const fixes = [
  { id: 'help-permissions', title: 'Morrow can\'t hear you, or can\'t click and type', video: 'fix-permissions', steps: ['Open System Settings, then Privacy & Security.', 'Under Microphone, turn on Morrow.', 'Under Accessibility, turn on Morrow, and Morrow Island for the shortcut.', 'Under Screen & System Audio Recording, turn on Morrow Island. If macOS asks, choose Quit & Reopen.', 'For computer control, keep the official ChatGPT or Codex desktop app installed and running.', 'In Morrow, open Settings > Permissions and choose Check connection.', 'If it says Service connection permission needed, choose Allow service connection and select the IPC folder shown by macOS. Then check again.'] },
  { id: 'help-keychain', title: 'Morrow keeps asking for your Keychain password', video: 'fix-keychain', steps: ['Type your Mac login password and click Always Allow.', 'If it keeps coming back, don\'t reset your Keychain. Quit any extra copies of Morrow and open the one in Applications.', 'If you see macOS status -34018, this build is missing a signing permission. Contact support for a replacement build.', 'Never send your password to support.'] },
  { id: 'help-paid', title: 'You paid, but Morrow on your Mac is still locked', video: 'fix-paid-locked', steps: ['Don\'t pay again. On the payment page, press Check payment status.', 'If the sign-in expired, press Continue to subscription and sign in with the same account.', 'Already paid? Choose Already paid? Sign in.', 'If it says your account is connected to another computer, contact Morrow support to reset the device.'] },
  { id: 'help-chatgpt', title: 'ChatGPT sign-in or cooldown', video: 'fix-chatgpt', steps: ['ChatGPT sign-in timed out? Press Try again and finish signing in in your browser.', 'Seeing ChatGPT cooldown? ChatGPT has paused requests for a few minutes. Your Morrow subscription is fine.', 'When the countdown ends, send your request again. Morrow doesn\'t resend it for you.'] },
];

export default function DownloadPage() {
  return (
    <DownloadTrialProvider><div className={styles.page}><SiteHeader activePage="download" /><main id="main-content">
      <section className={styles.top}>
        <div className={styles.wrap}>
          <PlatformDownload />
          <p className={styles.note}>On a Mac, computer control needs the official ChatGPT or Codex desktop app installed and running. In Morrow, use Settings &gt; Permissions to check the connection and allow the requested macOS access.</p>
        </div>
      </section>


      <section className={styles.help} aria-labelledby="help-title">
        <div className={styles.wrap}>
          <div className={styles.helpHead}>
            <h2 className={styles.h2} id="help-title">A little help, if you need it.</h2>
            <p>Choose the problem you are running into. The fix and video are inside.</p>
          </div>
          {fixes.map((f) => (
            <details className={styles.fix} id={f.id} key={f.id}><summary>{f.title}<span aria-hidden="true">+</span></summary><div className={styles.fixContent}>
              <div>
                <ol>{f.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              </div>
              <div className={styles.small}>
                <video controls playsInline preload="none" poster={`/media/${f.video}-poster.jpg`} width={1280} height={720}>
                  <source src={`/media/${f.video}-720.mp4`} type="video/mp4" />
                  Your browser can&apos;t play this video. <a href={`/media/${f.video}-720.mp4`}>Download it</a>.
                </video>
              </div>
            </div></details>
          ))}
          <LegacySetupVideo />
        </div>
      </section>

    </main><div className={styles.foot}><SiteFooter /></div></div></DownloadTrialProvider>
  );
}
