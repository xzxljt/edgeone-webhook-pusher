import 'preline/preline';

export default defineNuxtPlugin(() => {
  // Preline auto-initializes on DOMContentLoaded
  // For SPA navigation, we need to reinitialize
  const router = useRouter();
  
  router.afterEach(() => {
    setTimeout(() => {
      // @ts-ignore - Preline adds HSStaticMethods to window
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit();
      }
    }, 100);
  });
});
