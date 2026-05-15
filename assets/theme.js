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
  const CTA_POINTER_SCRAMBLE_SELECTOR = '.header-menu a, .header-link, .button, .video-hero__availability, .site-footer-v2__submit';
  const INTERACTIVE_SCRAMBLE_SELECTOR = '.header-menu a, .header-link, .button, .video-hero__availability, .collection-slider__fixed-quick-add-button, .site-footer-v2__links-list a, .site-footer-v2__links-list span, .site-footer-v2__submit';
  const interactiveScrambleState = new WeakMap();
  const ctaHoverScrambleState = new WeakMap();

  const getInteractiveTextTarget = (element) => {
    if (!element) return null;
    return element.querySelector?.('.video-hero__availability-label, .site-footer-v2__submit-label, .collection-slider__fixed-quick-add-label') || element;
  };

  const getInteractiveLockTarget = (element) => {
    if (!element) return null;
    return element.closest?.('.video-hero__availability, .site-footer-v2__submit, .collection-slider__fixed-quick-add-button') || element;
  };

  const isInteractiveScrambleDisabled = (element) => {
    if (!element) return false;
    if (element.dataset?.disableScramble === 'true') return true;
    return Boolean(element.closest?.('[data-disable-scramble="true"]'));
  };

  const preserveScrambleChar = (char) => /[\s\[\](),.:;'’/\-]/.test(char);

  const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();

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
  let footerRevealController = null;

  const initMobileNav = (root = document) => {
    const headerFromRoot = root?.matches?.('.site-header')
      ? root
      : root?.querySelector?.('.site-header');
    const headerEl = headerFromRoot || document.querySelector('.site-header');
    if (!headerEl) return;

    const navEl = headerEl.querySelector('[data-mobile-nav]');
    const toggleButton = navEl?.querySelector('[data-mobile-nav-toggle]');
    const panelEl = navEl?.querySelector('[data-mobile-nav-panel]');
    if (!navEl || !toggleButton || !panelEl) return;

    if (mobileNavController?.nav === navEl) return;
    if (mobileNavController?.destroy) {
      mobileNavController.destroy();
    }

    const mobileQuery = window.matchMedia('(max-width: 640px)');
    const panelLinks = Array.from(panelEl.querySelectorAll('a'));

    const syncOpenState = (isOpen) => {
      navEl.classList.toggle('is-open', isOpen);
      headerEl.classList.toggle('has-mobile-menu-open', isOpen);
      document.body.classList.toggle('mobile-menu-open', isOpen);
      toggleButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    const closeMenu = () => {
      syncOpenState(false);
    };

    const openMenu = () => {
      syncOpenState(true);
    };

    const toggleMenu = () => {
      if (navEl.classList.contains('is-open')) {
        closeMenu();
        return;
      }
      openMenu();
    };

    const handleDocumentClick = (event) => {
      if (!mobileQuery.matches) return;
      if (!navEl.classList.contains('is-open')) return;
      if (navEl.contains(event.target)) return;
      closeMenu();
    };

    const handleKeydown = (event) => {
      if (event.key !== 'Escape') return;
      if (!navEl.classList.contains('is-open')) return;
      closeMenu();
      toggleButton.focus();
    };

    const handleViewportChange = () => {
      if (mobileQuery.matches) return;
      closeMenu();
    };

    toggleButton.addEventListener('click', toggleMenu);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeydown);
    panelLinks.forEach((linkEl) => linkEl.addEventListener('click', closeMenu));

    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', handleViewportChange);
    } else {
      mobileQuery.addListener(handleViewportChange);
    }

    syncOpenState(navEl.classList.contains('is-open'));
    handleViewportChange();

    mobileNavController = {
      nav: navEl,
      destroy: () => {
        closeMenu();
        toggleButton.removeEventListener('click', toggleMenu);
        document.removeEventListener('click', handleDocumentClick);
        document.removeEventListener('keydown', handleKeydown);
        panelLinks.forEach((linkEl) => linkEl.removeEventListener('click', closeMenu));
        if (mobileQuery.removeEventListener) {
          mobileQuery.removeEventListener('change', handleViewportChange);
        } else {
          mobileQuery.removeListener(handleViewportChange);
        }
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
    const formEl = overlayEl.querySelector('.header-search-overlay__form');
    const resultsEl = overlayEl.querySelector('[data-search-results]');
    const dialogEl = overlayEl.querySelector('.header-search-overlay__dialog');
    const headerEl = overlayEl.closest('.site-header');
    const searchEndpoint = overlayEl.dataset.searchEndpoint;
    const searchSectionId = overlayEl.dataset.searchSectionId;
    const minSearchLength = 2;

    let searchDebounceId = 0;
    let searchAbortController = null;

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
    formEl?.addEventListener('submit', clearPendingSearch);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleDocumentClick);

    searchOverlayController = {
      overlay: overlayEl,
      destroy: () => {
        closeOverlay();
        triggerEls.forEach((triggerEl) => triggerEl.removeEventListener('click', handleTriggerClick));
        closeEls.forEach((closeEl) => closeEl.removeEventListener('click', closeOverlay));
        inputEl?.removeEventListener('input', schedulePredictiveSearch);
        inputEl?.removeEventListener('focus', schedulePredictiveSearch);
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
      footerEl.classList.toggle('is-reveal-interactive', clampedOpacity >= 0.1);
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
      if (desktopQuery.matches) {
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

      const minCardWidth = getNumericVar('--collection-slider-card-width', 260);
      const minRowHeight = getNumericVar('--collection-slider-row-height', 380);
      const baseCardWidth = Math.max(minCardWidth, viewportWidth / 4);
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
      const TRACKPAD_SCROLL_DAMPING = 0.28;
      const TRACKPAD_SCROLL_MAX_STEP = 42;
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
        if (hasInfiniteLoop) {
          const loopBase = getLoopWidth(step);
          return desktopQuery.matches ? loopBase + (step * 0.5) : loopBase;
        }
        if (!desktopQuery.matches) return 0;
        return step * 0.5;
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

        if (isTrackpadWheelGesture(event) && !event.shiftKey) {
          const rawTrackpadDelta = Math.abs(event.deltaX) > 0 ? event.deltaX : event.deltaY;
          const dampedTrackpadDelta = Math.max(
            -TRACKPAD_SCROLL_MAX_STEP,
            Math.min(TRACKPAD_SCROLL_MAX_STEP, rawTrackpadDelta * TRACKPAD_SCROLL_DAMPING)
          );

          if (Math.abs(dampedTrackpadDelta) < 0.5) return;

          event.preventDefault();
          hasManualScroll = true;
          hasUserInteracted = true;
          cancelProgrammaticScroll();

          if (wheelResetTimer) {
            window.clearTimeout(wheelResetTimer);
            wheelResetTimer = null;
          }

          if (scrollEndTimer) {
            window.clearTimeout(scrollEndTimer);
            scrollEndTimer = null;
          }

          wheelAccumDelta = 0;
          viewport.scrollLeft = clampScroll(viewport.scrollLeft + dampedTrackpadDelta);
          if (hasInfiniteLoop) {
            normalizeInfinitePosition();
          }
          updateControls();
          return;
        }

        const dominantDelta = Math.abs(event.deltaX) > 0 ? event.deltaX : event.deltaY;
        if (Math.abs(dominantDelta) < 1) return;

        event.preventDefault();
        hasManualScroll = true;
        hasUserInteracted = true;
        wheelAccumDelta += dominantDelta;

        if (Math.abs(wheelAccumDelta) >= 38) {
          scrollByStep(wheelAccumDelta > 0 ? 1 : -1);
          wheelAccumDelta = 0;
        }

        if (wheelResetTimer) window.clearTimeout(wheelResetTimer);
        wheelResetTimer = window.setTimeout(() => {
          wheelAccumDelta = 0;
        }, 120);
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
      const slide = slides[activeIndex];
      const url = getImageUrl(slide);
      const alt = (slide.dataset.imageAlt || '').trim();
      renderImage(url, alt).finally(() => {
        isTransitioning = false;
      });
    };

    sectionRoot.style.setProperty('--hero-step-loader-duration', `${autoplayDelay}ms`);
    sectionRoot.style.setProperty('--hero-step-loader-state', 'running');

    const setLoaderPlayState = (state) => {
      sectionRoot.style.setProperty('--hero-step-loader-state', state);
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

  initHeaderScrollVisibility();
  initMobileNav();
  initSearchOverlay();
  initFooterReveal();
  initLenisSmoothScroll();
  initCtaHoverScramble();
  initInteractiveScramble();
  initCollectionTickerScramble();
  initAllVideoHeros();
  initAllImageHeroSliders();
  initAllCollectionStacks();
  initAllCategorySticky();
  initAllCollectionsTrioParallax();
  document.addEventListener('shopify:section:load', (event) => {
    initHeaderScrollVisibility(event.target);
    initMobileNav(event.target);
    initSearchOverlay(event.target);
    initFooterReveal(event.target);
    initCtaHoverScramble(event.target);
    initInteractiveScramble(event.target);
    initCollectionTickerScramble(event.target);
    initAllVideoHeros(event.target);
    initAllImageHeroSliders(event.target);
    initAllCollectionStacks(event.target);
    initAllCategorySticky(event.target);
    initAllCollectionsTrioParallax(event.target);
  });
})();
