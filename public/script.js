document.addEventListener('DOMContentLoaded', function () {
  
  // 1. Scroll Reveal Animation ("Din ceață de jos")
  const revealElements = document.querySelectorAll('.reveal-up, section, .section-title, .hero-logo-img, .hero-title, .hero-description, .btn-group, .accordion-wrapper, .stats-grid, .gallery-container, .red-banner-section');
  
  revealElements.forEach(el => {
    if (!el.classList.contains('reveal-up')) {
      el.classList.add('reveal-up');
    }
  });

  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, observerOptions);

  revealElements.forEach(el => revealObserver.observe(el));

  // 2. Accordion Toggle Logic with Smooth Expansion
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  
  accordionHeaders.forEach(header => {
    header.addEventListener('click', function () {
      const currentItem = this.parentElement;
      const accordionGroup = currentItem.parentElement;

      // Close other items in the same accordion group
      const siblingItems = accordionGroup.querySelectorAll('.accordion-item');
      siblingItems.forEach(item => {
        if (item !== currentItem) {
          item.classList.remove('active');
        }
      });

      // Toggle active class on current item
      currentItem.classList.toggle('active');
    });
  });

  // 3. Photo Gallery Auto-Play & Smooth Slideshow Carousel (No Page Jump)
  const mainGalleryImg = document.getElementById('mainGalleryImg');
  const galleryThumbs = document.querySelectorAll('.gallery-thumb');
  const galleryThumbsRow = document.getElementById('galleryThumbnailsRow');
  let currentGalleryIndex = 0;
  let galleryTimer = null;

  function switchGalleryImage(index) {
    if (!mainGalleryImg || galleryThumbs.length === 0) return;
    
    currentGalleryIndex = index % galleryThumbs.length;
    const targetThumb = galleryThumbs[currentGalleryIndex];
    const fullSrc = targetThumb.getAttribute('data-full');

    if (fullSrc) {
      mainGalleryImg.style.opacity = '0.3';
      setTimeout(() => {
        mainGalleryImg.src = fullSrc;
        mainGalleryImg.style.opacity = '1';
      }, 150);
    }

    galleryThumbs.forEach(t => t.classList.remove('active'));
    targetThumb.classList.add('active');

    // Scroll ONLY the thumbnails row horizontally (Prevents whole page window jump!)
    if (galleryThumbsRow) {
      const scrollPos = targetThumb.offsetLeft - (galleryThumbsRow.offsetWidth / 2) + (targetThumb.offsetWidth / 2);
      galleryThumbsRow.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }

  function startGalleryAutoPlay() {
    stopGalleryAutoPlay();
    galleryTimer = setInterval(() => {
      switchGalleryImage(currentGalleryIndex + 1);
    }, 3500); // Transitions every 3.5 seconds
  }

  function stopGalleryAutoPlay() {
    if (galleryTimer) {
      clearInterval(galleryTimer);
      galleryTimer = null;
    }
  }

  if (galleryThumbs.length > 0) {
    galleryThumbs.forEach((thumb, idx) => {
      thumb.addEventListener('click', function () {
        stopGalleryAutoPlay();
        switchGalleryImage(idx);
        startGalleryAutoPlay();
      });
    });

    const galleryContainer = document.querySelector('.gallery-container');
    if (galleryContainer) {
      galleryContainer.addEventListener('mouseenter', stopGalleryAutoPlay);
      galleryContainer.addEventListener('mouseleave', startGalleryAutoPlay);
    }

    // Start auto-play on load
    startGalleryAutoPlay();
  }

  // 4. Statistics Number Counter Animation
  const statNumbers = document.querySelectorAll('.stat-number');
  let animatedStats = false;

  function animateCounters() {
    statNumbers.forEach(stat => {
      const rawText = stat.innerText.trim();
      const hasPlus = rawText.includes('+');
      const targetNum = parseInt(rawText.replace(/\D/g, ''), 10);
      if (isNaN(targetNum)) return;

      let current = 0;
      const duration = 2000; // 2 seconds count up
      const startTime = performance.now();

      function updateNumber(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - (1 - progress) * (1 - progress);
        current = Math.floor(easeProgress * targetNum);

        stat.innerText = current + (hasPlus ? '+' : '');

        if (progress < 1) {
          requestAnimationFrame(updateNumber);
        } else {
          stat.innerText = targetNum + (hasPlus ? '+' : '');
        }
      }

      requestAnimationFrame(updateNumber);
    });
  }

  const statsSection = document.querySelector('.stats-grid');
  if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animatedStats) {
          animatedStats = true;
          animateCounters();
        }
      });
    }, { threshold: 0.3 });

    statsObserver.observe(statsSection);
  }

  // 5. Artist Signup Form Submission
  const artistForm = document.getElementById('artistForm');
  const artistSuccessAlert = document.getElementById('artistSuccessAlert');

  if (artistForm) {
    artistForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (artistSuccessAlert) {
        artistSuccessAlert.style.display = 'block';
        artistForm.reset();
        window.scrollTo({ top: artistSuccessAlert.offsetTop - 80, behavior: 'smooth' });
      }
    });
  }

  // 6. Partners Form Submission
  const partnersForm = document.getElementById('partnersForm');
  const partnersSuccessAlert = document.getElementById('partnersSuccessAlert');

  if (partnersForm) {
    partnersForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (partnersSuccessAlert) {
        partnersSuccessAlert.style.display = 'block';
        partnersForm.reset();
        window.scrollTo({ top: partnersSuccessAlert.offsetTop - 80, behavior: 'smooth' });
      }
    });
  }

});
