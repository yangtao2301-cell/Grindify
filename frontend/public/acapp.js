(function () {
  class GrindifyAcApp {
    constructor(id) {
      const root = typeof id === 'string' ? document.getElementById(id) : id;
      if (!root) {
        throw new Error('GrindifyAcApp: mount element not found');
      }

      root.classList.add('grindify-acapp-root');

      const frame = document.createElement('iframe');
      frame.className = 'grindify-acapp-frame';
      frame.title = 'Grindify';
      frame.src = 'https://app7592.acapp.acwing.com.cn/';
      root.replaceChildren(frame);
      this.frame = frame;
    }
  }

  window.GrindifyAcApp = GrindifyAcApp;
})();
