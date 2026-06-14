// js/app.js
async function loadPhotos(type){
  try{
    const res = await fetch('photos.json', {cache: 'no-store'});
    const json = await res.json();
    const list = json[type] || [];
    const root = document.getElementById('gallery');

    if (!root) {
      return;
    }

    root.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'gallery';

    list.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery-card';
      button.dataset.zoomImage = item.url;
      button.dataset.zoomAlt = item.title || '';

      const img = document.createElement('img');
      img.src = item.thumb || item.url;
      img.alt = item.title || '';
      button.appendChild(img);

      const caption = document.createElement('div');
      caption.className = 'gallery-card-caption';

      const number = document.createElement('p');
      number.className = 'gallery-card-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const title = document.createElement('p');
      title.className = 'gallery-card-title';
      title.textContent = item.title || 'Photo';

      caption.appendChild(number);
      caption.appendChild(title);
      button.appendChild(caption);
      container.appendChild(button);
    });

    root.appendChild(container);

    const pageTitle = document.getElementById('galleryPageTitle');
    const pageLead = document.getElementById('galleryPageLead');
    const collectionName = document.getElementById('galleryCollectionName');
    const photoCount = document.getElementById('galleryPhotoCount');

    if (type === 'pre') {
      if (pageTitle) pageTitle.textContent = 'Pre-Wedding Photos';
      if (pageLead) pageLead.textContent = '2026.02.20 in 山中湖&根津記念館';
      if (collectionName) collectionName.textContent = '和装前撮り';
    } else if (type === 'event') {
      if (pageTitle) pageTitle.textContent = 'Ceremony Photos';
      if (pageLead) pageLead.textContent = 'coming soon...';
      if (collectionName) collectionName.textContent = '式当日';
    }

    if (photoCount) {
      photoCount.textContent = `${list.length} photos`;
    }

    initImageLightbox();
  }catch(err){
    console.error(err);
  }
}

// URLのクエリから type を取るユーティリティ
function getParam(name){
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

function initPhotoCarousel() {
  const carousel = document.querySelector('.photo-carousel');
  if (!carousel) {
    return;
  }

  const viewport = carousel.querySelector('.photo-carousel-viewport');
  const sourceImages = Array.from(carousel.querySelectorAll('.photo-carousel-source img'));
  const totalImages = sourceImages.length;

  if (!viewport || totalImages === 0) {
    return;
  }

  const interval = Number(carousel.dataset.interval || 3600);
  const duration = Number(carousel.dataset.duration || 900);
  carousel.style.setProperty('--carousel-duration', `${duration}ms`);

  const cards = Array.from({ length: Math.min(3, totalImages) }, () => {
    const card = document.createElement('img');
    card.className = 'photo-carousel-card';
    viewport.appendChild(card);
    return card;
  });

  let currentIndex = 0;
  let timerId = null;
  let isAnimating = false;

  function getSource(index) {
    return sourceImages[(index + totalImages) % totalImages];
  }

  function assignCard(card, sourceIndex) {
    const source = getSource(sourceIndex);
    card.src = source.src;
    card.alt = source.alt;
  }

  function applySlots() {
    const slotClasses = ['is-left', 'is-right', 'is-next'];
    cards.forEach((card, index) => {
      card.className = `photo-carousel-card ${slotClasses[index] || ''}`.trim();
    });
  }

  function renderInitialState() {
    cards.forEach((card, index) => assignCard(card, currentIndex + index));
    applySlots();
  }

  function scheduleNext() {
    if (totalImages < 3) {
      return;
    }
    timerId = window.setTimeout(runSlide, interval);
  }

  function getShiftDistance() {
    const styles = window.getComputedStyle(carousel);
    const gap = parseFloat(styles.getPropertyValue('--carousel-gap')) || 0;
    return (viewport.clientWidth - gap) / 2 + gap;
  }

  function runSlide() {
    if (isAnimating) {
      return;
    }

    isAnimating = true;
    const shiftDistance = getShiftDistance();
    const animations = cards.map((card, index) => {
      return card.animate(
        [
          { transform: 'translateX(0)', opacity: 1 },
          { transform: `translateX(-${shiftDistance}px)`, opacity: index === 0 ? 0 : 1 }
        ],
        {
          duration,
          easing: 'linear',
          fill: 'forwards'
        }
      );
    });

    Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        animations.forEach((animation) => {
          if (typeof animation.commitStyles === 'function') {
            animation.commitStyles();
          }
          animation.cancel();
        });

        currentIndex = (currentIndex + 1) % totalImages;
        const recycledCard = cards.shift();
        cards.push(recycledCard);
        assignCard(recycledCard, currentIndex + 2);
        applySlots();
        cards.forEach((card) => {
          card.style.transform = '';
          card.style.opacity = '';
        });

        isAnimating = false;
        scheduleNext();
      })
      .catch(() => {
        isAnimating = false;
      });
  }

  renderInitialState();
  scheduleNext();
}

