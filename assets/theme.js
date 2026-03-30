(() => {
  document.documentElement.classList.add('js');
  const HERO_AUTOPLAY_DELAY_MS = 7000;
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const COPY_OUT_DURATION_MS = 400;
  const COPY_ELEMENT_SELECTOR = '.video-hero__copy-grid h2, .video-hero__copy-grid h3, .video-hero__copy-grid p, .video-hero__copy-grid .video-hero__availability-label';
  const INTERACTIVE_SCRAMBLE_SELECTOR = '.header-menu a, .header-link, .button, .video-hero__prev, .video-hero__next, .video-hero__availability';
  const interactiveScrambleState = new WeakMap();

  const getInteractiveTextTarget = (element) => {
    if (!element) return null;
    return element.querySelector?.('.video-hero__availability-label') || element;
  };

  const getInteractiveLockTarget = (element) => {
    if (!element) return null;
    return element.closest?.('.video-hero__availability') || element;
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

  const runInteractiveScramble = (element) => {
    const textTarget = getInteractiveTextTarget(element);
    if (!textTarget) return;

    const finalText = getInteractiveFinalText(textTarget);
    if (!finalText) return;

    const existingState = interactiveScrambleState.get(textTarget);
    clearInteractiveScramble(textTarget);

    const lockTarget = getInteractiveLockTarget(textTarget);
    const widthLockState = existingState?.widthLockState || lockInteractiveWidth(lockTarget);

    let step = 0;
    const totalSteps = 10;
    textTarget.textContent = finalText;

    const intervalId = window.setInterval(() => {
      step += 1;

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

      textTarget.textContent = output;

      if (step >= totalSteps) {
        window.clearInterval(intervalId);
        textTarget.textContent = finalText;
        unlockInteractiveWidth(lockTarget, widthLockState);
        interactiveScrambleState.delete(textTarget);
      }
    }, 28);

    interactiveScrambleState.set(textTarget, {
      intervalId,
      delayTimer: 0,
      widthLockState,
      lockTarget
    });
  };

  const initInteractiveScramble = (root = document) => {
    root.querySelectorAll(INTERACTIVE_SCRAMBLE_SELECTOR).forEach((element) => {
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

  const initVideoHero = (sectionRoot) => {
    if (!sectionRoot || sectionRoot.dataset.videoHeroInit === 'true') return;
    sectionRoot.dataset.videoHeroInit = 'true';

    const slides = Array.from(sectionRoot.querySelectorAll('[data-slide]'));
    if (!slides.length) return;

    const imageEl = sectionRoot.querySelector('.video-hero__image');
    const transitionEl = sectionRoot.querySelector('.video-hero__transition');
    const placeholderEl = sectionRoot.querySelector('.video-hero__placeholder');
    const prevTriggerEl = sectionRoot.querySelector('[data-prev-trigger]');
    const nextTriggerEl = sectionRoot.querySelector('[data-next-trigger]');
    const stepEls = Array.from(sectionRoot.querySelectorAll('[data-jump-index]'));

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
    const imagePreloadCache = new Map();

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

    const updateNavigationTriggerState = () => {
      const hasPrev = activeIndex > 0;
      const hasNext = activeIndex < slides.length - 1;

      if (prevTriggerEl) {
        prevTriggerEl.hidden = !hasPrev;
        prevTriggerEl.disabled = !hasPrev;
        prevTriggerEl.setAttribute('aria-disabled', hasPrev ? 'false' : 'true');
        prevTriggerEl.classList.toggle('is-disabled', !hasPrev);
      }

      if (nextTriggerEl) {
        nextTriggerEl.hidden = !hasNext;
        nextTriggerEl.disabled = !hasNext;
        nextTriggerEl.setAttribute('aria-disabled', hasNext ? 'false' : 'true');
        nextTriggerEl.classList.toggle('is-disabled', !hasNext);
      }
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
      updateNavigationTriggerState();
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

    sectionRoot.addEventListener('wheel', handleHorizontalWheel, { passive: false });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    prepareCopyElements();
    prepareImageForSlide(0);
    setCopyHidden(false);
    setSlideState(0);
    showImage(0, false);
    queueAutoplay();
  };

  const initAllVideoHeros = (root = document) => {
    root.querySelectorAll('[data-video-hero]').forEach(initVideoHero);
  };

  initInteractiveScramble();
  initAllVideoHeros();
  document.addEventListener('shopify:section:load', (event) => {
    initInteractiveScramble(event.target);
    initAllVideoHeros(event.target);
  });
})();
