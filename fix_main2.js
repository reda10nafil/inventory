const fs=require('fs');
['C:\\a\\android\\app\\src\\main\\java\\com\\redako35\\syncroflow\\MainApplication.kt','C:\\Users\\Primo\\Desktop\\inventory\\android\\app\\src\\main\\java\\com\\redako35\\syncroflow\\MainApplication.kt'].forEach(p=>{
  let c=fs.readFileSync(p,'utf8');
  c=c.replace(/import com\.facebook\.react\.defaults\.DefaultReactNativeHost/,'import com.facebook.react.defaults.DefaultReactHost\nimport com.facebook.react.defaults.DefaultReactNativeHost');
  c=c.replace('DefaultReactNativeHost.getDefaultReactHost(applicationContext, reactNativeHost)','DefaultReactHost.getDefaultReactHost(applicationContext, reactNativeHost)');
  fs.writeFileSync(p,c);
  console.log('fixed',p);
});
