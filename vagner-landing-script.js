
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

window.addEventListener('load', () => {
  if (window.location.hash) {
    history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );
  }

  window.scrollTo(0, 0);
});

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}
 
// FAQ (accordion)
const faqItems = document.querySelectorAll('.faq-item');
const setOpen = (item, open) => {
  item.classList.toggle('open', open);
  const answer = item.querySelector('.faq-a');
  answer.style.maxHeight = open ? answer.scrollHeight + 'px' : 0;
};
faqItems.forEach((item) => {
  if (item.classList.contains('open')) setOpen(item, true);
  item.querySelector('.faq-q').addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    faqItems.forEach((other) => setOpen(other, false));
    if (!wasOpen) setOpen(item, true);
  });
});
 
