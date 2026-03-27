(() => {
  document.documentElement.classList.add('js');
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

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

    const resetTransition = () => {
      if (!transitionEl) return;
      transitionEl.pause();
      transitionEl.classList.remove('is-visible');
      transitionEl.removeAttribute('src');
      transitionEl.load();
    };

    const setCopyHidden = (isHidden) => {
      sectionRoot.classList.toggle('is-copy-hidden', isHidden);
    };

    const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();

    const prepareCopyElements = () => {
      slides.forEach((slide) => {
        slide
          .querySelectorAll('.video-hero__copy-grid h2, .video-hero__copy-grid h3, .video-hero__copy-grid p, .video-hero__copy-grid .video-hero__availability')
          .forEach((element) => {
            const finalText = normalizeText(element.textContent || '');
            element.dataset.copyFinal = finalText;
            element.textContent = finalText;
          });
      });
    };

    const scrambleText = (element, runNonce, delayMs = 0) => {
      const finalText = element.dataset.copyFinal || '';
      if (!finalText) return;

      const preserveChar = (char) => /[\s\[\](),.:;'’/\-]/.test(char);

      window.setTimeout(() => {
        if (runNonce !== copyAnimationNonce) return;
        const totalSteps = 12;
        let step = 0;

        const timer = window.setInterval(() => {
          if (runNonce !== copyAnimationNonce) {
            window.clearInterval(timer);
            element.textContent = finalText;
            return;
          }

          step += 1;
          if (step >= totalSteps) {
            window.clearInterval(timer);
            element.textContent = finalText;
            return;
          }

          const revealIndex = Math.floor((step / totalSteps) * finalText.length);
          let output = '';

          for (let i = 0; i < finalText.length; i += 1) {
            const finalChar = finalText[i];
            if (i <= revealIndex || preserveChar(finalChar)) {
              output += finalChar;
            } else {
              output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            }
          }

          element.textContent = output;
        }, 28);
      }, delayMs);
    };

    const animateSlideCopy = (index) => {
      const slide = slides[index];
      if (!slide) return;

      const copyElements = Array.from(
        slide.querySelectorAll('.video-hero__copy-grid h2, .video-hero__copy-grid h3, .video-hero__copy-grid p, .video-hero__copy-grid .video-hero__availability')
      );
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
        scrambleText(element, runNonce, idx * 55);
      });
    };

    const revealCopyWithEffect = (index) => {
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
      if (!imageEl || !placeholderEl || !transitionEl) return;
      const media = getMediaForSlide(index);

      if (!media || !media.imageUrl) {
        imageEl.classList.remove('is-visible', 'is-fading');
        placeholderEl.classList.add('is-visible');
        if (!keepTransitionVisible) {
          resetTransition();
        }
        return;
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
        setSlideState(targetIndex);
        showImage(targetIndex, true);
        revealCopyWithEffect(targetIndex);
        return;
      }

      const transitionUrl = resolveTransitionUrl(activeIndex, targetIndex, direction);

      setCopyHidden(true);

      if (!transitionUrl) {
        setSlideState(targetIndex);
        showImage(targetIndex, true);
        revealCopyWithEffect(targetIndex);
        return;
      }

      if (activeTransitionCleanup) {
        activeTransitionCleanup(false);
      }

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
        isTransitioning = false;
        activeTransitionCleanup = null;

        if (applyTarget) {
          setSlideState(targetIndex);
          showImage(targetIndex, false, true);
          revealCopyWithEffect(targetIndex);
        } else {
          setCopyHidden(false);
        }
        resetTransition();
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

    const goToIndex = (targetIndex) => {
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

      setSlideState(targetIndex);
      showImage(targetIndex, true);
      revealCopyWithEffect(targetIndex);
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
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', syncForViewport);
    } else {
      mediaQuery.addListener(syncForViewport);
    }

    prepareCopyElements();
    setCopyHidden(false);
    setSlideState(0);
    showImage(0, false);
  };

  const initAllVideoHeros = (root = document) => {
    root.querySelectorAll('[data-video-hero]').forEach(initVideoHero);
  };

  initAllVideoHeros();
  document.addEventListener('shopify:section:load', (event) => {
    initAllVideoHeros(event.target);
  });
})();
