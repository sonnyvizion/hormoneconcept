(() => {
  const SELECTOR = [
    '.site-page-kicker',
    '.main-search__panel-kicker',
    '.main-search__block-kicker',
    '.main-search__empty-kicker',
    '.collections-trio__subtitle-bracket',
    '.header-search-overlay__kicker'
  ].join(', ');
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const LOOP_DELAY = 3500;
  const REVEAL_DURATION = 950;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const reveal = (element) => {
    const finalText = element.dataset.scrambleFinal || element.textContent.trim();
    if (!finalText) return;
    element.dataset.scrambleFinal = finalText;
    const bracketMatch = finalText.match(/^(\[\s*)(.*?)(\s*\])$/);
    const animatedText = bracketMatch ? bracketMatch[2] : finalText;

    if (!element.dataset.scrambleWidth) {
      if (window.getComputedStyle(element).display === 'inline') {
        element.style.display = 'inline-block';
      }
      element.style.width = 'auto';
      element.textContent = finalText;
      element.dataset.scrambleWidth = `${Math.ceil(element.getBoundingClientRect().width)}px`;
      element.style.width = element.dataset.scrambleWidth;
    }

    if (reduceMotion) {
      element.textContent = finalText;
      return;
    }

    element.textContent = '';
    let animatedElement = element;

    if (bracketMatch) {
      const openingBracket = document.createElement('span');
      const closingBracket = document.createElement('span');
      animatedElement = document.createElement('span');

      openingBracket.textContent = bracketMatch[1].replace(/\s/g, '\u00a0');
      closingBracket.textContent = bracketMatch[3].replace(/\s/g, '\u00a0');
      element.append(openingBracket, animatedElement, closingBracket);

      element.style.position = 'relative';
      openingBracket.style.position = 'absolute';
      openingBracket.style.left = '0';
      animatedElement.style.position = 'absolute';
      animatedElement.style.left = `${openingBracket.getBoundingClientRect().width}px`;
      closingBracket.style.position = 'absolute';
      closingBracket.style.right = '0';
    }

    const stepDuration = REVEAL_DURATION / animatedText.length;
    const startedAt = performance.now();
    const frameTimer = window.setInterval(() => {
      const activeIndex = Math.min(
        Math.floor((performance.now() - startedAt) / stepDuration),
        animatedText.length
      );
      const prefix = animatedText.slice(0, activeIndex);
      const activeChar = animatedText.charAt(activeIndex);
      const scramblingChar = activeChar && !/\s/.test(activeChar)
        ? SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        : activeChar;

      animatedElement.textContent = `${prefix}${scramblingChar}`;

      if (activeIndex >= animatedText.length) {
        window.clearInterval(frameTimer);
        animatedElement.textContent = animatedText;
      }
    }, 42);
  };

  const init = (root = document) => {
    const elements = root.matches?.(SELECTOR)
      ? [root]
      : [...root.querySelectorAll?.(SELECTOR) || []];

    elements.forEach((element) => {
      if (element.dataset.scrambleLoopInitialized === 'true') return;
      if (element.getClientRects().length === 0 || element.getBoundingClientRect().width < 1) return;
      element.dataset.scrambleLoopInitialized = 'true';
      reveal(element);
      if (!reduceMotion) window.setInterval(() => reveal(element), LOOP_DELAY);
    });
  };

  init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        init(mutation.target);
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) init(node);
      });
    });
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'class', 'style']
  });
})();
