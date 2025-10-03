import { useCallback } from 'react'
import { X } from 'lucide-react'
import { useAppState } from '../store'

export function TopBanner() {
  const { isBannerVisible, setBannerVisible } = useAppState();

  const handleCloseBanner = useCallback(() => {
    setBannerVisible(false);
  }, [setBannerVisible]);

  if (!isBannerVisible) {
    return null;
  }

  return (
    <div className="relative w-full max-w-3xl px-2 py-2 mx-auto mt-4 mb-2 font-medium text-white bg-orange-500 rounded-md text-sm">
      <button
        onClick={handleCloseBanner}
        className="absolute top-2 right-2 p-1 bg-orange-600 hover:bg-orange-700 rounded transition-colors"
        aria-label="Close banner"
      >
        <X className="w-4 h-4" />
      </button>
      <p className='px-4'>This app works with <a href='https://docs.netlify.com/build/ai-gateway/overview/' className='underline'>Netlify AI Gateway</a>. If you want to use your own Anthropic key, update <a href='https://docs.netlify.com/build/environment-variables/overview/' className='underline'>the environment variables</a> in your project.</p>
    </div>
  );
}
