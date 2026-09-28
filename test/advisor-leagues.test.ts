import { afterEach, expect, it, vi } from 'vitest';
import { loadLeagueSnapshot } from '../src/features/rfl/data';
import { buildEvidence } from '../src/features/rfl/presentation';
afterEach(()=>vi.unstubAllGlobals());
it('loads selected league scoring and team instead of the RFL defaults', async()=>{
 vi.stubGlobal('fetch',vi.fn(async(input)=>{
  const url=String(input); let body:any;
  const id=url.includes('/222')?'222':'111';
  if(url.endsWith('/users')) body=[{user_id:'u',display_name:'Manager',metadata:{team_name:'Selected team'}}];
  else if(url.endsWith('/rosters')) body=[{roster_id:2,owner_id:'u',players:['p'],starters:['p'],reserve:[]}];
  else if(url.includes('/v1/league/')) body={league_id:id,name:'League '+id,season:'2026',scoring_settings:{rec:id==='222'?1:0.5},roster_positions:['WR'],settings:{last_scored_leg:0},status:'in_season'};
  else if(url.includes('/state/')) body={week:3,season:'2026'};
  else if(url.includes('/players/')) body={p:{full_name:'Player',position:'WR',team:'DET'}};
  else body=[{player_id:'p',season:'2026',week:3,opponent:'GB',stats:{rec:4,gp:1}}];
  return Response.json(body);
 }));
 const a=await loadLeagueSnapshot({provider:'sleeper',leagueId:'111',rosterId:2});
 const b=await loadLeagueSnapshot({provider:'sleeper',leagueId:'222',rosterId:2});
 expect(a.players[0].projection).toBe(2); expect(b.players[0].projection).toBe(4);
 expect(buildEvidence(b,{total:0,filled:0,assignments:[]},[]).team).toBe('Selected team');
 await expect(loadLeagueSnapshot({provider:'sleeper',leagueId:'111',rosterId:9})).rejects.toThrow(/roster/i);
});
it('rejects invalid league IDs before making requests',async()=>{
 await expect(loadLeagueSnapshot({provider:'sleeper',leagueId:'../bad',rosterId:1})).rejects.toThrow(/league/i);
});
