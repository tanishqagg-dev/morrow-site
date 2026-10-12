import {describe,expect,it} from 'vitest';
import {deviceTrustRedirectHash} from '../lib/clerk-device-trust';
describe('Clerk Device Trust route recovery',()=>{
 it('routes a successful first factor that still requires trust to Clerk verification',()=>{
  expect(deviceTrustRedirectHash('needs_client_trust','#/factor-one?redirect_url=%2Faccount')).toBe('#/client-trust?redirect_url=%2Faccount');
 });
 it('does not loop when Clerk is already verifying Device Trust',()=>{
  expect(deviceTrustRedirectHash('needs_client_trust','#/client-trust')).toBeNull();
 });
 it.each(['complete','needs_first_factor','needs_second_factor',null])('does not intervene for %s',status=>{
  expect(deviceTrustRedirectHash(status,'#/factor-one')).toBeNull();
 });
 it('does not override another Clerk screen',()=>{
  expect(deviceTrustRedirectHash('needs_client_trust','#/reset-password')).toBeNull();
  expect(deviceTrustRedirectHash('needs_client_trust','#/factor-two')).toBeNull();
 });
});
