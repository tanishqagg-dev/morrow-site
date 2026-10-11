import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
it('spaces recovery paragraphs and styles the existing-renewal action',()=>{
 const component=readFileSync(new URL('../components/SubscriptionRecoveryGuidance.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../components/SubscriptionFlow.module.css',import.meta.url),'utf8');
 const portal=readFileSync(new URL('../components/BillingPortal.tsx',import.meta.url),'utf8');
 expect(component).toContain('styles.recoveryGuidance');
 expect(css).toMatch(/\.recoveryGuidance\s*\{[^}]*gap:\s*12px/);
 const action=portal.slice(portal.indexOf('currentSubscription?.razorpay_subscription_id && !currentSubscription.cancel_at_period_end && !['),portal.indexOf('{!subscriptionNeedsRecovery &&'));
 expect(action).toContain('className={styles.quietButton}');
});
