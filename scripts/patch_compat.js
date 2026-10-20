const fs=require('fs');
const path=require('path');
function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) walk(p);
    else if(p.endsWith('.tsx')){
      let c=fs.readFileSync(p,'utf8');
      let orig=c;
      if(p.includes('tabs')||p.includes('product')||p.includes('settings')||p.includes('automations')){
        c=c.replace(/from '\.\.\/navigation\/compat'/g, "from '../../navigation/compat'");
        c=c.replace(/from "\.\.\/navigation\/compat"/g, 'from "../../navigation/compat"');
        // also handle double dots already correct for direct? but for tabs we need triple
        // For files that were incorrectly patched to '../../' but should be '../../' already, it's fine
      }
      if(c!==orig){fs.writeFileSync(p,c);console.log('patched',p)}
    }
  }
}
walk('src/screens');
