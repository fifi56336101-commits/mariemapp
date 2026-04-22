// ============================================
// DermAssist Documentation - Premium Scripts
// ============================================

// Mobile Menu Functions
function toggleMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.mobile-menu-overlay');
  
  menuBtn.classList.toggle('active');
  mobileMenu.classList.toggle('active');
  overlay.classList.toggle('active');
  
  // Prevent body scroll when menu is open
  document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
}

function closeMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.mobile-menu-overlay');
  
  menuBtn.classList.remove('active');
  mobileMenu.classList.remove('active');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Close menu on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMobileMenu();
  }
});

// FAQ Toggle
function toggleFaq(button) {
  const faqItem = button.parentElement;
  const isActive = faqItem.classList.contains('active');
  
  // Close all FAQ items
  document.querySelectorAll('.faq-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Open clicked item if it wasn't active
  if (!isActive) {
    faqItem.classList.add('active');
  }
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const headerOffset = 80;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    
    // Close mobile menu if open
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.remove('active');
  });
});

// Active navigation highlighting for manual section
const manualSections = document.querySelectorAll('.manual-section[id]');
const manualNavItems = document.querySelectorAll('.manual-nav-item');

function updateActiveManualNav() {
  const scrollPosition = window.scrollY + 150;
  
  manualSections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const sectionId = section.getAttribute('id');
    
    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
      manualNavItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${sectionId}`) {
          item.classList.add('active');
        }
      });
    }
  });
}

// Navbar scroll effect
const navbar = document.querySelector('.navbar');

function updateNavbar() {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

// Intersection Observer for reveal animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe elements for reveal animation
document.querySelectorAll('.feature-card, .step, .manual-card, .download-card, .faq-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  revealObserver.observe(el);
});

// Add revealed class styles
const revealedStyles = document.createElement('style');
revealedStyles.textContent = `
  .revealed {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
`;
document.head.appendChild(revealedStyles);

// Parallax effect for hero elements
function parallaxEffect() {
  const scrolled = window.pageYOffset;
  const heroGlow = document.querySelector('.hero-glow');
  const floatingCards = document.querySelectorAll('.float-card');
  
  if (heroGlow && scrolled < window.innerHeight) {
    heroGlow.style.transform = `translate(${scrolled * 0.1}px, ${scrolled * 0.05}px)`;
  }
  
  floatingCards.forEach((card, index) => {
    if (scrolled < window.innerHeight) {
      const speed = 0.05 + (index * 0.02);
      card.style.transform = `translateY(${scrolled * speed}px)`;
    }
  });
}

// Typing effect for hero title (optional enhancement)
function typeWriter(element, text, speed = 50) {
  let i = 0;
  element.textContent = '';
  
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  
  type();
}

// Counter animation for stats
function animateCounter(element, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);
  
  function updateCounter() {
    start += increment;
    if (start < target) {
      element.textContent = Math.floor(start);
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = target;
    }
  }
  
  updateCounter();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  updateActiveManualNav();
  updateNavbar();
  
  // Add loaded class to body
  document.body.classList.add('loaded');
  
  // Initialize phone mockup animation
  const phoneMockup = document.querySelector('.phone-mockup');
  if (phoneMockup) {
    phoneMockup.style.opacity = '0';
    phoneMockup.style.transform = 'translateY(40px)';
    
    setTimeout(() => {
      phoneMockup.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      phoneMockup.style.opacity = '1';
      phoneMockup.style.transform = 'translateY(0)';
    }, 300);
  }
});

// Event listeners
window.addEventListener('scroll', () => {
  updateActiveManualNav();
  updateNavbar();
  parallaxEffect();
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  const navLinks = document.querySelector('.nav-links');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  
  if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
    navLinks.classList.remove('active');
  }
});

// Keyboard navigation for FAQ
document.querySelectorAll('.faq-question').forEach(button => {
  button.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleFaq(button);
    }
  });
});

// Preload critical images
function preloadImages() {
  const images = [
    // Add image URLs here if needed
  ];
  
  images.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

preloadImages();

// Console branding
console.log('%c🩹 DermAssist', 'font-size: 24px; font-weight: bold; color: #E91E63;');
console.log('%cAI-Powered Wound Care', 'font-size: 14px; color: #6B7280;');
console.log('%chttps://dermassist.app', 'font-size: 12px; color: #9CA3AF;');
