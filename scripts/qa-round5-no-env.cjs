const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const {fileURLToPath} = require('node:url');
const originalLoad = Module._load;
Module._load = function(name, ...args) {
 const value = originalLoad.call(this, name, ...args);
 if (name === '@next/env' || /\/\@next\/env\/dist\/index\.js$/.test(name)) return {...value, loadEnvConfig: () => ({combinedEnv: process.env, parsedEnv: {}, loadedEnvFiles: []})};
 return value;
};
function check(value) {
 const filename = path.basename(value instanceof URL ? fileURLToPath(value) : String(value));
 if ((filename.startsWith('.env') && filename !== '.env.example') || ['production.env','backend.env'].includes(filename)) { const error = new Error('Environment file loading disabled for round 5'); error.code = 'ENOENT'; throw error; }
}
for (const name of ['readFileSync','statSync','readFile','stat']) { const original = fs[name]; fs[name] = function(value, ...args) { check(value); return original.call(this, value, ...args); }; }
const originalRead = fs.promises.readFile;
fs.promises.readFile = async function(value, ...args) { check(value); return originalRead.call(this, value, ...args); };
require('node:module').syncBuiltinESMExports();
