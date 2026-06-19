'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Spin } from 'antd';
import { motion } from 'framer-motion';
import {
  AUTH_SESSION_COOKIE,
  AUTH_TOKEN_COOKIE,
  getStoredAuthSessionId,
  getStoredAuthToken,
} from '@/lib/auth-service';
import { LoginAtmosphere } from '@/components/login/LoginAtmosphere';
import { LoginValueShowcase } from '@/components/login/LoginValueShowcase';

interface LoginSuccessPayload {
  token?: string;
  sessionId?: string;
}

interface YKLoginApi {
  init: (config: {
    appId: string;
    appName: string;
    baseURL: string;
    onLoginSuccess: (payload?: LoginSuccessPayload) => void;
    onLoginExpired?: () => void;
    onResourceChanged?: () => void;
    qrCodeExpireTime?: number;
    scanCheckInterval?: number;
    heartbeatInterval?: number;
  }) => void;
  mount: (selector: string) => void;
  refreshQRCode: () => void;
  STORAGE_KEYS: {
    TOKEN: string;
    SESSION_ID: string;
  };
}

declare global {
  interface Window {
    YKLogin?: YKLoginApi;
  }
}

function readRedirectPath() {
  if (typeof window === 'undefined') return '/';
  const value = new URLSearchParams(window.location.search).get('redirect') || '/';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function clearLoginSession() {
  window.localStorage.removeItem('__YK_LOGIN_TOKEN__');
  window.localStorage.removeItem('__YK_LOGIN_SESSION_ID__');
  window.localStorage.removeItem(AUTH_TOKEN_COOKIE);
  window.localStorage.removeItem(AUTH_SESSION_COOKIE);
  document.cookie = `${AUTH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${AUTH_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

async function persistLoginSession(token: string, sessionId: string) {
  const response = await fetch('/api/xiaoqiao/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ token, sessionId }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(String(payload.message || '登录已失效，请重新登录'));
  }
}

const sectionMotion = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.95, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const LOGIN_FORM_STYLE_ID = 'xiaoqiao-login-form-presentation';
const LOGIN_SDK_SRC = '/js/ykLogin.iife.js';
const LOGIN_LINK_BAR_CSS = `
  :host {
    display: block !important;
    text-align: center !important;
  }

  .links-container {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0 !important;
    line-height: 20px !important;
  }

  a {
    font-size: 14px !important;
    line-height: 20px !important;
  }

  #help-link,
  .divider {
    display: none !important;
  }
`;

function ensureShadowStyle(root: ShadowRoot | null | undefined, cssText: string) {
  if (!root) return false;
  let style = root.getElementById(LOGIN_FORM_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = LOGIN_FORM_STYLE_ID;
    root.appendChild(style);
  }
  style.textContent = cssText;
  return true;
}

function configureLoginLinkBar(linkBar: HTMLElement | null | undefined) {
  const root = linkBar?.shadowRoot;
  if (!root) return;
  ensureShadowStyle(root, LOGIN_LINK_BAR_CSS);
  const permissionLink = root.querySelector('#permission-link');
  if (permissionLink) permissionLink.textContent = '权限申请：小闪-OA审批';
}

function applyLoginPresentationStyles() {
  const loginForm = document.querySelector('#yk-login login-form') as HTMLElement | null;
  const formRoot = loginForm?.shadowRoot;
  if (!formRoot) return false;

  ensureShadowStyle(
    formRoot,
    `
      :host {
        width: 100% !important;
        max-width: none !important;
        height: auto !important;
        padding: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
        box-sizing: border-box !important;
      }

      .container {
        width: 100% !important;
      }

      .title,
      .browser-tip {
        display: none !important;
      }

      login-tabs {
        margin: 0 0 clamp(20px, 2.4vh, 28px) !important;
      }

      .login-content {
        min-height: 0 !important;
        margin-top: 0 !important;
      }
    `,
  );

  const tabs = formRoot.querySelector('login-tabs') as (HTMLElement & { updateIndicator?: () => void }) | null;
  ensureShadowStyle(
    tabs?.shadowRoot,
    `
      :host {
        display: flex !important;
        position: relative !important;
        width: 100% !important;
        margin: 0 !important;
        border-bottom: 1px solid #eceff3 !important;
      }

      div[role='tablist'] {
        display: flex !important;
        align-items: flex-end !important;
        gap: clamp(24px, 3vw, 38px) !important;
        white-space: nowrap !important;
      }

      button {
        display: inline-flex !important;
        align-items: center !important;
        width: auto !important;
        min-width: 0 !important;
        padding: 0 0 14px !important;
        font-size: 16px !important;
        line-height: 22px !important;
        letter-spacing: 0 !important;
      }

      .tab-indicator {
        height: 2px !important;
        bottom: 0 !important;
      }
    `,
  );
  if (tabs && !tabs.dataset.xiaoqiaoPresentationBound) {
    tabs.dataset.xiaoqiaoPresentationBound = 'true';
    tabs.addEventListener('tab-change', () => {
      window.setTimeout(() => {
        applyLoginPresentationStyles();
      }, 0);
    });
  }
  tabs?.updateIndicator?.();

  const qrLogin = formRoot.querySelector('qr-login') as HTMLElement | null;
  const qrRoot = qrLogin?.shadowRoot;
  ensureShadowStyle(
    qrRoot,
    `
      :host {
        text-align: center !important;
      }

      .qr-container {
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        width: min(100%, clamp(340px, 24vw, 440px)) !important;
        height: clamp(286px, 31vh, 322px) !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: clamp(18px, 2.4vh, 24px) 0 !important;
        border: 1px solid #eceff3 !important;
        border-radius: 0 0 12px 12px !important;
        border-top-left-radius: 0 !important;
        border-top-right-radius: 0 !important;
        border-bottom-left-radius: 12px !important;
        border-bottom-right-radius: 12px !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }

      .qr-header {
        width: 100% !important;
        margin: 0 0 14px !important;
        text-align: center !important;
      }

      .qr-container > div:not(.qr-header) {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        text-align: center !important;
      }

      .qr-header span {
        font-size: 14px !important;
        letter-spacing: 0 !important;
      }

      #login-module-qrcode,
      canvas {
        display: block !important;
        margin: 0 auto !important;
        width: clamp(164px, 10.2vw, 184px) !important;
        height: clamp(164px, 10.2vw, 184px) !important;
        padding: 8px !important;
        box-sizing: content-box !important;
      }

      .qr-overlay {
        top: 50% !important;
        left: 50% !important;
        right: auto !important;
        bottom: auto !important;
        width: clamp(180px, 11.4vw, 200px) !important;
        height: clamp(180px, 11.4vw, 200px) !important;
        transform: translate(-50%, -50%) !important;
      }

      link-bar {
        display: block !important;
        margin-top: clamp(22px, 2.6vh, 28px) !important;
      }

      .browser-tip {
        display: none !important;
      }
    `,
  );

  const linkBar = qrRoot?.querySelector('link-bar') as HTMLElement | null;
  configureLoginLinkBar(linkBar);

  const smsLogin = formRoot.querySelector('sms-login') as HTMLElement | null;
  const smsRoot = smsLogin?.shadowRoot;
  ensureShadowStyle(
    smsRoot,
    `
      :host {
        text-align: left !important;
      }

      .login-form {
        width: 100% !important;
        max-width: min(100%, 400px) !important;
        margin: clamp(28px, 4vh, 40px) auto 0 !important;
      }

      .login-module-input-group {
        margin-bottom: 16px !important;
      }

      .login-module-input-group input {
        height: 46px !important;
        padding-left: 48px !important;
        border-radius: 8px !important;
        font-size: 14px !important;
      }

      .login-module-input-group .input-icon {
        left: 18px !important;
        width: 18px !important;
      }

      .login-module-input-group.code-group input {
        padding-right: 132px !important;
      }

      .login-module-input-group.code-group .clear-icon {
        right: 112px !important;
      }

      #login-module-get-code {
        min-width: 112px !important;
        padding: 0 16px 0 0 !important;
        font-size: 14px !important;
      }

      #login-module-sms-button {
        height: 44px !important;
        margin: 18px 0 0 !important;
        border-radius: 8px !important;
        font-size: 15px !important;
      }

      link-bar {
        display: block !important;
        margin-top: 24px !important;
        text-align: center !important;
      }

      .browser-tip,
      .login-module-tip {
        display: none !important;
      }

      .error-message.show {
        transform: translateY(-2px) !important;
      }
    `,
  );
  const smsLinkBar = smsRoot?.querySelector('link-bar') as HTMLElement | null;
  configureLoginLinkBar(smsLinkBar);

  return true;
}

export default function LoginPage() {
  const mountRef = useRef(false);
  const restoreAttemptedRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState('');
  const [redirectPath, setRedirectPath] = useState('/');

  const appId = process.env.NEXT_PUBLIC_XIAOQIAO_LOGIN_APP_ID || '90001';
  const appName = '小乔智投';
  const [securityBaseUrl, setSecurityBaseUrl] = useState('/security');

  useEffect(() => {
    setRedirectPath(readRedirectPath());
    setSecurityBaseUrl(`${window.location.origin}/security`);
  }, []);

  useEffect(() => {
    if (window.YKLogin) {
      setScriptReady(true);
      return;
    }

    let cancelled = false;
    const existingScript = Array.from(document.scripts).find((script) =>
      script.src.endsWith(LOGIN_SDK_SRC),
    );
    const script = existingScript || document.createElement('script');

    const markReady = () => {
      if (cancelled) return;
      if (window.YKLogin) {
        setScriptReady(true);
        return;
      }
      setError('登录组件加载失败，请刷新重试');
    };
    const markFailed = () => {
      if (!cancelled) setError('登录组件加载失败，请刷新重试');
    };

    script.addEventListener('load', markReady);
    script.addEventListener('error', markFailed);

    if (!existingScript) {
      script.src = LOGIN_SDK_SRC;
      script.async = true;
      document.head.appendChild(script);
    }

    if (window.YKLogin) markReady();

    return () => {
      cancelled = true;
      script.removeEventListener('load', markReady);
      script.removeEventListener('error', markFailed);
    };
  }, []);

  const completeLogin = useCallback(
    async (payload?: LoginSuccessPayload) => {
      const tokenKey = window.YKLogin?.STORAGE_KEYS.TOKEN || '';
      const sessionKey = window.YKLogin?.STORAGE_KEYS.SESSION_ID || '';
      const token = payload?.token || (tokenKey ? window.localStorage.getItem(tokenKey) : '');
      const sessionId =
        payload?.sessionId || (sessionKey ? window.localStorage.getItem(sessionKey) : '');

      if (!token || !sessionId) {
        setError('登录信息不完整，请重新登录');
        window.YKLogin?.refreshQRCode();
        return;
      }

      try {
        await persistLoginSession(token, sessionId);
        if (tokenKey) window.localStorage.setItem(tokenKey, token);
        if (sessionKey) window.localStorage.setItem(sessionKey, sessionId);
        window.location.replace(redirectPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : '登录失败，请重新登录');
        window.YKLogin?.refreshQRCode();
      }
    },
    [redirectPath],
  );

  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;
    let cancelled = false;

    const restoreExistingSession = async () => {
      const targetPath = readRedirectPath();
      const token = getStoredAuthToken();
      const sessionId = getStoredAuthSessionId();

      if (!token || !sessionId) return;

      try {
        const current = await fetch('/api/xiaoqiao/auth/me', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (cancelled) return;
        if (current.ok) {
          window.location.replace(targetPath);
          return;
        }

        await persistLoginSession(token, sessionId);
        if (cancelled) return;
        window.location.replace(targetPath);
      } catch {
        if (!cancelled) clearLoginSession();
      }
    };

    void restoreExistingSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scriptReady || !window.YKLogin || mountRef.current) return;
    mountRef.current = true;

    let styleTimers: number[] = [];
    let styleInterval = 0;
    let stopStyleInterval = 0;
    let presentationObserver: MutationObserver | null = null;
    console.log("当前打包" + process.env.CI_PIPELINE_ID);
    try {
    window.YKLogin.init({
      appId,
      appName,
      baseURL: securityBaseUrl,
      onLoginSuccess: completeLogin,
      onLoginExpired: () => {
        setError('登录已过期，请重新登录');
      },
      qrCodeExpireTime: 5 * 60 * 1000,
      scanCheckInterval: 1000,
      heartbeatInterval: 30000,
    });
    window.YKLogin.mount('#yk-login');
    styleTimers = [0, 80, 240, 600, 1200].map((delay) =>
      window.setTimeout(() => {
        applyLoginPresentationStyles();
      }, delay),
    );
    styleInterval = window.setInterval(() => {
      applyLoginPresentationStyles();
    }, 300);
    stopStyleInterval = window.setTimeout(() => {
      window.clearInterval(styleInterval);
    }, 3600);
    const mountNode = document.querySelector('#yk-login');
    presentationObserver = new MutationObserver(() => {
      applyLoginPresentationStyles();
    });
    if (mountNode) {
      presentationObserver.observe(mountNode, {
        childList: true,
        subtree: true,
      });
    }
    } catch (err) {
      mountRef.current = false;
      setError(err instanceof Error ? err.message : '登录组件初始化失败，请刷新重试');
    }

    return () => {
      styleTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(styleInterval);
      window.clearTimeout(stopStyleInterval);
      presentationObserver?.disconnect();
    };
  }, [appId, appName, completeLogin, scriptReady, securityBaseUrl]);

  return (
    <main className="login-page-shell">
      <LoginAtmosphere />

      <motion.div variants={sectionMotion} initial="hidden" animate="visible">
        <LoginValueShowcase />
      </motion.div>

      <motion.section
        className="login-card"
        aria-label="登录"
        variants={sectionMotion}
        initial="hidden"
        animate="visible"
      >
        {error ? <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} /> : null}
        <div id="yk-login" className="login-sdk-mount">
          {!scriptReady ? (
            <div className="login-loading">
              <Spin />
              <span>正在准备登录</span>
            </div>
          ) : null}
        </div>
      </motion.section>
    </main>
  );
}
