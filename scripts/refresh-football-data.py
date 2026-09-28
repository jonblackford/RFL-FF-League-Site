"""Produce small historical usage snapshots from nflverse and DynastyProcess CSVs."""
import argparse, csv, io, json, math, os, tempfile, urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
FIELDS={'targets':'targets','carries':'carries','receptions':'receptions','receivingYards':'receiving_yards','rushingYards':'rushing_yards'}
IDS_URL='https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv'
def download(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'FantasyLeagueAdvisor/1.0'}),timeout=45) as r:
  data=r.read(30_000_001)
  if len(data)>30_000_000:raise ValueError('Source exceeds size limit')
  return data.decode('utf-8-sig')
def number(v):
 try:
  n=float(v)
  return n if math.isfinite(n) else None
 except (TypeError,ValueError):return None
def build_feed(rows,ids,season,through_week):
 mapping=defaultdict(set); reverse=defaultdict(set)
 for r in ids:
  g,s=r.get('gsis_id'),r.get('sleeper_id')
  if g and s and s.isdigit():mapping[g].add(s);reverse[s].add(g)
 valid={g:next(iter(s)) for g,s in mapping.items() if len(s)==1 and len(reverse[next(iter(s))])==1}
 records=defaultdict(dict)
 for r in rows:
  if str(r.get('season'))!=str(season) or r.get('season_type')!='REG':continue
  w=number(r.get('week'));pid=valid.get(r.get('player_id'))
  if not pid or w is None or w!=int(w) or not 1<=w<=through_week:continue
  w=int(w)
  if w in records[pid]:raise ValueError('Duplicate player/week; cannot establish a unique record')
  records[pid][w]={'week':w,**{k:number(r.get(col)) for k,col in FIELDS.items()}}
 players={}
 for pid,weeks in records.items():
  selected=sorted(weeks.values(),key=lambda r:r['week']);recent=selected[-3:]
  players[pid]={'games':len(recent),'throughWeek':recent[-1]['week'],'weeks':selected,**{k:round(sum(r[k] for r in recent)/len(recent),2) if all(r[k] is not None for r in recent) else None for k in FIELDS}}
 if not players:raise ValueError('No mapped completed player records; keeping previous snapshot')
 return {'schemaVersion':1,'season':season,'throughWeek':through_week,'generatedAt':datetime.now(timezone.utc).isoformat(),'source':'nflverse player stats + DynastyProcess player IDs','players':players}
def write_feed(path,feed):
 if feed.get('schemaVersion')!=1 or not feed.get('players'):raise ValueError('Invalid feed')
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
 fd,name=tempfile.mkstemp(dir=path.parent,suffix='.tmp')
 try:
  with os.fdopen(fd,'w') as f:json.dump(feed,f,separators=(',',':'),allow_nan=False)
  os.replace(name,path)
 finally:
  if os.path.exists(name):os.unlink(name)
def main():
 now=datetime.now(timezone.utc);parser=argparse.ArgumentParser();parser.add_argument('--season',type=int,default=now.year if now.month>=3 else now.year-1);parser.add_argument('--through-week',type=int);parser.add_argument('--output-dir',default='public/data');args=parser.parse_args()
 if not 1999<=args.season<=now.year:raise ValueError('Invalid season')
 if args.through_week is None:
  state=json.loads(download('https://api.sleeper.app/v1/state/nfl'))
  args.through_week=max(0,min(18,int(state.get('week',0))-1)) if str(state.get('season'))==str(args.season) else 18 if args.season<int(state.get('season',0)) else 0
 if not 1<=args.through_week<=18:raise ValueError('No completed regular-season weeks')
 url=f'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{args.season}.csv'
 rows=list(csv.DictReader(io.StringIO(download(url))));ids=list(csv.DictReader(io.StringIO(download(IDS_URL))))
 if not rows or not {'player_id','season','week','season_type'}.issubset(rows[0]):raise ValueError('Unsupported source schema')
 feed=build_feed(rows,ids,args.season,args.through_week);feed['sourceUrls']=[url,IDS_URL]
 write_feed(Path(args.output_dir)/f'football-{args.season}.json',feed)
 print(f"Published {len(feed['players'])} mapped players through week {args.through_week}")
if __name__=='__main__':main()
