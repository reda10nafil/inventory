require('fs').writeFileSync('Y:/node_modules/.bin/react-native.cmd', '@node \"%~dp0\\..\\@react-native-community\\cli\\build\\bin.js\" %*');
console.log(require('fs').readFileSync('Y:/node_modules/.bin/react-native.cmd','utf8'));
