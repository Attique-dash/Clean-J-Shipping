export function detectAndFixSafari() {
  if (typeof window === 'undefined') return;
  
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (isSafari) {
    // Force style recalculation
    document.documentElement.style.display = 'none';
    void document.documentElement.offsetHeight; // Trigger reflow
    document.documentElement.style.display = '';
    
    // Log for debugging
    console.log('Safari detected - styles forced');
  }
}