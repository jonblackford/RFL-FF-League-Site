import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAdvisorStore } from '../src/store/advisor';
beforeEach(() => setActivePinia(createPinia()));
it('rejects a late snapshot after selecting another league', async () => {
 const s = useAdvisorStore();
 let finish!: (v: any) => void;
 const first = s.select({provider:'sleeper',leagueId:'111',rosterId:1}, () => new Promise(r => finish=r));
 await s.select({provider:'sleeper',leagueId:'222',rosterId:2}, async () => ({league:{league_id:'222'},week:3}) as any);
 finish({league:{league_id:'111'},week:3}); await first;
 expect(s.snapshot?.league.league_id).toBe('222'); expect(s.loading).toBe(false);
});
it('does not relabel an old snapshot after a different league fails', async () => {
 const s=useAdvisorStore();
 await s.select({provider:'sleeper',leagueId:'111',rosterId:1}, async()=>({league:{league_id:'111'},week:3}) as any);
 await s.select({provider:'sleeper',leagueId:'222',rosterId:1}, async()=>{throw Error('Unavailable')});
 expect(s.snapshot).toBeNull(); expect(s.error).toContain('Unavailable');
});
