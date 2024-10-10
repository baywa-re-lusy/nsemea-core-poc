const fsExtra = require('fs-extra');
const fs = require('fs');
const path = require('path');

const source = path.join(process.cwd(),"src/Core");
const destination = '../../src/Core';
console.log(`copying NSEMEA core library from ${source} to ${destination}`);
fsExtra.copy(source,destination,{ preserveTimestamps:true}, err => {
  console.error(err);
});

const gitignorePath = path.resolve(__dirname, '../.gitignore');
const entriesToAdd = ['./src/Core'];

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