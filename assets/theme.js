(() => {
  document.documentElement.classList.add('js');
  const HERO_AUTOPLAY_DELAY_MS = 7000;
  const NAV_CONTROL_ENTER_MS = 360;
  const NAV_CONTROL_LEAVE_MS = 300;
  const NAV_CONTROL_PULSE_MS = 320;
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const CTA_SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_';
  const COPY_OUT_DURATION_MS = 400;
  const LENIS_DESKTOP_QUERY = '(hover: hover) and (pointer: fine)';
  const COPY_ELEMENT_SELECTOR = '.video-hero__copy-grid h2, .video-hero__copy-grid h3, .video-hero__copy-grid .video-hero__subtitle-bracket, .video-hero__copy-grid .video-hero__availability-label';
  const CTA_POINTER_SCRAMBLE_SELECTOR = '.header-menu a, .header-menu__list-row, .header-menu__view-all, .header-menu__panel a, .header-link, .button, .video-hero__availability, .site-footer-v2__submit';
  const INTERACTIVE_SCRAMBLE_SELECTOR = '.header-menu a, .header-menu__list-row, .header-menu__view-all, .header-menu__panel a, .header-link, .button, .video-hero__availability, .collection-slider__fixed-quick-add-button, .header-search-predictive__pill, .site-footer-v2__links-list a, .site-footer-v2__links-list span, .site-footer-v2__submit';
  const interactiveScrambleState = new WeakMap();
  const ctaHoverScrambleState = new WeakMap();

  const getInteractiveTextTarget = (element) => {
    if (!element) return null;
    return element.querySelector?.('.video-hero__availability-label, .site-footer-v2__submit-label, .collection-slider__fixed-quick-add-label, .header-menu__list-label') || element;
  };

  const getInteractiveLockTarget = (element) => {
    if (!element) return null;
    return element.closest?.('.video-hero__availability, .site-footer-v2__submit, .collection-slider__fixed-quick-add-button, .header-menu__list-row') || element;
  };

  const isInteractiveScrambleDisabled = (element) => {
    if (!element) return false;
    if (element.dataset?.disableScramble === 'true') return true;
    return Boolean(element.closest?.('[data-disable-scramble="true"]'));
  };

  const preserveScrambleChar = (char) => /[\s\[\](),.:;'’/\-]/.test(char);

  const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();
  const formatCartMoney = (value) => {
    const currency = window.Shopify?.currency?.active || 'EUR';
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency
      }).format((Number(value) || 0) / 100);
    } catch {
      return `${((Number(value) || 0) / 100).toFixed(2)} ${currency}`;
    }
  };

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const updateHeaderCartCount = (count) => {
    const normalizedCount = Math.max(0, Number(count) || 0);
    document.querySelectorAll('[data-header-cart-link]').forEach((linkEl) => {
      linkEl.classList.toggle('is-has-count', normalizedCount > 0);
    });
    document.querySelectorAll('[data-header-cart-count]').forEach((countEl) => {
      countEl.textContent = `${normalizedCount}`;
      countEl.hidden = normalizedCount <= 0;
    });
  };

  const refreshHeaderCartCount = async () => {
    try {
      const response = await fetch('/cart.js', {
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      if (!response.ok) return;
      const cart = await response.json();
      updateHeaderCartCount(cart?.item_count || 0);
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
    } catch {
      return;
    }
  };

  let quickAddUi = null;
  let quickAddToastTimer = 0;

  const ensureQuickAddUi = () => {
    if (quickAddUi) return quickAddUi;

    const rootEl = document.createElement('div');
    rootEl.className = 'quick-add-ui';
    rootEl.innerHTML = `
      <div class="quick-add-sheet" data-quick-add-sheet hidden>
        <button class="quick-add-sheet__backdrop" type="button" aria-label="Fermer" data-quick-add-close></button>
        <div class="quick-add-sheet__dialog" role="dialog" aria-modal="true" aria-labelledby="QuickAddTitle">
          <button class="quick-add-sheet__close" type="button" aria-label="Fermer" data-quick-add-close>
            <span></span>
            <span></span>
          </button>
          <div class="quick-add-sheet__head">
            <div class="quick-add-sheet__media" data-quick-add-image-wrap hidden>
              <img class="quick-add-sheet__image" alt="" data-quick-add-image>
            </div>
            <div class="quick-add-sheet__copy">
              <p class="quick-add-sheet__kicker">[ CHOISIR UNE TAILLE ]</p>
              <h3 class="quick-add-sheet__title" id="QuickAddTitle" data-quick-add-title></h3>
            </div>
          </div>
          <div class="quick-add-sheet__sizes" data-quick-add-sizes></div>
        </div>
      </div>
      <div class="quick-add-toast" data-quick-add-toast hidden>
        <div class="quick-add-toast__inner">
          <p class="quick-add-toast__title" data-quick-add-toast-title></p>
          <p class="quick-add-toast__meta" data-quick-add-toast-meta></p>
        </div>
      </div>
    `;

    document.body.appendChild(rootEl);

    quickAddUi = {
      rootEl,
      sheetEl: rootEl.querySelector('[data-quick-add-sheet]'),
      titleEl: rootEl.querySelector('[data-quick-add-title]'),
      imageWrapEl: rootEl.querySelector('[data-quick-add-image-wrap]'),
      imageEl: rootEl.querySelector('[data-quick-add-image]'),
      sizesEl: rootEl.querySelector('[data-quick-add-sizes]'),
      toastEl: rootEl.querySelector('[data-quick-add-toast]'),
      toastTitleEl: rootEl.querySelector('[data-quick-add-toast-title]'),
      toastMetaEl: rootEl.querySelector('[data-quick-add-toast-meta]'),
      activeFormEl: null
    };

    rootEl.querySelectorAll('[data-quick-add-close]').forEach((closeEl) => {
      closeEl.addEventListener('click', () => {
        if (!quickAddUi) return;
        quickAddUi.sheetEl.hidden = true;
        quickAddUi.activeFormEl = null;
        document.body.classList.remove('quick-add-open');
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !quickAddUi) return;
      if (!quickAddUi.sheetEl.hidden) {
        quickAddUi.sheetEl.hidden = true;
        quickAddUi.activeFormEl = null;
        document.body.classList.remove('quick-add-open');
      }
    });

    return quickAddUi;
  };

  const parseQuickAddVariants = (formEl) => {
    if (!formEl) return [];
    const jsonEl = formEl.querySelector('[data-quick-add-variants]');
    if (!jsonEl) return [];

    try {
      const parsed = JSON.parse(jsonEl.textContent || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getQuickAddPayload = (formEl) => {
    if (!formEl) return null;

    const title = (formEl.dataset.quickAddTitle || '').trim();
    const image = (formEl.dataset.quickAddImage || '').trim();
    const variants = parseQuickAddVariants(formEl).filter((variant) => Number(variant?.id) > 0);
    const defaultVariantId = Number(formEl.querySelector('input[name="id"]')?.value || 0);
    const defaultVariant = variants.find((variant) => Number(variant.id) === defaultVariantId) || variants[0] || null;

    return {
      title,
      image,
      variants,
      defaultVariant
    };
  };

  const flashQuickAddState = (formEl, state) => {
    if (!formEl) return;
    formEl.classList.remove('is-added', 'is-error');
    formEl.classList.add(state);
    window.setTimeout(() => {
      formEl.classList.remove(state);
    }, state === 'is-added' ? 900 : 1200);
  };

  const setQuickAddBusy = (formEl, isBusy) => {
    if (!formEl) return;
    const buttonEl = formEl.querySelector('button[type="submit"]');
    if (!buttonEl) return;

    if (isBusy) {
      buttonEl.dataset.quickAddDisabledBefore = buttonEl.disabled ? 'true' : 'false';
      buttonEl.disabled = true;
      formEl.classList.add('is-loading');
      return;
    }

    formEl.classList.remove('is-loading');
    if (buttonEl.dataset.quickAddDisabledBefore !== 'true') {
      buttonEl.disabled = false;
    }
    delete buttonEl.dataset.quickAddDisabledBefore;
  };

  const showQuickAddToast = (title, variantLabel) => {
    const ui = ensureQuickAddUi();
    if (!ui?.toastEl || !ui.toastTitleEl || !ui.toastMetaEl) return;

    if (quickAddToastTimer) {
      window.clearTimeout(quickAddToastTimer);
      quickAddToastTimer = 0;
    }

    ui.toastTitleEl.textContent = (title || 'Produit').toUpperCase();
    ui.toastMetaEl.textContent = variantLabel
      ? `${variantLabel.toUpperCase()} · AJOUTE AU PANIER`
      : 'AJOUTE AU PANIER';

    ui.toastEl.hidden = false;
    ui.toastEl.classList.remove('is-visible');
    void ui.toastEl.offsetWidth;
    ui.toastEl.classList.add('is-visible');

    quickAddToastTimer = window.setTimeout(() => {
      ui.toastEl.classList.remove('is-visible');
      window.setTimeout(() => {
        ui.toastEl.hidden = true;
      }, 260);
      quickAddToastTimer = 0;
    }, 2200);
  };

  const addQuickAddVariantToCart = async (formEl, variant) => {
    if (!formEl || !variant?.id) return false;

    setQuickAddBusy(formEl, true);

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          id: Number(variant.id),
          quantity: 1
        })
      });

      if (!response.ok) {
        throw new Error('Quick add request failed');
      }

      refreshHeaderCartCount();
      flashQuickAddState(formEl, 'is-added');
      showQuickAddToast(formEl.dataset.quickAddTitle || 'Produit', variant.title || '');
      return true;
    } catch {
      flashQuickAddState(formEl, 'is-error');
      return false;
    } finally {
      setQuickAddBusy(formEl, false);
    }
  };

  const closeQuickAddSheet = () => {
    const ui = ensureQuickAddUi();
    ui.sheetEl.hidden = true;
    ui.activeFormEl = null;
    document.body.classList.remove('quick-add-open');
  };

  const openQuickAddSheet = (formEl) => {
    const payload = getQuickAddPayload(formEl);
    if (!payload || !payload.variants.length) return;

    const ui = ensureQuickAddUi();
    ui.activeFormEl = formEl;
    ui.titleEl.textContent = (payload.title || 'Produit').toUpperCase();

    if (payload.image) {
      ui.imageWrapEl.hidden = false;
      ui.imageEl.src = payload.image;
      ui.imageEl.alt = payload.title || 'Produit';
    } else {
      ui.imageWrapEl.hidden = true;
      ui.imageEl.removeAttribute('src');
      ui.imageEl.alt = '';
    }

    ui.sizesEl.innerHTML = payload.variants.map((variant) => `
      <button
        class="quick-add-sheet__size${variant.available ? '' : ' is-sold-out'}"
        type="button"
        data-quick-add-size="${variant.id}"
        ${variant.available ? '' : 'disabled'}
      >
        <span class="quick-add-sheet__size-label">${(variant.title || '').toUpperCase()}</span>
        <span class="quick-add-sheet__size-price">${variant.available ? (variant.price || '') : 'ÉPUISÉ'}</span>
      </button>
    `).join('');

    ui.sheetEl.hidden = false;
    document.body.classList.add('quick-add-open');
  };

  document.addEventListener('click', async (event) => {
    const sizeButtonEl = event.target.closest('[data-quick-add-size]');
    if (!sizeButtonEl) return;

    const ui = ensureQuickAddUi();
    const formEl = ui.activeFormEl;
    if (!formEl) return;

    const payload = getQuickAddPayload(formEl);
    const variantId = Number(sizeButtonEl.dataset.quickAddSize || 0);
    const variant = payload?.variants.find((item) => Number(item.id) === variantId);
    if (!variant || !variant.available) return;

    const added = await addQuickAddVariantToCart(formEl, variant);
    if (added) {
      closeQuickAddSheet();
    }
  });

  document.addEventListener('submit', (event) => {
    const formEl = event.target.closest('[data-quick-add-form]');
    if (!formEl) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    const payload = getQuickAddPayload(formEl);
    if (!payload?.defaultVariant) return;

    const variantCount = payload.variants.length;
    const hasChoice = variantCount > 1 || !/default/i.test(payload.defaultVariant.title || '');

    if (hasChoice) {
      openQuickAddSheet(formEl);
      return;
    }

    addQuickAddVariantToCart(formEl, payload.defaultVariant);
  }, true);

  const getInteractiveFinalText = (element) => {
    const textTarget = getInteractiveTextTarget(element);
    if (!textTarget) return '';
    return textTarget.dataset.copyFinal || textTarget.dataset.scrambleFinal || normalizeText(textTarget.textContent || '');
  };

  const lockInteractiveWidth = (element) => {
    const widthRestore = element.style.width;
    const displayRestore = element.style.display;
    const lockedWidth = Math.ceil(element.getBoundingClientRect().width);
    const computedDisplay = window.getComputedStyle(element).display;

    if (computedDisplay === 'inline') {
      element.style.display = 'inline-block';
    } else if (computedDisplay === 'inline-flex') {
      element.style.display = 'inline-flex';
    }

    element.style.width = `${lockedWidth}px`;

    return {
      widthRestore,
      displayRestore
    };
  };

  const unlockInteractiveWidth = (element, widthLockState) => {
    if (!widthLockState) return;

    if (widthLockState.widthRestore) {
      element.style.width = widthLockState.widthRestore;
    } else {
      element.style.removeProperty('width');
    }

    if (widthLockState.displayRestore) {
      element.style.display = widthLockState.displayRestore;
    } else {
      element.style.removeProperty('display');
    }
  };

  const clearInteractiveScramble = (element) => {
    const textTarget = getInteractiveTextTarget(element);
    if (!textTarget) return;

    const existingState = interactiveScrambleState.get(textTarget);
    if (existingState) {
      if (existingState.delayTimer) {
        window.clearTimeout(existingState.delayTimer);
      }
      if (existingState.intervalId) {
        window.clearInterval(existingState.intervalId);
      }
      unlockInteractiveWidth(existingState.lockTarget, existingState.widthLockState);
      interactiveScrambleState.delete(textTarget);
    }

    const finalText = getInteractiveFinalText(textTarget);
    if (finalText) {
      textTarget.textContent = finalText;
    }
  };

  const runInteractiveScramble = (element, options = {}) => {
    const textTarget = getInteractiveTextTarget(element);
    if (!textTarget) return;
    if (isInteractiveScrambleDisabled(element) || isInteractiveScrambleDisabled(textTarget)) return;

    const scrambleDirection = options.direction === 'out' ? 'out' : 'in';
    const totalSteps = Number.isFinite(options.totalSteps)
      ? options.totalSteps
      : (scrambleDirection === 'out' ? 8 : 10);
    const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 28;
    const restoreFinalText = options.restoreFinalText !== false;
    const scrambleChars = typeof options.charSet === 'string' && options.charSet.length
      ? options.charSet
      : SCRAMBLE_CHARS;

    const finalText = getInteractiveFinalText(textTarget);
    if (!finalText) return;

    const existingState = interactiveScrambleState.get(textTarget);
    clearInteractiveScramble(textTarget);

    const lockTarget = getInteractiveLockTarget(textTarget);
    const widthLockState = existingState?.widthLockState || lockInteractiveWidth(lockTarget);

    let step = 0;
    let lastOutput = finalText;
    textTarget.textContent = finalText;

    const intervalId = window.setInterval(() => {
      step += 1;

      const revealIndex = Math.floor((step / totalSteps) * finalText.length);
      let output = '';

      for (let i = 0; i < finalText.length; i += 1) {
        const finalChar = finalText[i];
        if (preserveScrambleChar(finalChar)) {
          output += finalChar;
        } else if (scrambleDirection === 'out') {
          output += i <= revealIndex
            ? scrambleChars[Math.floor(Math.random() * scrambleChars.length)]
            : finalChar;
        } else if (i <= revealIndex) {
          output += finalChar;
        } else {
          output += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        }
      }

      lastOutput = output;
      textTarget.textContent = output;

      if (step >= totalSteps) {
        window.clearInterval(intervalId);
        if (restoreFinalText) {
          textTarget.textContent = finalText;
        } else {
          textTarget.textContent = lastOutput;
        }
        unlockInteractiveWidth(lockTarget, widthLockState);
        interactiveScrambleState.delete(textTarget);
        if (typeof options.onComplete === 'function') {
          options.onComplete();
        }
      }
    }, intervalMs);

    interactiveScrambleState.set(textTarget, {
      intervalId,
      delayTimer: 0,
      widthLockState,
      lockTarget
    });
  };

  const buildCtaHoverScrambleOutput = (finalText, focusIndex, frameSeed = 0) => {
    const coreRadius = 1.2;
    const edgeRadius = 2.1;
    let output = '';

    for (let i = 0; i < finalText.length; i += 1) {
      const finalChar = finalText[i];
      if (preserveScrambleChar(finalChar)) {
        output += finalChar;
        continue;
      }

      const distance = Math.abs(i - focusIndex);
      if (distance > edgeRadius) {
        output += finalChar;
        continue;
      }

      const pseudo = Math.abs(Math.sin(((i + 1) * 12.9898) + (frameSeed * 0.91)));
      const intensity = distance <= coreRadius
        ? 1
        : Math.max(0, 1 - ((distance - coreRadius) / (edgeRadius - coreRadius)));
      const scrambleChance = 0.12 + (intensity * 0.34);

      if (pseudo < scrambleChance) {
        const charIndex = Math.floor((pseudo * 1000 + frameSeed + i) % CTA_SCRAMBLE_CHARS.length);
        output += CTA_SCRAMBLE_CHARS[charIndex];
      } else {
        output += finalChar;
      }
    }

    return output;
  };

  const stopCtaHoverScramble = (element, resetText = true) => {
    const textTarget = getInteractiveTextTarget(element);
    if (!textTarget) return;

    const state = ctaHoverScrambleState.get(textTarget);
    if (state?.rafId) {
      window.cancelAnimationFrame(state.rafId);
    }

    ctaHoverScrambleState.delete(textTarget);

    if (!resetText) return;
    const finalText = getInteractiveFinalText(textTarget);
    if (finalText) {
      textTarget.textContent = finalText;
    }
  };

  const initCtaHoverScramble = (root = document) => {
    root.querySelectorAll(CTA_POINTER_SCRAMBLE_SELECTOR).forEach((element) => {
      if (element.dataset.ctaHoverScrambleInit === 'true') return;
      element.dataset.ctaHoverScrambleInit = 'true';

      const textTarget = getInteractiveTextTarget(element);
      if (!textTarget) return;
      if (isInteractiveScrambleDisabled(element) || isInteractiveScrambleDisabled(textTarget)) return;

      const finalText = normalizeText(textTarget.textContent || '');
      textTarget.dataset.scrambleFinal = finalText;
      textTarget.textContent = finalText;

      const getPointerRatio = (event) => {
        const rect = element.getBoundingClientRect();
        if (!rect.width) return 0.5;
        const pointerX = event.clientX - rect.left;
        return Math.min(1, Math.max(0, pointerX / rect.width));
      };

      const tick = (time) => {
        const state = ctaHoverScrambleState.get(textTarget);
        if (!state || !state.isActive) return;

        if (!state.lastTick || (time - state.lastTick) >= 34) {
          state.smoothedPointerRatio += (state.pointerRatio - state.smoothedPointerRatio) * 0.22;
          const lastIndex = Math.max(state.finalText.length - 1, 0);
          const focusIndex = state.smoothedPointerRatio * lastIndex;
          const frameSeed = Math.floor(time / 72);
          textTarget.textContent = buildCtaHoverScrambleOutput(state.finalText, focusIndex, frameSeed);
          state.lastTick = time;
        }

        state.rafId = window.requestAnimationFrame(tick);
      };

      const start = (event) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        clearInteractiveScramble(element);
        stopCtaHoverScramble(element, false);

        const state = {
          isActive: true,
          finalText: textTarget.dataset.scrambleFinal || finalText,
          pointerRatio: event ? getPointerRatio(event) : 0.5,
          smoothedPointerRatio: event ? getPointerRatio(event) : 0.5,
          rafId: 0,
          lastTick: 0
        };

        ctaHoverScrambleState.set(textTarget, state);
        state.rafId = window.requestAnimationFrame(tick);
      };

      const move = (event) => {
        const state = ctaHoverScrambleState.get(textTarget);
        if (!state) return;
        state.pointerRatio = getPointerRatio(event);
      };

      const stop = () => {
        stopCtaHoverScramble(element, true);
      };

      element.addEventListener('pointerenter', start);
      element.addEventListener('pointermove', move);
      element.addEventListener('pointerleave', stop);
      element.addEventListener('pointercancel', stop);
      element.addEventListener('blur', stop);
    });
  };

  const initInteractiveScramble = (root = document) => {
    root.querySelectorAll(INTERACTIVE_SCRAMBLE_SELECTOR).forEach((element) => {
      if (element.matches?.(CTA_POINTER_SCRAMBLE_SELECTOR)) return;
      if (element.dataset.navScrambleInit === 'true') return;
      element.dataset.navScrambleInit = 'true';

      const textTarget = getInteractiveTextTarget(element);
      if (!textTarget) return;

      const finalText = normalizeText(textTarget.textContent || '');
      textTarget.dataset.scrambleFinal = finalText;
      textTarget.textContent = finalText;

      const trigger = () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const heroSlide = element.closest('.video-hero__slide');
        if (heroSlide && (heroSlide.classList.contains('is-copy-animating') || heroSlide.classList.contains('is-copy-leaving'))) {
          return;
        }
        runInteractiveScramble(element);
      };

      element.addEventListener('mouseenter', trigger);
      element.addEventListener('focus', trigger);
    });
  };

  const tickerScrambleState = new WeakMap();

  const initCollectionTickerScramble = (root = document) => {
    root.querySelectorAll('.collection-slider__badge--title, .collection-slider__badge--view-all').forEach((badgeEl) => {
      if (badgeEl.dataset.tickerScrambleInit === 'true') return;

      const textTargets = Array.from(badgeEl.querySelectorAll('.collection-slider__ticker-track > span'));
      if (!textTargets.length) return;

      badgeEl.dataset.tickerScrambleInit = 'true';

      textTargets.forEach((target) => {
        const finalText = normalizeText(target.textContent || '');
        target.dataset.tickerFinal = finalText;
        target.textContent = finalText;
      });

      const trigger = () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (tickerScrambleState.get(badgeEl)) return;

        let step = 0;
        const totalSteps = 10;

        const intervalId = window.setInterval(() => {
          step += 1;

          textTargets.forEach((target) => {
            const finalText = target.dataset.tickerFinal || '';
            if (!finalText) return;

            if (step >= totalSteps) {
              target.textContent = finalText;
              return;
            }

            const revealIndex = Math.floor((step / totalSteps) * finalText.length);
            let output = '';

            for (let i = 0; i < finalText.length; i += 1) {
              const finalChar = finalText[i];
              if (preserveScrambleChar(finalChar) || i <= revealIndex) {
                output += finalChar;
              } else {
                output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
              }
            }

            target.textContent = output;
          });

          if (step >= totalSteps) {
            window.clearInterval(intervalId);
            tickerScrambleState.delete(badgeEl);
          }
        }, 28);

        tickerScrambleState.set(badgeEl, intervalId);
      };

      badgeEl.addEventListener('mouseenter', trigger);
      badgeEl.addEventListener('focusin', trigger);
    });
  };

  let headerScrollController = null;
  let mobileNavController = null;
  let searchOverlayController = null;
  let cartDrawerController = null;
  let footerRevealController = null;

  const initMobileNav = (root = document) => {
    const headerFromRoot = root?.matches?.('.site-header')
      ? root
      : root?.querySelector?.('.site-header');
    const headerEl = headerFromRoot || document.querySelector('.site-header');
    if (!headerEl) return;

    const navEl = headerEl.querySelector('[data-mobile-nav]');
    const toggleButton = navEl?.querySelector('[data-mobile-nav-toggle]');
    const panelEl = document.querySelector('[data-mobile-nav-panel]');
    if (!navEl || !toggleButton || !panelEl) return;

    if (mobileNavController?.nav === navEl) return;
    if (mobileNavController?.destroy) {
      mobileNavController.destroy();
    }

    const panelLinks = Array.from(panelEl.querySelectorAll('a'));
    const closeButtons = Array.from(panelEl.querySelectorAll('[data-mobile-nav-close]'));
    const drillButtons = Array.from(panelEl.querySelectorAll('[data-menu-drill]'));
    const backButtons = Array.from(panelEl.querySelectorAll('[data-menu-back]'));
    const views = Array.from(panelEl.querySelectorAll('[data-menu-view]'));
    const viewsContainer = panelEl.querySelector('[data-menu-views]');
    let lockedScrollY = 0;

    const panelScrambleTargets = '.header-menu__view.is-active .header-menu__view-title, .header-menu__view.is-active .header-menu__view-all, .header-menu__view.is-active .header-menu__list-label, .header-menu__view.is-active .header-menu__list-badge';

    const triggerPanelScramble = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const targets = Array.from(panelEl.querySelectorAll(panelScrambleTargets));
      targets.forEach((el, idx) => {
        window.setTimeout(() => {
          runInteractiveScramble(el, { direction: 'in', totalSteps: 11, intervalMs: 26 });
        }, idx * 32);
      });
    };

    const setActiveView = (viewName, options = {}) => {
      views.forEach((viewEl) => {
        viewEl.classList.toggle('is-active', viewEl.dataset.menuView === viewName);
      });
      if (viewsContainer) viewsContainer.scrollTop = 0;
      if (options.scramble) {
        window.requestAnimationFrame(triggerPanelScramble);
      }
    };

    const syncOpenState = (isOpen) => {
      const wasOpen = document.body.classList.contains('mobile-menu-open');

      if (isOpen && !wasOpen) {
        lockedScrollY = Math.max(window.scrollY || window.pageYOffset || 0, 0);
        document.body.style.top = `-${lockedScrollY}px`;
      }

      navEl.classList.toggle('is-open', isOpen);
      headerEl.classList.toggle('has-mobile-menu-open', isOpen);
      document.documentElement.classList.toggle('mobile-menu-open', isOpen);
      document.body.classList.toggle('mobile-menu-open', isOpen);
      toggleButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

      if (!isOpen) {
        setActiveView('root');

        if (wasOpen) {
          document.body.style.top = '';
          window.scrollTo(0, lockedScrollY);
          lockedScrollY = 0;
        }
      }
    };

    const closeMenu = () => {
      syncOpenState(false);
    };

    const openMenu = () => {
      cartDrawerController?.close?.();
      setActiveView('root');
      syncOpenState(true);
      window.requestAnimationFrame(triggerPanelScramble);
    };

    const toggleMenu = () => {
      if (navEl.classList.contains('is-open')) {
        closeMenu();
        return;
      }
      openMenu();
    };

    const handleDocumentClick = (event) => {
      if (!navEl.classList.contains('is-open')) return;
      if (navEl.contains(event.target)) return;
      if (panelEl.contains(event.target)) return;
      closeMenu();
    };

    const handleKeydown = (event) => {
      if (event.key !== 'Escape') return;
      if (!navEl.classList.contains('is-open')) return;
      closeMenu();
      toggleButton.focus();
    };

    const handleDrill = (event) => {
      const target = event.currentTarget.dataset.menuDrill;
      if (!target) return;
      setActiveView(target, { scramble: true });
    };

    const handleBack = (event) => {
      const target = event.currentTarget.dataset.menuBack || 'root';
      setActiveView(target, { scramble: true });
    };

    toggleButton.addEventListener('click', toggleMenu);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeydown);
    panelLinks.forEach((linkEl) => linkEl.addEventListener('click', closeMenu));
    closeButtons.forEach((btn) => btn.addEventListener('click', closeMenu));
    drillButtons.forEach((btn) => btn.addEventListener('click', handleDrill));
    backButtons.forEach((btn) => btn.addEventListener('click', handleBack));

    setActiveView('root');
    syncOpenState(navEl.classList.contains('is-open'));

    mobileNavController = {
      nav: navEl,
      close: closeMenu,
      destroy: () => {
        closeMenu();
        toggleButton.removeEventListener('click', toggleMenu);
        document.removeEventListener('click', handleDocumentClick);
        document.removeEventListener('keydown', handleKeydown);
        panelLinks.forEach((linkEl) => linkEl.removeEventListener('click', closeMenu));
        closeButtons.forEach((btn) => btn.removeEventListener('click', closeMenu));
        drillButtons.forEach((btn) => btn.removeEventListener('click', handleDrill));
        backButtons.forEach((btn) => btn.removeEventListener('click', handleBack));
      }
    };
  };

  const initCartDrawer = (root = document) => {
    const drawerEl = root?.matches?.('[data-cart-drawer]')
      ? root
      : root?.querySelector?.('[data-cart-drawer]') || document.querySelector('[data-cart-drawer]');
    if (!drawerEl) return;

    if (cartDrawerController?.drawer === drawerEl) return;
    if (cartDrawerController?.destroy) {
      cartDrawerController.destroy();
    }

    const triggerEls = Array.from(document.querySelectorAll('[data-cart-drawer-trigger]'));
    const closeEls = Array.from(drawerEl.querySelectorAll('[data-cart-drawer-close]'));
    const bodyEl = drawerEl.querySelector('[data-cart-drawer-body]');

    let isOpen = false;
    let activeFetchController = null;

    const setLoading = (loading) => {
      drawerEl.classList.toggle('is-loading', loading);
    };

    const getCart = async () => {
      if (activeFetchController) activeFetchController.abort();
      activeFetchController = new AbortController();
      const response = await fetch('/cart.js', {
        signal: activeFetchController.signal,
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      if (!response.ok) throw new Error('Cart fetch failed');
      return response.json();
    };

    const renderEmpty = () => {
      if (!bodyEl) return;
      bodyEl.innerHTML = `
        <div class="header-cart-drawer__empty">
          <p class="header-cart-drawer__empty-title">PANIER VIDE</p>
          <p class="header-cart-drawer__empty-copy">AJOUTE UNE PAIRE POUR RETROUVER ICI LE RECAP AVANT CHECKOUT.</p>
          <button class="header-cart-drawer__continue" type="button" data-cart-drawer-close>CONTINUER</button>
        </div>
      `;
      bodyEl.querySelectorAll('[data-cart-drawer-close]').forEach((btn) => btn.addEventListener('click', closeDrawer));
    };

    const renderCart = (cart) => {
      if (!bodyEl) return;
      const items = Array.isArray(cart?.items) ? cart.items : [];
      updateHeaderCartCount(cart?.item_count || 0);

      if (!items.length) {
        renderEmpty();
        return;
      }

      const itemMarkup = items.map((item) => {
        const title = escapeHtml(item.product_title || item.title || '');
        const variantTitle = item.variant_title && item.variant_title !== 'Default Title'
          ? `<p class="header-cart-drawer__meta">${escapeHtml(item.variant_title)}</p>`
          : '';
        const vendor = item.vendor ? `<p class="header-cart-drawer__meta">${escapeHtml(item.vendor)}</p>` : '';
        const imageMarkup = item.image
          ? `<img src="${escapeHtml(item.image)}" alt="${title}" loading="lazy">`
          : '<span class="header-cart-drawer__media-placeholder"></span>';

        return `
          <article class="header-cart-drawer__item" data-cart-line="${item.key}">
            <a class="header-cart-drawer__media" href="${escapeHtml(item.url || '/cart')}">${imageMarkup}</a>
            <div class="header-cart-drawer__copy">
              <a class="header-cart-drawer__title" href="${escapeHtml(item.url || '/cart')}">${title}</a>
              <div>
                ${vendor}
                ${variantTitle}
              </div>
              <div class="header-cart-drawer__row">
                <div class="header-cart-drawer__qty" aria-label="Quantite">
                  <button class="header-cart-drawer__qty-button" type="button" data-cart-drawer-qty="${item.quantity - 1}" aria-label="Reduire la quantite">-</button>
                  <span class="header-cart-drawer__qty-count">${item.quantity}</span>
                  <button class="header-cart-drawer__qty-button" type="button" data-cart-drawer-qty="${item.quantity + 1}" aria-label="Augmenter la quantite">+</button>
                </div>
                <p class="header-cart-drawer__price">${formatCartMoney(item.final_line_price)}</p>
              </div>
              <button class="header-cart-drawer__remove" type="button" data-cart-drawer-qty="0">SUPPRIMER</button>
            </div>
          </article>
        `;
      }).join('');

      bodyEl.innerHTML = `
        <div class="header-cart-drawer__items">
          ${itemMarkup}
        </div>
        <div class="header-cart-drawer__footer">
          <div class="header-cart-drawer__summary">
            <p class="header-cart-drawer__summary-label">TOTAL</p>
            <p class="header-cart-drawer__summary-value">${formatCartMoney(cart.total_price)}</p>
          </div>
          <p class="header-cart-drawer__note">Frais d'expedition et taxes calcules a l'etape suivante.</p>
          <div class="header-cart-drawer__actions">
            <a class="header-cart-drawer__checkout" href="/checkout">CHECKOUT</a>
            <a class="header-cart-drawer__cart-link" href="/cart">VOIR LE PANIER</a>
          </div>
        </div>
      `;

      const noteEl = bodyEl.querySelector('.header-cart-drawer__note');
      if (noteEl) {
        noteEl.textContent = "Frais d'expedition et taxes calcules a l'etape suivante.";
        noteEl.style.setProperty('letter-spacing', '0', 'important');
        noteEl.style.setProperty('text-transform', 'none', 'important');
      }
    };

    const refreshCartDrawer = async () => {
      if (!bodyEl) return;
      setLoading(true);
      try {
        const cart = await getCart();
        renderCart(cart);
      } catch (error) {
        if (error.name !== 'AbortError') {
          bodyEl.innerHTML = '<p class="header-cart-drawer__loading">IMPOSSIBLE DE CHARGER LE PANIER.</p>';
        }
      } finally {
        setLoading(false);
        activeFetchController = null;
      }
    };

    const openDrawer = () => {
      mobileNavController?.close?.();
      isOpen = true;
      drawerEl.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('cart-drawer-open');
      document.body.classList.add('cart-drawer-open');
      triggerEls.forEach((triggerEl) => triggerEl.setAttribute('aria-expanded', 'true'));
      refreshCartDrawer();
    };

    function closeDrawer() {
      isOpen = false;
      drawerEl.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('cart-drawer-open');
      document.body.classList.remove('cart-drawer-open');
      triggerEls.forEach((triggerEl) => triggerEl.setAttribute('aria-expanded', 'false'));
      setLoading(false);
    }

    const toggleDrawer = () => {
      if (isOpen) {
        closeDrawer();
        return;
      }
      openDrawer();
    };

    const handleTriggerClick = (event) => {
      event.preventDefault();
      toggleDrawer();
    };

    const handleBodyClick = async (event) => {
      const qtyButton = event.target.closest('[data-cart-drawer-qty]');
      if (!qtyButton || !bodyEl?.contains(qtyButton)) return;
      const lineEl = qtyButton.closest('[data-cart-line]');
      const lineKey = lineEl?.dataset.cartLine;
      const quantity = Number(qtyButton.dataset.cartDrawerQty);
      if (!lineKey || !Number.isFinite(quantity)) return;

      setLoading(true);
      try {
        const response = await fetch('/cart/change.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ id: lineKey, quantity: Math.max(0, quantity) })
        });
        if (!response.ok) throw new Error('Cart change failed');
        const cart = await response.json();
        renderCart(cart);
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
      } catch {
        refreshCartDrawer();
      } finally {
        setLoading(false);
      }
    };

    const handleKeydown = (event) => {
      if (event.key !== 'Escape' || !isOpen) return;
      closeDrawer();
    };

    const handleCartUpdated = (event) => {
      const cart = event.detail?.cart;
      if (!cart) return;
      updateHeaderCartCount(cart.item_count || 0);
      if (isOpen) renderCart(cart);
    };

    triggerEls.forEach((triggerEl) => triggerEl.addEventListener('click', handleTriggerClick));
    closeEls.forEach((closeEl) => closeEl.addEventListener('click', closeDrawer));
    bodyEl?.addEventListener('click', handleBodyClick);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('cart:updated', handleCartUpdated);

    cartDrawerController = {
      drawer: drawerEl,
      close: closeDrawer,
      destroy: () => {
        closeDrawer();
        if (activeFetchController) activeFetchController.abort();
        triggerEls.forEach((triggerEl) => triggerEl.removeEventListener('click', handleTriggerClick));
        closeEls.forEach((closeEl) => closeEl.removeEventListener('click', closeDrawer));
        bodyEl?.removeEventListener('click', handleBodyClick);
        document.removeEventListener('keydown', handleKeydown);
        document.removeEventListener('cart:updated', handleCartUpdated);
      }
    };
  };

  const initSearchOverlay = (root = document) => {
    const overlayEl = root?.matches?.('[data-search-overlay]')
      ? root
      : root?.querySelector?.('[data-search-overlay]') || document.querySelector('[data-search-overlay]');
    if (!overlayEl) return;

    if (searchOverlayController?.overlay === overlayEl) return;
    if (searchOverlayController?.destroy) {
      searchOverlayController.destroy();
    }

    const triggerEls = Array.from(document.querySelectorAll('[data-search-trigger]'));
    const closeEls = Array.from(overlayEl.querySelectorAll('[data-search-close]'));
    const inputEl = overlayEl.querySelector('[data-search-input]');
    const clearInputEl = overlayEl.querySelector('[data-search-clear]');
    const formEl = overlayEl.querySelector('.header-search-overlay__form');
    const resultsEl = overlayEl.querySelector('[data-search-results]');
    const dialogEl = overlayEl.querySelector('.header-search-overlay__dialog');
    const headerEl = overlayEl.closest('.site-header');
    const searchEndpoint = overlayEl.dataset.searchEndpoint;
    const searchSectionId = overlayEl.dataset.searchSectionId;
    const minSearchLength = 2;

    let searchDebounceId = 0;
    let searchAbortController = null;

    const syncClearButton = () => {
      if (!clearInputEl || !inputEl) return;
      clearInputEl.hidden = inputEl.value.trim().length === 0;
    };

    const clearPendingSearch = () => {
      window.clearTimeout(searchDebounceId);
      if (searchAbortController) {
        searchAbortController.abort();
        searchAbortController = null;
      }
      overlayEl.classList.remove('is-search-loading');
    };

    const clearResults = () => {
      clearPendingSearch();
      if (!resultsEl) return;
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
      syncClearButton();
    };

    const renderLoadingState = () => {
      if (!resultsEl) return;
      resultsEl.hidden = false;
      resultsEl.innerHTML = '<div class="header-search-predictive__loading"><p>Recherche en cours...</p></div>';
      overlayEl.classList.add('is-search-loading');
    };

    const renderPredictiveResults = (markup, searchTerm) => {
      if (!resultsEl) return;

      const parsedMarkup = new DOMParser().parseFromString(markup, 'text/html');
      const predictiveRoot = parsedMarkup.querySelector('[data-predictive-search-root]');
      if (!predictiveRoot) {
        clearResults();
        return;
      }

      if (inputEl?.value.trim() !== searchTerm) return;

      overlayEl.classList.remove('is-search-loading');
      resultsEl.hidden = false;
      resultsEl.innerHTML = predictiveRoot.outerHTML;

      const renderedPredictiveRoot = resultsEl.querySelector('[data-predictive-search-root]');
      if (!renderedPredictiveRoot) return;

      initCollectionStacks(renderedPredictiveRoot);
      initInteractiveScramble(renderedPredictiveRoot);
      initCollectionTickerScramble(renderedPredictiveRoot);
    };

    const fetchPredictiveResults = async (searchTerm) => {
      if (!searchEndpoint || !searchSectionId || !resultsEl) return;

      clearPendingSearch();
      renderLoadingState();

      const requestUrl = new URL(searchEndpoint, window.location.origin);
      requestUrl.searchParams.set('q', searchTerm);
      requestUrl.searchParams.set('section_id', searchSectionId);
      requestUrl.searchParams.set('resources[type]', 'product,collection,page,article,query');
      requestUrl.searchParams.set('resources[limit]', '8');
      requestUrl.searchParams.set('resources[limit_scope]', 'each');
      requestUrl.searchParams.set('resources[options][unavailable_products]', 'hide');
      requestUrl.searchParams.set('resources[options][fields]', 'title,product_type,variants.title,vendor');

      searchAbortController = new AbortController();

      try {
        const response = await fetch(requestUrl.toString(), {
          signal: searchAbortController.signal,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (!response.ok) {
          throw new Error(`Predictive search failed with status ${response.status}`);
        }

        const markup = await response.text();
        renderPredictiveResults(markup, searchTerm);
      } catch (error) {
        if (error.name === 'AbortError') return;
        clearResults();
      } finally {
        searchAbortController = null;
        overlayEl.classList.remove('is-search-loading');
      }
    };

    const schedulePredictiveSearch = () => {
      if (!inputEl || !resultsEl) return;

      const searchTerm = inputEl.value.trim();
      syncClearButton();
      if (searchTerm.length < minSearchLength) {
        clearResults();
        return;
      }

      window.clearTimeout(searchDebounceId);
      searchDebounceId = window.setTimeout(() => {
        fetchPredictiveResults(searchTerm);
      }, 180);
    };

    const closeOverlay = () => {
      overlayEl.hidden = true;
      headerEl?.classList.remove('has-search-overlay-open');
      document.body.classList.remove('search-overlay-open');
      clearResults();
      syncClearButton();
    };

    const openOverlay = () => {
      overlayEl.hidden = false;
      headerEl?.classList.add('has-search-overlay-open');
      document.body.classList.add('search-overlay-open');
      window.requestAnimationFrame(() => {
        inputEl?.focus();
        if (inputEl?.value.trim().length >= minSearchLength) {
          schedulePredictiveSearch();
        }
      });
    };

    const handleTriggerClick = (event) => {
      event.preventDefault();
      if (!overlayEl.hidden) {
        closeOverlay();
        return;
      }
      openOverlay();
    };

    const handleKeydown = (event) => {
      if (event.key !== 'Escape') return;
      if (overlayEl.hidden) return;
      closeOverlay();
    };

    const handleClearInput = () => {
      if (!inputEl) return;
      inputEl.value = '';
      clearResults();
      syncClearButton();
      inputEl.focus();
    };

    const handleDocumentClick = (event) => {
      if (overlayEl.hidden) return;
      if (dialogEl?.contains(event.target)) return;
      if (triggerEls.some((triggerEl) => triggerEl.contains(event.target))) return;
      closeOverlay();
    };

    triggerEls.forEach((triggerEl) => triggerEl.addEventListener('click', handleTriggerClick));
    closeEls.forEach((closeEl) => closeEl.addEventListener('click', closeOverlay));
    inputEl?.addEventListener('input', schedulePredictiveSearch);
    inputEl?.addEventListener('focus', schedulePredictiveSearch);
    clearInputEl?.addEventListener('click', handleClearInput);
    formEl?.addEventListener('submit', clearPendingSearch);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleDocumentClick);
    syncClearButton();

    searchOverlayController = {
      overlay: overlayEl,
      destroy: () => {
        closeOverlay();
        triggerEls.forEach((triggerEl) => triggerEl.removeEventListener('click', handleTriggerClick));
        closeEls.forEach((closeEl) => closeEl.removeEventListener('click', closeOverlay));
        inputEl?.removeEventListener('input', schedulePredictiveSearch);
        inputEl?.removeEventListener('focus', schedulePredictiveSearch);
        clearInputEl?.removeEventListener('click', handleClearInput);
        formEl?.removeEventListener('submit', clearPendingSearch);
        document.removeEventListener('keydown', handleKeydown);
        document.removeEventListener('click', handleDocumentClick);
      }
    };
  };

  const initHeaderScrollVisibility = (root = document) => {
    const headerFromRoot = root?.matches?.('.site-header')
      ? root
      : root?.querySelector?.('.site-header');
    const headerEl = headerFromRoot || document.querySelector('.site-header');
    if (!headerEl) return;

    if (headerScrollController?.header === headerEl) return;
    if (headerScrollController?.destroy) {
      headerScrollController.destroy();
    }

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const downThreshold = 22;
    const upThreshold = 14;
    const revealTopOffset = 34;

    let rafId = 0;
    let isHidden = false;
    let downDistance = 0;
    let upDistance = 0;
    let lastY = Math.max(window.scrollY || window.pageYOffset || 0, 0);

    const setHeaderHidden = (nextHidden) => {
      if (isHidden === nextHidden) return;
      isHidden = nextHidden;
      headerEl.classList.toggle('is-scroll-hidden', nextHidden);
    };

    const updateHeaderState = () => {
      rafId = 0;
      const currentY = Math.max(window.scrollY || window.pageYOffset || 0, 0);
      const delta = currentY - lastY;
      lastY = currentY;

      if (reduceMotionQuery.matches) {
        downDistance = 0;
        upDistance = 0;
        setHeaderHidden(false);
        return;
      }

      if (currentY <= revealTopOffset) {
        downDistance = 0;
        upDistance = 0;
        setHeaderHidden(false);
        return;
      }

      if (headerEl.classList.contains('has-mobile-menu-open') || headerEl.classList.contains('has-search-overlay-open')) {
        downDistance = 0;
        upDistance = 0;
        setHeaderHidden(false);
        return;
      }

      if (Math.abs(delta) < 0.8) return;

      if (delta > 0) {
        downDistance += delta;
        upDistance = 0;
        if (downDistance >= downThreshold) {
          setHeaderHidden(true);
        }
        return;
      }

      upDistance += Math.abs(delta);
      downDistance = 0;
      if (upDistance >= upThreshold) {
        setHeaderHidden(false);
      }
    };

    const queueHeaderStateUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateHeaderState);
    };

    const handleReduceMotionChange = () => {
      downDistance = 0;
      upDistance = 0;
      setHeaderHidden(false);
      queueHeaderStateUpdate();
    };

    window.addEventListener('scroll', queueHeaderStateUpdate, { passive: true });
    window.addEventListener('resize', queueHeaderStateUpdate, { passive: true });

    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener('change', handleReduceMotionChange);
    } else {
      reduceMotionQuery.addListener(handleReduceMotionChange);
    }

    queueHeaderStateUpdate();

    headerScrollController = {
      header: headerEl,
      destroy: () => {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        window.removeEventListener('scroll', queueHeaderStateUpdate);
        window.removeEventListener('resize', queueHeaderStateUpdate);
        if (reduceMotionQuery.removeEventListener) {
          reduceMotionQuery.removeEventListener('change', handleReduceMotionChange);
        } else {
          reduceMotionQuery.removeListener(handleReduceMotionChange);
        }
        headerEl.classList.remove('is-scroll-hidden');
      }
    };
  };

  const initFooterReveal = (root = document) => {
    const footerFromRoot = root?.matches?.('.site-footer.site-footer--showcase')
      ? root
      : root?.querySelector?.('.site-footer.site-footer--showcase');
    const footerEl = footerFromRoot || document.querySelector('.site-footer.site-footer--showcase');
    if (!footerEl) return;

    if (footerRevealController?.footer === footerEl) return;
    if (footerRevealController?.destroy) {
      footerRevealController.destroy();
    }

    const docEl = document.documentElement;
    const bodyEl = document.body;
    if (!docEl || !bodyEl) return;

    bodyEl.classList.remove('has-footer-reveal');
    footerEl.classList.remove('is-reveal-interactive');
    footerEl.style.removeProperty('--footer-reveal-content-opacity');
    bodyEl.style.removeProperty('--footer-reveal-content-opacity');
    bodyEl.style.removeProperty('--footer-reveal-bg');
    docEl.style.removeProperty('--footer-reveal-height');
    bodyEl.style.removeProperty('--footer-reveal-height');
    return;

    const desktopQuery = window.matchMedia('(min-width: 981px)');
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    let rafId = 0;
    let footerHeight = 1;
    let renderedOpacity = 0;
    let lastOpacityTimestamp = 0;
    let resizeObserver = null;
    let isEnabled = false;

    const setFooterOpacity = (contentOpacityValue) => {
      const clampedOpacity = clamp(contentOpacityValue, 0, 1);
      const contentOpacityString = clampedOpacity.toFixed(3);
      footerEl.style.setProperty('--footer-reveal-content-opacity', contentOpacityString);
      bodyEl.style.setProperty('--footer-reveal-content-opacity', contentOpacityString);
      footerEl.classList.toggle('is-reveal-interactive', clampedOpacity >= 0.98);
    };
    const getHeroShellInset = () => {
      const rawInset = window.getComputedStyle(bodyEl).getPropertyValue('--hero-shell-inset');
      const parsedInset = Number.parseFloat(rawInset);
      return Number.isFinite(parsedInset) ? parsedInset : 0;
    };

    const refreshFooterHeight = () => {
      if (!isEnabled) return;
      const rect = footerEl.getBoundingClientRect();
      const computed = window.getComputedStyle(footerEl);
      const bottomOffset = Number.parseFloat(computed.bottom || '0') || 0;
      footerHeight = Math.max(1, Math.ceil(rect.height + bottomOffset));
      docEl.style.setProperty('--footer-reveal-height', `${footerHeight}px`);
      bodyEl.style.setProperty('--footer-reveal-height', `${footerHeight}px`);
    };

    const getRevealProgress = () => {
      const scrollY = Math.max(window.scrollY || window.pageYOffset || 0, 0);
      const maxScroll = Math.max(docEl.scrollHeight - window.innerHeight, 1);
      const distanceToEnd = Math.max(0, maxScroll - scrollY);
      const revealDistance = Math.max(1, Math.ceil(footerHeight + getHeroShellInset()));
      return clamp(1 - (distanceToEnd / revealDistance), 0, 1);
    };

    const applyFooterReveal = (timestamp = 0) => {
      rafId = 0;
      if (!isEnabled) return;

      const revealProgress = getRevealProgress();
      const contentStartThreshold = 0.4;
      const targetOpacity = revealProgress <= contentStartThreshold
        ? 0
        : clamp((revealProgress - contentStartThreshold) / (1 - contentStartThreshold), 0, 1);

      renderedOpacity = targetOpacity;
      lastOpacityTimestamp = timestamp || window.performance?.now?.() || Date.now();

      setFooterOpacity(renderedOpacity);

      if (isEnabled) {
        queueFooterReveal();
      }
    };

    const queueFooterReveal = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(applyFooterReveal);
    };

    const enableReveal = () => {
      if (isEnabled) return;
      isEnabled = true;
      bodyEl.classList.add('has-footer-reveal');
      const footerBg = window.getComputedStyle(footerEl).getPropertyValue('--footer-bg').trim();
      if (footerBg) {
        bodyEl.style.setProperty('--footer-reveal-bg', footerBg);
      }
      renderedOpacity = 0;
      lastOpacityTimestamp = 0;
      setFooterOpacity(0);
      refreshFooterHeight();
      queueFooterReveal();
    };

    const disableReveal = () => {
      if (!isEnabled) return;
      isEnabled = false;
      bodyEl.classList.remove('has-footer-reveal');
      footerEl.classList.remove('is-reveal-interactive');
      footerEl.style.removeProperty('--footer-reveal-content-opacity');
      bodyEl.style.removeProperty('--footer-reveal-content-opacity');
      bodyEl.style.removeProperty('--footer-reveal-bg');
      docEl.style.removeProperty('--footer-reveal-height');
      bodyEl.style.removeProperty('--footer-reveal-height');
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const syncRevealMode = () => {
      const shouldUseFooterReveal = desktopQuery.matches
        && !bodyEl.classList.contains('template-collection')
        && !bodyEl.classList.contains('template-search');
      if (shouldUseFooterReveal) {
        enableReveal();
      } else {
        disableReveal();
      }
    };

    const handleResize = () => {
      refreshFooterHeight();
      queueFooterReveal();
    };

    const handleReducedMotionChange = () => {
      lastOpacityTimestamp = 0;
      queueFooterReveal();
    };

    window.addEventListener('scroll', queueFooterReveal, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', syncRevealMode);
    } else {
      desktopQuery.addListener(syncRevealMode);
    }

    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener('change', handleReducedMotionChange);
    } else {
      reduceMotionQuery.addListener(handleReducedMotionChange);
    }

    if (typeof window.ResizeObserver === 'function') {
      resizeObserver = new window.ResizeObserver(() => {
        refreshFooterHeight();
        queueFooterReveal();
      });
      resizeObserver.observe(footerEl);
    }

    syncRevealMode();

    footerRevealController = {
      footer: footerEl,
      destroy: () => {
        disableReveal();
        window.removeEventListener('scroll', queueFooterReveal);
        window.removeEventListener('resize', handleResize);
        if (desktopQuery.removeEventListener) {
          desktopQuery.removeEventListener('change', syncRevealMode);
        } else {
          desktopQuery.removeListener(syncRevealMode);
        }
        if (reduceMotionQuery.removeEventListener) {
          reduceMotionQuery.removeEventListener('change', handleReducedMotionChange);
        } else {
          reduceMotionQuery.removeListener(handleReducedMotionChange);
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      }
    };
  };

  const initLenisSmoothScroll = () => {
    if (typeof window.Lenis !== 'function') return;

    const desktopQuery = window.matchMedia(LENIS_DESKTOP_QUERY);
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    let lenis = null;
    let lenisFrame = 0;

    const shouldEnableLenis = () => desktopQuery.matches && !reduceMotionQuery.matches;

    const stopLenis = () => {
      if (lenisFrame) {
        window.cancelAnimationFrame(lenisFrame);
        lenisFrame = 0;
      }

      if (lenis) {
        lenis.destroy();
        lenis = null;
      }
    };

    const tickLenis = (time) => {
      if (!lenis) return;
      lenis.raf(time);
      lenisFrame = window.requestAnimationFrame(tickLenis);
    };

    const syncLenisState = () => {
      if (!shouldEnableLenis()) {
        stopLenis();
        return;
      }

      if (lenis) {
        if (typeof lenis.resize === 'function') {
          lenis.resize();
        }
        return;
      }

      lenis = new window.Lenis({
        lerp: 0.075,
        smoothWheel: true,
        wheelMultiplier: 1.08,
        syncTouch: false,
        touchMultiplier: 1,
        gestureOrientation: 'vertical',
        orientation: 'vertical',
        prevent: (node) => Boolean(
          node
          && typeof node.closest === 'function'
          && node.closest('[data-lenis-prevent="true"]')
        )
      });

      lenisFrame = window.requestAnimationFrame(tickLenis);
    };

    const queueLenisResize = () => {
      if (lenis && typeof lenis.resize === 'function') {
        lenis.resize();
      }
    };

    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', syncLenisState);
    } else {
      desktopQuery.addListener(syncLenisState);
    }

    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener('change', syncLenisState);
    } else {
      reduceMotionQuery.addListener(syncLenisState);
    }

    window.addEventListener('resize', queueLenisResize, { passive: true });
    window.addEventListener('pageshow', queueLenisResize);
    syncLenisState();
  };

  const initVideoHero = (sectionRoot) => {
    if (!sectionRoot || sectionRoot.dataset.videoHeroInit === 'true') return;
    sectionRoot.dataset.videoHeroInit = 'true';

    const slides = Array.from(sectionRoot.querySelectorAll('[data-slide]'));
    if (!slides.length) return;

    const imageEl = sectionRoot.querySelector('.video-hero__image');
    const transitionEl = sectionRoot.querySelector('.video-hero__transition');
    const placeholderEl = sectionRoot.querySelector('.video-hero__placeholder');
    const techFrameEl = sectionRoot.querySelector('.video-hero__tech-frame');
    const contentWrapEl = sectionRoot.querySelector('.video-hero__content-wrap');
    const prevTriggerEl = sectionRoot.querySelector('[data-prev-trigger]');
    const nextTriggerEl = sectionRoot.querySelector('[data-next-trigger]');
    const stepEls = Array.from(sectionRoot.querySelectorAll('[data-jump-index]'));
    const sideStepEls = Array.from(sectionRoot.querySelectorAll('[data-side-step]'));

    const breakpoint = Number(sectionRoot.dataset.mobileBreakpoint || 768);
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    let activeIndex = 0;
    let isTransitioning = false;
    let activeTransitionCleanup = null;
    let transitionNonce = 0;
    let copyAnimationNonce = 0;
    let copyHideTimer = 0;
    let wheelDeltaX = 0;
    let wheelResetTimer = 0;
    let autoplayTimer = 0;
    let autoplayDirection = 1;
    let scrollEffectFrame = 0;
    let renderedCopyOpacity = 1;
    let lastCopyOpacityTimestamp = 0;
    const imagePreloadCache = new Map();
    const navControlAnimationState = new WeakMap();
    let hasInitializedNavigation = false;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const parseSlideData = (slide) => ({
      imageDesktop: (slide.dataset.imageDesktop || '').trim(),
      imageMobile: (slide.dataset.imageMobile || '').trim(),
      transitionDesktop: (slide.dataset.transitionDesktop || '').trim(),
      transitionMobile: (slide.dataset.transitionMobile || '').trim(),
      transitionPrevDesktop: (slide.dataset.transitionPrevDesktop || '').trim(),
      transitionPrevMobile: (slide.dataset.transitionPrevMobile || '').trim(),
      alt: (slide.dataset.imageAlt || '').trim()
    });

    const getMediaForSlide = (index) => {
      const slide = slides[index];
      if (!slide) return null;
      const data = parseSlideData(slide);

      const imageUrl = mediaQuery.matches
        ? (data.imageMobile || data.imageDesktop)
        : (data.imageDesktop || data.imageMobile);

      const transitionNextUrl = mediaQuery.matches
        ? (data.transitionMobile || data.transitionDesktop)
        : (data.transitionDesktop || data.transitionMobile);

      const transitionPrevUrl = mediaQuery.matches
        ? (data.transitionPrevMobile || data.transitionPrevDesktop)
        : (data.transitionPrevDesktop || data.transitionPrevMobile);

      return {
        imageUrl,
        transitionNextUrl,
        transitionPrevUrl,
        alt: data.alt
      };
    };

    const preloadImage = (imageUrl) => {
      if (!imageUrl) return Promise.resolve(false);
      if (imagePreloadCache.has(imageUrl)) return imagePreloadCache.get(imageUrl);

      const preloadPromise = new Promise((resolve) => {
        const preloadImg = new Image();

        const finish = (isReady) => resolve(isReady);
        const finalizeReady = () => {
          if (typeof preloadImg.decode === 'function') {
            preloadImg.decode().catch(() => null).finally(() => finish(true));
            return;
          }
          finish(true);
        };

        preloadImg.onload = finalizeReady;
        preloadImg.onerror = () => finish(false);
        preloadImg.src = imageUrl;

        if (preloadImg.complete && preloadImg.naturalWidth > 0) {
          finalizeReady();
        }
      });

      imagePreloadCache.set(imageUrl, preloadPromise);
      return preloadPromise;
    };

    const prepareImageForSlide = (index) => {
      const media = getMediaForSlide(index);
      if (!media || !media.imageUrl) {
        return Promise.resolve(media);
      }

      return preloadImage(media.imageUrl).then(() => media);
    };

    const waitForRenderedImage = (expectedUrl) => {
      if (!imageEl || !expectedUrl) return Promise.resolve(false);

      return new Promise((resolve) => {
        let isResolved = false;

        const finish = (isReady) => {
          if (isResolved) return;
          isResolved = true;
          resolve(isReady);
        };

        const finalizeReady = () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => finish(true));
          });
        };

        const cleanup = () => {
          imageEl.removeEventListener('load', handleLoad);
          imageEl.removeEventListener('error', handleError);
        };

        const handleLoad = () => {
          cleanup();
          if (typeof imageEl.decode === 'function') {
            imageEl.decode().catch(() => null).finally(finalizeReady);
            return;
          }
          finalizeReady();
        };

        const handleError = () => {
          cleanup();
          finish(false);
        };

        if (imageEl.complete && imageEl.naturalWidth > 0 && imageEl.getAttribute('src') === expectedUrl) {
          handleLoad();
          return;
        }

        imageEl.addEventListener('load', handleLoad, { once: true });
        imageEl.addEventListener('error', handleError, { once: true });
      });
    };

    const resetTransition = () => {
      if (!transitionEl) return;
      transitionEl.pause();
      transitionEl.classList.remove('is-visible');
      transitionEl.removeAttribute('src');
      transitionEl.load();
    };

    const clearAutoplayTimer = () => {
      if (!autoplayTimer) return;
      window.clearTimeout(autoplayTimer);
      autoplayTimer = 0;
    };

    const canAutoplay = () => slides.length > 1 && !reduceMotionQuery.matches && !document.hidden;

    const getNextAutoplayIndex = () => {
      if (slides.length < 2) return activeIndex;

      let nextIndex = activeIndex + autoplayDirection;

      if (nextIndex >= slides.length || nextIndex < 0) {
        autoplayDirection *= -1;
        nextIndex = activeIndex + autoplayDirection;
      }

      return Math.max(0, Math.min(slides.length - 1, nextIndex));
    };

    const queueAutoplay = () => {
      clearAutoplayTimer();
      if (!canAutoplay()) return;

      autoplayTimer = window.setTimeout(() => {
        autoplayTimer = 0;

        if (!canAutoplay()) return;
        if (isTransitioning) {
          queueAutoplay();
          return;
        }

        const targetIndex = getNextAutoplayIndex();
        if (targetIndex === activeIndex) {
          queueAutoplay();
          return;
        }

        goToIndex(targetIndex, 'auto');
      }, HERO_AUTOPLAY_DELAY_MS);
    };

    const setCopyHidden = (isHidden) => {
      sectionRoot.classList.toggle('is-copy-hidden', isHidden);
    };

    const getCopyElements = (slide) => Array.from(slide.querySelectorAll(COPY_ELEMENT_SELECTOR));

    const resetSlideCopy = (slide) => {
      getCopyElements(slide).forEach((element) => {
        clearInteractiveScramble(element);
        element.textContent = element.dataset.copyFinal || '';
      });
    };

    const clearCopyLeaveState = () => {
      if (copyHideTimer) {
        window.clearTimeout(copyHideTimer);
        copyHideTimer = 0;
      }
      copyAnimationNonce += 1;
      slides.forEach((slide) => {
        slide.classList.remove('is-copy-animating');
        slide.classList.remove('is-copy-leaving');
        resetSlideCopy(slide);
      });
    };

    const hideCopyWithEffect = () => {
      clearCopyLeaveState();

      const currentSlide = slides[activeIndex];
      if (!currentSlide || reduceMotionQuery.matches) {
        setCopyHidden(true);
        return;
      }

      const runNonce = copyAnimationNonce;
      currentSlide.classList.remove('is-copy-animating');
      currentSlide.classList.add('is-copy-leaving');
      setCopyHidden(false);
      animateSlideCopyOut(currentSlide, runNonce);

      copyHideTimer = window.setTimeout(() => {
        if (runNonce !== copyAnimationNonce) return;
        currentSlide.classList.remove('is-copy-leaving');
        setCopyHidden(true);
        copyHideTimer = 0;
      }, COPY_OUT_DURATION_MS);
    };

    const prepareCopyElements = () => {
      slides.forEach((slide) => {
        getCopyElements(slide).forEach((element, idx) => {
          const finalText = normalizeText(element.textContent || '');
          element.dataset.copyFinal = finalText;
          element.textContent = finalText;
          element.style.setProperty('--copy-motion-delay', `${idx * 58}ms`);
          element.style.setProperty('--copy-out-delay', `${idx * 18}ms`);
        });
      });
    };

    const scrambleText = (element, runNonce, delayMs = 0, direction = 'in') => {
      const finalText = element.dataset.copyFinal || '';
      if (!finalText) return;

      window.setTimeout(() => {
        if (runNonce !== copyAnimationNonce) return;
        const totalSteps = direction === 'out' ? 8 : 12;
        let step = 0;

        const timer = window.setInterval(() => {
          if (runNonce !== copyAnimationNonce) {
            window.clearInterval(timer);
            element.textContent = finalText;
            return;
          }

          step += 1;
          if (direction === 'in' && step >= totalSteps) {
            window.clearInterval(timer);
            element.textContent = finalText;
            return;
          }

          const revealIndex = Math.floor((step / totalSteps) * finalText.length);
          let output = '';

          for (let i = 0; i < finalText.length; i += 1) {
            const finalChar = finalText[i];
            if (preserveScrambleChar(finalChar)) {
              output += finalChar;
            } else if (direction === 'out') {
              output += i <= revealIndex
                ? SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
                : finalChar;
            } else if (i <= revealIndex) {
              output += finalChar;
            } else {
              output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            }
          }

          element.textContent = output;

          if (direction === 'out' && step >= totalSteps) {
            window.clearInterval(timer);
          }
        }, 28);
      }, delayMs);
    };

    const animateSlideCopy = (index) => {
      const slide = slides[index];
      if (!slide) return;

      const copyElements = getCopyElements(slide);
      if (!copyElements.length) return;

      slide.classList.remove('is-copy-animating');
      if (reduceMotionQuery.matches) {
        copyElements.forEach((element) => {
          element.textContent = element.dataset.copyFinal || '';
        });
        return;
      }

      const runNonce = ++copyAnimationNonce;
      slide.classList.add('is-copy-animating');
      window.setTimeout(() => {
        if (runNonce !== copyAnimationNonce) return;
        slide.classList.remove('is-copy-animating');
      }, 460);

      copyElements.forEach((element, idx) => {
        scrambleText(element, runNonce, idx * 55, 'in');
      });
    };

    const animateSlideCopyOut = (slide, runNonce) => {
      const copyElements = getCopyElements(slide);
      if (!copyElements.length) return;

      copyElements.forEach((element, idx) => {
        scrambleText(element, runNonce, idx * 16, 'out');
      });
    };

    const revealCopyWithEffect = (index) => {
      clearCopyLeaveState();
      setCopyHidden(false);
      requestAnimationFrame(() => animateSlideCopy(index));
    };

    const clearNavigationControlAnimation = (controlEl) => {
      if (!controlEl) return null;
      const state = navControlAnimationState.get(controlEl);
      if (!state) return null;

      if (state.hideTimer) {
        window.clearTimeout(state.hideTimer);
        state.hideTimer = 0;
      }

      if (state.classTimer) {
        window.clearTimeout(state.classTimer);
        state.classTimer = 0;
      }

      if (state.pulseTimer) {
        window.clearTimeout(state.pulseTimer);
        state.pulseTimer = 0;
      }

      return state;
    };

    const applyNavigationControlState = (controlEl, isVisible) => {
      if (!controlEl) return;
      clearNavigationControlAnimation(controlEl);
      clearInteractiveScramble(controlEl);
      controlEl.classList.remove('is-nav-entering', 'is-nav-leaving', 'is-nav-pulsing');
      controlEl.hidden = false;
      controlEl.disabled = !isVisible;
      controlEl.setAttribute('aria-disabled', isVisible ? 'false' : 'true');
      controlEl.classList.toggle('is-disabled', !isVisible);
    };

    const animateNavigationControlState = (controlEl, isVisible) => {
      if (!controlEl) return;

      let state = clearNavigationControlAnimation(controlEl);
      if (!state) {
        state = {
          nonce: 0,
          hideTimer: 0,
          classTimer: 0,
          pulseTimer: 0
        };
      }

      state.nonce += 1;
      navControlAnimationState.set(controlEl, state);
      const runNonce = state.nonce;

      clearInteractiveScramble(controlEl);
      controlEl.classList.remove('is-nav-entering', 'is-nav-leaving', 'is-nav-pulsing');

      if (reduceMotionQuery.matches) {
        applyNavigationControlState(controlEl, isVisible);
        return;
      }

      const currentState = navControlAnimationState.get(controlEl);
      if (!currentState || currentState.nonce !== runNonce) return;

      controlEl.hidden = false;
      controlEl.disabled = !isVisible;
      controlEl.setAttribute('aria-disabled', isVisible ? 'false' : 'true');
      controlEl.classList.toggle('is-disabled', !isVisible);
    };

    const pulseNavigationControl = (controlEl) => {
      if (!controlEl || controlEl.hidden || reduceMotionQuery.matches) return;
      if (controlEl.classList.contains('is-disabled')) return;
      if (controlEl.classList.contains('is-nav-entering') || controlEl.classList.contains('is-nav-leaving')) return;

      let state = navControlAnimationState.get(controlEl);
      if (!state) {
        state = {
          nonce: 0,
          hideTimer: 0,
          classTimer: 0,
          pulseTimer: 0
        };
        navControlAnimationState.set(controlEl, state);
      }

      if (state.pulseTimer) {
        window.clearTimeout(state.pulseTimer);
        state.pulseTimer = 0;
      }

      clearInteractiveScramble(controlEl);
      controlEl.classList.remove('is-nav-pulsing');
      void controlEl.offsetWidth;
      controlEl.classList.add('is-nav-pulsing');
      runInteractiveScramble(controlEl, { direction: 'in' });

      state.pulseTimer = window.setTimeout(() => {
        const currentState = navControlAnimationState.get(controlEl);
        if (!currentState) return;
        controlEl.classList.remove('is-nav-pulsing');
        currentState.pulseTimer = 0;
      }, NAV_CONTROL_PULSE_MS);
    };

    const updateNavigationTriggerState = () => {
      const hasPrev = activeIndex > 0;
      const hasNext = activeIndex < slides.length - 1;
      const shouldPulseControls = hasInitializedNavigation;

      if (prevTriggerEl) {
        if (hasInitializedNavigation) {
          animateNavigationControlState(prevTriggerEl, hasPrev);
        } else {
          applyNavigationControlState(prevTriggerEl, hasPrev);
        }
      }

      if (nextTriggerEl) {
        if (hasInitializedNavigation) {
          animateNavigationControlState(nextTriggerEl, hasNext);
        } else {
          applyNavigationControlState(nextTriggerEl, hasNext);
        }
      }

      hasInitializedNavigation = true;

      if (shouldPulseControls) {
        pulseNavigationControl(prevTriggerEl);
        pulseNavigationControl(nextTriggerEl);
      }
    };

    const alignTechFrameToCopyGrid = () => {
      if (!techFrameEl) return;
      const activeSlide = slides[activeIndex];
      if (!activeSlide) return;

      const activeCopyGrid = activeSlide.querySelector('.video-hero__copy-grid');
      const overlayRect = techFrameEl.parentElement?.getBoundingClientRect();
      if (!activeCopyGrid || !overlayRect) {
        sectionRoot.style.removeProperty('--tech-frame-center-y');
        return;
      }

      const copyRect = activeCopyGrid.getBoundingClientRect();
      const copyCenterY = copyRect.top + (copyRect.height / 2) - overlayRect.top;
      sectionRoot.style.setProperty('--tech-frame-center-y', `${copyCenterY}px`);
    };

    const queueTechFrameAlignment = () => {
      if (!techFrameEl) return;
      window.requestAnimationFrame(alignTechFrameToCopyGrid);
    };

    const updateScrollCopyOpacity = (targetOpacity, immediate = false) => {
      const clampedTarget = clamp(targetOpacity, 0, 1);
      const now = window.performance?.now ? window.performance.now() : Date.now();

      if (immediate) {
        renderedCopyOpacity = clampedTarget;
        lastCopyOpacityTimestamp = now;
      } else {
        if (!Number.isFinite(lastCopyOpacityTimestamp) || lastCopyOpacityTimestamp <= 0) {
          lastCopyOpacityTimestamp = now;
        }

        const delta = Math.max(0, Math.min(80, now - lastCopyOpacityTimestamp));
        const smoothing = 1 - Math.exp(-delta / 220);
        lastCopyOpacityTimestamp = now;
        renderedCopyOpacity += (clampedTarget - renderedCopyOpacity) * smoothing;

        if (Math.abs(clampedTarget - renderedCopyOpacity) <= 0.003) {
          renderedCopyOpacity = clampedTarget;
        }
      }

      sectionRoot.style.setProperty('--hero-copy-scroll-opacity', `${renderedCopyOpacity.toFixed(3)}`);
      sectionRoot.classList.toggle(
        'is-scroll-copy-hidden',
        clampedTarget <= 0.01 && renderedCopyOpacity <= 0.01
      );

      return renderedCopyOpacity;
    };

    const applyScrollEffect = () => {
      scrollEffectFrame = 0;
      if (!contentWrapEl) return;

      const sectionRect = sectionRoot.getBoundingClientRect();
      const sectionHeight = Math.max(sectionRect.height, 1);
      const scrollPastTop = Math.max(0, -sectionRect.top);
      const traveled = Math.min(scrollPastTop, sectionHeight);
      const scrollProgress = clamp(traveled / sectionHeight, 0, 1);
      const fadeStartProgress = 0.06;
      const fadeEndProgress = 0.42;

      let copyOpacity = 1;
      if (scrollProgress >= fadeEndProgress) {
        copyOpacity = 0;
      } else if (scrollProgress > fadeStartProgress) {
        copyOpacity = 1 - ((scrollProgress - fadeStartProgress) / (fadeEndProgress - fadeStartProgress));
      }

      if (reduceMotionQuery.matches) {
        updateScrollCopyOpacity(copyOpacity, true);
        sectionRoot.style.setProperty('--hero-content-parallax-y', '0px');
        sectionRoot.style.setProperty('--hero-media-parallax-y', '0px');
        queueTechFrameAlignment();
        return;
      }

      const parallaxFactor = window.innerWidth <= breakpoint ? 0.2 : 0.3;
      const parallaxOffset = traveled * parallaxFactor;
      const currentCopyOpacity = updateScrollCopyOpacity(copyOpacity);

      const mediaParallaxRatio = window.innerWidth <= breakpoint ? 0.82 : 0.88;
      const mediaParallaxOffset = parallaxOffset * mediaParallaxRatio;

      sectionRoot.style.setProperty('--hero-content-parallax-y', `${parallaxOffset.toFixed(2)}px`);
      sectionRoot.style.setProperty('--hero-media-parallax-y', `${mediaParallaxOffset.toFixed(2)}px`);
      queueTechFrameAlignment();

      if (Math.abs(copyOpacity - currentCopyOpacity) > 0.003) {
        queueScrollEffect();
      }
    };

    const queueScrollEffect = () => {
      if (scrollEffectFrame) return;
      scrollEffectFrame = window.requestAnimationFrame(applyScrollEffect);
    };

    const setSlideState = (index) => {
      activeIndex = index;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
      });
      stepEls.forEach((stepEl, i) => {
        stepEl.classList.toggle('is-active', i === index);
        stepEl.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
      sideStepEls.forEach((stepEl, i) => {
        stepEl.classList.toggle('is-active', i === index);
        stepEl.classList.toggle('is-past', i < index);
      });
      updateNavigationTriggerState();
      queueTechFrameAlignment();
    };

    const showImage = (index, withFade = false, keepTransitionVisible = false) => {
      if (!imageEl || !placeholderEl || !transitionEl) return Promise.resolve(false);
      const media = getMediaForSlide(index);

      if (!media || !media.imageUrl) {
        imageEl.classList.remove('is-visible', 'is-fading');
        placeholderEl.classList.add('is-visible');
        if (!keepTransitionVisible) {
          resetTransition();
        }
        return Promise.resolve(false);
      }

      if (imageEl.getAttribute('src') !== media.imageUrl) {
        imageEl.setAttribute('src', media.imageUrl);
      }
      imageEl.setAttribute('alt', media.alt || '');
      placeholderEl.classList.remove('is-visible');

      if (!keepTransitionVisible) {
        resetTransition();
      }

      if (withFade) {
        imageEl.classList.remove('is-fading');
        void imageEl.offsetWidth;
        imageEl.classList.add('is-fading');
        window.setTimeout(() => imageEl.classList.remove('is-fading'), 260);
      }

      imageEl.classList.add('is-visible');
      return waitForRenderedImage(media.imageUrl);
    };

    const resolveTransitionUrl = (fromIndex, targetIndex, direction) => {
      const fromMedia = getMediaForSlide(fromIndex);
      const targetMedia = getMediaForSlide(targetIndex);

      if (direction === 'next') {
        return (fromMedia && fromMedia.transitionNextUrl) || (targetMedia && targetMedia.transitionPrevUrl) || '';
      }

      return (fromMedia && fromMedia.transitionPrevUrl) || (targetMedia && targetMedia.transitionNextUrl) || '';
    };

    const playTransitionTo = (targetIndex, direction) => {
      if (!transitionEl) {
        swapSlideWithCopyTransition(targetIndex);
        return;
      }

      const transitionUrl = resolveTransitionUrl(activeIndex, targetIndex, direction);
      const targetMediaPromise = prepareImageForSlide(targetIndex);

      if (!transitionUrl) {
        swapSlideWithCopyTransition(targetIndex);
        return;
      }

      if (activeTransitionCleanup) {
        activeTransitionCleanup(false);
      }

      hideCopyWithEffect();
      isTransitioning = true;
      const currentNonce = ++transitionNonce;

      let isDone = false;
      let timeoutId = 0;
      const onEnd = () => finish(true);
      const onError = () => finish(true);

      const finish = (applyTarget = true, invalidate = false) => {
        if (isDone) return;
        if (currentNonce !== transitionNonce && !invalidate) return;
        isDone = true;
        if (invalidate) transitionNonce += 1;

        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timeoutId = 0;
        }

        transitionEl.removeEventListener('ended', onEnd);
        transitionEl.removeEventListener('error', onError);

        if (!applyTarget) {
          isTransitioning = false;
          activeTransitionCleanup = null;
          clearCopyLeaveState();
          setCopyHidden(false);
          resetTransition();
          queueAutoplay();
          return;
        }

        targetMediaPromise.finally(() => {
          if (currentNonce !== transitionNonce) return;

          setSlideState(targetIndex);
          showImage(targetIndex, false, true).finally(() => {
            if (currentNonce !== transitionNonce) return;
            isTransitioning = false;
            activeTransitionCleanup = null;
            revealCopyWithEffect(targetIndex);
            resetTransition();
            queueAutoplay();
          });
        });
      };

      activeTransitionCleanup = (applyTarget = false) => finish(applyTarget, true);
      transitionEl.addEventListener('ended', onEnd, { once: true });
      transitionEl.addEventListener('error', onError, { once: true });
      timeoutId = window.setTimeout(() => finish(true), 6000);

      transitionEl.classList.add('is-visible');
      if (transitionEl.getAttribute('src') !== transitionUrl) {
        transitionEl.setAttribute('src', transitionUrl);
      }
      transitionEl.muted = true;
      transitionEl.load();
      try {
        transitionEl.currentTime = 0;
      } catch (_error) {
        // Some browsers block seeking before metadata is loaded.
      }
      transitionEl.play().catch(() => finish(true));
    };

    const swapSlideWithCopyTransition = (targetIndex) => {
      if (targetIndex < 0 || targetIndex >= slides.length) return;

      isTransitioning = true;
      const currentNonce = ++transitionNonce;
      let timeoutId = 0;
      const targetMediaPromise = prepareImageForSlide(targetIndex);

      const finish = (applyTarget = true, invalidate = false) => {
        if (currentNonce !== transitionNonce && !invalidate) return;
        if (invalidate) transitionNonce += 1;

        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timeoutId = 0;
        }

        if (!applyTarget) {
          isTransitioning = false;
          activeTransitionCleanup = null;
          clearCopyLeaveState();
          setCopyHidden(false);
          queueAutoplay();
          return;
        }

        targetMediaPromise.finally(() => {
          if (currentNonce !== transitionNonce) return;

          setSlideState(targetIndex);
          showImage(targetIndex, true).finally(() => {
            if (currentNonce !== transitionNonce) return;
            isTransitioning = false;
            activeTransitionCleanup = null;
            revealCopyWithEffect(targetIndex);
            queueAutoplay();
          });
        });
      };

      activeTransitionCleanup = (applyTarget = false) => finish(applyTarget, true);
      hideCopyWithEffect();

      if (reduceMotionQuery.matches) {
        finish(true);
        return;
      }

      timeoutId = window.setTimeout(() => finish(true), COPY_OUT_DURATION_MS);
    };

    const goToIndex = (targetIndex, source = 'manual') => {
      if (source !== 'auto') {
        clearAutoplayTimer();
      }

      if (targetIndex < 0 || targetIndex >= slides.length || targetIndex === activeIndex) return;

      if (isTransitioning && activeTransitionCleanup) {
        activeTransitionCleanup(false);
      }

      if (targetIndex === activeIndex + 1) {
        playTransitionTo(targetIndex, 'next');
        return;
      }

      if (targetIndex === activeIndex - 1) {
        playTransitionTo(targetIndex, 'prev');
        return;
      }

      swapSlideWithCopyTransition(targetIndex);
    };

    const handleHorizontalWheel = (event) => {
      if (slides.length < 2 || reduceMotionQuery.matches) return;

      const primaryDelta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
      if (!primaryDelta) return;

      const absDeltaX = Math.abs(primaryDelta);
      const absDeltaY = Math.abs(event.deltaY);
      if (absDeltaX < 12 || absDeltaX < absDeltaY) return;

      event.preventDefault();

      if (wheelResetTimer) {
        window.clearTimeout(wheelResetTimer);
      }

      wheelDeltaX += primaryDelta;
      wheelResetTimer = window.setTimeout(() => {
        wheelDeltaX = 0;
        wheelResetTimer = 0;
      }, 180);

      if (isTransitioning) return;

      if (wheelDeltaX >= 90 && activeIndex < slides.length - 1) {
        wheelDeltaX = 0;
        goToIndex(activeIndex + 1);
        return;
      }

      if (wheelDeltaX <= -90 && activeIndex > 0) {
        wheelDeltaX = 0;
        goToIndex(activeIndex - 1);
      }
    };

    if (prevTriggerEl) {
      prevTriggerEl.addEventListener('click', () => {
        const target = activeIndex - 1;
        if (target >= 0) {
          goToIndex(target);
        }
      });
    }

    if (nextTriggerEl) {
      nextTriggerEl.addEventListener('click', () => {
        const target = activeIndex + 1;
        if (target < slides.length) {
          goToIndex(target);
        }
      });
    }

    stepEls.forEach((stepEl) => {
      stepEl.addEventListener('click', () => {
        const target = Number(stepEl.dataset.jumpIndex);
        if (Number.isInteger(target)) {
          goToIndex(target);
        }
      });
    });

    const syncForViewport = () => {
      if (isTransitioning) return;
      showImage(activeIndex, false);
      queueTechFrameAlignment();
      queueScrollEffect();
      queueAutoplay();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearAutoplayTimer();
        return;
      }

      queueAutoplay();
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', syncForViewport);
    } else {
      mediaQuery.addListener(syncForViewport);
    }

    window.addEventListener('resize', queueTechFrameAlignment);
    window.addEventListener('resize', queueScrollEffect);
    window.addEventListener('scroll', queueScrollEffect, { passive: true });
    sectionRoot.addEventListener('wheel', handleHorizontalWheel, { passive: false });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    prepareCopyElements();
    prepareImageForSlide(0);
    setCopyHidden(false);
    setSlideState(0);
    showImage(0, false);
    queueTechFrameAlignment();
    queueScrollEffect();
    queueAutoplay();
  };

  const initCollectionStacks = (sectionRoot) => {
    if (!sectionRoot || sectionRoot.dataset.collectionStacksInit === 'true') return;
    sectionRoot.dataset.collectionStacksInit = 'true';

    const rows = Array.from(sectionRoot.querySelectorAll('.collection-slider__row'));
    if (!rows.length) return;

    const quickAddForms = Array.from(sectionRoot.querySelectorAll('[data-quick-add-form]'));
    const desktopQuery = window.matchMedia('(min-width: 981px)');

    const getScrollStep = (track) => {
      if (!track) return 0;
      const firstCard = track.querySelector('[data-product-card]');
      if (!firstCard) return 0;
      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
      const width = firstCard.getBoundingClientRect().width;
      return width + gap;
    };

    const getNumericVar = (name, fallbackValue) => {
      const raw = window.getComputedStyle(sectionRoot).getPropertyValue(name);
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : fallbackValue;
    };

    const syncDesktopCardFormat = () => {
      if (!desktopQuery.matches) {
        sectionRoot.style.removeProperty('--collection-slider-card-width-current');
        sectionRoot.style.removeProperty('--collection-slider-row-height-current');
        return;
      }

      const firstViewport = rows[0]?.querySelector('[data-stack-viewport]');
      if (!firstViewport) return;

      const viewportWidth = firstViewport.clientWidth || firstViewport.getBoundingClientRect().width;
      if (!viewportWidth) return;

      const visibleSlots = Math.max(1, getNumericVar('--collection-slider-visible-slots', 4));
      const minCardWidth = getNumericVar(
        '--collection-slider-min-card-width',
        getNumericVar('--collection-slider-card-width', 260)
      );
      const minRowHeight = getNumericVar('--collection-slider-row-height', 380);
      const baseCardWidth = Math.max(minCardWidth, viewportWidth / visibleSlots);
      const computedCardWidth = baseCardWidth;
      const computedRowHeight = Math.max(minRowHeight, (computedCardWidth * 5) / 4);

      sectionRoot.style.setProperty('--collection-slider-card-width-current', `${computedCardWidth}px`);
      sectionRoot.style.setProperty('--collection-slider-row-height-current', `${computedRowHeight}px`);
    };

    rows.forEach((row, rowIndex) => {
      const viewport = row.querySelector('[data-stack-viewport]');
      const track = row.querySelector('[data-stack-track]');
      const prevButton = row.querySelector('[data-stack-prev]');
      const nextButton = row.querySelector('[data-stack-next]');
      const loopSize = Number.parseInt(track?.dataset.loopSize || '0', 10);
      const hasInfiniteLoop = Number.isInteger(loopSize) && loopSize > 0;

      if (!viewport || !track || !prevButton || !nextButton) return;

      const fixedQuickAddButtons = Array.from(row.querySelectorAll('[data-fixed-quick-add-slot]'));
      const productCards = Array.from(track.querySelectorAll('[data-product-card]'));
      const fixedQuickAddTargets = new WeakMap();
      let isProgrammaticScroll = false;
      let hasManualScroll = false;
      let hasUserInteracted = false;
      let dragPointerId = null;
      let dragLastX = 0;
      let dragAccumDelta = 0;
      let dragDidMove = false;
      let dragPointerCaptured = false;
      let dragPointerWasMouse = false;
      let dragClickLink = null;
      let suppressClick = false;
      let wheelAccumDelta = 0;
      let wheelResetTimer = null;
      let scrollEndTimer = null;
      let scrollAnimFrame = 0;
      let scrollAnimToken = 0;
      let programmaticTargetLeft = null;
      let programmaticScrollEndTimer = null;
      let viewportRealignFrame = 0;
      let autoSlideFrame = 0;
      let autoSlideState = 0;
      let previousAutoSlideRowTop = null;
      const TRACKPAD_STEP_THRESHOLD = 70;
      const TRACKPAD_MAX_STEPS_PER_GESTURE = 3;
      const TRACKPAD_GESTURE_RESET_MS = 180;
      const TRACKPAD_NEW_GESTURE_RATIO = 1.4;
      let trackpadStepsThisGesture = 0;
      let trackpadLastDeltaAbs = 0;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const coarsePointerQuery = window.matchMedia('(pointer: coarse)');

      const getMaxScroll = () => Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const clampScroll = (value, min = 0, max = getMaxScroll()) => Math.min(Math.max(value, min), max);
      const getReferenceScrollLeft = () => {
        if (isProgrammaticScroll && Number.isFinite(programmaticTargetLeft)) {
          return programmaticTargetLeft;
        }
        return viewport.scrollLeft;
      };
      const getLoopWidth = (step) => {
        if (!hasInfiniteLoop || !step) return 0;
        return step * loopSize;
      };
      const cancelProgrammaticScroll = () => {
        if (scrollAnimFrame) {
          window.cancelAnimationFrame(scrollAnimFrame);
          scrollAnimFrame = 0;
        }

        if (programmaticScrollEndTimer) {
          window.clearTimeout(programmaticScrollEndTimer);
          programmaticScrollEndTimer = null;
        }

        scrollAnimToken += 1;
        isProgrammaticScroll = false;
        programmaticTargetLeft = null;
      };
      const isTrackpadWheelGesture = (event) => {
        if (event.deltaMode !== 0 || event.ctrlKey) return false;

        const absDeltaX = Math.abs(event.deltaX);
        const absDeltaY = Math.abs(event.deltaY);
        const hasMixedAxes = absDeltaX > 0 && absDeltaY > 0;
        const hasFractionalDelta = !Number.isInteger(event.deltaX) || !Number.isInteger(event.deltaY);

        return hasMixedAxes || hasFractionalDelta;
      };

      const withProgrammaticScroll = (targetLeft, options = {}) => {
        const { instant = false, durationMs = null } = options;
        const clampedTarget = clampScroll(targetLeft);
        const startLeft = viewport.scrollLeft;
        const delta = clampedTarget - startLeft;
        if (scrollEndTimer) {
          window.clearTimeout(scrollEndTimer);
          scrollEndTimer = null;
        }

        if (scrollAnimFrame) {
          window.cancelAnimationFrame(scrollAnimFrame);
          scrollAnimFrame = 0;
        }

        if (programmaticScrollEndTimer) {
          window.clearTimeout(programmaticScrollEndTimer);
          programmaticScrollEndTimer = null;
        }

        scrollAnimToken += 1;
        const currentToken = scrollAnimToken;
        isProgrammaticScroll = true;
        programmaticTargetLeft = clampedTarget;

        if (instant || prefersReducedMotion || Math.abs(delta) < 1) {
          viewport.scrollLeft = clampedTarget;
          window.requestAnimationFrame(() => {
            if (currentToken !== scrollAnimToken) return;
            normalizeInfinitePosition();
            isProgrammaticScroll = false;
            programmaticTargetLeft = null;
            updateControls();
          });
          return;
        }

        const duration = Number.isFinite(durationMs)
          ? Math.max(180, durationMs)
          : Math.min(520, Math.max(260, Math.abs(delta) * 0.7));
        const shouldUseNativeSmoothScroll = (
          !instant
          && !prefersReducedMotion
          && (window.innerWidth <= 640 || coarsePointerQuery.matches)
          && typeof viewport.scrollTo === 'function'
        );

        if (shouldUseNativeSmoothScroll) {
          viewport.scrollTo({
            left: clampedTarget,
            behavior: 'smooth'
          });
          updateControls();

          programmaticScrollEndTimer = window.setTimeout(() => {
            programmaticScrollEndTimer = null;
            if (currentToken !== scrollAnimToken) return;
            normalizeInfinitePosition();
            isProgrammaticScroll = false;
            programmaticTargetLeft = null;
            updateControls();
          }, duration + 140);
          return;
        }

        const startTime = window.performance.now();
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const animate = (now) => {
          if (currentToken !== scrollAnimToken) return;

          const progress = Math.min(1, (now - startTime) / duration);
          const eased = easeOutCubic(progress);
          viewport.scrollLeft = startLeft + (delta * eased);
          updateControls();

          if (progress < 1) {
            scrollAnimFrame = window.requestAnimationFrame(animate);
            return;
          }

          scrollAnimFrame = 0;
          viewport.scrollLeft = clampedTarget;
          normalizeInfinitePosition();
          isProgrammaticScroll = false;
          programmaticTargetLeft = null;
          updateControls();
        };

        scrollAnimFrame = window.requestAnimationFrame(animate);
      };

      const getBaseOffset = (step) => {
        if (!step) return 0;
        const desktopPeekRatio = getNumericVar('--collection-slider-desktop-peek-ratio', 0.5);
        const mobilePeekRatio = getNumericVar('--collection-slider-mobile-peek-ratio', 0);
        if (hasInfiniteLoop) {
          const loopBase = getLoopWidth(step);
          return loopBase + (step * (desktopQuery.matches ? desktopPeekRatio : mobilePeekRatio));
        }
        return step * (desktopQuery.matches ? desktopPeekRatio : mobilePeekRatio);
      };
      const getPositiveIndex = (value, size) => {
        if (!size) return 0;
        return ((value % size) + size) % size;
      };
      const getCurrentStepIndex = () => {
        const step = getScrollStep(track);
        if (!step) return 0;

        const baseOffset = getBaseOffset(step);
        const rawIndex = Math.round((getReferenceScrollLeft() - baseOffset) / step);
        if (hasInfiniteLoop) {
          return getPositiveIndex(rawIndex, loopSize);
        }
        return Math.max(0, rawIndex);
      };
      const getCurrentRawStepIndex = () => {
        const step = getScrollStep(track);
        if (!step) return 0;

        const baseOffset = getBaseOffset(step);
        return Math.round((getReferenceScrollLeft() - baseOffset) / step);
      };
      const alignToStepIndex = (index, options = {}) => {
        const { instant = true } = options;
        const step = getScrollStep(track);
        if (!step) return;

        const baseOffset = getBaseOffset(step);
        let targetIndex = Number.isFinite(index) ? index : 0;

        if (hasInfiniteLoop) {
          targetIndex = getPositiveIndex(targetIndex, loopSize);
        } else {
          const maxIndex = Math.max(0, Math.round((getMaxScroll() - baseOffset) / step));
          targetIndex = Math.max(0, Math.min(maxIndex, targetIndex));
        }

        const targetLeft = baseOffset + (targetIndex * step);
        withProgrammaticScroll(targetLeft, { instant });
      };
      const alignToRawStepIndex = (index, options = {}) => {
        if (!hasInfiniteLoop) {
          alignToStepIndex(index, options);
          return;
        }

        const { instant = true } = options;
        const step = getScrollStep(track);
        if (!step) return;

        const baseOffset = getBaseOffset(step);
        const targetRawIndex = Number.isFinite(index) ? index : 0;
        const targetLeft = baseOffset + (targetRawIndex * step);
        withProgrammaticScroll(targetLeft, { instant });
      };
      const realignAfterViewportChange = () => {
        const anchorIndex = getCurrentStepIndex();

        syncDesktopCardFormat();
        syncFixedGrid();

        window.requestAnimationFrame(() => {
          alignToStepIndex(anchorIndex, { instant: true });
          window.requestAnimationFrame(() => {
            syncFixedGrid();
            updateControls();
            queueAutoSlide();
          });
        });
      };
      const queueViewportRealign = () => {
        if (viewportRealignFrame) return;
        viewportRealignFrame = window.requestAnimationFrame(() => {
          viewportRealignFrame = 0;
          realignAfterViewportChange();
        });
      };
      const getAutoSlideThresholdRatio = () => {
        if (rowIndex === 0) return 0.5;
        if (rowIndex === 1) return 0.2;
        return null;
      };
      const applyAutoSlide = () => {
        autoSlideFrame = 0;

        const thresholdRatio = getAutoSlideThresholdRatio();
        if (!Number.isFinite(thresholdRatio)) return;

        if (getMaxScroll() <= 2) return;

        const viewportHeight = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
        if (!viewportHeight) return;

        const rowRect = row.getBoundingClientRect();
        const triggerLine = viewportHeight * thresholdRatio;
        const currentRowTop = rowRect.top;

        if (!Number.isFinite(previousAutoSlideRowTop)) {
          previousAutoSlideRowTop = currentRowTop;
          return;
        }

        if (hasUserInteracted || dragPointerId !== null || isProgrammaticScroll) {
          previousAutoSlideRowTop = currentRowTop;
          return;
        }

        const crossedForward = previousAutoSlideRowTop > triggerLine && currentRowTop <= triggerLine;
        const crossedBackward = previousAutoSlideRowTop < triggerLine && currentRowTop >= triggerLine;
        previousAutoSlideRowTop = currentRowTop;

        if (crossedForward && autoSlideState === 0) {
          autoSlideState = 1;
          scrollByStep(1, {
            durationMs: window.innerWidth <= 640 ? 420 : 320
          });
          return;
        }

        if (crossedBackward && autoSlideState === 1) {
          autoSlideState = 0;
          scrollByStep(-1, {
            durationMs: window.innerWidth <= 640 ? 420 : 320
          });
        }
      };
      const queueAutoSlide = () => {
        if (autoSlideFrame) return;
        autoSlideFrame = window.requestAnimationFrame(applyAutoSlide);
      };
      const setFixedQuickAddTarget = (buttonEl, formEl) => {
        if (!buttonEl) return;

        fixedQuickAddTargets.set(buttonEl, formEl || null);

        const sourceButton = formEl?.querySelector('button[type="submit"]');
        const canSubmit = Boolean(formEl && sourceButton && !sourceButton.disabled);

        buttonEl.disabled = !canSubmit;
        buttonEl.classList.toggle('is-disabled', !canSubmit);
        buttonEl.setAttribute('aria-disabled', canSubmit ? 'false' : 'true');

        const label = canSubmit
          ? sourceButton.getAttribute('aria-label') || 'Ajouter au panier'
          : 'Ajouter au panier';
        buttonEl.setAttribute('aria-label', label);
      };
      const syncFixedQuickAddButtons = () => {
        if (!fixedQuickAddButtons.length) return;

        const step = getScrollStep(track);
        if (!step) {
          fixedQuickAddButtons.forEach((buttonEl) => {
            setFixedQuickAddTarget(buttonEl, null);
          });
          return;
        }

        const baseOffset = getBaseOffset(step);
        const normalizedBaseOffset = ((baseOffset % step) + step) % step;
        const currentIndex = Math.round((viewport.scrollLeft - baseOffset) / step);
        const leftInset = 14;

        fixedQuickAddButtons.forEach((buttonEl, slotIndex) => {
          const slotStartX = normalizedBaseOffset + (slotIndex * step);
          buttonEl.style.left = `${slotStartX + leftInset}px`;

          if (!productCards.length) {
            setFixedQuickAddTarget(buttonEl, null);
            return;
          }

          const productIndex = getPositiveIndex(currentIndex + slotIndex, productCards.length);
          const cardEl = productCards[productIndex];
          const formEl = cardEl?.querySelector('[data-quick-add-form]') || null;
          setFixedQuickAddTarget(buttonEl, formEl);
        });
      };
      const normalizeInfinitePosition = () => {
        if (!hasInfiniteLoop) return;

        const step = getScrollStep(track);
        if (!step) return;

        const loopWidth = getLoopWidth(step);
        if (!loopWidth) return;

        const baseOffset = getBaseOffset(step);
        const minAnchor = baseOffset - (loopWidth * 0.5);
        const maxAnchor = baseOffset + (loopWidth * 0.5);
        let adjusted = viewport.scrollLeft;

        while (adjusted < minAnchor) adjusted += loopWidth;
        while (adjusted > maxAnchor) adjusted -= loopWidth;

        adjusted = clampScroll(adjusted);

        if (Math.abs(adjusted - viewport.scrollLeft) > 0.5) {
          viewport.scrollLeft = adjusted;
          if (isProgrammaticScroll && Number.isFinite(programmaticTargetLeft)) {
            programmaticTargetLeft = adjusted;
          }
        }
      };
      const syncFixedGrid = () => {
        const step = getScrollStep(track);
        if (!step) {
          row.style.removeProperty('--collection-slider-grid-offset');
          row.style.removeProperty('--collection-slider-grid-step');
          return;
        }

        const baseOffset = getBaseOffset(step);
        const normalizedOffset = ((baseOffset % step) + step) % step;
        row.style.setProperty('--collection-slider-grid-offset', `${normalizedOffset}px`);
        row.style.setProperty('--collection-slider-grid-step', `${step}px`);
      };

      const applyDesktopPeekOffset = (force = false) => {
        const step = getScrollStep(track);
        if (!step) return;

        const targetOffset = getBaseOffset(step);
        syncFixedGrid();

        if (!force && hasManualScroll) return;
        if (Math.abs(viewport.scrollLeft - targetOffset) < 1) return;

        withProgrammaticScroll(targetOffset);
      };

      const updateControls = () => {
        if (hasInfiniteLoop) {
          const step = getScrollStep(track);
          const canLoop = Boolean(step) && loopSize > 1 && getMaxScroll() > 2;
          prevButton.classList.toggle('is-disabled', !canLoop);
          nextButton.classList.toggle('is-disabled', !canLoop);
          syncFixedQuickAddButtons();
          return;
        }

        const maxScroll = getMaxScroll();
        const step = getScrollStep(track);
        const baseOffset = getBaseOffset(step);
        const isAtStart = viewport.scrollLeft <= baseOffset + 2;
        const isAtEnd = viewport.scrollLeft >= maxScroll - 2;

        prevButton.classList.toggle('is-disabled', isAtStart);
        nextButton.classList.toggle('is-disabled', isAtEnd || maxScroll <= 2);
        syncFixedQuickAddButtons();
      };

      const scrollByStep = (direction, options = {}) => {
        const step = getScrollStep(track) || viewport.clientWidth * 0.75;
        if (!step) return;

        if (hasInfiniteLoop) {
          const baseOffset = getBaseOffset(step);
          const currentIndex = Math.round((getReferenceScrollLeft() - baseOffset) / step);
          const target = baseOffset + ((currentIndex + direction) * step);
          withProgrammaticScroll(target, options);
          return;
        }

        const maxScroll = getMaxScroll();
        const baseOffset = getBaseOffset(step);
        const currentIndex = Math.round((getReferenceScrollLeft() - baseOffset) / step);
        const target = clampScroll(baseOffset + ((currentIndex + direction) * step), baseOffset, maxScroll);

        withProgrammaticScroll(target, options);
      };
      const snapToNearestStep = (options = {}) => {
        const { instant = false } = options;
        const step = getScrollStep(track);
        if (!step) return;

        const maxScroll = getMaxScroll();
        const baseOffset = getBaseOffset(step);
        const rawIndex = Math.round((viewport.scrollLeft - baseOffset) / step);
        const maxIndex = Math.max(0, Math.round((maxScroll - baseOffset) / step));
        const targetIndex = hasInfiniteLoop ? rawIndex : Math.max(0, Math.min(maxIndex, rawIndex));
        const minTarget = hasInfiniteLoop ? 0 : baseOffset;
        const targetLeft = clampScroll(baseOffset + (targetIndex * step), minTarget, maxScroll);

        withProgrammaticScroll(targetLeft, { instant });
      };

      prevButton.addEventListener('click', () => {
        if (prevButton.classList.contains('is-disabled')) return;
        hasManualScroll = true;
        hasUserInteracted = true;
        scrollByStep(-1);
      });

      nextButton.addEventListener('click', () => {
        if (nextButton.classList.contains('is-disabled')) return;
        hasManualScroll = true;
        hasUserInteracted = true;
        scrollByStep(1);
      });

      fixedQuickAddButtons.forEach((buttonEl) => {
        if (!buttonEl || buttonEl.dataset.fixedQuickAddInit === 'true') return;
        buttonEl.dataset.fixedQuickAddInit = 'true';

        buttonEl.addEventListener('click', (event) => {
          event.preventDefault();

          const targetForm = fixedQuickAddTargets.get(buttonEl);
          const submitButton = targetForm?.querySelector('button[type="submit"]');
          if (!targetForm || !submitButton || submitButton.disabled) return;

          if (typeof targetForm.requestSubmit === 'function') {
            targetForm.requestSubmit(submitButton);
            return;
          }

          submitButton.click();
        });
      });

      viewport.addEventListener('wheel', (event) => {
        if (getMaxScroll() <= 2) return;

        const horizontalIntent = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
        if (!horizontalIntent) return;

        const dominantDelta = Math.abs(event.deltaX) > 0 ? event.deltaX : event.deltaY;
        const currentDeltaAbs = Math.abs(dominantDelta);
        if (currentDeltaAbs < 0.5) return;

        event.preventDefault();
        hasManualScroll = true;
        hasUserInteracted = true;

        const isDirectionFlip = (
          trackpadLastDeltaAbs > 0
          && (Math.sign(dominantDelta) !== Math.sign(wheelAccumDelta) && wheelAccumDelta !== 0)
        );
        const isAmplitudeSpike = currentDeltaAbs > trackpadLastDeltaAbs * TRACKPAD_NEW_GESTURE_RATIO + 2;
        if (isDirectionFlip || isAmplitudeSpike) {
          trackpadStepsThisGesture = 0;
          if (isDirectionFlip) wheelAccumDelta = 0;
        }
        trackpadLastDeltaAbs = currentDeltaAbs;

        if (trackpadStepsThisGesture < TRACKPAD_MAX_STEPS_PER_GESTURE) {
          wheelAccumDelta += dominantDelta;

          while (
            Math.abs(wheelAccumDelta) >= TRACKPAD_STEP_THRESHOLD
            && trackpadStepsThisGesture < TRACKPAD_MAX_STEPS_PER_GESTURE
          ) {
            const direction = wheelAccumDelta > 0 ? 1 : -1;
            scrollByStep(direction);
            wheelAccumDelta -= direction * TRACKPAD_STEP_THRESHOLD;
            trackpadStepsThisGesture += 1;
          }

          if (trackpadStepsThisGesture >= TRACKPAD_MAX_STEPS_PER_GESTURE) {
            wheelAccumDelta = 0;
          }
        }

        if (wheelResetTimer) window.clearTimeout(wheelResetTimer);
        wheelResetTimer = window.setTimeout(() => {
          wheelAccumDelta = 0;
          trackpadStepsThisGesture = 0;
          trackpadLastDeltaAbs = 0;
        }, TRACKPAD_GESTURE_RESET_MS);
      }, { passive: false });

      track.addEventListener('click', (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      }, true);

      viewport.addEventListener('pointerdown', (event) => {
        const isMousePointer = event.pointerType === 'mouse';
        if (isMousePointer && event.button !== 0) return;
        if (!isMousePointer && !desktopQuery.matches) return;

        event.preventDefault();
        hasUserInteracted = true;
        if (scrollEndTimer) {
          window.clearTimeout(scrollEndTimer);
          scrollEndTimer = null;
        }

        if (scrollAnimFrame) {
          window.cancelAnimationFrame(scrollAnimFrame);
          scrollAnimFrame = 0;
        }
        scrollAnimToken += 1;
        isProgrammaticScroll = false;
        programmaticTargetLeft = null;

        dragPointerId = event.pointerId;
        dragLastX = event.clientX;
        dragAccumDelta = 0;
        dragDidMove = false;
        dragPointerCaptured = false;
        dragPointerWasMouse = isMousePointer;
        dragClickLink = isMousePointer
          ? event.target.closest('.collection-slider__product-link[href]')
          : null;
        suppressClick = false;

        viewport.classList.add('is-dragging');
        if (viewport.setPointerCapture) {
          viewport.setPointerCapture(event.pointerId);
          dragPointerCaptured = true;
        }
      });

      viewport.addEventListener('pointermove', (event) => {
        if (dragPointerId === null || event.pointerId !== dragPointerId) return;

        const deltaX = event.clientX - dragLastX;
        dragLastX = event.clientX;
        if (Math.abs(deltaX) < 0.01) return;

        dragAccumDelta += Math.abs(deltaX);
        if (!dragDidMove) {
          if (dragAccumDelta < 1.2) return;
          dragDidMove = true;
        }

        if (event.cancelable) {
          event.preventDefault();
        }

        hasManualScroll = true;
        viewport.scrollLeft = clampScroll(viewport.scrollLeft - deltaX);
        if (hasInfiniteLoop) {
          normalizeInfinitePosition();
        }

        if (dragAccumDelta > 4) {
          suppressClick = true;
        }

        updateControls();
      });

      const endDrag = (event) => {
        if (dragPointerId === null || event.pointerId !== dragPointerId) return;

        if (
          dragPointerCaptured
          && viewport.releasePointerCapture
          && viewport.hasPointerCapture?.(event.pointerId)
        ) {
          viewport.releasePointerCapture(event.pointerId);
        }

        dragPointerId = null;
        if (
          dragPointerWasMouse
          && !dragDidMove
          && dragClickLink
        ) {
          const href = dragClickLink.getAttribute('href');
          if (href) {
            const shouldOpenNewTab = event.metaKey || event.ctrlKey || dragClickLink.getAttribute('target') === '_blank';
            if (shouldOpenNewTab) {
              window.open(href, '_blank', 'noopener');
            } else {
              window.location.assign(href);
            }
          }
          updateControls();
        } else if (dragDidMove && dragAccumDelta > 0.5) {
          snapToNearestStep();
        } else {
          updateControls();
        }
        dragAccumDelta = 0;
        dragDidMove = false;
        dragPointerCaptured = false;
        dragPointerWasMouse = false;
        dragClickLink = null;
        viewport.classList.remove('is-dragging');
      };

      viewport.addEventListener('pointerup', endDrag);
      viewport.addEventListener('pointercancel', endDrag);

      viewport.addEventListener('scroll', () => {
        if (!isProgrammaticScroll) {
          hasManualScroll = true;
          normalizeInfinitePosition();
          if (scrollEndTimer) window.clearTimeout(scrollEndTimer);
          scrollEndTimer = window.setTimeout(() => {
            scrollEndTimer = null;
            if (dragPointerId !== null || isProgrammaticScroll) return;
            snapToNearestStep();
          }, 96);
        }
        updateControls();
      }, { passive: true });

      window.addEventListener('resize', queueViewportRealign);
      window.addEventListener('scroll', queueAutoSlide, { passive: true });

      if (desktopQuery.addEventListener) {
        desktopQuery.addEventListener('change', queueViewportRealign);
      } else {
        desktopQuery.addListener(queueViewportRealign);
      }

      if (typeof window.ResizeObserver === 'function') {
        const viewportResizeObserver = new window.ResizeObserver(() => {
          queueViewportRealign();
        });
        viewportResizeObserver.observe(viewport);
      }

      window.requestAnimationFrame(() => {
        syncDesktopCardFormat();
        syncFixedGrid();
        window.requestAnimationFrame(() => {
          applyDesktopPeekOffset(true);
          updateControls();
          queueAutoSlide();
        });
      });
    });

    quickAddForms.forEach((formEl) => {
      if (!formEl || formEl.dataset.quickAddInit === 'true') return;
      formEl.dataset.quickAddInit = 'true';

      const buttonEl = formEl.querySelector('button[type="submit"]');
      const idInputEl = formEl.querySelector('input[name="id"]');
      if (!buttonEl || !idInputEl) return;

      formEl.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (buttonEl.disabled) return;

        const variantId = Number(idInputEl.value);
        if (!Number.isInteger(variantId) || variantId <= 0) return;

        buttonEl.disabled = true;
        formEl.classList.remove('is-added', 'is-error');

        try {
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({
              id: variantId,
              quantity: 1
            })
          });

          if (!response.ok) {
            throw new Error('Quick add request failed');
          }

          refreshHeaderCartCount();
          formEl.classList.add('is-added');
          window.setTimeout(() => {
            formEl.classList.remove('is-added');
          }, 900);
        } catch (_error) {
          formEl.classList.add('is-error');
          window.setTimeout(() => {
            formEl.classList.remove('is-error');
          }, 1200);
        } finally {
          buttonEl.disabled = false;
        }
      });
    });
  };

  const syncProductViewMediaControls = (productViewEl, activeIndex, totalItems) => {
    const mediaPrevEl = productViewEl?.querySelector('[data-product-media-prev]');
    const mediaNextEl = productViewEl?.querySelector('[data-product-media-next]');
    if (!mediaPrevEl && !mediaNextEl) return;

    const isAtStart = activeIndex <= 0;
    const isAtEnd = activeIndex >= totalItems - 1;

    if (mediaPrevEl) {
      mediaPrevEl.disabled = isAtStart;
      mediaPrevEl.classList.toggle('is-disabled', isAtStart);
    }

    if (mediaNextEl) {
      mediaNextEl.disabled = isAtEnd;
      mediaNextEl.classList.toggle('is-disabled', isAtEnd);
    }
  };

  const PRODUCT_SIZE_US_MAP = {
    '35.5': '3.5 US',
    '36': '4 US',
    '36.5': '4.5 US',
    '36 2/3': '4.5 US',
    '37': '5 US',
    '37.5': '5 US',
    '38': '5.5 US',
    '38.5': '6 US',
    '38 2/3': '6 US',
    '39': '6.5 US',
    '39.5': '7 US',
    '40': '7 US',
    '40.5': '7.5 US',
    '40 2/3': '7.5 US',
    '41': '8 US',
    '41.5': '8.5 US',
    '42': '8.5 US',
    '42.5': '9 US',
    '42 2/3': '9 US',
    '43': '9.5 US',
    '43.5': '10 US',
    '44': '10 US',
    '44.5': '10.5 US',
    '44 2/3': '10.5 US',
    '45': '11 US',
    '45.5': '11.5 US',
    '46': '12 US',
    '46.5': '12.5 US',
    '46 2/3': '12 US',
    '47': '12.5 US',
    '47.5': '13 US',
    '48': '13.5 US',
    '48.5': '14 US',
    '49.5': '15 US'
  };

  const PRODUCT_SIZE_EU_MAP = Object.entries(PRODUCT_SIZE_US_MAP).reduce((map, [euSize, usSize]) => {
    map[usSize.replace(/\s*US$/i, '')] = euSize;
    return map;
  }, {});

  const normalizeSizeValue = (value) => (value || '')
    .replace(/,/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\.0\b/g, '')
    .trim();

  const getExplicitSizeValue = (label, unitPattern) => {
    const normalizedLabel = normalizeSizeValue(label).toUpperCase();
    const numberPattern = '(\\d+(?:\\.\\d+)?(?:\\s+2\\/3)?)';
    const groupedUnitPattern = `(?:${unitPattern})`;
    const unitBeforeMatch = normalizedLabel.match(new RegExp(`\\b${groupedUnitPattern}\\s*${numberPattern}\\b`, 'i'));
    const unitAfterMatch = normalizedLabel.match(new RegExp(`\\b${numberPattern}\\s*${groupedUnitPattern}\\b`, 'i'));
    return normalizeSizeValue(unitBeforeMatch?.[1] || unitAfterMatch?.[1] || '');
  };

  const getFallbackSizeValue = (label) => normalizeSizeValue(label)
    .replace(/\b(EU|UE|US|UK)\b/gi, '')
    .replace(/[()[\]]/g, '')
    .split(/[/-]/)
    .map((part) => normalizeSizeValue(part))
    .find((part) => /^\d+(?:\.\d+)?(?:\s+2\/3)?$/.test(part)) || '';

  const formatVariantSizeLabel = (label, unit) => {
    const euValue = getExplicitSizeValue(label, 'EU|UE') || getFallbackSizeValue(label);
    const usValue = getExplicitSizeValue(label, 'US');
    const fallbackValue = normalizeSizeValue(label)
      .replace(/\b(EU|UE|US|UK)\b/gi, '')
      .trim();

    if (unit === 'US') {
      const convertedUsValue = usValue || PRODUCT_SIZE_US_MAP[euValue]?.replace(/\s*US$/i, '');
      return convertedUsValue ? `${convertedUsValue} US` : `${fallbackValue} US`;
    }

    const convertedEuValue = euValue || PRODUCT_SIZE_EU_MAP[usValue];
    return convertedEuValue ? `${convertedEuValue} EU` : `${fallbackValue} EU`;
  };

  const syncProductSizeUnit = (formEl, unit = 'EU') => {
    if (!formEl) return;

    const unitToggleEls = Array.from(formEl.querySelectorAll('[data-size-unit-toggle]'));
    const variantPillEls = Array.from(formEl.querySelectorAll('[data-variant-pill]'));

    unitToggleEls.forEach((toggleEl) => {
      const isActive = toggleEl.dataset.sizeUnit === unit;
      toggleEl.classList.toggle('is-active', isActive);
      toggleEl.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    variantPillEls.forEach((pillInputEl) => {
      const pillLabelEl = formEl.querySelector(`label[for="${pillInputEl.id}"] [data-variant-pill-label]`);
      if (!pillLabelEl) return;
      pillLabelEl.textContent = formatVariantSizeLabel(pillInputEl.dataset.variantLabel || pillLabelEl.textContent, unit).toUpperCase();
    });
  };

  const initProductSizeGuide = (formEl) => {
    if (!formEl || formEl.dataset.sizeGuideInit === 'true') return;
    formEl.dataset.sizeGuideInit = 'true';

    const guideEl = formEl.querySelector('[data-size-guide]');
    const openEl = formEl.querySelector('[data-size-guide-open]');
    const closeEls = Array.from(formEl.querySelectorAll('[data-size-guide-close]'));

    if (!guideEl || !openEl) return;

    const closeGuide = () => {
      guideEl.hidden = true;
      openEl.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('size-guide-open');
    };

    const openGuide = () => {
      guideEl.hidden = false;
      openEl.setAttribute('aria-expanded', 'true');
      document.body.classList.add('size-guide-open');
    };

    openEl.addEventListener('click', openGuide);
    closeEls.forEach((closeEl) => {
      closeEl.addEventListener('click', closeGuide);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || guideEl.hidden) return;
      closeGuide();
    });
  };

  const initMobileStickyPurchasePanel = (formEl) => {
    if (!formEl || formEl.dataset.mobileStickyPurchaseInit === 'true') return;
    formEl.dataset.mobileStickyPurchaseInit = 'true';

    const purchasePanelEl = formEl.querySelector('[data-product-purchase-panel]');
    const placeholderEl = formEl.querySelector('[data-product-purchase-placeholder]');
    const mobileQuery = window.matchMedia('(max-width: 749px)');

    if (!purchasePanelEl || !placeholderEl) return;

    const syncStickyPurchasePanel = () => {
      const isMobile = mobileQuery.matches;

      if (!isMobile) {
        purchasePanelEl.classList.remove('is-mobile-sticky-active');
        placeholderEl.hidden = true;
        placeholderEl.style.height = '';
        return;
      }

      const panelHeight = purchasePanelEl.offsetHeight || 0;
      const panelRect = placeholderEl.getBoundingClientRect();
      const stickyOffset = 12;
      const shouldStick = panelRect.top > (window.innerHeight - panelHeight - stickyOffset);

      placeholderEl.style.height = `${panelHeight}px`;
      placeholderEl.hidden = !shouldStick;
      purchasePanelEl.classList.toggle('is-mobile-sticky-active', shouldStick);
    };

    const syncStickyPurchasePanelRaf = () => {
      window.requestAnimationFrame(syncStickyPurchasePanel);
    };

    syncStickyPurchasePanel();

    window.addEventListener('scroll', syncStickyPurchasePanel, { passive: true });
    window.addEventListener('resize', syncStickyPurchasePanelRaf);

    if (typeof mobileQuery.addEventListener === 'function') {
      mobileQuery.addEventListener('change', syncStickyPurchasePanelRaf);
    } else if (typeof mobileQuery.addListener === 'function') {
      mobileQuery.addListener(syncStickyPurchasePanelRaf);
    }
  };

  const getProductViewMediaThumbEls = (productViewEl) => Array.from(productViewEl?.querySelectorAll('[data-product-media-thumb]') || []);

  const getProductViewActiveMediaIndex = (productViewEl) => {
    const mainMediaEl = productViewEl?.querySelector('.product-view__media-image') || productViewEl?.querySelector('[data-product-main-media]');
    const mediaThumbEls = getProductViewMediaThumbEls(productViewEl);
    if (!mainMediaEl || !mediaThumbEls.length) return 0;

    const activeMediaId = mainMediaEl.dataset.mediaId || '';
    const activeThumbEl = activeMediaId
      ? mediaThumbEls.find((thumbEl) => thumbEl.dataset.mediaId === activeMediaId)
      : mediaThumbEls.find((thumbEl) => thumbEl.classList.contains('is-active'));

    if (!activeThumbEl) return 0;

    return Number(activeThumbEl.dataset.mediaIndex || mediaThumbEls.indexOf(activeThumbEl) || 0);
  };

  const syncProductViewMedia = (productViewEl, selectedThumbEl) => {
    if (!productViewEl || !selectedThumbEl) return;

    const mainMediaEl = productViewEl.querySelector('.product-view__media-image') || productViewEl.querySelector('[data-product-main-media]');
    const mediaThumbEls = getProductViewMediaThumbEls(productViewEl);
    const overflowThumbEl = productViewEl.querySelector('[data-product-media-overflow]');
    if (!mainMediaEl || !mediaThumbEls.length) return;

    const mediaSrc = selectedThumbEl.dataset.mediaSrc;
    const mediaAlt = selectedThumbEl.dataset.mediaAlt || mainMediaEl.alt;
    const mediaId = selectedThumbEl.dataset.mediaId || '';
    const activeIndex = Number(selectedThumbEl.dataset.mediaIndex || mediaThumbEls.indexOf(selectedThumbEl) || 0);

    if (mediaSrc) {
      mainMediaEl.src = mediaSrc;
      mainMediaEl.removeAttribute('srcset');
      mainMediaEl.removeAttribute('sizes');
    }

    mainMediaEl.alt = mediaAlt;
    if (mediaId) {
      mainMediaEl.dataset.mediaId = mediaId;
    }

    mediaThumbEls.forEach((thumbEl) => {
      const thumbIndex = Number(thumbEl.dataset.mediaIndex || mediaThumbEls.indexOf(thumbEl) || 0);
      const isOverflowThumb = thumbEl.hasAttribute('data-product-media-overflow');
      const isVisibleActive = thumbEl === selectedThumbEl || (isOverflowThumb && activeIndex >= 5);
      thumbEl.classList.toggle('is-active', isVisibleActive && !thumbEl.classList.contains('product-view__media-thumb--hidden'));
      thumbEl.setAttribute('aria-pressed', isVisibleActive ? 'true' : 'false');
      if (thumbEl.classList.contains('product-view__media-thumb--hidden')) {
        thumbEl.dataset.mediaActive = thumbIndex === activeIndex ? 'true' : 'false';
      }
    });

    if (overflowThumbEl && activeIndex < 5) {
      overflowThumbEl.classList.remove('is-active');
      overflowThumbEl.setAttribute('aria-pressed', 'false');
    }

    syncProductViewMediaControls(productViewEl, activeIndex, mediaThumbEls.length);
  };

  document.addEventListener('click', (event) => {
    const thumbEl = event.target.closest('[data-product-media-thumb]');
    if (!thumbEl) return;

    const productViewEl = thumbEl.closest('[data-product-view]');
    if (!productViewEl) return;

    syncProductViewMedia(productViewEl, thumbEl);
  });

  document.addEventListener('click', (event) => {
    const controlEl = event.target.closest('[data-product-media-prev], [data-product-media-next]');
    if (!controlEl) return;

    const productViewEl = controlEl.closest('[data-product-view]');
    if (!productViewEl) return;

    const mediaThumbEls = getProductViewMediaThumbEls(productViewEl);
    if (!mediaThumbEls.length) return;

    const isPrev = controlEl.hasAttribute('data-product-media-prev');
    const activeIndex = getProductViewActiveMediaIndex(productViewEl);
    const targetIndex = isPrev
      ? (activeIndex > 0 ? activeIndex - 1 : 0)
      : (activeIndex >= 0 ? Math.min(mediaThumbEls.length - 1, activeIndex + 1) : 0);
    const targetThumbEl = mediaThumbEls[targetIndex];
    if (!targetThumbEl) return;

    syncProductViewMedia(productViewEl, targetThumbEl);
  });

  const initProductView = (root = document) => {
    root.querySelectorAll('[data-product-form]').forEach((formEl) => {
      if (!formEl || formEl.dataset.productFormInit === 'true') return;
      formEl.dataset.productFormInit = 'true';

      const productViewEl = formEl.closest('[data-product-view]');
      const variantIdInputEl = formEl.querySelector('[data-product-variant-id]');
      const priceEl = formEl.querySelector('[data-product-price]');
      const submitEl = formEl.querySelector('[data-product-submit]');
      const submitLabelEl = formEl.querySelector('[data-product-submit-label]');
      const paymentPanelEl = formEl.querySelector('[data-product-payment-panel]');
      const pillEls = Array.from(formEl.querySelectorAll('[data-variant-pill]'));
      const sizeUnitToggleEls = Array.from(formEl.querySelectorAll('[data-size-unit-toggle]'));
      const mainMediaEl = productViewEl?.querySelector('[data-product-main-media]');
      const mediaThumbEls = getProductViewMediaThumbEls(productViewEl);
      const mediaPrevEl = productViewEl?.querySelector('[data-product-media-prev]');
      const mediaNextEl = productViewEl?.querySelector('[data-product-media-next]');

      initMobileStickyPurchasePanel(formEl);

      const syncActiveMedia = (selectedThumbEl) => {
        if (!mainMediaEl || !selectedThumbEl) return;
        syncProductViewMedia(productViewEl, selectedThumbEl);
      };

      mediaThumbEls.forEach((thumbEl) => {
        thumbEl.addEventListener('click', () => {
          syncActiveMedia(thumbEl);
        });
      });

      mediaPrevEl?.addEventListener('click', () => {
        const activeIndex = getProductViewActiveMediaIndex(productViewEl);
        const targetIndex = activeIndex > 0 ? activeIndex - 1 : 0;
        const targetThumbEl = mediaThumbEls[targetIndex];
        if (targetThumbEl) {
          syncActiveMedia(targetThumbEl);
        }
      });

      mediaNextEl?.addEventListener('click', () => {
        const activeIndex = getProductViewActiveMediaIndex(productViewEl);
        const targetIndex = activeIndex >= 0 ? Math.min(mediaThumbEls.length - 1, activeIndex + 1) : 0;
        const targetThumbEl = mediaThumbEls[targetIndex];
        if (targetThumbEl) {
          syncActiveMedia(targetThumbEl);
        }
      });

      if (mediaThumbEls.length) {
        const initialThumbEl = mediaThumbEls.find((thumbEl) => thumbEl.dataset.mediaId === mainMediaEl?.dataset.mediaId)
          || mediaThumbEls.find((thumbEl) => thumbEl.classList.contains('is-active'))
          || mediaThumbEls[0];
        syncActiveMedia(initialThumbEl);
      }

      if (sizeUnitToggleEls.length && pillEls.length) {
        sizeUnitToggleEls.forEach((toggleEl) => {
          toggleEl.addEventListener('click', () => {
            syncProductSizeUnit(formEl, toggleEl.dataset.sizeUnit || 'EU');
          });
        });

        syncProductSizeUnit(formEl, 'EU');
      }

      initProductSizeGuide(formEl);

      if (!variantIdInputEl || !priceEl || !submitEl || !pillEls.length) return;

      const syncVariantState = (selectedPillEl) => {
        if (!selectedPillEl) return;

        const isAvailable = selectedPillEl.dataset.variantAvailable === 'true';
        variantIdInputEl.value = selectedPillEl.value;
        priceEl.textContent = selectedPillEl.dataset.variantPrice || priceEl.textContent;
        submitEl.disabled = !isAvailable;
        if (submitLabelEl) {
          submitLabelEl.textContent = isAvailable ? 'AJOUTER AU PANIER' : 'INDISPONIBLE';
        }
        if (paymentPanelEl) {
          paymentPanelEl.hidden = !isAvailable;
        }
      };

      pillEls.forEach((pillEl) => {
        pillEl.addEventListener('change', () => {
          if (!pillEl.checked) return;
          syncVariantState(pillEl);
        });
      });

      syncVariantState(pillEls.find((pillEl) => pillEl.checked) || pillEls[0]);
    });
  };

  const initCategorySticky = (sectionRoot) => {
    if (!sectionRoot || sectionRoot.dataset.categoryStickyInit === 'true') return;
    sectionRoot.dataset.categoryStickyInit = 'true';

    const categorySectionWrapper = sectionRoot.closest('.shopify-section');
    if (categorySectionWrapper && categorySectionWrapper.dataset.categoryStickyLayerInit !== 'true') {
      categorySectionWrapper.dataset.categoryStickyLayerInit = 'true';
      categorySectionWrapper.classList.add('shopify-section--category-sticky-base');

      let nextSection = categorySectionWrapper.nextElementSibling;
      let isFirstAboveCategory = true;
      while (nextSection) {
        if (nextSection.classList?.contains('shopify-section')) {
          nextSection.classList.add('shopify-section--above-category-sticky');
          if (isFirstAboveCategory) {
            nextSection.classList.add('shopify-section--above-category-sticky-first');
            isFirstAboveCategory = false;
          }
        }
        nextSection = nextSection.nextElementSibling;
      }
    }

    const stack = sectionRoot.querySelector('.category-sticky__stack');
    const items = Array.from(sectionRoot.querySelectorAll('[data-category-item]'));
    const copyItems = Array.from(sectionRoot.querySelectorAll('[data-category-copy]'));
    const stepItems = Array.from(sectionRoot.querySelectorAll('[data-category-step]'));
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!stack || !items.length) return;

    let progressFrame = 0;
    let layoutFrame = 0;
    let activeIndex = -1;
    const categoryLabelScrambleState = new WeakMap();

    const getCopyIndex = (copyEl, fallbackIndex) => Number.parseInt(copyEl?.dataset.index || `${fallbackIndex}`, 10);

    const getCopyByIndex = (index) => {
      const target = Number.parseInt(`${index}`, 10);
      if (!Number.isInteger(target)) return null;
      return copyItems.find((copyEl, fallbackIndex) => getCopyIndex(copyEl, fallbackIndex) === target) || null;
    };

    const getCopyLabel = (copyEl) => copyEl?.querySelector('.video-hero__availability-label') || null;

    const getLabelFinalText = (labelEl) => {
      if (!labelEl) return '';
      const finalText = normalizeText(
        labelEl.dataset.copyFinal
        || labelEl.dataset.scrambleFinal
        || labelEl.textContent
        || ''
      );
      if (finalText) {
        labelEl.dataset.scrambleFinal = finalText;
        labelEl.textContent = finalText;
      }
      return finalText;
    };

    const clearCategoryLabelScramble = (labelEl) => {
      if (!labelEl) return;
      const scrambleState = categoryLabelScrambleState.get(labelEl);
      if (!scrambleState) return;
      if (scrambleState.intervalId) {
        window.clearInterval(scrambleState.intervalId);
      }
      unlockInteractiveWidth(scrambleState.lockTarget, scrambleState.widthLockState);
      categoryLabelScrambleState.delete(labelEl);
    };

    const runCategoryLabelSwapScramble = (labelEl, startText, finalText) => {
      if (!labelEl || !finalText) return;

      const fromText = normalizeText(startText || finalText) || finalText;
      clearCategoryLabelScramble(labelEl);
      clearInteractiveScramble(labelEl);

      const lockTarget = getInteractiveLockTarget(labelEl);
      const widthLockState = lockInteractiveWidth(lockTarget);
      const totalSteps = 12;
      const intervalMs = 26;
      let step = 0;

      labelEl.textContent = fromText;

      const intervalId = window.setInterval(() => {
        step += 1;
        const revealIndex = Math.floor((step / totalSteps) * finalText.length);
        let output = '';

        for (let i = 0; i < finalText.length; i += 1) {
          const finalChar = finalText[i];
          const fromChar = fromText[i] || '';

          if (preserveScrambleChar(finalChar)) {
            output += finalChar;
          } else if (step <= 2 && fromChar && !preserveScrambleChar(fromChar)) {
            output += fromChar;
          } else if (i <= revealIndex) {
            output += finalChar;
          } else {
            output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          }
        }

        labelEl.textContent = output;

        if (step >= totalSteps) {
          window.clearInterval(intervalId);
          labelEl.textContent = finalText;
          unlockInteractiveWidth(lockTarget, widthLockState);
          categoryLabelScrambleState.delete(labelEl);
        }
      }, intervalMs);

      categoryLabelScrambleState.set(labelEl, {
        intervalId,
        lockTarget,
        widthLockState
      });
    };

    const animateCategoryLabelTransition = (previousIndex, nextIndex) => {
      const nextCopy = getCopyByIndex(nextIndex);
      const nextLabel = getCopyLabel(nextCopy);
      if (!nextLabel) return;

      const nextFinalText = getLabelFinalText(nextLabel);
      if (!nextFinalText) return;

      if (previousIndex < 0 || reduceMotionQuery.matches) {
        clearCategoryLabelScramble(nextLabel);
        clearInteractiveScramble(nextLabel);
        nextLabel.textContent = nextFinalText;
        return;
      }

      const previousCopy = getCopyByIndex(previousIndex);
      const previousLabel = getCopyLabel(previousCopy);
      const previousFinalText = getLabelFinalText(previousLabel);
      const startText = previousFinalText || nextFinalText;

      runCategoryLabelSwapScramble(nextLabel, startText, nextFinalText);
    };

    const setActiveState = (nextIndex) => {
      const clampedIndex = Math.min(items.length - 1, Math.max(0, nextIndex));
      if (clampedIndex === activeIndex) return;
      const previousActiveIndex = activeIndex;
      activeIndex = clampedIndex;

      copyItems.forEach((copyEl, index) => {
        const copyIndex = Number.parseInt(copyEl.dataset.index || `${index}`, 10);
        copyEl.classList.toggle('is-active', copyIndex === activeIndex);
      });

      stepItems.forEach((stepEl, index) => {
        const stepIndex = Number.parseInt(stepEl.dataset.index || `${index}`, 10);
        stepEl.classList.toggle('is-past', stepIndex < activeIndex);
        stepEl.classList.toggle('is-active', stepIndex === activeIndex);
      });

      animateCategoryLabelTransition(previousActiveIndex, activeIndex);
    };

    const getViewportHeight = () => Math.max(
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0,
      stack.clientHeight || 0
    );

    const updateProgress = () => {
      const total = items.length;
      const viewportHeight = getViewportHeight();
      if (!viewportHeight) return;

      const sectionTop = sectionRoot.getBoundingClientRect().top + window.scrollY;
      const maxTravel = viewportHeight * Math.max(total - 1, 0);
      const travel = Math.min(Math.max(window.scrollY - sectionTop, 0), maxTravel);
      const progress = viewportHeight ? travel / viewportHeight : 0;

      items.forEach((itemEl, index) => {
        const offset = Math.max(0, (index - progress) * 100);
        itemEl.style.setProperty('--category-item-offset', `${offset}`);
      });

      setActiveState(Math.round(progress));
    };

    const queueProgressUpdate = () => {
      if (progressFrame) return;
      progressFrame = window.requestAnimationFrame(() => {
        progressFrame = 0;
        updateProgress();
      });
    };

    const updateLayout = () => {
      const total = Math.max(1, items.length);
      const viewportHeight = getViewportHeight();
      if (!viewportHeight) return;

      // Keep one extra sticky viewport after the last category so the next
      // section can scroll over it instead of ending sticky immediately.
      const stickyScreens = total + (total > 1 ? 1 : 0);

      sectionRoot.style.setProperty('--category-total', `${stickyScreens}`);
      sectionRoot.style.minHeight = `${viewportHeight * stickyScreens}px`;
      stack.style.height = `${viewportHeight}px`;
      updateProgress();
    };

    const queueLayoutUpdate = () => {
      if (layoutFrame) return;
      layoutFrame = window.requestAnimationFrame(() => {
        layoutFrame = 0;
        updateLayout();
      });
    };

    window.addEventListener('scroll', queueProgressUpdate, { passive: true });
    window.addEventListener('resize', queueLayoutUpdate);

    if (window.visualViewport?.addEventListener) {
      window.visualViewport.addEventListener('resize', queueLayoutUpdate);
    }

    if (typeof window.ResizeObserver === 'function') {
      const stickyResizeObserver = new window.ResizeObserver(() => {
        queueLayoutUpdate();
      });
      stickyResizeObserver.observe(sectionRoot);
    }

    window.requestAnimationFrame(() => {
      updateLayout();
    });
  };

  const initCollectionsTrioParallax = (sectionRoot) => {
    if (!sectionRoot || sectionRoot.dataset.collectionsTrioParallaxInit === 'true') return;
    sectionRoot.dataset.collectionsTrioParallaxInit = 'true';

    const items = Array.from(sectionRoot.querySelectorAll('.collections-trio__item'));
    if (!items.length) return;

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    let parallaxFrame = 0;

    const resetParallax = () => {
      items.forEach((itemEl) => {
        itemEl.style.setProperty('--collections-trio-media-parallax-y', '0px');
      });
    };

    const applyParallax = () => {
      parallaxFrame = 0;

      if (reduceMotionQuery.matches) {
        resetParallax();
        return;
      }

      const viewportHeight = Math.max(
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0,
        1
      );
      const viewportCenter = viewportHeight / 2;
      const maxOffset = window.innerWidth <= 640 ? 8 : 14;

      items.forEach((itemEl) => {
        const rect = itemEl.getBoundingClientRect();
        const itemCenter = rect.top + (rect.height / 2);
        const normalizedDistance = clamp((viewportCenter - itemCenter) / viewportHeight, -0.5, 0.5);
        const parallaxOffset = normalizedDistance * maxOffset * 2;
        itemEl.style.setProperty('--collections-trio-media-parallax-y', `${parallaxOffset.toFixed(2)}px`);
      });
    };

    const queueParallax = () => {
      if (parallaxFrame) return;
      parallaxFrame = window.requestAnimationFrame(applyParallax);
    };

    window.addEventListener('scroll', queueParallax, { passive: true });
    window.addEventListener('resize', queueParallax);

    if (window.visualViewport?.addEventListener) {
      window.visualViewport.addEventListener('resize', queueParallax);
    }

    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener('change', queueParallax);
    } else {
      reduceMotionQuery.addListener(queueParallax);
    }

    if (typeof window.ResizeObserver === 'function') {
      const trioResizeObserver = new window.ResizeObserver(() => {
        queueParallax();
      });
      trioResizeObserver.observe(sectionRoot);
    }

    window.requestAnimationFrame(() => {
      applyParallax();
    });
  };

  const initSneakerCleaningCompareParallax = (sectionRoot) => {
    if (!sectionRoot || sectionRoot.dataset.sneakerCleaningParallaxInit === 'true') return;
    sectionRoot.dataset.sneakerCleaningParallaxInit = 'true';

    const compareEl = sectionRoot.querySelector('[data-sneaker-cleaning-compare]');
    if (!compareEl) return;

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let parallaxFrame = 0;

    const applyParallax = () => {
      parallaxFrame = 0;

      if (reduceMotionQuery.matches) {
        compareEl.style.setProperty('--sneaker-cleaning-media-parallax-y', '0px');
        return;
      }

      const rect = compareEl.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0, 1);
      const viewportCenter = viewportHeight / 2;
      const compareCenter = rect.top + (rect.height / 2);
      const normalizedDistance = Math.min(Math.max((viewportCenter - compareCenter) / viewportHeight, -0.5), 0.5);
      const maxOffset = window.innerWidth <= 640 ? 10 : 18;
      const parallaxOffset = normalizedDistance * maxOffset * 2;
      compareEl.style.setProperty('--sneaker-cleaning-media-parallax-y', `${parallaxOffset.toFixed(2)}px`);
    };

    const queueParallax = () => {
      if (parallaxFrame) return;
      parallaxFrame = window.requestAnimationFrame(applyParallax);
    };

    window.addEventListener('scroll', queueParallax, { passive: true });
    window.addEventListener('resize', queueParallax);

    if (window.visualViewport?.addEventListener) {
      window.visualViewport.addEventListener('resize', queueParallax);
    }

    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener('change', queueParallax);
    } else {
      reduceMotionQuery.addListener(queueParallax);
    }

    if (typeof window.ResizeObserver === 'function') {
      const compareResizeObserver = new window.ResizeObserver(() => {
        queueParallax();
      });
      compareResizeObserver.observe(compareEl);
    }

    window.requestAnimationFrame(() => {
      applyParallax();
    });
  };

  const initAllSneakerCleaningCompareParallax = (root = document) => {
    root.querySelectorAll('[data-sneaker-cleaning-compare-section]').forEach(initSneakerCleaningCompareParallax);
  };

  const initAllVideoHeros = (root = document) => {
    root.querySelectorAll('[data-video-hero]').forEach(initVideoHero);
  };

  const initImageHeroSlider = (sectionRoot) => {
    if (!sectionRoot || sectionRoot.dataset.imageHeroInit === 'true') return;
    sectionRoot.dataset.imageHeroInit = 'true';

    const slides = Array.from(sectionRoot.querySelectorAll('[data-slide]'));
    if (!slides.length) return;

    const imageEl = sectionRoot.querySelector('.video-hero__image');
    const placeholderEl = sectionRoot.querySelector('.video-hero__placeholder');
    const prevTriggerEl = sectionRoot.querySelector('[data-prev-trigger]');
    const nextTriggerEl = sectionRoot.querySelector('[data-next-trigger]');
    const stepEls = Array.from(sectionRoot.querySelectorAll('[data-jump-index]'));
    const sideStepEls = Array.from(sectionRoot.querySelectorAll('[data-side-step]'));

    const breakpoint = Number(sectionRoot.dataset.mobileBreakpoint || 768);
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const autoplayEnabled = sectionRoot.dataset.autoplay === 'true';
    const autoplayDelay = Math.max(1500, Number(sectionRoot.dataset.autoplayDelay) || 5000);

    let activeIndex = 0;
    let isTransitioning = false;

    const getImageUrl = (slide) => {
      const desktop = (slide.dataset.imageDesktop || '').trim();
      const mobile = (slide.dataset.imageMobile || '').trim();
      return mediaQuery.matches ? (mobile || desktop) : (desktop || mobile);
    };

    const showPlaceholder = (visible) => {
      if (!placeholderEl) return;
      placeholderEl.classList.toggle('is-visible', !!visible);
    };

    const renderImage = (url, alt) => new Promise((resolve) => {
      if (!imageEl) { resolve(false); return; }
      if (!url) {
        imageEl.classList.remove('is-visible', 'is-fading');
        imageEl.removeAttribute('src');
        showPlaceholder(true);
        resolve(false);
        return;
      }

      const finalize = () => {
        imageEl.classList.add('is-visible');
        if (!reduceMotionQuery.matches) {
          imageEl.classList.remove('is-fading');
          void imageEl.offsetWidth;
          imageEl.classList.add('is-fading');
        }
        showPlaceholder(false);
        resolve(true);
      };

      const onLoad = () => {
        imageEl.removeEventListener('load', onLoad);
        imageEl.removeEventListener('error', onError);
        finalize();
      };
      const onError = () => {
        imageEl.removeEventListener('load', onLoad);
        imageEl.removeEventListener('error', onError);
        showPlaceholder(true);
        resolve(false);
      };

      imageEl.addEventListener('load', onLoad);
      imageEl.addEventListener('error', onError);
      imageEl.alt = alt || '';
      if (imageEl.src === url) {
        finalize();
      } else {
        imageEl.classList.remove('is-visible');
        imageEl.src = url;
      }
    });

    sectionRoot.style.setProperty('--hero-step-loader-duration', `${autoplayDelay}ms`);
    sectionRoot.style.setProperty('--hero-step-loader-state', 'running');

    const setLoaderPlayState = (state) => {
      sectionRoot.style.setProperty('--hero-step-loader-state', state);
    };

    const restartActiveStepLoader = () => {
      if (!autoplayEnabled || slides.length < 2 || reduceMotionQuery.matches) return;
      const activeStepEl = stepEls[activeIndex];
      const activeFillEl = activeStepEl?.querySelector('.video-hero__step-fill');
      if (!activeFillEl) return;

      setLoaderPlayState('running');
      activeFillEl.style.animation = 'none';
      void activeFillEl.offsetWidth;
      activeFillEl.style.animation = '';
    };

    const syncControls = () => {
      slides.forEach((slide, index) => {
        slide.classList.toggle('is-active', index === activeIndex);
      });
      stepEls.forEach((step, index) => {
        const isActive = index === activeIndex;
        step.classList.toggle('is-active', isActive);
        step.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      sideStepEls.forEach((step, index) => {
        step.classList.toggle('is-active', index === activeIndex);
      });
      if (prevTriggerEl) {
        const atStart = activeIndex === 0;
        prevTriggerEl.classList.toggle('is-disabled', atStart);
        prevTriggerEl.toggleAttribute('disabled', atStart);
        prevTriggerEl.setAttribute('aria-disabled', atStart ? 'true' : 'false');
      }
      if (nextTriggerEl) {
        const atEnd = activeIndex === slides.length - 1;
        nextTriggerEl.classList.toggle('is-disabled', atEnd && !autoplayEnabled);
        if (!autoplayEnabled) {
          nextTriggerEl.toggleAttribute('disabled', atEnd);
          nextTriggerEl.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
        }
      }
    };

    const goTo = (index) => {
      if (isTransitioning) return;
      const total = slides.length;
      if (!total) return;
      const next = ((index % total) + total) % total;
      if (next === activeIndex) return;
      isTransitioning = true;
      activeIndex = next;
      syncControls();
      restartActiveStepLoader();
      const slide = slides[activeIndex];
      const url = getImageUrl(slide);
      const alt = (slide.dataset.imageAlt || '').trim();
      renderImage(url, alt).finally(() => {
        isTransitioning = false;
      });
    };

    sectionRoot.addEventListener('animationend', (event) => {
      if (event.animationName !== 'imageHeroStepLoader') return;
      if (!autoplayEnabled || slides.length < 2 || reduceMotionQuery.matches) return;
      goTo(activeIndex + 1);
    });

    if (prevTriggerEl) {
      prevTriggerEl.addEventListener('click', () => goTo(activeIndex - 1));
    }
    if (nextTriggerEl) {
      nextTriggerEl.addEventListener('click', () => goTo(activeIndex + 1));
    }
    stepEls.forEach((step) => {
      step.addEventListener('click', () => {
        const index = Number(step.dataset.jumpIndex);
        if (!Number.isNaN(index)) goTo(index);
      });
    });

    sectionRoot.addEventListener('mouseenter', () => setLoaderPlayState('paused'));
    sectionRoot.addEventListener('mouseleave', () => setLoaderPlayState('running'));
    sectionRoot.addEventListener('focusin', () => setLoaderPlayState('paused'));
    sectionRoot.addEventListener('focusout', () => setLoaderPlayState('running'));

    let parallaxFrame = 0;
    const applyParallax = () => {
      parallaxFrame = 0;
      if (reduceMotionQuery.matches) {
        sectionRoot.style.setProperty('--hero-content-parallax-y', '0px');
        sectionRoot.style.setProperty('--hero-media-parallax-y', '0px');
        return;
      }
      const rect = sectionRoot.getBoundingClientRect();
      const sectionHeight = Math.max(rect.height, 1);
      const scrollPastTop = Math.max(0, -rect.top);
      const traveled = Math.min(scrollPastTop, sectionHeight);
      const parallaxFactor = window.innerWidth <= breakpoint ? 0.2 : 0.3;
      const parallaxOffset = traveled * parallaxFactor;
      const mediaParallaxRatio = window.innerWidth <= breakpoint ? 0.82 : 0.88;
      const mediaParallaxOffset = parallaxOffset * mediaParallaxRatio;
      sectionRoot.style.setProperty('--hero-content-parallax-y', `${parallaxOffset.toFixed(2)}px`);
      sectionRoot.style.setProperty('--hero-media-parallax-y', `${mediaParallaxOffset.toFixed(2)}px`);
    };
    const queueParallax = () => {
      if (parallaxFrame) return;
      parallaxFrame = window.requestAnimationFrame(applyParallax);
    };
    window.addEventListener('scroll', queueParallax, { passive: true });
    window.addEventListener('resize', queueParallax);
    applyParallax();

    const handleResize = () => {
      const slide = slides[activeIndex];
      if (!slide) return;
      const url = getImageUrl(slide);
      if (url && imageEl && imageEl.src !== url) {
        renderImage(url, (slide.dataset.imageAlt || '').trim());
      }
    };
    mediaQuery.addEventListener('change', handleResize);

    const firstSlide = slides[activeIndex];
    const firstUrl = getImageUrl(firstSlide);
    if (firstUrl) {
      renderImage(firstUrl, (firstSlide.dataset.imageAlt || '').trim());
    } else {
      showPlaceholder(true);
    }
    syncControls();
    restartActiveStepLoader();
  };

  const initAllImageHeroSliders = (root = document) => {
    root.querySelectorAll('[data-image-hero-slider]').forEach(initImageHeroSlider);
  };

  const initAllCollectionStacks = (root = document) => {
    root.querySelectorAll('[data-collection-stacks]').forEach(initCollectionStacks);
  };

  const initAllCategorySticky = (root = document) => {
    root.querySelectorAll('[data-category-sticky]').forEach(initCategorySticky);
  };

  const initAllCollectionsTrioParallax = (root = document) => {
    root.querySelectorAll('.collections-trio').forEach(initCollectionsTrioParallax);
  };

  const initCatalogPage = (root = document) => {
    const pageEl = root.matches?.('[data-collection-page]')
      ? root
      : root.querySelector('[data-collection-page]');
    if (!pageEl || pageEl.dataset.catalogInit === 'true') return;
    pageEl.dataset.catalogInit = 'true';

    const colToggleEl = pageEl.querySelector('[data-col-toggle]');
    if (colToggleEl) {
      const savedCols = window.sessionStorage.getItem('catalog-cols');
      if (savedCols) {
        pageEl.style.setProperty('--catalog-cols', savedCols);
        colToggleEl.querySelectorAll('[data-cols]').forEach((btn) => {
          btn.classList.toggle('is-active', btn.dataset.cols === savedCols);
        });
      }

      colToggleEl.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-cols]');
        if (!btn) return;
        const cols = btn.dataset.cols;
        pageEl.style.setProperty('--catalog-cols', cols);
        window.sessionStorage.setItem('catalog-cols', cols);
        colToggleEl.querySelectorAll('[data-cols]').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
      });
    }

    const filterFormEl = pageEl.querySelector('[data-catalog-filter-form]');
    if (filterFormEl) {
      const mobileAccordionEl = filterFormEl.querySelector('[data-catalog-filters-mobile]');
      if (mobileAccordionEl && mobileAccordionEl.dataset.catalogFiltersSync !== 'true') {
        mobileAccordionEl.dataset.catalogFiltersSync = 'true';

        const mobileQuery = window.matchMedia('(max-width: 640px)');
        const syncCatalogFiltersAccordion = () => {
          if (mobileQuery.matches) {
            mobileAccordionEl.removeAttribute('open');
          } else {
            mobileAccordionEl.setAttribute('open', 'open');
          }
        };

        syncCatalogFiltersAccordion();

        if (typeof mobileQuery.addEventListener === 'function') {
          mobileQuery.addEventListener('change', syncCatalogFiltersAccordion);
        } else if (typeof mobileQuery.addListener === 'function') {
          mobileQuery.addListener(syncCatalogFiltersAccordion);
        }
      }

      filterFormEl.querySelectorAll('[data-filter-checkbox]').forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          filterFormEl.submit();
        });
      });

      document.addEventListener('click', (event) => {
        if (!filterFormEl.contains(event.target)) {
          filterFormEl.querySelectorAll('details[data-filter-group][open]').forEach((d) => {
            d.removeAttribute('open');
          });
        }
      });
    }

    pageEl.querySelectorAll('[data-quick-add-form]').forEach((formEl) => {
      if (formEl.dataset.quickAddInit === 'true') return;
      formEl.dataset.quickAddInit = 'true';

      const buttonEl = formEl.querySelector('button[type="submit"]');
      const idInputEl = formEl.querySelector('input[name="id"]');
      if (!buttonEl || !idInputEl) return;

      formEl.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (buttonEl.disabled) return;

        const variantId = Number(idInputEl.value);
        if (!Number.isInteger(variantId) || variantId <= 0) return;

        buttonEl.disabled = true;
        formEl.classList.remove('is-added', 'is-error');

        try {
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ id: variantId, quantity: 1 }),
          });
          if (!response.ok) throw new Error();
          refreshHeaderCartCount();
          formEl.classList.add('is-added');
          window.setTimeout(() => formEl.classList.remove('is-added'), 900);
        } catch {
          formEl.classList.add('is-error');
          window.setTimeout(() => formEl.classList.remove('is-error'), 1200);
        } finally {
          buttonEl.disabled = false;
        }
      });

      const labelEl = buttonEl.querySelector('.catalog-grid__quick-add-label');
      if (!labelEl) return;
      const finalText = labelEl.textContent.trim();
      let scrambleTimer = null;

      buttonEl.addEventListener('mouseenter', () => {
        if (scrambleTimer) window.clearInterval(scrambleTimer);
        const total = 12;
        let step = 0;
        scrambleTimer = window.setInterval(() => {
          step += 1;
          if (step >= total) {
            window.clearInterval(scrambleTimer);
            scrambleTimer = null;
            labelEl.textContent = finalText;
            return;
          }
          const revealIndex = Math.floor((step / total) * finalText.length);
          let output = '';
          for (let i = 0; i < finalText.length; i += 1) {
            const ch = finalText[i];
            if (ch === ' ') { output += ' '; continue; }
            output += i <= revealIndex
              ? ch
              : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          }
          labelEl.textContent = output;
        }, 28);
      });

      buttonEl.addEventListener('mouseleave', () => {
        if (scrambleTimer) { window.clearInterval(scrambleTimer); scrambleTimer = null; }
        labelEl.textContent = finalText;
      });
    });
  };

  const initCartPage = (root = document) => {
    root.querySelectorAll('form[data-cart-auto-update]').forEach((formEl) => {
      if (formEl.dataset.cartAutoUpdateInit === 'true') return;
      formEl.dataset.cartAutoUpdateInit = 'true';

      const updateSubmitEl = formEl.querySelector('[data-cart-update-submit]');
      if (!updateSubmitEl) return;

      let submitTimer = null;
      const queueSubmit = () => {
        if (submitTimer) window.clearTimeout(submitTimer);
        submitTimer = window.setTimeout(() => {
          if (typeof formEl.requestSubmit === 'function') {
            formEl.requestSubmit(updateSubmitEl);
          } else {
            updateSubmitEl.click();
          }
        }, 260);
      };

      formEl.querySelectorAll('input[name="updates[]"]').forEach((inputEl) => {
        inputEl.addEventListener('change', queueSubmit);
        inputEl.addEventListener('blur', queueSubmit);
      });
    });
  };

  const initSearchPageFallback = (root = document) => {
    const bodyEl = document.body;
    if (!bodyEl.classList.contains('template-search')) return;

    const searchRoot = root?.matches?.('#main-content, .shopify-section')
      ? root
      : root?.querySelector?.('#main-content, .shopify-section') || document.getElementById('main-content');
    if (!searchRoot) return;

    const hasRenderedCards = document.querySelector('.main-search__results--products .search-card');
    if (hasRenderedCards) return;

    const listEl = Array.from(document.querySelectorAll('#main-content ol, #main-content ul')).find((candidate) => {
      if (candidate.closest('.header-search-overlay, .site-footer')) return false;
      return candidate.querySelectorAll(':scope > li').length >= 2;
    });

    if (!listEl) return;

    const itemEls = Array.from(listEl.querySelectorAll(':scope > li'));
    if (!itemEls.length) return;

    const escapeHtml = (value = '') => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const getLargestImageSource = (imageEl) => {
      if (!imageEl) return '';

      const srcsetCandidates = (imageEl.getAttribute('srcset') || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [url, widthToken] = entry.split(/\s+/);
          const width = Number.parseInt((widthToken || '').replace(/\D/g, ''), 10) || 0;
          return { url, width };
        })
        .filter((entry) => entry.url);

      if (srcsetCandidates.length) {
        srcsetCandidates.sort((a, b) => b.width - a.width);
        return srcsetCandidates[0].url;
      }

      const rawSrc = imageEl.currentSrc || imageEl.getAttribute('src') || '';
      if (!rawSrc) return '';

      return rawSrc
        .replace(/([._-])(\d{2,4})x(\d{2,4})(?=\.)/i, '$1master')
        .replace(/([?&](?:width|height))=\d+/gi, '$1=1200');
    };

    const items = itemEls.map((itemEl) => {
      const titleLinkEl = Array.from(itemEl.querySelectorAll('a[href]')).find((linkEl) => normalizeText(linkEl.textContent || '').length > 4);
      const imageEl = itemEl.querySelector('img');
      const titleEl = itemEl.querySelector('h1, h2, h3, h4, strong');
      const title = normalizeText(titleLinkEl?.textContent || titleEl?.textContent || '');
      const href = titleLinkEl?.href || itemEl.querySelector('a[href]')?.href || '#';

      let metaText = '';
      const paragraphTexts = Array.from(itemEl.querySelectorAll('p'))
        .map((paragraphEl) => normalizeText(paragraphEl.textContent || ''))
        .filter(Boolean)
        .filter((text) => text !== title);

      if (paragraphTexts.length) {
        metaText = paragraphTexts.join(' ');
      } else {
        metaText = normalizeText(itemEl.textContent || '').replace(title, '').trim();
      }

      const metaLines = metaText
        .split(/(?=SKU:|Colorway:|Date de sortie:)/i)
        .map((line) => normalizeText(line))
        .filter(Boolean)
        .slice(0, 3);

      return {
        title,
        href,
        imageUrl: getLargestImageSource(imageEl),
        imageAlt: imageEl?.getAttribute('alt') || title,
        metaLines
      };
    }).filter((item) => item.title && item.href && item.href !== '#');

    const query = normalizeText(new URLSearchParams(window.location.search).get('q') || '');
    const targetSectionEl = listEl.closest('.shopify-section') || listEl.parentElement;
    if (!targetSectionEl) return;

    const buildSearchFormMarkup = () => `
      <form action="/search" method="get" class="site-search-form main-search__form" role="search">
        <input type="hidden" name="options[prefix]" value="last">
        <label class="visually-hidden" for="SearchFallbackInput">Recherche</label>
        <input id="SearchFallbackInput" type="search" name="q" value="${query.replace(/"/g, '&quot;')}" placeholder="RECHERCHER UNE MARQUE, MODELE..." autocomplete="off">
        <button class="button main-search__submit" type="submit">LANCER</button>
      </form>
    `;

    const wrapperEl = document.createElement('section');
    wrapperEl.className = 'main-page main-search search-fallback';
    wrapperEl.innerHTML = `
      <div class="main-search__frame">
        <header class="catalog-page-head main-search__head">
          <p class="site-page-kicker">[ RECHERCHE ]</p>
          <h1 class="catalog-page-head__title">${query ? query.toUpperCase() : 'TROUVER UNE PAIRE'}</h1>
        </header>
        <div class="catalog-page-body main-search__body">
          <div class="main-search__layout">
            <aside class="main-search__rail">
              <div class="main-search__panel main-search__panel--search">
                <p class="main-search__panel-kicker">[ RECHERCHER ]</p>
                ${buildSearchFormMarkup()}
                <p class="main-search__panel-copy">
                  ${query
                    ? `RESULTATS POUR "${query.toUpperCase()}", AVEC UNE SEPARATION CLAIRE ENTRE PRODUITS ET CONTENUS.`
                    : "UTILISE LA RECHERCHE COMME UN INDEX RAPIDE POUR NAVIGUER DANS L'UNIVERS HORMONE."}
                </p>
              </div>
              <div class="main-search__panel main-search__panel--summary">
                <p class="main-search__panel-kicker">[ INDEX ]</p>
                <div class="main-search__stats">
                  <div class="main-search__stat">
                    <span class="main-search__stat-value">${items.length}</span>
                    <span class="main-search__stat-label">RESULTATS</span>
                  </div>
                  <div class="main-search__stat">
                    <span class="main-search__stat-value">${items.length}</span>
                    <span class="main-search__stat-label">PRODUITS</span>
                  </div>
                  <div class="main-search__stat">
                    <span class="main-search__stat-value">0</span>
                    <span class="main-search__stat-label">CONTENUS</span>
                  </div>
                </div>
              </div>
            </aside>
            <div class="main-search__content">
              ${items.length
                ? `
                  <section class="main-search__block">
                    <div class="main-search__block-head">
                      <p class="main-search__block-kicker">[ PRODUITS ]</p>
                      <p class="main-search__block-count">${items.length} RESULTATS</p>
                    </div>
                    <div class="main-search__results main-search__results--products" data-search-fallback-results></div>
                  </section>
                `
                : `
                  <div class="main-search__empty">
                    <p class="main-search__empty-kicker">[ VIDE ]</p>
                    <p>AUCUN ARTICLE TROUVE${query ? ` POUR "${query.toUpperCase()}"` : ''}.</p>
                    <p>ESSAIE UNE AUTRE ORTHOGRAPHE, UN NOM DE MARQUE PLUS COURT OU UNE RECHERCHE PLUS LARGE.</p>
                  </div>
                `}
            </div>
          </div>
        </div>
      </div>
    `;

    const resultsEl = wrapperEl.querySelector('[data-search-fallback-results]');
    items.forEach((item) => {
      const cardEl = document.createElement('article');
      cardEl.className = 'search-card search-card--product search-card--fallback';
      cardEl.innerHTML = `
        <a class="search-card__link" href="${item.href}" data-search-product-url="${escapeHtml(item.href)}">
          <div class="search-card__media">
            ${item.imageUrl
              ? `<img class="search-card__image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.imageAlt)}" loading="lazy">`
              : '<div class="search-card__image search-card__image--placeholder"></div>'}
          </div>
          <div class="search-card__meta search-card__meta--copy-only">
            <div class="search-card__meta-copy">${(item.metaLines.length ? item.metaLines : [item.title.toUpperCase()]).map((line) => `<p class="search-card__meta-line">${line}</p>`).join('')}</div>
          </div>
        </a>
      `;
      resultsEl?.appendChild(cardEl);
    });

    targetSectionEl.innerHTML = '';
    targetSectionEl.appendChild(wrapperEl);

    const extractBestProductImageFromDocument = (doc) => {
      const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
      if (ogImage) return ogImage;

      const productMediaImage = doc.querySelector('.product-view__media-image, .product-view__media-frame img')?.getAttribute('src');
      if (productMediaImage) return productMediaImage;

      const ldJsonEls = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
      for (const ldJsonEl of ldJsonEls) {
        try {
          const parsed = JSON.parse(ldJsonEl.textContent || '{}');
          const entries = Array.isArray(parsed) ? parsed : [parsed];
          for (const entry of entries) {
            const imageValue = entry?.image;
            if (typeof imageValue === 'string' && imageValue) return imageValue;
            if (Array.isArray(imageValue) && imageValue[0]) return imageValue[0];
          }
        } catch {
          continue;
        }
      }

      return '';
    };

    wrapperEl.querySelectorAll('[data-search-product-url]').forEach(async (linkEl) => {
      const imageEl = linkEl.querySelector('.search-card__image');
      const productUrl = linkEl.getAttribute('data-search-product-url');
      if (!imageEl || !productUrl) return;

      try {
        const response = await fetch(productUrl, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        if (!response.ok) return;

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const bestImageUrl = extractBestProductImageFromDocument(doc);
        if (!bestImageUrl) return;

        imageEl.src = bestImageUrl;
        imageEl.srcset = '';
      } catch {
        return;
      }
    });
  };

  initHeaderScrollVisibility();
  initMobileNav();
  initCartDrawer();
  initSearchOverlay();
  initFooterReveal();
  initLenisSmoothScroll();
  initCtaHoverScramble();
  initInteractiveScramble();
  initCollectionTickerScramble();
  initAllVideoHeros();
  initAllImageHeroSliders();
  initAllCollectionStacks();
  initProductView();
  initAllCategorySticky();
  initAllCollectionsTrioParallax();
  initAllSneakerCleaningCompareParallax();
  initCatalogPage();
  initCartPage();
  initSearchPageFallback();
  refreshHeaderCartCount();
  document.addEventListener('shopify:section:load', (event) => {
    initHeaderScrollVisibility(event.target);
    initMobileNav(event.target);
    initCartDrawer(event.target);
    initSearchOverlay(event.target);
    initFooterReveal(event.target);
    initCtaHoverScramble(event.target);
    initInteractiveScramble(event.target);
    initCollectionTickerScramble(event.target);
    initAllVideoHeros(event.target);
    initAllImageHeroSliders(event.target);
    initAllCollectionStacks(event.target);
    initProductView(event.target);
    initAllCategorySticky(event.target);
    initAllCollectionsTrioParallax(event.target);
    initAllSneakerCleaningCompareParallax(event.target);
    initCatalogPage(event.target);
    initCartPage(event.target);
    initSearchPageFallback(event.target);
    refreshHeaderCartCount();
  });
})();
