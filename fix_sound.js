const fs=require('fs');
['C:\\a\\services\\SoundService.ts','C:\\Users\\Primo\\Desktop\\inventory\\services\\SoundService.ts'].forEach(p=>{
  let c=fs.readFileSync(p,'utf8');
  c=c.replace(/const \{ sound: shortSound \} = await Audio\.Sound\.createAsync\(\s*require\('..\/assets\/audio\/beep_short\.wav'\),\s*\{ shouldPlay: false \}\s*\);/,'// wav require rimosso per bundle - usa Vibration fallback\n            const shortSound = null;');
  c=c.replace(/const \{ sound: longSound \} = await Audio\.Sound\.createAsync\(\s*require\('..\/assets\/audio\/beep_long\.wav'\),\s*\{ shouldPlay: false \}\s*\);/,'const longSound = null;');
  c=c.replace('this.shortBeep = shortSound;','this.shortBeep = shortSound as any;');
  c=c.replace('this.longBeep = longSound;','this.longBeep = longSound as any;');
  fs.writeFileSync(p,c);
  console.log('patched',p);
});
