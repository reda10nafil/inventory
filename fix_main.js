const fs=require('fs');
['C:\\a\\android\\app\\src\\main\\java\\com\\redako35\\syncroflow\\MainApplication.kt','C:\\Users\\Primo\\Desktop\\inventory\\android\\app\\src\\main\\java\\com\\redako35\\syncroflow\\MainApplication.kt'].forEach(p=>{
  let c=fs.readFileSync(p,'utf8');
  c=c.replace('ReactNativeHost.createReactHost(applicationContext, reactNativeHost)','DefaultReactNativeHost.getDefaultReactHost(applicationContext, reactNativeHost)');
  fs.writeFileSync(p,c);
  console.log('fixed',p);
});
