"""Prepare a new manifest from a directory of authorised master files (one ID.mp3 or ID.m4a per track)."""
import argparse,hashlib,json,pathlib,subprocess,datetime,urllib.parse
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('directory',type=pathlib.Path);p.add_argument('https_base');p.add_argument('epoch',help='UTC ISO timestamp ending in Z');p.add_argument('--rights-confirmed',action='store_true',required=True)
a=p.parse_args()
if urllib.parse.urlparse(a.https_base).scheme!='https' or not a.epoch.endswith('Z'):p.error('HTTPS media base and UTC epoch required')
datetime.datetime.fromisoformat(a.epoch[:-1]+'+00:00')
path=pathlib.Path(__file__).with_name('station.json');m=json.loads(path.read_text());seen={}
for t in m['tracks']:
 files=[f for f in a.directory.glob(t['id']+'.*') if f.suffix.lower() in ('.mp3','.m4a')]
 if len(files)!=1:raise SystemExit('Expected one authorised file: '+t['id'])
 f=files[0];duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',f]))
 if not duration>0:raise ValueError(f)
 digest=subprocess.check_output(['ffmpeg','-v','error','-xerror','-i',f,'-map','0:a:0','-f','hash','-hash','sha256','-']).strip()
 if digest in seen: print('Review identical decoded audio:',seen[digest],t['id'])
 seen[digest]=t['id'];t.update(seconds=duration,audio=a.https_base.rstrip('/')+'/'+f.name)
m.update(version=m['version']+1,epoch=a.epoch)
out=path.with_suffix('.next.json');out.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');print(out)
