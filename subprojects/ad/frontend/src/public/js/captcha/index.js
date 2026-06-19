window.initNECaptcha = window.initNECaptcha || function initNECaptcha(_config, onload) {
  if (typeof onload === 'function') {
    onload({
      verify: function verify() {},
      refresh: function refresh() {},
      destroy: function destroy() {},
    });
  }
};
