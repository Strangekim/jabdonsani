// Keep native import() intact when ts-node compiles the TypeScript app to CommonJS.
// jose v6 is ESM; this also works on Node 20 releases without require(esm).
module.exports = () => import('jose');
