const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

exports.load = (relativePath, mocks = {}) => {
  const filename = path.resolve(__dirname, '..', relativePath);
  const module = new Module(filename);
  module.filename = filename;
  module.paths = Module._nodeModulePaths(path.dirname(filename));
  module.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : Module.prototype.require.call(module, name);
  require.extensions['.ts'](module, filename);
  return module.exports;
};
