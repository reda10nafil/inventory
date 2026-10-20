const fs=require('fs'),path=require('path');
const replacements=[
  ["from 'expo-image'", "from '../../lib/ExpoImage'"],
  ['from "expo-image"', 'from "../../lib/ExpoImage"'],
  ["from 'expo-print'", "from '../../lib/print'"],
  ['from "expo-print"', 'from "../../lib/print"'],
  ["from 'expo-file-system/legacy'", "from '../../lib/fileSystem'"],
  ['from "expo-file-system/legacy"', 'from "../../lib/fileSystem"'],
  ["from 'expo-file-system'", "from '../../lib/fileSystem'"],
  ["from 'expo-image-manipulator'", "from '../../lib/imageManipulator'"],
  ['from "expo-image-manipulator"', 'from "../../lib/imageManipulator"'],
  ["from 'expo-sharing'", "from '../../lib/sharing'"],
  ['from "expo-sharing"', 'from "../../lib/sharing"'],
  ["from 'expo-clipboard'", "from '../../lib/clipboard'"],
  ['from "expo-clipboard"', 'from "../../lib/clipboard"'],
  ["from 'expo-image-picker'", "from '../../lib/imagePicker'"],
  ['from "expo-image-picker"', 'from "../../lib/imagePicker"'],
  ["from 'expo-document-picker'", "from '../../lib/documentPicker'"],
  ['from "expo-document-picker"', 'from "../../lib/documentPicker"'],
  ["from 'expo-linear-gradient'", "from '../../lib/LinearGradient'"],
];
function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) walk(p);
    else if(p.endsWith('.tsx')||p.endsWith('.ts')){
      let c=fs.readFileSync(p,'utf8');
      let orig=c;
      for(const [a,b] of replacements){
        c=c.split(a).join(b);
      }
      // Fix depth for files at different levels
      // Direct src/screens/*.tsx should be '../lib' not '../../lib'
      if(p.includes('src\\screens\\') && !p.includes('tabs') && !p.includes('settings') && !p.includes('product') && !p.includes('automations')){
        c=c.replace(/from '\.\.\/\.\.\/lib\//g,"from '../lib/");
        c=c.replace(/from "\.\.\/\.\.\/lib\//g,'from "../lib/');
      }
      if(c!==orig){fs.writeFileSync(p,c);console.log('patched',p)}
    }
  }
}
walk('src/screens');
// Also patch components
let comp='components/BarcodeScanner.tsx';
if(fs.existsSync(comp)){
  let c=fs.readFileSync(comp,'utf8');
  c=c.replace(/from 'expo-camera'/g,"from '../src/lib/camera'");
  fs.writeFileSync(comp,c); console.log('patched',comp);
}
let bc='utils/barcodeDecoder.ts';
if(fs.existsSync(bc)){
  let c=fs.readFileSync(bc,'utf8');
  c=c.replace(/from 'expo-image-manipulator'/g,"from '../src/lib/imageManipulator'");
  c=c.replace(/from 'expo-file-system\/legacy'/g,"from '../src/lib/fileSystem'");
  c=c.replace(/from 'expo-file-system'/g,"from '../src/lib/fileSystem'");
  fs.writeFileSync(bc,c); console.log('patched',bc);
}
