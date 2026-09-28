import importlib.util, pathlib, unittest, tempfile
spec=importlib.util.spec_from_file_location('refresh',pathlib.Path(__file__).parents[1]/'scripts/refresh-football-data.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class FeedTest(unittest.TestCase):
 def test_mapping_zeros_and_incomplete_week(self):
  ids=[{'gsis_id':'g','sleeper_id':'1'}]
  rows=[{'player_id':'g','season':'2026','season_type':'REG','week':str(w),'targets':str(n),'carries':'0'} for w,n in [(1,0),(2,6),(3,99)]]
  result=m.build_feed(rows,ids,2026,2)
  self.assertEqual(result['players']['1']['targets'],3)
  self.assertEqual(result['players']['1']['carries'],0)
  self.assertIsNone(result['players']['1']['receptions'])
  self.assertEqual(result['players']['1']['throughWeek'],2)
 def test_ambiguous_ids_never_join(self):
  with self.assertRaises(ValueError):m.build_feed([{'player_id':'g','season':'2026','season_type':'REG','week':'1'}],[{'gsis_id':'g','sleeper_id':'1'},{'gsis_id':'g','sleeper_id':'2'}],2026,2)
 def test_invalid_download_preserves_prior_file(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'feed.json';p.write_text('previous')
   with self.assertRaises(ValueError):m.write_feed(p,{'players':{}})
   self.assertEqual(p.read_text(),'previous')
if __name__=='__main__':unittest.main()