function initMainFeatures() {
  const galleryRoot = document.getElementById('gallery');
  const type = galleryRoot ? galleryRoot.dataset.galleryType : getParam('type');
  if(type){
    loadPhotos(type);
  }

  // スムーズスクロール機能
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if(targetElement){
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // ハンバーガーメニュー機能
  const menuBtn = document.getElementById('menuBtn');
  const navMenu = document.getElementById('navMenu');

  if(menuBtn && navMenu){
    menuBtn.addEventListener('click', ()=>{
      navMenu.classList.toggle('active');
      menuBtn.classList.toggle('active');
      menuBtn.setAttribute('aria-expanded', String(navMenu.classList.contains('active')));
    });
  }

  initImageLightbox();
  initProfilePhotoStacks();
  initScrollReveals();
}

function initProfilePhotoStacks() {
  document.querySelectorAll('.profile-photo-stack').forEach((stack) => {
    const images = Array.from(stack.querySelectorAll('.profile-photo-stack-image'));
    if (images.length <= 1) {
      return;
    }

    let activeIndex = Math.max(0, images.findIndex((image) => image.classList.contains('is-active')));
    let isAnimating = false;

    function render() {
      images.forEach((image, index) => {
        image.classList.remove('is-active', 'is-next', 'is-back');
        image.style.removeProperty('z-index');
        image.style.removeProperty('opacity');
        image.style.removeProperty('transform');

        if (index === activeIndex) {
          image.classList.add('is-active');
        } else if (index === (activeIndex + 1) % images.length) {
          image.classList.add('is-next');
        } else {
          image.classList.add('is-back');
        }
      });
    }

    render();

    stack.addEventListener('click', () => {
      if (isAnimating) {
        return;
      }

      isAnimating = true;
      const currentImage = images[activeIndex];
      const nextIndex = (activeIndex + 1) % images.length;
      const nextImage = images[nextIndex];

      currentImage.style.zIndex = '4';
      nextImage.style.zIndex = '3';

      const outgoing = currentImage.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
          { opacity: 0, transform: 'translate3d(0, -16px, 0) scale(1.025)' }
        ],
        {
          duration: 720,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards'
        }
      );

      const incoming = nextImage.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 10px, 0) scale(0.99)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
        ],
        {
          duration: 720,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        }
      );

      Promise.all([outgoing.finished, incoming.finished]).then(() => {
        outgoing.cancel();
        incoming.cancel();
        activeIndex = nextIndex;
        render();
        isAnimating = false;
      }).catch(() => {
        activeIndex = nextIndex;
        render();
        isAnimating = false;
      });
    });
  });
}

function initScrollReveals() {
  const revealGroups = [
    { selector: '.memory-item', effect: 'reveal-memory' },
    { selector: '.about-profile-card', effect: 'reveal-about-profile' },
    { selector: '.pet-family-group', effect: 'reveal-about-profile' },
    { selector: '.about-profile-together', effect: 'reveal-about-profile' },
    { selector: '.qa-item', effect: 'reveal-qa' },
    { selector: '.agenda-timeline .agenda-item', effect: 'reveal-agenda' },
    { selector: '.prephoto-gallery .gallery-card', effect: 'reveal-prephoto' }
  ];

  revealGroups.forEach((group) => {
    document.querySelectorAll(group.selector).forEach((element) => {
      element.classList.add('reveal-on-scroll', group.effect);
    });
  });

  const revealElements = Array.from(document.querySelectorAll('.reveal-on-scroll'));
  if (revealElements.length === 0) {
    return;
  }

  revealElements.forEach((element, index) => {
    const localIndex = Array.from(element.parentElement ? element.parentElement.children : []).indexOf(element);
    const staggerIndex = localIndex >= 0 ? localIndex : index;
    element.style.transitionDelay = `${Math.min(staggerIndex * 70, 420)}ms`;
  });

  if (!('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.18,
    rootMargin: '0px 0px -8% 0px'
  });

  revealElements.forEach((element) => observer.observe(element));
}

function initImageLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxContent = document.getElementById('imageLightboxContent');
  const lightboxClose = document.getElementById('imageLightboxClose');
  const zoomButtons = document.querySelectorAll('[data-zoom-image]');

  if (!lightbox || !lightboxContent || !lightboxClose || zoomButtons.length === 0) {
    return;
  }

  if (lightbox.dataset.bound === 'true') {
    zoomButtons.forEach((button) => {
      button.onclick = () => {
        openLightbox(button.dataset.zoomImage, button.dataset.zoomAlt);
      };
    });
    return;
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxContent.src = '';
    lightboxContent.alt = '';
    document.body.style.overflow = '';
  }

  function openLightbox(imageSrc, imageAlt) {
    lightboxContent.src = imageSrc;
    lightboxContent.alt = imageAlt || '';
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  zoomButtons.forEach((button) => {
    button.addEventListener('click', () => {
      openLightbox(button.dataset.zoomImage, button.dataset.zoomAlt);
    });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !lightbox.hidden) {
      closeLightbox();
    }
  });

  lightbox.dataset.bound = 'true';
}

function shouldShowLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen) {
    return false;
  }

  const sessionKey = 'index-loading-screen-shown';
  const navigationEntry = performance.getEntriesByType('navigation')[0];
  const navigationType = navigationEntry ? navigationEntry.type : 'navigate';
  const hasShownInSession = sessionStorage.getItem(sessionKey) === 'true';

  if (navigationType === 'reload') {
    sessionStorage.setItem(sessionKey, 'true');
    return true;
  }

  if (!hasShownInSession) {
    sessionStorage.setItem(sessionKey, 'true');
    return true;
  }

  loadingScreen.style.display = 'none';
  return false;
}

window.addEventListener('load', ()=>{
  const loadingScreen = document.getElementById('loading-screen');
  const showLoadingScreen = shouldShowLoadingScreen();

  initPhotoCarousel();

  if(showLoadingScreen && loadingScreen){
    loadingScreen.classList.remove('hide');
    loadingScreen.style.display = '';

    setTimeout(()=>{
      loadingScreen.classList.add('hide');

      setTimeout(()=>{
        loadingScreen.style.display = 'none';
        initMainFeatures();
      }, 1500);
    }, 2000);
  } else {
    if (loadingScreen) {
      loadingScreen.classList.add('hide');
      loadingScreen.style.display = 'none';
    }
    initMainFeatures();
  }
});
