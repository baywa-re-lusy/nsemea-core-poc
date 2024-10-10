const fs = require('fs-extra')
const path = require('path')

const source = path.join(process.cwd(),"src/Core")
const destination = '../../src';
console.log(`copying NSEMEA core library from ${source} to ${destination}`)
fs.copy(source,destination,{ preserveTimestamps:true}, err => {
  console.error(err);
});