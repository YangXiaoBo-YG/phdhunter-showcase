import json,re,subprocess,sys
from pathlib import Path
rules={
 'api_key':r'\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|sb_secret_[A-Za-z0-9_-]{10,})\b',
 'jwt':r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
 'private_key':r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
 'credential_url':r'https?://[^\s/@:]+:[^\s/@]+@',
}
files=subprocess.check_output(['git','ls-files','-z']).decode().split('\0');issues=[]
for name in filter(None,files):
 p=Path(name)
 if (p.name.startswith('.env') and p.name!='.env.local.example') or p.suffix in ('.log','.pem','.key','.sqlite','.db','.p12','.pfx'):
  issues.append({'file':name,'rule':'private_file'});continue
 try:text=p.read_text(encoding='utf-8')
 except (UnicodeError,OSError):continue
 for label,pattern in rules.items():
  if re.search(pattern,text):issues.append({'file':name,'rule':label})
if issues:print(json.dumps(issues));sys.exit(1)
print('Public-source credential scan passed; no credential values printed.')
