(() => {
  document.documentElement.classList.add('js');

  const initVideoHero = (sectionRoot) => {
    if (!sectionRoot || sectionRoot.dataset.videoHeroInit === 'true') return;
    sectionRoot.dataset.videoHeroInit = 'true';

    const slides = Array.from(sectionRoot.querySelectorAll('[data-slide]'));
    if (!slides.length) return;

    const imageEl = sectionRoot.querySelector('.video-hero__image');
    const transitionEl = sectionRoot.querySelector('.video-hero__transition');
    const placeholderEl = sectionRoot.querySelector('.video-hero__placeholder');
    const breakpoint = Number(sectionRoot.dataset.mobileBreakpoint || 768);
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

    let activeIndex = 0;
    let isTransitioning = false;
    let activeTransitionCleanup = null;

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

      const transitionUrl = mediaQuery.matches
        ? (data.transitionMobile || data.transitionDesktop)
        : (data.transitionDesktop || data.transitionMobile);

      const transitionPrevUrl = mediaQuery.matches
        ? (data.transitionPrevMobile || data.transitionPrevDesktop)
        : (data.transitionPrevDesktop || data.transitionPrevMobile);

      return {
        imageUrl,
        transitionUrl,
        transitionPrevUrl,
        alt: data.alt
      };
    };

    const setSlideState = (index) => {
      activeIndex = index;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
      });
    };

    const showImage = (index, withFade = false, keepTransitionVisible = false) => {
      if (!imageEl || !placeholderEl || !transitionEl) return;
      const media = getMediaForSlide(index);
      if (!media || !media.imageUrl) {
        imageEl.classList.remove('is-visible', 'is-fading');
        placeholderEl.classList.add('is-visible');
        if (!keepTransitionVisible) {
          transitionEl.classList.remove('is-visible');
        }
        transitionEl.pause();
        transitionEl.removeAttribute('src');
        return;
      }

      if (imageEl.getAttribute('src') !== media.imageUrl) {
        imageEl.setAttribute('src', media.imageUrl);
      }
      imageEl.setAttribute('alt', media.alt || '');

      placeholderEl.classList.remove('is-visible');
      if (!keepTransitionVisible) {
        transitionEl.classList.remove('is-visible');
        transitionEl.pause();
      }

      if (withFade) {
        imageEl.classList.remove('is-fading');
        void imageEl.offsetWidth;
        imageEl.classList.add('is-fading');
        window.setTimeout(() => imageEl.classList.remove('is-fading'), 240);
      }

      imageEl.classList.add('is-visible');
    };

    const playTransitionTo = (targetIndex, direction = 'next') => {
      if (!transitionEl) {
        setSlideState(targetIndex);
        showImage(targetIndex, true);
        return;
      }

      const currentMedia = getMediaForSlide(activeIndex);
      const transitionUrl = currentMedia
        ? (direction === 'prev' ? currentMedia.transitionPrevUrl : currentMedia.transitionUrl)
        : '';
      if (!transitionUrl) {
        setSlideState(targetIndex);
        showImage(targetIndex, true);
        return;
      }

      if (activeTransitionCleanup) {
        activeTransitionCleanup(false);
      }

      isTransitioning = true;
      transitionEl.classList.add('is-visible');
      transitionEl.setAttribute('src', transitionUrl);
      transitionEl.currentTime = 0;
      transitionEl.muted = true;
      transitionEl.load();

      let isDone = false;
      let timeoutId = 0;
      const finish = (applyTarget = true) => {
        if (isDone) return;
        isDone = true;
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timeoutId = 0;
        }
        if (applyTarget) {
          setSlideState(targetIndex);
          showImage(targetIndex, false, true);
          requestAnimationFrame(() => {
            transitionEl.classList.remove('is-visible');
            transitionEl.pause();
          });
        } else {
          transitionEl.classList.remove('is-visible');
          transitionEl.pause();
        }
        transitionEl.removeEventListener('ended', finish);
        transitionEl.removeEventListener('error', finish);
        isTransitioning = false;
        activeTransitionCleanup = null;
      };
      activeTransitionCleanup = finish;

      transitionEl.addEventListener('ended', finish, { once: true });
      transitionEl.addEventListener('error', finish, { once: true });
      timeoutId = window.setTimeout(() => finish(true), 5000);

      transitionEl.play().catch(() => {
        finish(true);
      });
    };

    sectionRoot.addEventListener('click', (event) => {
      const nav = event.target.closest('[data-nav]');
      if (!nav) return;

      if (nav.dataset.nav === 'next') {
        if (isTransitioning) return;
        const target = activeIndex + 1;
        if (target < slides.length) {
          playTransitionTo(target, 'next');
        }
      }

      if (nav.dataset.nav === 'prev') {
        if (isTransitioning && activeTransitionCleanup) {
          activeTransitionCleanup(false);
        }
        const target = activeIndex - 1;
        if (target >= 0) {
          playTransitionTo(target, 'prev');
        }
      }
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
