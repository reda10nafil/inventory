const fs=require('fs'), path=require('path');
function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) walk(p);
    else if(p.endsWith('.tsx')||p.endsWith('.ts')){
      let c=fs.readFileSync(p,'utf8');
      let orig=c;
      // Determine depth: number of folders from inventory root to file's directory
      // e.g., src/screens/ScannerScreen.tsx -> dir src/screens -> depth 2
      // src/screens/tabs/HomeScreen.tsx -> dir src/screens/tabs -> depth 3
      const rel = path.relative(process.cwd(), p); // e.g., src\screens\tabs\HomeScreen.tsx
      const depth = path.dirname(rel).split(path.sep).length; // src/screens/tabs = 3
      let newPrefix;
      if(depth===2) newPrefix='../../';
      else if(depth===3) newPrefix='../../../';
      else newPrefix='../'.repeat(depth);
      // Replace old imports that point to root: ../constants, ../../constants etc
      // Old app files had either ../ or ../../ to reach root.
      // We need to normalize: any import that starts with ../ or ../../ and points to known root folders should be rewritten to newPrefix + folder
      const rootFolders=['constants','contexts','components','services','utils','types','lib','hooks','assets'];
      for(const folder of rootFolders){
        // Match from '../folder' or '../../folder' or '../../../folder' (any number)
        const regex = new RegExp(`from\\s+['"]\\.\\./(?:\\.\\./)*${folder}/`, 'g');
        c=c.replace(regex, `from '${newPrefix}${folder}/`);
        const regex2 = new RegExp(`from\\s+['"]\\.\\./(?:\\.\\./)*${folder}['"]`, 'g');
        c=c.replace(regex2, `from '${newPrefix}${folder}'`);
        // also handle require
      }
      // Fix compat import already done, but ensure depth correct for compat
      // compat is at src/navigation/compat.ts, relative from file
      // For depth 2 (src/screens/*): ../navigation/compat
      // For depth 3: ../../navigation/compat
      if(c.includes('navigation/compat')){
        const compatPrefix = depth===2 ? '../navigation/compat' : '../../navigation/compat';
        c=c.replace(/from\s+['"]\.\.\/(?:\.\.\/)*navigation\/compat['"]/g, `from '${compatPrefix}'`);
      }
      if(c!==orig){fs.writeFileSync(p,c); console.log('fixed',p,'depth',depth,'->',newPrefix)}
    }
  }
}
walk('src/screens');
walk('src/navigation');
