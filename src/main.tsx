import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSupaStorage } from "./lib/supaStorage";
import LoadingAnimation from "./components/LoadingAnimation.tsx";
import { useState, useEffect } from "react";

// Create a wrapper component to handle the loading state
const AppWithLoading = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Minimal delay for loading animation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100); // 100ms delay - fast loading

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingAnimation />;
  }

  return <App />;
};

async function bootstrap() {
  try {
    await initSupaStorage();
  } catch (e) {
    // Silently handle supaStorage init failure
  }
  // Apply mobile performance optimizations early to reduce jank on small devices
  try {
    const applyMobileOptimizations = () => {
      if (typeof window === 'undefined') return;
      const ua = (navigator && navigator.userAgent) || '';
      const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad|iPod/.test(ua);
      document.documentElement.classList.toggle('performance-mode', isMobile);
      if (isMobile) {
        document.documentElement.setAttribute('data-mobile-optimized', 'true');
        try { document.body.style.backgroundAttachment = 'scroll'; } catch(e) {}
      } else {
        document.documentElement.removeAttribute('data-mobile-optimized');
        try { document.body.style.backgroundAttachment = 'fixed'; } catch(e) {}
      }
    };

    // initial run
    applyMobileOptimizations();
    // update on resize (debounced-ish via requestAnimationFrame)
    let rafId: number | null = null;
    window.addEventListener('resize', () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyMobileOptimizations();
        rafId = null;
      });
    });
  } catch (e) {
    // Non-fatal
    console.warn('[bootstrap] mobile optimization init failed', e);
  }

  createRoot(document.getElementById("root")!).render(<AppWithLoading />);
}

bootstrap();