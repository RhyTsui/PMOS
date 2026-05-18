import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;
const TABLET_UA_REGEX = /iPad|Tablet/i;

function detectMobileClient(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent || '';
  const narrowScreen = window.innerWidth < MOBILE_BREAKPOINT;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const touchPoints = window.navigator.maxTouchPoints || 0;
  const isHandheldUa = MOBILE_UA_REGEX.test(ua);
  const isTabletUa = TABLET_UA_REGEX.test(ua);

  // 仅把真实移动终端视为 mobile。
  // 桌面浏览器即便窗口缩窄，也保持 PC 交互，不切到语音模式。
  if (isHandheldUa) return narrowScreen || coarsePointer;
  if (isTabletUa) return coarsePointer && touchPoints > 0;
  return false;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const onChange = () => {
      setIsMobile(detectMobileClient());
    };

    const widthMedia = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const pointerMedia = window.matchMedia('(pointer: coarse)');

    onChange();
    widthMedia.addEventListener('change', onChange);
    pointerMedia.addEventListener('change', onChange);
    window.addEventListener('resize', onChange);

    return () => {
      widthMedia.removeEventListener('change', onChange);
      pointerMedia.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  return isMobile;
}
