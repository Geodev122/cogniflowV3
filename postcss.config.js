// ESM wrapper for PostCSS config. Re-export the CommonJS config so tools
// that import as ESM (because package.json sets "type": "module") can
// still load the configuration.
export { default } from './postcss.config.cjs';
