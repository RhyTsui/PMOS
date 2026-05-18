const crypto = require('crypto');

module.exports = function yokaLessModuleLoader(source) {
  const css = String(source)
    .replace(/:global\s+/g, '')
    .replace(/:global\s*\{/g, '{');
  const id = `yoka-ui-${crypto.createHash('md5').update(this.resourcePath || css).digest('hex').slice(0, 10)}`;

  return `
const css = ${JSON.stringify(css)};
const styleId = ${JSON.stringify(id)};
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
}
const styles = new Proxy({}, {
  get(_target, key) {
    return typeof key === 'string' ? key : '';
  },
});
export default styles;
`;
};
