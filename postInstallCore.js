const fsExtra = require('fs-extra');
const fs = require('fs');
const path = require('path');

let source = path.join(process.cwd(),"src/Typescripts/Core");
let destination = '../../src/Typescripts/modules/Core';
console.log(`copying NSEMEA core library from ${source} to ${destination}`);
fsExtra.copy(source,destination,{ preserveTimestamps:true}, err => {
  console.error(err);
});

source = path.join(process.cwd(),"tests/__mock__/N");
destination = '../../tests/__mock__/N';
console.log(`copying mocked Netsuite record from ${source} to ${destination}`);
fsExtra.copy(source,destination,{ preserveTimestamps:true}, err => {
  console.error(err);
});

console.log(`path : ${__dirname}`);
const gitignorePath = path.resolve(__dirname, '../../.gitignore');
const entriesToAdd = ['src/Typescripts/modules/**', 'tests/__mock__/N'];

console.log(`gitignorePath ${gitignorePath}`);

fs.readFile(gitignorePath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading .gitignore file: ${err}`);
    return;
  }

  const existingEntries = data.split('\n');
  const newEntries = entriesToAdd.filter(entry => !existingEntries.includes(entry));

  if (newEntries.length > 0) {
    const updatedContent = `${data.trim()}\n${newEntries.join('\n')}\n`;
    fs.writeFile(gitignorePath, updatedContent, 'utf8', err => {
      if (err) {
        console.error(`Error writing to .gitignore file: ${err}`);
      } else {
        console.log('Successfully updated .gitignore file.');
      }
    });
  } else {
    console.log('.gitignore file already contains the specified entries.');
  }
});
