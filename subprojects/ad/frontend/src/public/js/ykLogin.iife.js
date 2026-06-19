var YKLogin=function(k){"use strict";var vn=Object.defineProperty,yn=Object.defineProperties;var Cn=Object.getOwnPropertyDescriptors;var Se=Object.getOwnPropertySymbols;var En=Object.prototype.hasOwnProperty,xn=Object.prototype.propertyIsEnumerable;var Ht=(k,A,L)=>A in k?vn(k,A,{enumerable:!0,configurable:!0,writable:!0,value:L}):k[A]=L,$=(k,A)=>{for(var L in A||(A={}))En.call(A,L)&&Ht(k,L,A[L]);if(Se)for(var L of Se(A))xn.call(A,L)&&Ht(k,L,A[L]);return k},ct=(k,A)=>yn(k,Cn(A));var S=(k,A,L)=>Ht(k,typeof A!="symbol"?A+"":A,L);var F=(k,A,L)=>new Promise((nt,Q)=>{var ot=P=>{try{G(L.next(P))}catch(j){Q(j)}},dt=P=>{try{G(L.throw(P))}catch(j){Q(j)}},G=P=>P.done?nt(P.value):Promise.resolve(P.value).then(ot,dt);G((L=L.apply(k,A)).next())});class A{constructor(){S(this,"container");S(this,"queue",[]);this.container=document.createElement("div"),this.container.className="yoka-toast-container",document.body.appendChild(this.container);const i=document.createElement("style");i.textContent=`
      .yoka-toast-container {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        pointer-events: none;
      }

      .yoka-toast {
        background: #fff;
        color: #333;
        padding: 12px 24px;
        border-radius: 8px;
        margin-bottom: 8px;
        font-size: 14px;
        line-height: 1.5;
        text-align: left;
        transition: all 0.3s;
        opacity: 0;
        transform: translateY(-100%);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        min-width: 280px;
        max-width: 500px;
      }

      .yoka-toast.show {
        opacity: 1;
        transform: translateY(0);
      }

      .yoka-toast::before {
        content: '';
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 8px;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }

      .yoka-toast.info::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231890ff'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'/%3E%3C/svg%3E");
      }

      .yoka-toast.success::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2352c41a'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E");
      }

      .yoka-toast.error::before {
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 1024 1024' version='1.1' xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M512 15.675077a497.191385 497.191385 0 1 0 0 994.382769A497.191385 497.191385 0 0 0 512 15.675077z m213.228308 645.907692a45.607385 45.607385 0 0 1-64.433231 64.512L512 577.299692 363.204923 726.094769a45.607385 45.607385 0 1 1-64.433231-64.512l148.795077-148.716307-148.795077-148.795077a45.607385 45.607385 0 1 1 64.433231-64.433231L512 448.433231l148.795077-148.795077a45.607385 45.607385 0 0 1 64.433231 64.433231L576.433231 512.866462l148.795077 148.716307z' fill='%23ff4d4f'%3E%3C/path%3E%3C/svg%3E");
      }

      .yoka-toast.warning::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23faad14'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z'/%3E%3C/svg%3E");
      }
    `, document.head.appendChild(i)
}

    createToast(i) {
        const n = document.createElement("div");
        return n.className = `yoka-toast ${i.type || "info"}`, n.textContent = i.content, this.container.appendChild(n), n
    }

    showToast(i) {
        const n = this.createToast(i);
        this.queue.push(n), requestAnimationFrame(() => {
            n.classList.add("show")
        }), setTimeout(() => {
            n.classList.remove("show"), setTimeout(() => {
                this.container.removeChild(n), this.queue = this.queue.filter(t => t !== n)
            }, 300)
        }, i.duration || 3e3)
    }

    info(i, n) {
        this.showToast({content: i, duration: n, type: "info"})
    }

    success(i, n) {
        this.showToast({content: i, duration: n, type: "success"})
    }

    error(i, n) {
        this.showToast({content: i, duration: n, type: "error"})
    }

    warning(i, n) {
        this.showToast({content: i, duration: n, type: "warning"})
    }
}

    const L = new A;
    let nt = null, Q = null;

    function ot(r) {
        nt = r
    }

    function dt() {
        return nt
    }

    function G(r) {
        Q = r
    }

    function P() {
        const r = navigator.userAgent || navigator.vendor || window.opera || "",
            i = /android|iphone|ipad|ipod|blackberry|kindle|windows phone|opera mini|iemobile|mobile.*firefox|phone|silk|symbian|windows ce/i,
            n = /iPad|iPhone|iPod/i, t = /Android/i;
        return i.test(r) || n.test(r) || t.test(r) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1 && !window.MSStream
    }

    function j(r) {
        if (r.code === 200) return r.data;
        throw L.error(r.msg), new Error(r.msg)
    }

    function Ut(r, i = {}, n = {}) {
        if (n.useSmsTraceId) {
            const o = Q || void 0;
            o && (i = ct($({}, i), {traceId: o}))
        }
        const t = Object.keys(i).map(o => `${encodeURIComponent(o)}=${encodeURIComponent(i[o])}`).join("&"),
            e = t ? `${r}?${t}` : r;
        return new Promise((o, s) => {
            const a = new XMLHttpRequest;
            a.open("GET", e, !0), a.setRequestHeader("Content-Type", "application/json"), a.setRequestHeader("Accept", "application/json"), a.onload = function () {
                if (a.status >= 200 && a.status < 300) try {
                    const l = JSON.parse(a.responseText);
                    n.extractQrTraceId && l.data && l.data.traceId && ot(l.data.traceId), n.extractSmsTraceId && l.data && l.data.traceId && G(l.data.traceId), o(j(l))
                } catch (l) {
                    s(a.responseText)
                } else try {
                    const l = JSON.parse(a.responseText);
                    l.code !== void 0 ? (n.skipErrorHandler || L.error(l.msg || "请求失败"), s(l)) : (n.skipErrorHandler || L.error(a.statusText || "请求失败"), s({
                        status: a.status,
                        statusText: a.statusText,
                        response: a.responseText
                    }))
                } catch (l) {
                    n.skipErrorHandler || L.error(a.statusText || "请求失败"), s({
                        status: a.status,
                        statusText: a.statusText,
                        response: a.responseText
                    })
                }
            }, n.skipErrorHandler || (a.onerror = function () {
                L.error("网络错误"), s({status: a.status, statusText: "网络错误", response: a.responseText})
            }, a.timeout = 3e4, a.ontimeout = function () {
                L.error("请求超时"), s({status: 408, statusText: "请求超时", response: null})
            }), a.send()
        })
    }

    function it(r, i = {}, n = {}) {
        if (n.useSmsTraceId) {
            const t = Q || void 0;
            t && (i = ct($({}, i), {traceId: t}))
        }
        return new Promise((t, e) => {
            const o = new XMLHttpRequest;
            o.open("POST", r, !0), o.setRequestHeader("Content-Type", "application/json"), o.setRequestHeader("Accept", "application/json"), o.onload = function () {
                if (o.status >= 200 && o.status < 300) try {
                    const s = JSON.parse(o.responseText);
                    n.extractQrTraceId && s.data && s.data.traceId && ot(s.data.traceId), n.extractSmsTraceId && s.data && s.data.traceId && G(s.data.traceId), t(j(s))
                } catch (s) {
                    e(o.responseText)
                } else try {
                    const s = JSON.parse(o.responseText);
                    s.code !== void 0 ? (n.skipErrorHandler || L.error(s.msg || "请求失败"), e(s)) : (n.skipErrorHandler || L.error(o.statusText || "请求失败"), e({
                        status: o.status,
                        statusText: o.statusText,
                        response: o.responseText
                    }))
                } catch (s) {
                    n.skipErrorHandler || L.error(o.statusText || "请求失败"), e({
                        status: o.status,
                        statusText: o.statusText,
                        response: o.responseText
                    })
                }
            }, n.skipErrorHandler || (o.onerror = function () {
                L.error("网络错误"), e({status: o.status, statusText: "网络错误", response: o.responseText})
            }, o.timeout = 3e4, o.ontimeout = function () {
                L.error("请求超时"), e({status: 408, statusText: "请求超时", response: null})
            }), o.send(JSON.stringify(i))
        })
    }

    function Kt(r, i) {
        return new CustomEvent(r, {detail: i, bubbles: !0, composed: !0})
    }

    function zt(r) {
        window.sliderVerify("pop", i => {
            r(i)
        }, {appKey: "75235"})
    }

    function W() {
        var r;
        return (r = window.__LoginSDKConfig) != null ? r : {}
    }

    function qe(r) {
        const i = W(), n = "https://xs-login.dobest.com/ads-aitd/security/", t = dt(),
            e = new URLSearchParams({code: r, appId: i.appId, appName: i.appName, baseURL: "https://xs-login.dobest.com/ads-aitd/security"});
        return t && e.append("traceId", t), `${n}static/scanLogin.html?${e.toString()}`
    }

    class Te extends HTMLElement {
        constructor() {
            super();
            S(this, "tabs", []);
            S(this, "tabIndicator", null);
            S(this, "activeTabId", "");
            S(this, "isMobile", !1);
            this.attachShadow({mode: "open"}), this.isMobile = P()
        }

        static get observedAttributes() {
            return ["tabs", "active-tab"]
        }

        connectedCallback() {
            this.loadTabsData(), this.render(), this.bindEvents(), setTimeout(() => this.updateIndicator(), 0)
        }

        attributeChangedCallback(n, t, e) {
            n === "tabs" && e !== t ? (this.loadTabsData(), this.render(), this.bindEvents()) : n === "active-tab" && e !== t && (this.activeTabId = e, this.activateTab(this.activeTabId))
        }

        loadTabsData() {
            const n = this.getAttribute("tabs");
            if (n) try {
                this.tabs = JSON.parse(n);
                const t = this.tabs.find(e => e.active);
                t ? this.activeTabId = t.id : this.tabs.length > 0 && (this.activeTabId = this.tabs[0].id)
            } catch (t) {
                console.error("解析tabs属性失败:", t), this.tabs = []
            }
        }

        render() {
            const n = this.tabs.map(o => {
                const s = o.id === this.activeTabId, a = s ? "active" : "";
                return `<button id="${o.id}" class="${a}" data-tab-id="${o.id}" role="tab" aria-selected="${s}">${o.title}</button>`
            }).join("");
            let t = `
      :host {
        display: flex;
        position: relative;
        margin-bottom: 30px;
        border-bottom: 1px solid #eeeeee;
      }
      
      button {
        display: inline-block;
        padding: 0 0 15px 0;
        border: none;
        background: none;
        position: relative;
        cursor: pointer;
        transition: color 0.3s;
        width: auto;
        color: #666;
        font-size: 18px;
        outline: none;
      }
      
      button:focus-visible {
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        border-radius: 2px;
      }
      
      button + button {
        margin-left: 30px;
      }
      
      button.active {
        color: #333;
        font-weight: 500;
      }
      
      .tab-indicator {
        position: absolute;
        bottom: 0;
        height: 3px;
        background-color: #0A6BFD;
        transition: left 0.3s, width 0.3s;
        border-radius: 3px;
      }
    `;this.isMobile&&(t+=`
        :host {
          margin-bottom: 24px;
        }
        button {
          font-size: 14px;
        }
        .tab-indicator {
          height: 2px;
        }
      `);const e=`
      <style>${t}</style>
      <div role="tablist">
        ${n}
      </div>
      <div class="tab-indicator"></div>
    `;this.shadowRoot&&(this.shadowRoot.innerHTML=e,this.tabIndicator=this.shadowRoot.querySelector(".tab-indicator"))}bindEvents(){if(!this.shadowRoot)return;this.shadowRoot.querySelectorAll("button").forEach(t=>{t.addEventListener("click",()=>{const e=t.getAttribute("data-tab-id");e&&(this.activateTab(e),this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:e},bubbles:!0,composed:!0})))}),t.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();const o=Array.from(this.shadowRoot.querySelectorAll("button")),s=o.indexOf(t);let a;e.key==="ArrowLeft"?a=s>0?s-1:o.length-1:a=s<o.length-1?s+1:0;const l=o[a];l.focus(),l.click()}})})}updateIndicator(){if(!this.shadowRoot||!this.tabIndicator)return;const n=this.shadowRoot.querySelector("button.active");n&&(this.tabIndicator.style.width=`${n.offsetWidth}px`,this.tabIndicator.style.left=`${n.offsetLeft}px`)}activateTab(n){if(!this.shadowRoot)return;this.shadowRoot.querySelectorAll("button").forEach(e=>{e.getAttribute("data-tab-id")===n?(e.classList.add("active"),e.setAttribute("aria-selected","true"),this.activeTabId=n):(e.classList.remove("active"),e.setAttribute("aria-selected","false"))}),this.updateIndicator()}}customElements.define("login-tabs",Te);class Be extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.render()}render(){const n=`
      <style>
      :host {
        display: block;
        text-align: center;
      }
      
      .links-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 20px;
        color: #999;
        font-size: 14px;
      }
      
      .links-container a {
        color: #999;
        text-decoration: none;
        transition: color 0.3s;
      }
      
      .links-container a:hover {
        color: #3b86f9;
      }
      
      .divider {
        margin: 0 20px;
        color: #DBDCDC;
        height: 14px;
        line-height: 14px;
        display: inline-block;
        overflow: hidden;
      }
    </style>
      <div class="links-container">
        <a href="https://i8oa.dobest.com/workflow/process/page/pro?procfullname=%E6%99%BA%E6%8A%95%E6%9D%83%E9%99%90%E5%AE%A1%E6%89%B9%E6%B5%81%E7%A8%8B&version=25" id="permission-link" target="_blank">权限申请</a>
        <span class="divider">|</span>
        <a href="https://docs-center.dobest.cn/docs/data-service-docs/data-service-docs-1g1p1q3nsgc3s" id="help-link" target="_blank">帮助中心</a>
      </div>
    `;this.shadowRoot&&(this.shadowRoot.innerHTML=n)}}customElements.define("link-bar",Be);class Re extends HTMLElement{constructor(){super();S(this,"phoneInput");S(this,"smsCodeInput");S(this,"clearPhoneButton");S(this,"clearSmsCodeButton");S(this,"getCodeButton");S(this,"loginButton");S(this,"phoneError");S(this,"smsCodeError");S(this,"isMobile",!1);S(this,"phoneIconSvg",'<svg t="1744956939724" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1114" ><path d="M511.97184 821.248c-29.184 0-52.224 23.04-52.224 52.224 0 28.672 23.04 51.712 52.224 51.712 28.672 0 51.712-23.04 51.712-51.712 0-29.184-23.04-52.224-51.712-52.224zM770.01984 0H253.41184C210.40384 0 175.07584 35.328 175.07584 78.336v866.816C175.07584 988.16 210.40384 1024 253.41184 1024h516.608c43.52 0 78.848-35.84 78.848-78.848V78.336c0-43.008-35.328-78.336-78.848-78.336zM253.41184 52.224h516.608c14.336 0 26.112 11.776 26.112 26.112v649.216H227.29984V78.336c0-14.336 11.776-26.112 26.112-26.112z m516.608 919.04H253.41184c-14.336 0-26.112-11.776-26.112-26.112v-160.256h568.832v160.256c0 14.336-11.776 26.112-26.112 26.112z" p-id="1115"></path></svg>');S(this,"passwordIconSvg",'<svg t="1744956824668" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3261" ><path d="M916.21 1024H107.79c-29.777 0-53.895-24.145-53.895-53.895V485.053c0-29.777 24.118-53.895 53.894-53.895h80.843v-107.79C188.632 144.761 333.42 0 512 0c178.58 0 323.368 144.761 323.368 323.368v107.79h80.843c29.776 0 53.894 24.118 53.894 53.895v485.052c0 29.75-24.118 53.895-53.894 53.895zM781.475 323.368c0-148.83-120.644-269.473-269.474-269.473-148.83 0-269.474 120.643-269.474 269.473v107.79h538.948v-107.79zM916.21 485.053H107.789v485.052h808.422V485.053zM512 592.843c14.875 0 26.947 12.072 26.947 26.946v215.58c0 14.874-12.072 26.947-26.947 26.947s-26.947-12.073-26.947-26.948V619.79c0-14.874 12.072-26.947 26.947-26.947z" p-id="3262"></path></svg>');S(this,"closeIconSvg",'<svg t="1744956900851" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1054" ><path d="M685.4 354.8c0-4.4-3.6-8-8-8l-66 0.3L512 465.6l-99.3-118.4-66.1-0.3c-4.4 0-8 3.5-8 8 0 1.9 0.7 3.7 1.9 5.2l130.1 155L340.5 670c-1.2 1.5-1.9 3.3-1.9 5.2 0 4.4 3.6 8 8 8l66.1-0.3L512 564.4l99.3 118.4 66 0.3c4.4 0 8-3.5 8-8 0-1.9-0.7-3.7-1.9-5.2L553.5 515l130.1-155c1.2-1.4 1.8-3.3 1.8-5.2z" p-id="1055"></path><path d="M512 65C264.6 65 64 265.6 64 513s200.6 448 448 448 448-200.6 448-448S759.4 65 512 65z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" p-id="1056"></path></svg>');S(this,"countdownTimer",null);S(this,"remainingTime",60);S(this,"isCountingDown",!1);S(this,"phoneRegex",/^1\d{10}$/);this.attachShadow({mode:"open"}),this.isMobile=P(),this.render(),this.phoneInput=this.shadowRoot.querySelector("#login-module-phone"),this.smsCodeInput=this.shadowRoot.querySelector("#login-module-sms-code"),this.clearPhoneButton=this.shadowRoot.querySelector("#login-module-clear-phone"),this.clearSmsCodeButton=this.shadowRoot.querySelector("#login-module-clear-sms-code"),this.getCodeButton=this.shadowRoot.querySelector("#login-module-get-code"),this.loginButton=this.shadowRoot.querySelector("#login-module-sms-button"),this.phoneError=this.shadowRoot.querySelector("#phone-error"),this.smsCodeError=this.shadowRoot.querySelector("#sms-code-error"),this.getCodeButton.disabled=!0,this.bindEvents()}static get observedAttributes(){return["disabled"]}connectedCallback(){}disconnectedCallback(){this.countdownTimer&&(clearInterval(this.countdownTimer),this.countdownTimer=null)}attributeChangedCallback(n,t,e){if(n==="disabled"){const o=e!==null;this.phoneInput.disabled=o,this.smsCodeInput.disabled=o,this.getCodeButton.disabled=o,this.loginButton.disabled=o}}render(){let n=`
      :host {
        display: block;
      }
      
      .login-module-input-group {
        position: relative;
        margin-bottom: 20px;
      }
      
      .login-module-input-group .input-icon {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: 25px;
        z-index: 1;
        pointer-events: none;
        vertical-align: top;
      }

      .login-module-input-group .input-icon svg {
        width: 100%;
        height: 20px;
        fill: #666666;
      }
      
      .login-module-input-group input {
        width: 100%;
        padding: 8px 40px 8px 60px;
        box-sizing: border-box;
        font-size: 16px;
        line-height: 1.5;
        background: #fcfcfc;
        border: 1px solid #ececec;
        border-radius: 4px;
        height: 50px;
        transition: border-color 0.3s, box-shadow 0.3s;
        outline: none;
      }
      
      .login-module-input-group input::placeholder {
        color: #999;
      }
      
      .login-module-input-group:hover input,
      .login-module-input-group input:focus {
        border-color: #3b86f9;
      }
      
      .login-module-input-group input.error {
        border-color: #ff4d4f;
      }
      
      .login-module-input-group .clear-icon {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        width: 20px;
        height: 20px;
        padding: 0;
        display: none;
        align-items: center;
        justify-content: center;
      }
      
      .login-module-input-group .clear-icon svg {
        width: 14px;
        transition: opacity 0.3s ease-in-out, fill 0.3s ease-in-out;
        fill: #666666;
      }
      
      .login-module-input-group .clear-icon:hover svg {
        opacity: 1;
      }

      .login-module-input-group.code-group {
        position: relative;
      }
      
      .login-module-input-group.code-group input {
        padding-right: 180px;
      }
      
      .login-module-input-group.code-group .clear-icon {
        right: 150px;
      }
      
      #login-module-get-code {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 100%;
        padding: 0 20px 0 0;
        background: transparent;
        border: none;
        color: #0C6FFD;
        font-size: 16px;
        cursor: pointer;
        white-space: nowrap;
        z-index: 2;
        min-width: 120px;
        text-align: right;
      }
      
      #login-module-get-code:hover {
        color: #4096ff;
      }
      
      #login-module-get-code:disabled {
        color: #999;
        cursor: not-allowed;
      }
      
      .error-message {
        position: absolute;
        top: 100%;
        left: 0;
        color: #ff4d4f;
        font-size: 12px;
        opacity: 0;
        transform: translateY(-8px);
        transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
      }
      
      .error-message.show {
        opacity: 1;
        transform: translateY(2px);
      }
      
      #login-module-sms-button {
        width: 100%;
        background: linear-gradient(to right, #1D93FF, #0A6BFD);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        height: 50px;
        font-size: 18px;
        margin: 35px 0 0px;
        transition: box-shadow 0.3s ease-in-out;
      }
      
      #login-module-sms-button:hover {
        box-shadow: 0 4px 12px rgba(10, 107, 253, 0.4);
      }
      
      #login-module-sms-button:disabled {
        background: #cccccc;
        cursor: not-allowed;
        box-shadow: none;
      }

      .browser-tip {
        color: #999;
        font-size: 14px;
        text-align: center;
        margin-top: 45px;
        display: none;
      }

      .login-module-tip {
        color: #999;
        font-size: 14px;
        margin: 0;
        line-height: 24px;
      }

      .login-module-tip.first-tip {
        margin-top: 45px;
      }
    `;this.isMobile&&(n+=`
        .login-module-input-group {
          margin-bottom: 15px;
        }
        .login-module-input-group input {
          padding: 2px 40px 2px 36px;
          height: 34px;
          font-size: 12px;
        }
        .login-module-input-group .input-icon {
          left: 16px;
          width: 14px;
        }
        .login-module-input-group .input-icon svg {
          height: 14px;
        }
        .login-module-input-group .clear-icon svg {
          width: 12px;
          height: 12px;
        }
        #login-module-get-code {
          font-size: 12px;
          padding: 0 10px 0 0;
          min-width: 100px;
        }
        .login-module-input-group.code-group .clear-icon {
          right: 100px;
        }
        .login-module-input-group.code-group input {
          padding-right: 120px;
        }
        .error-message.show {
          transform: translateY(0px);
        }
        #login-module-sms-button {
          font-size: 14px;
          height: 34px;
          margin: 15px 0 0;
        }
        .login-module-tip {
          font-size: 12px;
        }
        .login-module-tip.first-tip {
          margin-top: 20px;
        }
      `);const t=`
      <style>${n}</style>
      <div class="login-form">
        <div class="login-module-input-group">
          <div class="input-icon">${this.phoneIconSvg}</div>
          <input 
            type="tel" 
            id="login-module-phone" 
            placeholder="请输入手机号" 
            autocomplete="off"
          />
          <button id="login-module-clear-phone" class="clear-icon" type="button" aria-label="清除手机号">
            ${this.closeIconSvg}
          </button>
          <div id="phone-error" class="error-message"></div>
        </div>
        
        <div class="login-module-input-group code-group">
          <div class="input-icon">${this.passwordIconSvg}</div>
          <input 
            type="text" 
            id="login-module-sms-code" 
            placeholder="请输入验证码"
            autocomplete="off"
          />
          <button id="login-module-clear-sms-code" class="clear-icon" type="button" aria-label="清除验证码">
            ${this.closeIconSvg}
          </button>
          <button id="login-module-get-code" type="button">发送验证码</button>
          <div id="sms-code-error" class="error-message"></div>
        </div>
        
        <div class="browser-tip">推荐使用谷歌Chrome浏览器，可以更好的兼容本产品</div>
        <button id="login-module-sms-button" type="button">登录</button>

        <link-bar></link-bar>

        <p class="login-module-tip first-tip">1、请使用小闪绑定的手机号登录。</p>
        <p class="login-module-tip">2、如需更换登记手机号，请联系人事处理。</p>
      </div>
    `;this.shadowRoot&&(this.shadowRoot.innerHTML=t)}bindEvents(){this.phoneInput.addEventListener("input",this.handlePhoneInput.bind(this)),this.clearPhoneButton.addEventListener("click",this.handleClearPhone.bind(this)),this.clearSmsCodeButton.addEventListener("click",this.handleClearSmsCode.bind(this)),this.getCodeButton.addEventListener("click",this.handleGetCode.bind(this)),this.loginButton.addEventListener("click",this.handleSubmit.bind(this)),this.smsCodeInput.addEventListener("input",this.handleSmsCodeInput.bind(this))}handlePhoneInput(n){const t=n.target,e=t.value.trim();if(t.value=e.replace(/\D/g,""),t.value?this.clearPhoneButton.style.display="flex":this.clearPhoneButton.style.display="none",this.isCountingDown){this.getCodeButton.disabled=!0;return}this.getCodeButton.disabled=!this.phoneRegex.test(t.value),this.setError("phone","")}handleClearPhone(){this.phoneInput.value="",this.clearPhoneButton.style.display="none",this.phoneInput.focus(),this.setError("phone","")}handleClearSmsCode(){this.smsCodeInput.value="",this.clearSmsCodeButton.style.display="none",this.smsCodeInput.focus(),this.setError("code","")}startCountdown(){this.isCountingDown=!0,this.getCodeButton.disabled=!0,this.remainingTime=60,this.getCodeButton.innerText=`${this.remainingTime}秒后重新发送`,this.countdownTimer&&clearInterval(this.countdownTimer),this.countdownTimer=window.setInterval(()=>{this.remainingTime-=1,this.remainingTime<=0?(this.countdownTimer&&(clearInterval(this.countdownTimer),this.countdownTimer=null),this.isCountingDown=!1,this.getCodeButton.disabled=!this.phoneRegex.test(this.phoneInput.value),this.getCodeButton.innerText="发送验证码"):this.getCodeButton.innerText=`${this.remainingTime}秒后重新发送`},1e3)}reset(){this.phoneError.classList.remove("show"),this.smsCodeError.classList.remove("show"),this.phoneInput.classList.remove("error"),this.smsCodeInput.classList.remove("error")}handleSmsCodeInput(n){const t=n.target,e=t.value.trim();t.value=e.replace(/\D/g,""),t.value?this.clearSmsCodeButton.style.display="flex":this.clearSmsCodeButton.style.display="none",this.setError("code","")}handleGetCode(){if(this.validatePhone()){const n=this.phoneInput.value,t=new CustomEvent("sendCode",{detail:{phone:n},bubbles:!0,composed:!0});this.dispatchEvent(t)}}handleSubmit(){const n=this.validatePhone(),t=this.validateCode();if(n&&t){const e=this.phoneInput.value,o=this.smsCodeInput.value,s=Kt("login",{phone:e,code:o});this.dispatchEvent(s)}}validatePhone(){const n=this.phoneInput.value.trim();return n?this.phoneRegex.test(n)?(this.phoneError&&(this.phoneError.textContent="",this.phoneError.classList.remove("show"),this.phoneInput.classList.remove("error")),!0):(this.setError("phone","请输入正确的手机号"),!1):(this.setError("phone","请输入手机号"),!1)}validateCode(){return this.smsCodeInput.value.trim()?(this.smsCodeError&&(this.smsCodeError.textContent="",this.smsCodeError.classList.remove("show"),this.smsCodeInput.classList.remove("error")),!0):(this.setError("code","请输入验证码"),!1)}setError(n,t){const e=n==="phone"?this.phoneError:this.smsCodeError,o=n==="phone"?this.phoneInput:this.smsCodeInput;t?(e.textContent=t,e.classList.add("show"),o.classList.add("error"),o.focus()):(e.textContent="",e.classList.remove("show"),o.classList.remove("error"))}showError(n,t="phone"){const e=t==="phone"?this.phoneError:this.smsCodeError,o=t==="phone"?this.phoneInput:this.smsCodeInput;e.textContent=n,e.classList.add("show"),o.classList.add("error")}}customElements.define("sms-login",Re);function Le(r){return r&&r.__esModule&&Object.prototype.hasOwnProperty.call(r,"default")?r.default:r}var X={},ut,Wt;function ke(){return Wt||(Wt=1,ut=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then}),ut}var ht={},K={},Ot;function O(){if(Ot)return K;Ot=1;let r;const i=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];return K.getSymbolSize=function(t){if(!t)throw new Error('"version" cannot be null or undefined');if(t<1||t>40)throw new Error('"version" should be in range from 1 to 40');return t*4+17},K.getSymbolTotalCodewords=function(t){return i[t]},K.getBCHDigit=function(n){let t=0;for(;n!==0;)t++,n>>>=1;return t},K.setToSJISFunction=function(t){if(typeof t!="function")throw new Error('"toSJISFunc" is not a valid function.');r=t},K.isKanjiModeEnabled=function(){return typeof r!="undefined"},K.toSJIS=function(t){return r(t)},K}var gt={},Yt;function ft(){return Yt||(Yt=1,function(r){r.L={bit:1},r.M={bit:0},r.Q={bit:3},r.H={bit:2};function i(n){if(typeof n!="string")throw new Error("Param is not a string");switch(n.toLowerCase()){case"l":case"low":return r.L;case"m":case"medium":return r.M;case"q":case"quartile":return r.Q;case"h":case"high":return r.H;default:throw new Error("Unknown EC Level: "+n)}}r.isValid=function(t){return t&&typeof t.bit!="undefined"&&t.bit>=0&&t.bit<4},r.from=function(t,e){if(r.isValid(t))return t;try{return i(t)}catch(o){return e}}}(gt)),gt}var pt,Qt;function Ae(){if(Qt)return pt;Qt=1;function r(){this.buffer=[],this.length=0}return r.prototype={get:function(i){const n=Math.floor(i/8);return(this.buffer[n]>>>7-i%8&1)===1},put:function(i,n){for(let t=0;t<n;t++)this.putBit((i>>>n-t-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(i){const n=Math.floor(this.length/8);this.buffer.length<=n&&this.buffer.push(0),i&&(this.buffer[n]|=128>>>this.length%8),this.length++}},pt=r,pt}var mt,Gt;function Me(){if(Gt)return mt;Gt=1;function r(i){if(!i||i<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=i,this.data=new Uint8Array(i*i),this.reservedBit=new Uint8Array(i*i)}return r.prototype.set=function(i,n,t,e){const o=i*this.size+n;this.data[o]=t,e&&(this.reservedBit[o]=!0)},r.prototype.get=function(i,n){return this.data[i*this.size+n]},r.prototype.xor=function(i,n,t){this.data[i*this.size+n]^=t},r.prototype.isReserved=function(i,n){return this.reservedBit[i*this.size+n]},mt=r,mt}var wt={},jt;function Ne(){return jt||(jt=1,function(r){const i=O().getSymbolSize;r.getRowColCoords=function(t){if(t===1)return[];const e=Math.floor(t/7)+2,o=i(t),s=o===145?26:Math.ceil((o-13)/(2*e-2))*2,a=[o-7];for(let l=1;l<e-1;l++)a[l]=a[l-1]-s;return a.push(6),a.reverse()},r.getPositions=function(t){const e=[],o=r.getRowColCoords(t),s=o.length;for(let a=0;a<s;a++)for(let l=0;l<s;l++)a===0&&l===0||a===0&&l===s-1||a===s-1&&l===0||e.push([o[a],o[l]]);return e}}(wt)),wt}var bt={},Xt;function Pe(){if(Xt)return bt;Xt=1;const r=O().getSymbolSize,i=7;return bt.getPositions=function(t){const e=r(t);return[[0,0],[e-i,0],[0,e-i]]},bt}var vt={},Jt;function De(){return Jt||(Jt=1,function(r){r.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const i={N1:3,N2:3,N3:40,N4:10};r.isValid=function(e){return e!=null&&e!==""&&!isNaN(e)&&e>=0&&e<=7},r.from=function(e){return r.isValid(e)?parseInt(e,10):void 0},r.getPenaltyN1=function(e){const o=e.size;let s=0,a=0,l=0,c=null,h=null;for(let y=0;y<o;y++){a=l=0,c=h=null;for(let f=0;f<o;f++){let d=e.get(y,f);d===c?a++:(a>=5&&(s+=i.N1+(a-5)),c=d,a=1),d=e.get(f,y),d===h?l++:(l>=5&&(s+=i.N1+(l-5)),h=d,l=1)}a>=5&&(s+=i.N1+(a-5)),l>=5&&(s+=i.N1+(l-5))}return s},r.getPenaltyN2=function(e){const o=e.size;let s=0;for(let a=0;a<o-1;a++)for(let l=0;l<o-1;l++){const c=e.get(a,l)+e.get(a,l+1)+e.get(a+1,l)+e.get(a+1,l+1);(c===4||c===0)&&s++}return s*i.N2},r.getPenaltyN3=function(e){const o=e.size;let s=0,a=0,l=0;for(let c=0;c<o;c++){a=l=0;for(let h=0;h<o;h++)a=a<<1&2047|e.get(c,h),h>=10&&(a===1488||a===93)&&s++,l=l<<1&2047|e.get(h,c),h>=10&&(l===1488||l===93)&&s++}return s*i.N3},r.getPenaltyN4=function(e){let o=0;const s=e.data.length;for(let l=0;l<s;l++)o+=e.data[l];return Math.abs(Math.ceil(o*100/s/5)-10)*i.N4};function n(t,e,o){switch(t){case r.Patterns.PATTERN000:return(e+o)%2===0;case r.Patterns.PATTERN001:return e%2===0;case r.Patterns.PATTERN010:return o%3===0;case r.Patterns.PATTERN011:return(e+o)%3===0;case r.Patterns.PATTERN100:return(Math.floor(e/2)+Math.floor(o/3))%2===0;case r.Patterns.PATTERN101:return e*o%2+e*o%3===0;case r.Patterns.PATTERN110:return(e*o%2+e*o%3)%2===0;case r.Patterns.PATTERN111:return(e*o%3+(e+o)%2)%2===0;default:throw new Error("bad maskPattern:"+t)}}r.applyMask=function(e,o){const s=o.size;for(let a=0;a<s;a++)for(let l=0;l<s;l++)o.isReserved(l,a)||o.xor(l,a,n(e,l,a))},r.getBestMask=function(e,o){const s=Object.keys(r.Patterns).length;let a=0,l=1/0;for(let c=0;c<s;c++){o(c),r.applyMask(c,e);const h=r.getPenaltyN1(e)+r.getPenaltyN2(e)+r.getPenaltyN3(e)+r.getPenaltyN4(e);r.applyMask(c,e),h<l&&(l=h,a=c)}return a}}(vt)),vt}var rt={},Zt;function _t(){if(Zt)return rt;Zt=1;const r=ft(),i=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],n=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];return rt.getBlocksCount=function(e,o){switch(o){case r.L:return i[(e-1)*4+0];case r.M:return i[(e-1)*4+1];case r.Q:return i[(e-1)*4+2];case r.H:return i[(e-1)*4+3];default:return}},rt.getTotalCodewordsCount=function(e,o){switch(o){case r.L:return n[(e-1)*4+0];case r.M:return n[(e-1)*4+1];case r.Q:return n[(e-1)*4+2];case r.H:return n[(e-1)*4+3];default:return}},rt}var yt={},tt={},$t;function Ve(){if($t)return tt;$t=1;const r=new Uint8Array(512),i=new Uint8Array(256);return function(){let t=1;for(let e=0;e<255;e++)r[e]=t,i[t]=e,t<<=1,t&256&&(t^=285);for(let e=255;e<512;e++)r[e]=r[e-255]}(),tt.log=function(t){if(t<1)throw new Error("log("+t+")");return i[t]},tt.exp=function(t){return r[t]},tt.mul=function(t,e){return t===0||e===0?0:r[i[t]+i[e]]},tt}var te;function Fe(){return te||(te=1,function(r){const i=Ve();r.mul=function(t,e){const o=new Uint8Array(t.length+e.length-1);for(let s=0;s<t.length;s++)for(let a=0;a<e.length;a++)o[s+a]^=i.mul(t[s],e[a]);return o},r.mod=function(t,e){let o=new Uint8Array(t);for(;o.length-e.length>=0;){const s=o[0];for(let l=0;l<e.length;l++)o[l]^=i.mul(e[l],s);let a=0;for(;a<o.length&&o[a]===0;)a++;o=o.slice(a)}return o},r.generateECPolynomial=function(t){let e=new Uint8Array([1]);for(let o=0;o<t;o++)e=r.mul(e,new Uint8Array([1,i.exp(o)]));return e}}(yt)),yt}var Ct,ee;function He(){if(ee)return Ct;ee=1;const r=Fe();function i(n){this.genPoly=void 0,this.degree=n,this.degree&&this.initialize(this.degree)}return i.prototype.initialize=function(t){this.degree=t,this.genPoly=r.generateECPolynomial(this.degree)},i.prototype.encode=function(t){if(!this.genPoly)throw new Error("Encoder not initialized");const e=new Uint8Array(t.length+this.degree);e.set(t);const o=r.mod(e,this.genPoly),s=this.degree-o.length;if(s>0){const a=new Uint8Array(this.degree);return a.set(o,s),a}return o},Ct=i,Ct}var Et={},xt={},It={},ne;function oe(){return ne||(ne=1,It.isValid=function(i){return!isNaN(i)&&i>=1&&i<=40}),It}var D={},ie;function re(){if(ie)return D;ie=1;const r="[0-9]+",i="[A-Z $%*+\\-./:]+";let n="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";n=n.replace(/u/g,"\\u");const t="(?:(?![A-Z0-9 $%*+\\-./:]|"+n+`)(?:.|[\r
]))+`;D.KANJI=new RegExp(n,"g"),D.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),D.BYTE=new RegExp(t,"g"),D.NUMERIC=new RegExp(r,"g"),D.ALPHANUMERIC=new RegExp(i,"g");const e=new RegExp("^"+n+"$"),o=new RegExp("^"+r+"$"),s=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");return D.testKanji=function(l){return e.test(l)},D.testNumeric=function(l){return o.test(l)},D.testAlphanumeric=function(l){return s.test(l)},D}var se;function Y(){return se||(se=1,function(r){const i=oe(),n=re();r.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},r.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},r.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},r.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},r.MIXED={bit:-1},r.getCharCountIndicator=function(o,s){if(!o.ccBits)throw new Error("Invalid mode: "+o);if(!i.isValid(s))throw new Error("Invalid version: "+s);return s>=1&&s<10?o.ccBits[0]:s<27?o.ccBits[1]:o.ccBits[2]},r.getBestModeForData=function(o){return n.testNumeric(o)?r.NUMERIC:n.testAlphanumeric(o)?r.ALPHANUMERIC:n.testKanji(o)?r.KANJI:r.BYTE},r.toString=function(o){if(o&&o.id)return o.id;throw new Error("Invalid mode")},r.isValid=function(o){return o&&o.bit&&o.ccBits};function t(e){if(typeof e!="string")throw new Error("Param is not a string");switch(e.toLowerCase()){case"numeric":return r.NUMERIC;case"alphanumeric":return r.ALPHANUMERIC;case"kanji":return r.KANJI;case"byte":return r.BYTE;default:throw new Error("Unknown mode: "+e)}}r.from=function(o,s){if(r.isValid(o))return o;try{return t(o)}catch(a){return s}}}(xt)),xt}var ae;function Ue(){return ae||(ae=1,function(r){const i=O(),n=_t(),t=ft(),e=Y(),o=oe(),s=7973,a=i.getBCHDigit(s);function l(f,d,T){for(let B=1;B<=40;B++)if(d<=r.getCapacity(B,T,f))return B}function c(f,d){return e.getCharCountIndicator(f,d)+4}function h(f,d){let T=0;return f.forEach(function(B){const M=c(B.mode,d);T+=M+B.getBitsLength()}),T}function y(f,d){for(let T=1;T<=40;T++)if(h(f,T)<=r.getCapacity(T,d,e.MIXED))return T}r.from=function(d,T){return o.isValid(d)?parseInt(d,10):T},r.getCapacity=function(d,T,B){if(!o.isValid(d))throw new Error("Invalid QR Code version");typeof B=="undefined"&&(B=e.BYTE);const M=i.getSymbolTotalCodewords(d),x=n.getTotalCodewordsCount(d,T),R=(M-x)*8;if(B===e.MIXED)return R;const I=R-c(B,d);switch(B){case e.NUMERIC:return Math.floor(I/10*3);case e.ALPHANUMERIC:return Math.floor(I/11*2);case e.KANJI:return Math.floor(I/13);case e.BYTE:default:return Math.floor(I/8)}},r.getBestVersionForData=function(d,T){let B;const M=t.from(T,t.M);if(Array.isArray(d)){if(d.length>1)return y(d,M);if(d.length===0)return 1;B=d[0]}else B=d;return l(B.mode,B.getLength(),M)},r.getEncodedBits=function(d){if(!o.isValid(d)||d<7)throw new Error("Invalid QR Code version");let T=d<<12;for(;i.getBCHDigit(T)-a>=0;)T^=s<<i.getBCHDigit(T)-a;return d<<12|T}}(Et)),Et}var St={},le;function Ke(){if(le)return St;le=1;const r=O(),i=1335,n=21522,t=r.getBCHDigit(i);return St.getEncodedBits=function(o,s){const a=o.bit<<3|s;let l=a<<10;for(;r.getBCHDigit(l)-t>=0;)l^=i<<r.getBCHDigit(l)-t;return(a<<10|l)^n},St}var qt={},Tt,ce;function ze(){if(ce)return Tt;ce=1;const r=Y();function i(n){this.mode=r.NUMERIC,this.data=n.toString()}return i.getBitsLength=function(t){return 10*Math.floor(t/3)+(t%3?t%3*3+1:0)},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(t){let e,o,s;for(e=0;e+3<=this.data.length;e+=3)o=this.data.substr(e,3),s=parseInt(o,10),t.put(s,10);const a=this.data.length-e;a>0&&(o=this.data.substr(e),s=parseInt(o,10),t.put(s,a*3+1))},Tt=i,Tt}var Bt,de;function We(){if(de)return Bt;de=1;const r=Y(),i=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function n(t){this.mode=r.ALPHANUMERIC,this.data=t}return n.getBitsLength=function(e){return 11*Math.floor(e/2)+6*(e%2)},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(e){let o;for(o=0;o+2<=this.data.length;o+=2){let s=i.indexOf(this.data[o])*45;s+=i.indexOf(this.data[o+1]),e.put(s,11)}this.data.length%2&&e.put(i.indexOf(this.data[o]),6)},Bt=n,Bt}var Rt,ue;function Oe(){if(ue)return Rt;ue=1;const r=Y();function i(n){this.mode=r.BYTE,typeof n=="string"?this.data=new TextEncoder().encode(n):this.data=new Uint8Array(n)}return i.getBitsLength=function(t){return t*8},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(n){for(let t=0,e=this.data.length;t<e;t++)n.put(this.data[t],8)},Rt=i,Rt}var Lt,he;function Ye(){if(he)return Lt;he=1;const r=Y(),i=O();function n(t){this.mode=r.KANJI,this.data=t}return n.getBitsLength=function(e){return e*13},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){let e;for(e=0;e<this.data.length;e++){let o=i.toSJIS(this.data[e]);if(o>=33088&&o<=40956)o-=33088;else if(o>=57408&&o<=60351)o-=49472;else throw new Error("Invalid SJIS character: "+this.data[e]+`
Make sure your charset is UTF-8`);o=(o>>>8&255)*192+(o&255),t.put(o,13)}},Lt=n,Lt}var kt={exports:{}},ge;function Qe(){return ge||(ge=1,function(r){var i={single_source_shortest_paths:function(n,t,e){var o={},s={};s[t]=0;var a=i.PriorityQueue.make();a.push(t,0);for(var l,c,h,y,f,d,T,B,M;!a.empty();){l=a.pop(),c=l.value,y=l.cost,f=n[c]||{};for(h in f)f.hasOwnProperty(h)&&(d=f[h],T=y+d,B=s[h],M=typeof s[h]=="undefined",(M||B>T)&&(s[h]=T,a.push(h,T),o[h]=c))}if(typeof e!="undefined"&&typeof s[e]=="undefined"){var x=["Could not find a path from ",t," to ",e,"."].join("");throw new Error(x)}return o},extract_shortest_path_from_predecessor_list:function(n,t){for(var e=[],o=t;o;)e.push(o),n[o],o=n[o];return e.reverse(),e},find_path:function(n,t,e){var o=i.single_source_shortest_paths(n,t,e);return i.extract_shortest_path_from_predecessor_list(o,e)},PriorityQueue:{make:function(n){var t=i.PriorityQueue,e={},o;n=n||{};for(o in t)t.hasOwnProperty(o)&&(e[o]=t[o]);return e.queue=[],e.sorter=n.sorter||t.default_sorter,e},default_sorter:function(n,t){return n.cost-t.cost},push:function(n,t){var e={value:n,cost:t};this.queue.push(e),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};r.exports=i}(kt)),kt.exports}var fe;function Ge(){return fe||(fe=1,function(r){const i=Y(),n=ze(),t=We(),e=Oe(),o=Ye(),s=re(),a=O(),l=Qe();function c(x){return unescape(encodeURIComponent(x)).length}function h(x,R,I){const C=[];let N;for(;(N=x.exec(I))!==null;)C.push({data:N[0],index:N.index,mode:R,length:N[0].length});return C}function y(x){const R=h(s.NUMERIC,i.NUMERIC,x),I=h(s.ALPHANUMERIC,i.ALPHANUMERIC,x);let C,N;return a.isKanjiModeEnabled()?(C=h(s.BYTE,i.BYTE,x),N=h(s.KANJI,i.KANJI,x)):(C=h(s.BYTE_KANJI,i.BYTE,x),N=[]),R.concat(I,C,N).sort(function(b,w){return b.index-w.index}).map(function(b){return{data:b.data,mode:b.mode,length:b.length}})}function f(x,R){switch(R){case i.NUMERIC:return n.getBitsLength(x);case i.ALPHANUMERIC:return t.getBitsLength(x);case i.KANJI:return o.getBitsLength(x);case i.BYTE:return e.getBitsLength(x)}}function d(x){return x.reduce(function(R,I){const C=R.length-1>=0?R[R.length-1]:null;return C&&C.mode===I.mode?(R[R.length-1].data+=I.data,R):(R.push(I),R)},[])}function T(x){const R=[];for(let I=0;I<x.length;I++){const C=x[I];switch(C.mode){case i.NUMERIC:R.push([C,{data:C.data,mode:i.ALPHANUMERIC,length:C.length},{data:C.data,mode:i.BYTE,length:C.length}]);break;case i.ALPHANUMERIC:R.push([C,{data:C.data,mode:i.BYTE,length:C.length}]);break;case i.KANJI:R.push([C,{data:C.data,mode:i.BYTE,length:c(C.data)}]);break;case i.BYTE:R.push([{data:C.data,mode:i.BYTE,length:c(C.data)}])}}return R}function B(x,R){const I={},C={start:{}};let N=["start"];for(let g=0;g<x.length;g++){const b=x[g],w=[];for(let u=0;u<b.length;u++){const E=b[u],p=""+g+u;w.push(p),I[p]={node:E,lastCount:0},C[p]={};for(let v=0;v<N.length;v++){const m=N[v];I[m]&&I[m].node.mode===E.mode?(C[m][p]=f(I[m].lastCount+E.length,E.mode)-f(I[m].lastCount,E.mode),I[m].lastCount+=E.length):(I[m]&&(I[m].lastCount=E.length),C[m][p]=f(E.length,E.mode)+4+i.getCharCountIndicator(E.mode,R))}}N=w}for(let g=0;g<N.length;g++)C[N[g]].end=0;return{map:C,table:I}}function M(x,R){let I;const C=i.getBestModeForData(x);if(I=i.from(R,C),I!==i.BYTE&&I.bit<C.bit)throw new Error('"'+x+'" cannot be encoded with mode '+i.toString(I)+`.
 Suggested mode is: `+i.toString(C));switch(I===i.KANJI&&!a.isKanjiModeEnabled()&&(I=i.BYTE),I){case i.NUMERIC:return new n(x);case i.ALPHANUMERIC:return new t(x);case i.KANJI:return new o(x);case i.BYTE:return new e(x)}}r.fromArray=function(R){return R.reduce(function(I,C){return typeof C=="string"?I.push(M(C,null)):C.data&&I.push(M(C.data,C.mode)),I},[])},r.fromString=function(R,I){const C=y(R,a.isKanjiModeEnabled()),N=T(C),g=B(N,I),b=l.find_path(g.map,"start","end"),w=[];for(let u=1;u<b.length-1;u++)w.push(g.table[b[u]].node);return r.fromArray(d(w))},r.rawSplit=function(R){return r.fromArray(y(R,a.isKanjiModeEnabled()))}}(qt)),qt}var pe;function je(){if(pe)return ht;pe=1;const r=O(),i=ft(),n=Ae(),t=Me(),e=Ne(),o=Pe(),s=De(),a=_t(),l=He(),c=Ue(),h=Ke(),y=Y(),f=Ge();function d(g,b){const w=g.size,u=o.getPositions(b);for(let E=0;E<u.length;E++){const p=u[E][0],v=u[E][1];for(let m=-1;m<=7;m++)if(!(p+m<=-1||w<=p+m))for(let q=-1;q<=7;q++)v+q<=-1||w<=v+q||(m>=0&&m<=6&&(q===0||q===6)||q>=0&&q<=6&&(m===0||m===6)||m>=2&&m<=4&&q>=2&&q<=4?g.set(p+m,v+q,!0,!0):g.set(p+m,v+q,!1,!0))}}function T(g){const b=g.size;for(let w=8;w<b-8;w++){const u=w%2===0;g.set(w,6,u,!0),g.set(6,w,u,!0)}}function B(g,b){const w=e.getPositions(b);for(let u=0;u<w.length;u++){const E=w[u][0],p=w[u][1];for(let v=-2;v<=2;v++)for(let m=-2;m<=2;m++)v===-2||v===2||m===-2||m===2||v===0&&m===0?g.set(E+v,p+m,!0,!0):g.set(E+v,p+m,!1,!0)}}function M(g,b){const w=g.size,u=c.getEncodedBits(b);let E,p,v;for(let m=0;m<18;m++)E=Math.floor(m/3),p=m%3+w-8-3,v=(u>>m&1)===1,g.set(E,p,v,!0),g.set(p,E,v,!0)}function x(g,b,w){const u=g.size,E=h.getEncodedBits(b,w);let p,v;for(p=0;p<15;p++)v=(E>>p&1)===1,p<6?g.set(p,8,v,!0):p<8?g.set(p+1,8,v,!0):g.set(u-15+p,8,v,!0),p<8?g.set(8,u-p-1,v,!0):p<9?g.set(8,15-p-1+1,v,!0):g.set(8,15-p-1,v,!0);g.set(u-8,8,1,!0)}function R(g,b){const w=g.size;let u=-1,E=w-1,p=7,v=0;for(let m=w-1;m>0;m-=2)for(m===6&&m--;;){for(let q=0;q<2;q++)if(!g.isReserved(E,m-q)){let z=!1;v<b.length&&(z=(b[v]>>>p&1)===1),g.set(E,m-q,z),p--,p===-1&&(v++,p=7)}if(E+=u,E<0||w<=E){E-=u,u=-u;break}}}function I(g,b,w){const u=new n;w.forEach(function(q){u.put(q.mode.bit,4),u.put(q.getLength(),y.getCharCountIndicator(q.mode,g)),q.write(u)});const E=r.getSymbolTotalCodewords(g),p=a.getTotalCodewordsCount(g,b),v=(E-p)*8;for(u.getLengthInBits()+4<=v&&u.put(0,4);u.getLengthInBits()%8!==0;)u.putBit(0);const m=(v-u.getLengthInBits())/8;for(let q=0;q<m;q++)u.put(q%2?17:236,8);return C(u,g,b)}function C(g,b,w){const u=r.getSymbolTotalCodewords(b),E=a.getTotalCodewordsCount(b,w),p=u-E,v=a.getBlocksCount(b,w),m=u%v,q=v-m,z=Math.floor(u/v),et=Math.floor(p/v),mn=et+1,Ee=z-et,wn=new l(Ee);let Pt=0;const lt=new Array(v),xe=new Array(v);let Dt=0;const bn=new Uint8Array(g.buffer);for(let _=0;_<v;_++){const Ft=_<q?et:mn;lt[_]=bn.slice(Pt,Pt+Ft),xe[_]=wn.encode(lt[_]),Pt+=Ft,Dt=Math.max(Dt,Ft)}const Vt=new Uint8Array(u);let Ie=0,H,U;for(H=0;H<Dt;H++)for(U=0;U<v;U++)H<lt[U].length&&(Vt[Ie++]=lt[U][H]);for(H=0;H<Ee;H++)for(U=0;U<v;U++)Vt[Ie++]=xe[U][H];return Vt}function N(g,b,w,u){let E;if(Array.isArray(g))E=f.fromArray(g);else if(typeof g=="string"){let z=b;if(!z){const et=f.rawSplit(g);z=c.getBestVersionForData(et,w)}E=f.fromString(g,z||40)}else throw new Error("Invalid data");const p=c.getBestVersionForData(E,w);if(!p)throw new Error("The amount of data is too big to be stored in a QR Code");if(!b)b=p;else if(b<p)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+p+`.
`);const v=I(b,w,E),m=r.getSymbolSize(b),q=new t(m);return d(q,b),T(q),B(q,b),x(q,w,0),b>=7&&M(q,b),R(q,v),isNaN(u)&&(u=s.getBestMask(q,x.bind(null,q,w))),s.applyMask(u,q),x(q,w,u),{modules:q,version:b,errorCorrectionLevel:w,maskPattern:u,segments:E}}return ht.create=function(b,w){if(typeof b=="undefined"||b==="")throw new Error("No input text");let u=i.M,E,p;return typeof w!="undefined"&&(u=i.from(w.errorCorrectionLevel,i.M),E=c.from(w.version),p=s.from(w.maskPattern),w.toSJISFunc&&r.setToSJISFunction(w.toSJISFunc)),N(b,E,u,p)},ht}var At={},Mt={},me;function we(){return me||(me=1,function(r){function i(n){if(typeof n=="number"&&(n=n.toString()),typeof n!="string")throw new Error("Color should be defined as hex string");let t=n.slice().replace("#","").split("");if(t.length<3||t.length===5||t.length>8)throw new Error("Invalid hex color: "+n);(t.length===3||t.length===4)&&(t=Array.prototype.concat.apply([],t.map(function(o){return[o,o]}))),t.length===6&&t.push("F","F");const e=parseInt(t.join(""),16);return{r:e>>24&255,g:e>>16&255,b:e>>8&255,a:e&255,hex:"#"+t.slice(0,6).join("")}}r.getOptions=function(t){t||(t={}),t.color||(t.color={});const e=typeof t.margin=="undefined"||t.margin===null||t.margin<0?4:t.margin,o=t.width&&t.width>=21?t.width:void 0,s=t.scale||4;return{width:o,scale:o?4:s,margin:e,color:{dark:i(t.color.dark||"#000000ff"),light:i(t.color.light||"#ffffffff")},type:t.type,rendererOpts:t.rendererOpts||{}}},r.getScale=function(t,e){return e.width&&e.width>=t+e.margin*2?e.width/(t+e.margin*2):e.scale},r.getImageWidth=function(t,e){const o=r.getScale(t,e);return Math.floor((t+e.margin*2)*o)},r.qrToImageData=function(t,e,o){const s=e.modules.size,a=e.modules.data,l=r.getScale(s,o),c=Math.floor((s+o.margin*2)*l),h=o.margin*l,y=[o.color.light,o.color.dark];for(let f=0;f<c;f++)for(let d=0;d<c;d++){let T=(f*c+d)*4,B=o.color.light;if(f>=h&&d>=h&&f<c-h&&d<c-h){const M=Math.floor((f-h)/l),x=Math.floor((d-h)/l);B=y[a[M*s+x]?1:0]}t[T++]=B.r,t[T++]=B.g,t[T++]=B.b,t[T]=B.a}}}(Mt)),Mt}var be;function Xe(){return be||(be=1,function(r){const i=we();function n(e,o,s){e.clearRect(0,0,o.width,o.height),o.style||(o.style={}),o.height=s,o.width=s,o.style.height=s+"px",o.style.width=s+"px"}function t(){try{return document.createElement("canvas")}catch(e){throw new Error("You need to specify a canvas element")}}r.render=function(o,s,a){let l=a,c=s;typeof l=="undefined"&&(!s||!s.getContext)&&(l=s,s=void 0),s||(c=t()),l=i.getOptions(l);const h=i.getImageWidth(o.modules.size,l),y=c.getContext("2d"),f=y.createImageData(h,h);return i.qrToImageData(f.data,o,l),n(y,c,h),y.putImageData(f,0,0),c},r.renderToDataURL=function(o,s,a){let l=a;typeof l=="undefined"&&(!s||!s.getContext)&&(l=s,s=void 0),l||(l={});const c=r.render(o,s,l),h=l.type||"image/png",y=l.rendererOpts||{};return c.toDataURL(h,y.quality)}}(At)),At}var Nt={},ve;function Je(){if(ve)return Nt;ve=1;const r=we();function i(e,o){const s=e.a/255,a=o+'="'+e.hex+'"';return s<1?a+" "+o+'-opacity="'+s.toFixed(2).slice(1)+'"':a}function n(e,o,s){let a=e+o;return typeof s!="undefined"&&(a+=" "+s),a}function t(e,o,s){let a="",l=0,c=!1,h=0;for(let y=0;y<e.length;y++){const f=Math.floor(y%o),d=Math.floor(y/o);!f&&!c&&(c=!0),e[y]?(h++,y>0&&f>0&&e[y-1]||(a+=c?n("M",f+s,.5+d+s):n("m",l,0),l=0,c=!1),f+1<o&&e[y+1]||(a+=n("h",h),h=0)):l++}return a}return Nt.render=function(o,s,a){const l=r.getOptions(s),c=o.modules.size,h=o.modules.data,y=c+l.margin*2,f=l.color.light.a?"<path "+i(l.color.light,"fill")+' d="M0 0h'+y+"v"+y+'H0z"/>':"",d="<path "+i(l.color.dark,"stroke")+' d="'+t(h,c,l.margin)+'"/>',T='viewBox="0 0 '+y+" "+y+'"',M='<svg xmlns="http://www.w3.org/2000/svg" '+(l.width?'width="'+l.width+'" height="'+l.width+'" ':"")+T+' shape-rendering="crispEdges">'+f+d+`</svg>
`;return typeof a=="function"&&a(null,M),M},Nt}var ye;function Ze(){if(ye)return X;ye=1;const r=ke(),i=je(),n=Xe(),t=Je();function e(o,s,a,l,c){const h=[].slice.call(arguments,1),y=h.length,f=typeof h[y-1]=="function";if(!f&&!r())throw new Error("Callback required as last argument");if(f){if(y<2)throw new Error("Too few arguments provided");y===2?(c=a,a=s,s=l=void 0):y===3&&(s.getContext&&typeof c=="undefined"?(c=l,l=void 0):(c=l,l=a,a=s,s=void 0))}else{if(y<1)throw new Error("Too few arguments provided");return y===1?(a=s,s=l=void 0):y===2&&!s.getContext&&(l=a,a=s,s=void 0),new Promise(function(d,T){try{const B=i.create(a,l);d(o(B,s,l))}catch(B){T(B)}})}try{const d=i.create(a,l);c(null,o(d,s,l))}catch(d){c(d)}}return X.create=i.create,X.toCanvas=e.bind(null,n.render),X.toDataURL=e.bind(null,n.renderToDataURL),X.toString=e.bind(null,function(o,s,a){return t.render(o,a)}),X}var _e=Ze();const $e=Le(_e),tn="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAC+lBMVEUAAAD////////////UhLn////+9OuTsP6lw//UhLjUg7qmxPzTgbiTsf0qKWnVhLf7+/z+3on83onThrjJ2P783IX3+PqaNX/Tf7ft7PP+9O3/0cGVsfrv7/SdN4H4qD/Wg7qgPIWsTpH68Ov4okj+8efPerOaOoD9/fj1rEbz9fmYtfv47eq9YqGgvvzEa6mwUZWqxvfNd7GeOYP5pkPx8fbSfLe6Xp7IcK3BZ6WqSY770nf2uFWkQonWhbG2WZunRYvKdK+dPIHo7/f82YH6zW+iP4b87OF2deDRfrX4w2LyrE/3sUqjwf7YhavZ5PWxyfTVgbj3qEb65dn2oFL2tE/A0vP71nzS4f+5zvPu5fH3vVv29/bh6vb/9Oz7+Ov69OL5x2j70sSWOHvn7v+zVZjQ3vTpwdz518xNTKz5rET9pjrt8/nhjY6XQYHnkn39+/L13bQ0MWr1nln7pECcufvI2fP539Pah6XbiZ7ynGD428735cOeTIjkkIacRIXwvXKYs/b4686hVY3mz9/ei5fhxtvdv9L20Mr88+/vwn3vmWfq1+nt1+D51sjyycbLnb7tl2/vsFf26u368NmTN4X18fb5+PC0xO7w3urz0pnxuGivxf6ovvLYt87Tr8ntu8XQqMWmXJLrlXeetvHlq8HTj77Fl7nXkLdUSaDxy4+nRnL0s1r04ezcpsvfoLzBjrL1tKCwc57utGK9iK302amqbJtVTnnymU/NytlUUri0eKOlSo3xx4hrXIVBPXG80v/y6edsbNZ/adDVnsbal8G7gafx1aOsZJiDeJaMO43Nb15bW8Pbf1ze193Cu8eRg5r35uVfXqqHTaSxa516aYu1XHqppb6alrNsaLHYuZL32YrmklTc3uq7u9XestSGW7rHnbTTe4+1WGfm4+atrNPRsbiOQ5piVJPHa3bWemvlqFzzw7OSfrHBaJRzP5GLa32efHt7d7Ciip/er37QoXjcg3bDrdy8pMaBgLu2WI68jm/RlV6+noM7Dj/DAAAABHRSTlMAgL9ARyeO/QAAH7FJREFUeNrMl+9rEnEcxzvTyqnsYONM8FYbNG8na2nd1oJoThiMY6h7ICnKCZWPJE5oPnLkTAykB2FipltRRAMZEZl7UoMeVPYH9DT6V/p8PfV7Nz1vEf14MyeCfH3xfr+/n+/3jg3WcYLQ6XSGPyudjiAIFYBBTMDz90QQ/x9Th+x/hNIGIwz/TMR/Z5Uk3XEVKsMhjY9vb588abFvrJ0aKFNb5+0WpJPwd2RZtre3r9+82WeYZoA3x4FIkvO8CpLL5feH/Ds7Oy+37G2yX+BqL/rxo5KM0KACJrzCxkCiUDDli0a9oGjUFw9WAO2XqEzSYgA2jItQOCVfwQ4rKAUupXzeBEW2xZAGkmS9vuBL+9Gp1kyw6AAwQp1KBmUBbazJsJBR/mCUbSNFOI6maRtNcyx8ohIAdrSKOZVlvW7AOq7WdpQfxkJmmeTpheJeimHICPB01COjfDt2i13dM9WyflTh0uEAFQsAltOEsRBUAn6eYoEJUDhKUplDaAAWrWxht7R6BRoQpE4eIaZSSG5WxykSmBAS5AjfRy8kCJS2cZQmlwVTKXVzQL0wlXoNgCoVJdtQNolJKZLibDRwQY5aCQ5Uf4yEvFdK2XuLoPwQFE2XMRPDyMEQFxV/afmVBHGOfTFiqiFmhaKQn9SgLhIjloRDXByZqNiHUw3CwvsR20XgCFXMMoFXXpLkaBQTgJAkMAmlZKFRjym4aDpC+rbQ/rW0mwkvBRWeDMO4dEqzBo29jldAxUCpyiSYJDIkI8bS9Qa/fmYvDVhYEbCLqmw5nYgMDiS1XmnUS2HWeD9WZxlXxQuNpmkKviVmW0lBaGb4Gb5RqPFVwaCMkSK/B4OhUKhSQWclHJZ9vdK267gcqw+qa5bJ7wMqMAI1Skg2is1sZq9WaGVjTT5TMsjFwpQos2UWxHmjvhSc5BtOdI5rU4HkKar13YJuNNJkiFNol7Wr/jjdKhSLyWYrnRUYJlsrJhUpUnT4/jOkp/fzuXAZtm40HnS9RHXDCWrbBWapY0kLmVzBBFO2QYJIsYNas3qQFYVsPSkyQn2mLpCKFB/sf9gE3bv34tv7d7vP8uEyB2Q7WxvglaZwioTqNoRDWsLyUVSXCrD4aiwmGoRq8UAwiEk+k1XuxSf7V5CWViatN244Nl+83b3/CHkWcmli4VlPqGHhLpiCCRgNnEGSiOoEWzGbKTYFBr0lRYVb4YfTSG6327O4cOHq8vLdD193c2U24QsiMO3SS1g61VHaudG44jBG6d7hl64V0wwJNtXSpXQsVucPBCXWJ72ks4GzZvO8Z2HJanVsfsmVI4m4H8DwOB0y6nU9LLXDy+SPQt/Z3nEDKdYF+H+pVijyB7HkXiNLyiv/5JW+J6NRP2I2uxeWlh233+fDEW/KrxFlD0s9QzBLmqRoGhm6EgGkJKb37qyvn5mpCqUC3xTl8zSnwBoZ0esDp6dnp1Ycm+/yYRYl+RtY6EbTGfBBlqRt2BCoE58Umjxf27vEpxmxyhfwXiRZ2w+MJeNbXbyw4ri3m2MhSbjAaXYeY6mdOykKqiVrj1BfP4hlq81kZh2AmPReEe9FyvYEqjVI5vnFqeW7b5/SrC/kOjrW+GGs7phxAZaNk2ExSQARH4vpBp9kSEOswFcZXPj8q5GBWGP6gHt2yXHvTZiKDgny+nAsOzQLu2WjDVhMKTPTEiG9mUwMda3FZ8QOFWV78HoMYY2ARkdHjUrDVj0XLq7s5yOJlH9wjmsb4xpY6OEQh2gzyCRU1zMxyLLYFNtdKxS6WLbw/TGzORAImM1mI5KyYKOB+dmLjhdPOTY+kOu80z4cy7KFnyuCCUXlEQjPp0Umm5TugMy5E4xEBeehZ3F2dnZx7rJnen71dOBQ78eMxoBnybH5/FEEuPqtgtuGBpZ0icQDIiLHEjJwEqLbaQeW7FLlv16csFonJiasjsmlqYU5j3vVLHds1Dhidk85Nh+GIz7g6qcaimXB2xDkjzIsuj5goTqVmMNPGHQ49+XDVFtwJF6dtFqtk1cW5tzmdtkw2/St5du7TygfTFak9q+gAIFKAwuahR+ig95I/oGNUpS+1kgrsWBghXOf3O7pedDqtPvy3OLCramrFydWpq7NTY/ox2RZuq9N3n0T5nxwWfS7JKw1RKWJhR8sEFX56f5uWG4XnIgtpVsUBwl+HoP2jLZl1P9kzcxDkwrgOP6PRO/x4tXMfIvyTXtozzJNXzPnNZ0OpmYlmjWNlGGRZger4YbdzagZdN8HtSg6iOgiuiDoooug448KoqLoICqoiA7o93xpNl1F+mNs+GDbx9/x/R1WVVVhaqVCZRQKjSplNZKf+VKtdfphaEXsnJiJ5bA5AFUcq3gZAtXAHbumX0lXyvO4Bs/suvE0pll1R+ArV4EQNwyTWnQSMbhMSUBp5lpSg9Y6/9j5UCi0YQQrYsOGwFYLVH/G6pVt0uxyOG399l1NEvWFTflcXeNX2Zi6wOfxu5H3kSqZUKyS5id/g7bp6YcFC5ZfXrthRMs2oGLtL1gwK2cTa2PdwKVzZRI1wj/UyKV9oQXZrOKD8YoaAj4bKdEIrQoix4WY3K+8jCfKkEdnbajbuPAPWIUHLbYIg0t2ySQWSJY9h9KNsGT8NiBzr0ZUpvbwke6oQPBBrqoVtSKZytKQfWiaR0UNjnDAxRxMbmDvPH/D6sXNytykNVmePiGrGck1tQtTNmWuD/3gtgXf5HLYZmHFBrk61B1SfvlF6kW1up9ciHsVY7D16SPQG+gFi+Tj2BtnN1iFE83wlmmbLsmMSox71/w9h1LpRrBK4AFrbEynYf2SV8Lg93fDCF2NyKjltAJJtJEOQZ8+FQK9DzbN0dtgnxxQXLeKbNIT1++dLtbxuPgg4LA9Fw7t3Lk9lU6nlyxJPXp04dASyLjK1L9g8REUGrXGXI3yWKwOxtEHsCoEYc+WRcHJLS3jxuz+k8oPAGdxCjdm9MDti2Xa6lzq8qpQVHHmzJ09Fy9cvHhxzx7I8ouP0pWVj3j/ZpjULNZARfL4uLuTMQgqWPP7nJcnBYNB7vjaq1ushaOyOipPH5FJqtG87B1r1ogkFizvCVTCpgtV/4aF4NUKsUgiRSHl45RLXwHe6iNw0MuTyeOzkqBhk3d3O0HkyhCqcO/0+ep8tSHMMpGqOv8JyueD1/4RCwJJ6KxC9p3irc1kwC8QgMf0Ludqp8fj3HI5FBy9u1usnj+xWkakrggVDQj+ax4HX0UwHo7n/yMeWgUP/s1g3wAuq0ptap1BkaTL57DbBP6DJBl1uaK08+za4ORusHJlOKau8fD0GnXeUNKgEGvMIIklGYLp6mVfnnRQZBSMJH0L7n98uNpus+kdLuf+kHxyUSwow9wEn1os1hG5vwf+r9dEoOWWaoTOeOAG5XLY7WGHwUd/PXfu3ccHggqBLUyvXtRvYiFWfpMeU1d5uEkl/UWBjawVRiBbSzaU0N176LEL2Hy36Zff3Td13937bFXaDJ7LwWlFscBZXDNsCS4BZ2VrDmikEqhBoCyDNTw5Sfsr+mR0a/PdqadO7Xu/xQ7pH/Ds31CAlX+j4cpQoublsDCtkJP70g3B25tpfQXHtfnWvlPXp5577Qro/UWx8m80oFnrF4u1GJrjsojhJVImrNYOj0NQkfHWg/svpp4CLJqkXaQzGawrggXO+ok1Wr69qdaSwxpL1IIM8spkoPGU059xlsB/9P2LffveLQi7yBgNlTi6KxaMh+Cs7DVk4BGZCqCyWAphvRID1SxXFNtYMQUou49+/f3W+2+rbXoD6Tw+qRgWjH8/sVrkS6BH500lRpGZqCoPFjdueUlD2B420KTP/mDzcpr2C/QB+miysBIznzpxWHCVXNlU+ytomFlkVI8tFxaKInhiRjNDgtEByH3oP6Qdvhvo5aF+XbF+n2hOyCJYTpgttUIF96o8XAiCu+OrqFiMdNjYzLcZyDD8sLvg1lKABc7KrffpxUJlDovQio3ceFNGMlPcG4u5OJ0QGEhHBdAFPMsLsbLOgmPpiB1zxQSaxbLUgLPKjIUnOmbHYgFwFosVIA0CqAB79ODMAqw52aPA1tHrj4lVWXVAEIW4nt3Yy2l4opOJxWIwOHNYMdqewTpagDWA0yxI+gl1m07IFBj/J1Z1RGgm0P/O96qCUoGt2z3DC1SZ0IHZfBBPO6gFWRjEOT05LHazSO2yWnB+rkdrlGgJZTi2AAtxz/POjs2mmIAgw6WnZ5+kaBdNb0n27or1U7OAqq7f83sH3KafWIRCU6Ou+n+sBmnBr5ribWQ05u2gXHYBG0MH2fzpxkPnlrPJDfKuWOCsTJOePDCU/HDjRmfczU2dUpVI24Ci/5tbWESiUKPIr2QHb7V3eHwuZlW8g/KF/TYIHjUjceDe/WQoOLGryo/PRlAe2rzFwzBM8zwTjsMuZjHWlzI6YPObNBJdAz+nDDjeuopyhWnvPHe8jaJ9BgNNdbQSEeuxNf1atvUtjjVhWmjzahoag4FpazcBFqYU1lhKwVIJ4TQoGYkh2Q8QEjMoOuxg2lpxU3tnM0VR3lXtprFK664l/SYsLIoFzgouWk07YCexuagZbkh7wiyMELwSsHTCuaeny8QKjgtHoB9GHX4D0+lGUdzd+vLaq/YEjiDqGtnO9RN3F8WC8W/Dfk/AJmDzkFmVgINHtUSkLaUZIhbZ4qXbT4iFsLeyWKZ4MxOw6WkqjkO+8nEdBAMBYkIrPJGWjyuGBQlfF1oQDWcagt0DUTTh6vp6JVoKVrV17o5BK44thhMLBhek9jbGoIfag9RicxeRGsGRbNIpNVc/D5w2uZi3ILXWHnXZM8qr93hnxOOtSk2tpSQswjh/Z49Ba3buaqpVEpDujA8aYWA21dYZb02Y+A1mkUrKtbh1t28G64pijRu4djWLBdOGPTqb8no7XlolUn5JWDXzH/fov2zo0jvWWl2iE7QKNNRucHkob1vnvPaEsr5+JIqDV83r3r6p7Pdnb8H0A9OQL8o8fBohkJL2VcDqD7YsdbrpwCcvGbBlhmU7e3OjqOZVn+41KdAqFB+rE1998ax3cay6H9WceVAbdRTHRwdxNkbjiDYRMSEXGWpikGAuCIQUEqGIcqSotdSCKKUSpoDSFikqVUCEgoiKR+lhpyBWsVYBqa2o7ZSiVmy19Wi97/s+//D7+22S3SRctTMeb6YXTcKH996+6/d2r7ofvoWs6ZbFZiaSSPfS18Ljw7LXt4MqvFm7ZgR96zJMAdNxpaNfTUxf6JYlqN4e/yxDFCZCkuvqe/WKUCw6/lt8e1kmKkW3DMomeLKh90XHVbhnOHdsABbAtLdt++ClIVU1Rg5JmYlpIEOEXxgrQzQlM3OJouubvqPBWNijwcHAPVc9jNqnIEkWm4gogVY3Nr88+Xi4mBhDQ2M4K82NG/tfL69oqVIlVKNeXpIIMswDq196n7YvKZp9fR8FYxGqe26576ZHZPNv//GL+YlnAQtOkJW/Ovm4rkS9dGNruFc6N9RpTNkrbl29qSVflSBLKsDPnZk79MHvdKZqce57IwQLfrV4+f2xsWWyP7/d+e2Pb6Gc9WMdB5ewxLBtwoel1A545PockSgZaKuq3QVkSJn/eb+d5sx4e9e7IVgXXHLP8ieQDZd88V1fX98Pb7HNeAGMKJodVoZkkmsD4dLxnjbcz9W6TWONF2AmRlvrtLOQsje9b5PG0A9QdB24Nxhrwdy7bs9dmHjWW2/uRPv92n1UWQjHSKmzUktMSgqwAn8AQXSOxVG3RhnOcd1W5zBJwIVBBC6q9FhVx8p4q9icQxRrMnwSggVlzXcn0qkAhhWfPpwGScwsU/1M6q6ZRWC2GUzCkIrZqNBs6wznibbdY9eTJF2hSipIz1K13JosVIjpO4XIP78EY129+JnYzDQEup920mEFCiF3lkz10uvJjIiZTUp2iuUh2TNHJ/c0KvlY6taDpDVIXrkqNzPdnQAqUViKVJHDECvKu0Kwrrvq9tglZ6FZe/tbTMK+my8rQxOgGu//fQXqZwGDXpiZli4GR3R2IxPQSQhTrZrtUBZftOs8NmSb1flZmW5S0+EdaK1gf7TbCnEI1rxwoi0UDvP/2Pnpa29ihEhi8Hj/Zy0dq1ck4zg3jJne421iqcEk4XcSOGg1NLQGKKswvBlen5KR3VEd606oKqcOonc66NxRoJP+GupbT853pyO8J9305x9vvkVH+XCt8fF8ZPuKW+Fh02IJhDbxRo/dzD8aM5oMdT3a8MgArkhtT53TfGv+Mpmsqhx2wCtTbVIzQ/JUvKY95Eq88pabYt1Ihenp8xFMcR2SWCcb+nyTahkBK19Bo/1UShNIbMVb9kIPUCuE/GbUOeu3dCsDsCILCxEkir+uwIdWrc6Opi+MsUstDK027CFYKEwRTWXLSOohTkalwK3quJUOMZDry1cCbKoYJjDains2eHaYgUUkguiqfntreKho3/P0t1RXoxAUeXs+q9QkJL4lTAnBOmXBvMW33PcITq7SMstwqkbljCVoBcAlcyfF5ua3VEwDFm8rvm3NQRKUaCchxMFT/UArImmoNG78YGhZfkW2r/mUxElLKBZjDsHCIvUlc258JDYR9XJWbDpMSMuuhKqVyStbErKWINcnUCeLnhRLaHZ6uifa2TkwI5TgXLN+SytnQb4hR/d8Xo3WUOTDEiJCAAsDBeMLIVgX33z53OWPZKWhnFkoc2OWQs/VSJRHAV6dlYjgisKtahPxfkEolk7e0Kls3OgwIzJI9FaHo2GdVhk+qWg/rqgClcgf3UziHUJWb48GY118XtTlc5a7s8gcf4lMtpBypbkTOrIF6M5pY3BWAcCqqyqyQ7FgCMOIUtk6UqwzxlgU2Ajcc4d2cihU0K2vf/B1Du+9OqmNxRK+E4x1fVTU5VcCKw1YmbLqhMwCRPyFMoQWsl1UXpW7EGUIwMqqW1aEhWKZ7Z4eZbh2oNgaJxdrGkYaR6GqqbCUI5o4IS8XWMROL9a1wVhYQ770OvgWlIKh4ZAqAcVEUu7QeHYYsBiksLIlZxFQMgXg5vW+qWNGimMvPKm53aPB5uT2dd1QFetX2pf379//ciBk5IZ6J//gxiKVs1hMMNaZODu/YNFdN+UmJSJBD31egRIyQTU03k9cOCICYzKCRamymYAzQiY6OiNVZ/NsICSNIyNbetbwzNe8f2xw1+DY/lEEUu6ra+oceh6WXiqXsGsUIVhko/OaK5c/kpuVFTs0/np2eUVHR8X7/Q4SfzEZzi9DHi9IygWViBfJBVjhtKQorM76PTTLTKxpHVVymilUDu+sPO200yoHD2nVhRzW1qcMKYFYGVNjRd07757lN9155/0/9dskTPaKFdkxDgN+KpgwHyMA0qSBivN3xAGzSWF3GoqL67b7VLQYNuKwRsdARWRwmGdG+KDBKpwlFpbJFpx7z1V33XXVugaHkZgHLbFBx4hAhbkBlhYSuH4D1Y4wxmSXGxyeum3tja0Tykmde3iQQkFfOzv9XyVlhMZm9F84gumNCK57F83F+sUdezVm+jKhQpoiIiNFnIVAV6jrGf+xM/adDJr6hu2N3Z3a5ubIya+5Q7tO83ENa115RFxqUjx7nGbhbLFgx4cevHfBoiue0piE3vgbl7wawYHqqgpU/hrd5BTXbxxo7FQqEcoBNTnWYQ7rlaaioqJzioraagHW2SDXBWDlTIF1qv82qAcvOXubBvUiO52yl6/KTSqAX+UitwqivVWMOc5Rd7C9VQskME0tPG29tvYcVopKXWrlNkcKsPwBwimcTltUzr/k3B+65BJaapjFH4AqkQT+hJaVjA/LbNU0IOPBHDPIfg5rpx+rqEatHHDEGf3ngmyUnxHr7K+6NPEMLVcwNnCj7Uf7n5BfgZKLUsXv0OxdtxWamhHr5cFJtFVUq1b2eBQxfiyTdMfssPaJLUK6J/LZkCwpEVg4WMvN37QymVaRCs3GRi2YZsYafaXS71sB2rrNQ+ZmXAUxO6xvxCUUS/jZ26qErCTMqdPAhaYumTZO9T2dzVxwIhKJX5NgKf3qqvy4CEhUSl3h4a11Nn20f+xriJsV1vffdNmN9B1f94+vUlUnzE9akliQGVu9qjxZAGU91amM9EchtVKpJZfjJFiFzVp4l1dZXqyitjwE/O4Gp8WHJUEYmhHr1FMWHfm+b5/czFZ3Dvv75ZtWqVQJse7MhWWkAE+1edYhK/sV8uH+sbHDw6MADcWKjNQOD+6qrNw15qci8aFQvXWvXOcrA412qY6ZHgsB4oJ5R97o22fQkQMHQYzNacGcGmT5KmzzLavOr/jaWdfd7AsLqBDGKiGDhz9UToJVSF5w6JVX3ltbVETdqjQPFgTWxDaHKdrfYkr1M2DhxPryucNvLD3QFYdJASoWnK0IBBhcgwzTn2pwvdTP798/9Dp15eGgCotTnnKipraNSG0NoOjX1Z17NCk+LLNTnDoDFo73F8w5+urSd7usOEREM2ISl2TQHjkZOqvoqFKh2tmj5UUmn0/v2h+sLjX3N5eLpB2XWo3wS5FHB8R+LL3cYZweC1QX3HD6R68+/fw+p0VI9KWn83wyY8FwHyOzio63x7nRkHriByiLlde0gRdhXpuL+xd7oXqvV7CNbiku8WHp5DbJNFin0vtCcAPNoaUvPn/AYAIWWl4n7yiKIROz1/spFn5sdV5p6RiAvOp6WclXVe3jj9eGTyXN2vbikhy2+Y4mYWtqLKorch/b3MNLX7zo3a44GobjFVJdwKEP5j7tSpqH1bVt5zS95seqPKRl1VRb43LVfPn441/mTYsVRz8WxW0cZjhhU2JRXZEDlg9/W/rcRc/vs5vZPV9NSUwwlpbVB7m2xjiswyxW6eNEpqGCRGo3FMcZKVZOhlVsEUyNxVLhyAAXIrA+MejY9C4PPF5hvFjqGhqJftgVjJX3JYVqcylngyXKwZpFfNjUWHTDmhx0Hn31aWAd6KKqZcxWqVkQwQOL0wyQ7+8qpVgfc8n4V5Inyf/k1dTkzVBdaHuAJaD5TW/DhTgF1tXeLSm41rmH4FoXEeciVQQiF9YgGB5WiYYGiLw2GrXXjlWGujxy0QwCbfmwdHKrH2trMBZLBazr4FrAgnPZzLS4MWEnk49lkj/VyWmryK+usU5e+pk9VkYJ9oomx4L4F2zmUNcC1icadgtPb3MGrJ9anA1biW+x6ioCF9XXTijr2LAy2OJNIcX3mQrLv8ly5dG+p4FFnYvG93irVC+M4PX1Ns8aJeWqLSLS1PjKIHLxsPYYqCL9AQIjajnXbZwUjPUsi4XwQKIWBM6liCcRFOOnuBz+rSd2zQZgRdKc4kJK0Wo7r+hEWX8sWBOI8kKKZcGehc9HHvVjncg7IoMsmHuE2pBaUZ5KtAWflBt5WDkKzR6OQa1WsyG/8Bg8S+2q3V5cQj+TTboCzoaBWFezrnXN3GGEBy+WWI9kjZG7TWwW8kdZGjjX3xdkRVdt0x42VTMxuNBDXOtEYHnFq63rjuBCZLkOiFMQGWhcL+GwgGmob1QeB5faVVO6XsdiYWfNoMeffBsCC7fk8q148YOXXIkrEVysc0kYEThMUv5eGQbC9QPawr9PlVdbur4XdRzF0husqSFYJwDLJ2R3//rzHlx09lHKBax9ciPVUqrcQMzpw4IV97Yej6qaNvdKrA4dwcLJPpdyT+KwuMeMXEZv5Iq6d9GFKAPhX3Au7yhCojDEAcu/aBbjqNvQ/PdVtXZzL5Nhl+vIzVMxVoPfta7lYSFC+IRQkfHIvAuHX10KhT1/gM7Lac9vi+GpSxJXPLJV+XdVtf6xiDBBjNxpIVipUm4pmSPhP/6ErsRGnRxFxjZHvgfY0we6FGxsMRp4kwyoy4ybH7XHDgVVNcGAEaJoQbzDZhbRRVuFb1y5la8sakVedUPHSZfMvfAjgH2DUQTrTSVS/pY6Dkod27tJsJq14LWuPK+qiJil1lQcvJEWMdrv7xwWJOgZNujJbn7wmnnnHjl66CuPOJ7FMhuc+oA9I0fDMcYIFmpzL42cERgAWrGNwhBbCoKpYEO+FSG+ruyhS/FsmDlXbGRHEQxjVHCFLQ2CiuLt3bPnUvugIiIE3thuiJNE4JqWIvNwJuSUxVmRd3s1HOyhSxfMmzMiTfFa0RK4XYaatW6dFrOtwtkwuWpqCdRueiMTW2TFGUqEDDZdDNiVCaKCskLUdfUDvuY66qFrTt8it3p1FG8NOMOMwK2iB7uV4Jo2y4AJiqptIz7VG8G/YwgflyMKixdj/4AJojph0ueBebmAdcOcnnpbjP8AxJ7KP9XEsUX7BNL0lLKYtR366SYEqt7oaBH/7XK5JUeENE0mu4JHAwBCH0bEzcKjzrv+lBuuW1MvN3utRlaIJQy3lIw7pOrXo3mfgkzNqglMVFE4CEE7wEmMGOtRiKniFEGYAGE0VFmcGTlD0oYReyRXYPLqRZGY4J38Myhs8+1di7EC0Fxq0PnFBcmrgTtBTWup8UIkxyyGGRi9XGNmrqUGDHnmT6gZAfYsvXUZC+qOFN9KAzogkySa5/V6p2bP+rVrm9pKa2trQMcKeGpLS0sJ0frNYAJUqAjhEjlhiIY7HqWqmvEBXBzYs2iC7h7QKKAgr7qwcs1h0QLOYdn92Ob1hK2p1CtNLNDmx3b3RjDRYZheTIaFgheW1LffMcNz+uBeIWRXz5vTeHCHxPdRWDpB+R0QvMR2syiit3f3Y5DNVMjfdu/upVpiqBdCQrcT7AcjriV6CqH6Dz3JkEf1n3rCop/qP/bkR6+3/58e/vhffVTmvwhGVfVfA5sZioJNR/avMHFkJ/wDT/jFI36nYPoLumihsPKwMKsAAAAASUVORK5CYII=";function J(r){const i=W();if(!i)throw new Error("SDK未初始化，请先调用initSDK");const n=r.startsWith("/")?r:`/${r}`;return`${i.baseURL.endsWith("/")?i.baseURL.slice(0,-1):i.baseURL}${n}`}const Z={getVertifyCode:"/auth/generateCode",checkLoginStatus:"/auth/queryCodeStatus",sendSmsCode:"/auth/sms/send",loginByPhone:"/auth/loginByPhone",heartbeatDetector:"/auth/heartbeat/detector",logout:"/auth/logout"};function en(r){return F(this,null,function*(){try{return yield it(J(Z.getVertifyCode),r,{extractQrTraceId:!0})}catch(i){throw console.error("获取二维码code失败:",i),i}})}function nn(r){return F(this,null,function*(){try{return yield Ut(J(Z.checkLoginStatus),{code:r},{skipErrorHandler:!0})}catch(i){throw console.error("检查登录状态失败:",i),i}})}function on(r){return F(this,null,function*(){try{return yield it(J(Z.sendSmsCode),r,{extractSmsTraceId:!0})}catch(i){throw console.error("发送短信验证码失败:",i),i}})}function rn(r){return F(this,null,function*(){const i=W();try{const n=ct($({},r),{appId:i.appId});return yield it(J(Z.loginByPhone),n,{useSmsTraceId:!0})}catch(n){throw console.error("手机号登录失败:",n),n}})}function sn(r){return F(this,null,function*(){try{return yield Ut(J(Z.heartbeatDetector),r,{skipErrorHandler:!0})}catch(i){throw console.error("心跳探测失败:",i),i}})}function an(r){return F(this,null,function*(){try{return yield it(J(Z.logout),r,{skipErrorHandler:!0})}catch(i){throw i}})}class ln extends HTMLElement{constructor(){super();S(this,"qrCanvas",null);S(this,"xiaoShanIconPath",tn);S(this,"vertifyCode","");S(this,"qrCheckStatusInterval",null);S(this,"qrExpireTimeout",null);S(this,"isGenerating",!1);S(this,"scanPollingInterval",null);S(this,"qrCodeExpireTime",3e5);S(this,"scanCheckInterval",1e3);S(this,"qrCodeExpireTimeout",null);S(this,"isMobile",!1);this.attachShadow({mode:"open"}),this.refreshQRCode=this.refreshQRCode.bind(this),this.isMobile=P(),this.render();const n=W();n&&(n.qrCodeExpireTime&&(this.qrCodeExpireTime=n.qrCodeExpireTime),n.scanCheckInterval&&(this.scanCheckInterval=n.scanCheckInterval))}static get observedAttributes(){return["active"]}connectedCallback(){this.qrCanvas=this.shadowRoot.querySelector("#login-module-qrcode"),this.hasAttribute("active")&&this.initialize()}disconnectedCallback(){this.clearIntervals()}attributeChangedCallback(n,t,e){n==="active"&&(e!==null&&t===null?this.initialize():e===null&&t!==null&&this.clearIntervals())}render(){let n=`
      :host {
        display: block;
        text-align: center;
      }
      
      .qr-container {
        margin: 20px auto 0px;
        padding: 25px 30px;
        border: 1px solid #EEEEEE;
        display: inline-block;
        border-radius: 8px;
        position: relative;
      }
      
      .qr-header {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 10px;
      }
      
      .qr-header svg {
        width: 18px;
        height: 18px;
        margin-right: 8px;
        fill: #999;
      }
      
      .qr-header span {
        font-size: 16px;
        color: #999;
        margin: 0;
        letter-spacing: 1.3px;
      }
      
      canvas {
        display: block;
        padding: 15px;
        width: 210px;
        height: 210px;
      }
      
      .qr-status {
        margin-top: 10px;
        padding: 6px;
        background-color: #f6f6f6;
        font-size: 13px;
        color: #333;
        transition: all 0.3s ease;
      }
      
      .qr-status.scanned {
        background-color: #e6f7ff;
        color: #3b86f9;
      }

      .qr-overlay {
        position: absolute;
        top: 15px;
        left: 15px;
        right: 15px;
        bottom: 15px;
        background: rgba(255, 255, 255, 0.96);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
      }

      .qr-loading {
        position: relative;
         width: 28px;
        height: 28px;
        animation: qr-loading-rotate 1.2s infinite linear;
      }

      .qr-loading-dot {
        position: absolute;
        width: 9px;
        height: 9px;
        background-color: #3b86f9;
        border-radius: 50%;
        animation: qr-loading-opacity 1.2s infinite ease-in-out;
      }

      .qr-loading-dot:nth-child(1) {
        top: 1px;
        left: 1px;
        animation-delay: -0s;
      }

      .qr-loading-dot:nth-child(2) {
        top: 1px;
        right: 1px;
        animation-delay: -0.3s;
      }

      .qr-loading-dot:nth-child(3) {
        bottom: 1px;
        right: 1px;
        animation-delay: -0.6s;
      }

      .qr-loading-dot:nth-child(4) {
        bottom: 1px;
        left: 1px;
        animation-delay: -0.9s;
      }

      @keyframes qr-loading-rotate {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @keyframes qr-loading-opacity {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.3;
        }
      }

      .qr-expired {
        text-align: center;
      }

      .qr-expired p {
        margin-bottom: 20px;
      }

      .qr-refresh {
        background: none;
        border: none;
        color: #3b86f9;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        transition: all 0.3s;
        font-size: 14px;
      }

      .qr-refresh svg {
        width: 14px;
        height: 14px;
        fill: #3b86f9;
      }

      .browser-tip {
        color: #999;
        font-size: 14px;
        text-align: center;
        margin-top: 30px;
        display: none;
      }

      .c-primary {
        color: #3b86f9 !important;
      }

      .qr-scanned {
        text-align: center;
      }

      .qr-scanned p {
        margin: 0;
        color: #3b86f9;
        font-size: 14px;
      }
    `;this.isMobile&&(n+=`
        .qr-container {
          margin: 0;
          padding: 20px 20px 10px 20px;
        }
        .qr-header {
          margin-bottom: 0;
        }
        .qr-header svg{
          width: 14px;
          height: 14px;
        }
        .qr-header span {
          font-size: 12px;
        }
        .qr-overlay {
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 10px;
        }
        canvas {
          padding: 10px;
          width: 160px;
          height: 160px;
        }
      `);const t=`
      <style>${n}</style>
      <div class="qr-container">
        <div class="qr-header">
          <svg t="1744957992577" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1299" width="32" height="32"><path d="M151.407665 402.833571a19.431947 19.431947 0 0 1-18.991425-19.87247V194.319475c0-43.905433 33.969198-79.440934 75.867805-79.440934H388.653633c10.474652 0 18.991425 8.908349 18.991425 19.87247a19.431947 19.431947 0 0 1-18.991425 19.823523H208.332992c-20.949304 0-37.933902 17.76775-37.933902 39.744941v188.592679a19.431947 19.431947 0 0 1-18.991425 19.823523z m702.242192-19.87247c0 10.964121 8.467826 19.823523 18.991425 19.823523a19.431947 19.431947 0 0 0 18.942478-19.823523V194.319475c0-43.905433-33.969198-79.440934-75.867805-79.440934H635.346367a19.431947 19.431947 0 0 0-18.991425 19.87247c0 10.964121 8.467826 19.823523 18.991425 19.823523h180.271694c20.998251 0 37.982849 17.76775 37.982849 39.744941v188.592679z m-464.996224 526.082043H208.332992c-41.947554 0-75.867805-35.486554-75.867805-79.391987v-188.592679c0-10.964121 8.418879-19.87247 18.942478-19.87247 10.474652 0 18.991425 8.908349 18.991425 19.87247v188.592679c0 21.928243 16.984599 39.695993 37.933902 39.695994H388.653633c10.474652 0 18.991425 8.908349 18.991425 19.87247a19.431947 19.431947 0 0 1-18.991425 19.823523z m246.692734 0h180.320641c41.947554 0 75.916752-35.486554 75.916752-79.391987v-188.592679a19.431947 19.431947 0 0 0-18.942478-19.87247 19.431947 19.431947 0 0 0-18.991425 19.87247v188.592679c0 21.928243-16.984599 39.695993-37.982849 39.695994H635.346367a19.431947 19.431947 0 0 0-18.942478 19.87247c0 10.964121 8.467826 19.823523 18.991425 19.823523z" p-id="1300"></path><path d="M773.866294 551.142893H249.644236c-20.557728 0-37.689168-18.110379-37.689168-39.157577 0-21.536667 17.13144-39.647046 37.689168-39.647047h524.222058c20.557728 0 37.689168 18.110379 37.689168 39.647047 0 21.047197-17.13144 39.157577-37.689168 39.157577z" p-id="1301"></path></svg>          
          <span>请使用<span class="c-primary">小闪扫码</span>登录</span>
        </div>
        <div style="position: relative; display: inline-block;">
          <canvas id="login-module-qrcode" ></canvas>
          <div id="qr-overlay" class="qr-overlay" style="display: none;">
            <div class="qr-loading">
              <div class="qr-loading-dot"></div>
              <div class="qr-loading-dot"></div>
              <div class="qr-loading-dot"></div>
              <div class="qr-loading-dot"></div>
            </div>
          </div>
        </div>
      </div>
      <link-bar id="link-bar"></link-bar>
    </div>
    <div class="browser-tip">推荐使用谷歌Chrome浏览器，可以更好的兼容本产品</div>
    `;this.shadowRoot&&(this.shadowRoot.innerHTML=t)}initialize(){this.generateQRCode()}generateQRCode(){return F(this,null,function*(){if(!this.qrCanvas||this.isGenerating)return;const n=(...e)=>F(this,[...e],function*(t={}){try{this.showLoadingState();const o=yield en(t);return o.risk?(this.showFailedState(),zt(s=>{this.showLoadingState(),n($({},s))}),null):o.code}catch(o){return this.showFailedState(),null}});try{this.isGenerating=!0;const t=yield n();if(!t)return;this.vertifyCode=t;const e=qe(this.vertifyCode);yield $e.toCanvas(this.qrCanvas,e,{width:this.isMobile?160:210,margin:0}),this.addLogoToQRCode(),this.hideLoadingState(),this.clearIntervals(),this.qrExpireTimeout=window.setTimeout(()=>{this.showExpiredState()},this.qrCodeExpireTime),this.startScanPolling(this.vertifyCode)}catch(t){console.error("生成二维码失败:",t),this.showExpiredState()}finally{this.isGenerating=!1}})}addLogoToQRCode(){if(!this.qrCanvas)return;const n=this.qrCanvas.getContext("2d");if(!n)return;const t=new Image;t.src=this.xiaoShanIconPath,t.onload=()=>{const e=this.isMobile?40:50,o=(this.qrCanvas.width-e)/2,s=(this.qrCanvas.height-e)/2;n.fillStyle="white",n.fillRect(o-1,s-1,e+2,e+2),n.drawImage(t,o,s,e,e)}}startScanPolling(n){this.scanPollingInterval&&clearInterval(this.scanPollingInterval),this.scanPollingInterval=window.setInterval(()=>F(this,null,function*(){const t=yield nn(n);if(t.status==="EXPIRED")this.stopScanPolling(),this.showExpiredState();else if(t.status==="CONFIRMED"){this.stopScanPolling();const e=Kt("login",{token:t.token,sessionId:t.sessionId});this.dispatchEvent(e)}}),this.scanCheckInterval)}stopScanPolling(){this.scanPollingInterval&&(clearInterval(this.scanPollingInterval),this.scanPollingInterval=null)}clearIntervals(){this.qrCheckStatusInterval&&(clearInterval(this.qrCheckStatusInterval),this.qrCheckStatusInterval=null),this.qrExpireTimeout&&(clearTimeout(this.qrExpireTimeout),this.qrExpireTimeout=null),this.stopScanPolling()}showExpiredState(){var t;const n=(t=this.shadowRoot)==null?void 0:t.querySelector("#qr-overlay");if(n){n.style.display="flex",n.innerHTML=`
        <div class="qr-expired">
          <p>二维码过期</p>
          <button class="qr-refresh" id="refresh-btn">
            <svg t="1744962273319" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1457" width="32" height="32"><path d="M909.1 209.3l-56.4 44.1C775.8 155.1 656.2 92 521.9 92 290 92 102.3 279.5 102 511.5 101.7 743.7 289.8 932 521.9 932c181.3 0 335.8-115 394.6-276.1 1.5-4.2-0.7-8.9-4.9-10.3l-56.7-19.5c-4.1-1.4-8.6 0.7-10.1 4.8-1.8 5-3.8 10-5.9 14.9-17.3 41-42.1 77.8-73.7 109.4-31.6 31.6-68.4 56.4-109.3 73.8-42.3 17.9-87.4 27-133.8 27-46.5 0-91.5-9.1-133.8-27-40.9-17.3-77.7-42.1-109.3-73.8-31.6-31.6-56.4-68.4-73.7-109.4-17.9-42.4-27-87.4-27-133.9s9.1-91.5 27-133.9c17.3-41 42.1-77.8 73.7-109.4 31.6-31.6 68.4-56.4 109.3-73.8 42.3-17.9 87.4-27 133.8-27 46.5 0 91.5 9.1 133.8 27 40.9 17.3 77.7 42.1 109.3 73.8 9.9 9.9 19.2 20.4 27.8 31.4l-60.2 47c-5.3 4.1-3.5 12.5 3 14.1l175.6 43c5 1.2 9.9-2.6 9.9-7.7l0.8-180.9c-0.1-6.6-7.8-10.3-13-6.2z" p-id="1458"></path></svg>
            点击刷新
          </button>
        </div>
      `;const e=n.querySelector("#refresh-btn");e&&e.addEventListener("click",this.refreshQRCode)}this.stopScanPolling()}showLoadingState(){var t;const n=(t=this.shadowRoot)==null?void 0:t.querySelector("#qr-overlay");n&&(n.style.display="flex",n.innerHTML=`
        <div class="qr-loading">
          <div class="qr-loading-dot"></div>
          <div class="qr-loading-dot"></div>
          <div class="qr-loading-dot"></div>
          <div class="qr-loading-dot"></div>
        </div>
      `)}hideLoadingState(){var t;const n=(t=this.shadowRoot)==null?void 0:t.querySelector("#qr-overlay");n&&(n.style.display="none")}showFailedState(){var t;const n=(t=this.shadowRoot)==null?void 0:t.querySelector("#qr-overlay");if(n){n.style.display="flex",n.innerHTML=`
        <div class="qr-expired">
          <p>二维码获取失败</p>
          <button class="qr-refresh" id="refresh-btn">
            <svg t="1744962273319" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1457" width="32" height="32"><path d="M909.1 209.3l-56.4 44.1C775.8 155.1 656.2 92 521.9 92 290 92 102.3 279.5 102 511.5 101.7 743.7 289.8 932 521.9 932c181.3 0 335.8-115 394.6-276.1 1.5-4.2-0.7-8.9-4.9-10.3l-56.7-19.5c-4.1-1.4-8.6 0.7-10.1 4.8-1.8 5-3.8 10-5.9 14.9-17.3 41-42.1 77.8-73.7 109.4-31.6 31.6-68.4 56.4-109.3 73.8-42.3 17.9-87.4 27-133.8 27-46.5 0-91.5-9.1-133.8-27-40.9-17.3-77.7-42.1-109.3-73.8-31.6-31.6-56.4-68.4-73.7-109.4-17.9-42.4-27-87.4-27-133.9s9.1-91.5 27-133.9c17.3-41 42.1-77.8 73.7-109.4 31.6-31.6 68.4-56.4 109.3-73.8 42.3-17.9 87.4-27 133.8-27 46.5 0 91.5 9.1 133.8 27 40.9 17.3 77.7 42.1 109.3 73.8 9.9 9.9 19.2 20.4 27.8 31.4l-60.2 47c-5.3 4.1-3.5 12.5 3 14.1l175.6 43c5 1.2 9.9-2.6 9.9-7.7l0.8-180.9c-0.1-6.6-7.8-10.3-13-6.2z" p-id="1458"></path></svg>
            点击刷新
          </button>
        </div>
      `;const e=n.querySelector("#refresh-btn");e&&e.addEventListener("click",this.refreshQRCode)}this.stopScanPolling()}refreshQRCode(){this.isGenerating||(this.showLoadingState(),this.clearIntervals(),requestAnimationFrame(()=>{this.initialize()}))}}customElements.define("qr-login",ln);class cn extends HTMLElement{constructor(){super();S(this,"shadowRoot");S(this,"showError",!1);S(this,"errorMessage","");S(this,"activeTabId","");S(this,"isMobile",!1);S(this,"smsLoginComponent",null);S(this,"qrLoginComponent",null);S(this,"tabsComponent",null);this.shadowRoot=this.attachShadow({mode:"open"}),this.detectDeviceType()}detectDeviceType(){this.isMobile=P(),this.activeTabId=this.isMobile?"sms-tab":"qr-tab"}connectedCallback(){this.render(),this.getComponentReferences(),this.bindEvents(),setTimeout(()=>{this.showLoginPanel(this.activeTabId)},0)}disconnectedCallback(){this.removeEventListeners()}getComponentReferences(){this.shadowRoot&&(this.smsLoginComponent=this.shadowRoot.querySelector("sms-login"),this.qrLoginComponent=this.shadowRoot.querySelector("qr-login"),this.tabsComponent=this.shadowRoot.querySelector("login-tabs"))}bindEvents(){if(!this.shadowRoot)return;const n=this.shadowRoot.querySelector("login-tabs");n==null||n.addEventListener("tab-change",this.handleTabChange.bind(this));const t=this.shadowRoot.querySelector("sms-login");t==null||t.addEventListener("login",this.handleSmsLogin.bind(this)),t==null||t.addEventListener("sendCode",this.handleSendCode.bind(this));const e=this.shadowRoot.querySelector("qr-login");e==null||e.addEventListener("login",this.handleQrLogin.bind(this))}removeEventListeners(){const n=this.tabsComponent,t=this.smsLoginComponent,e=this.qrLoginComponent;n==null||n.removeEventListener("tab-change",this.handleTabChange.bind(this)),t==null||t.removeEventListener("login",this.handleSmsLogin.bind(this)),t==null||t.removeEventListener("sendCode",this.handleSendCode.bind(this)),e==null||e.removeEventListener("login",this.handleQrLogin.bind(this))}handleTabChange(n){const t=n,{tabId:e}=t.detail;this.activeTabId=e,this.showLoginPanel(e),this.smsLoginComponent&&this.smsLoginComponent.reset()}handleSmsLogin(n){const t=n,{phone:e,code:o}=t.detail;rn({phone:e,code:o}).then(s=>{if(s.codeCerifyMsg){console.log("sms登录成功",s),this.smsLoginComponent.showError(s.codeCerifyMsg,"code");return}if(s.phoneCerifyMsg){this.smsLoginComponent.showError(s.phoneCerifyMsg,"phone");return}s.token&&s.sessionId&&this.dispatchLoginSuccess({token:s.token,sessionId:s.sessionId},"sms")}).catch(s=>{console.error("sms登录失败",s)})}handleSendCode(n){const t=n,{phone:e}=t.detail,o=s=>{on(s).then(a=>{var l;if(a.risk)zt(c=>{o($({phone:e},c))});else{if(a.phoneCerifyMsg){this.smsLoginComponent.showError(a.phoneCerifyMsg,"phone");return}const c=(l=this.shadowRoot)==null?void 0:l.querySelector("sms-login");c&&c.startCountdown&&c.startCountdown()}}).catch(a=>{})};o({phone:e})}handleQrLogin(n){const t=n,{token:e,sessionId:o}=t.detail;this.dispatchLoginSuccess({token:e,sessionId:o},"qrcode")}showLoginPanel(n){if(!this.shadowRoot)return;const t=this.shadowRoot.querySelector("sms-login"),e=this.shadowRoot.querySelector("qr-login");!t||!e||(n==="sms-tab"?(t.style.display="block",e.style.display="none",e.removeAttribute("active")):n==="qr-tab"&&(t.style.display="none",e.style.display="block",e.setAttribute("active","")))}dispatchLoginSuccess(n,t){n.token&&localStorage.setItem(V.TOKEN,n.token),n.sessionId&&localStorage.setItem(V.SESSION_ID,n.sessionId);const e=W();e!=null&&e.onLoginSuccess&&e.onLoginSuccess(n);const o=new CustomEvent("login-success",{detail:{token:n.token,sessionId:n.sessionId,method:t},bubbles:!0,composed:!0});this.dispatchEvent(o)}render(){let n;this.isMobile?n=[{id:"sms-tab",title:"小闪手机号登录",active:!0},{id:"qr-tab",title:"小闪扫码登录"}]:n=[{id:"qr-tab",title:"小闪扫码登录",active:!0},{id:"sms-tab",title:"小闪手机号登录"}];let t=`
      :host {
        display: block;
        color: #333;
        box-shadow: 0 2px 30px rgba(191, 194, 255, 0.3);
        border-radius: 20px;
        padding: 60px 60px 0;
        background-color: #fff;
        height: 630px;
        max-width: 500px;
        -webkit-tap-highlight-color: transparent;
        box-sizing: border-box;
      }
      
      .title {
        font-size: 24px;
        font-weight: 500;
        text-align: left;
        color: #333;
        margin: 0;
        margin-bottom: 50px;
      }
      
      .login-content {
        margin-top: 20px;
      }
      
      .browser-tip {
        font-size: 14px;
        color: #999;
        text-align: center;
        margin-top: 30px;
      }
    `;this.isMobile&&(t+=`
        :host {
          width: calc(100vw - 52px);
          height: 450px;
          padding: 36px 38px 0;
          margin: 0 auto;
        }

        .title {
          font-size: 18px;
          margin-bottom: 25px;
        }
      `);const e=`
      <style>${t}</style>
      <div class="container">
        <h2 class="title">欢迎    登录</h2>
        
        <login-tabs tabs='${JSON.stringify(n)}'></login-tabs>
        
        <div class="login-content">
          <sms-login></sms-login>
          <qr-login></qr-login>
        </div>
              
      </div>
    `;this.shadowRoot&&(this.shadowRoot.innerHTML=e)}}customElements.define("login-form",cn);const V={TOKEN:"__YK_LOGIN_TOKEN__",SESSION_ID:"__YK_LOGIN_SESSION_ID__"};let st=null,at=!1;function dn(r){window.__LoginSDKConfig=r,un()}function un(){const r=W();hn(),r.immediateHeartbeat&&Ce(),st=window.setInterval(()=>{Ce()},r.heartbeatInterval||3e4)}function Ce(){const r=localStorage.getItem(V.TOKEN),i=localStorage.getItem(V.SESSION_ID),n=W();if(!i||!r){at&&(L.error("系统已自动登出，请重新登录"),at=!1,n!=null&&n.onLoginExpired?n.onLoginExpired():window.location.reload());return}at=!0,sn({sessionId:i}).then(t=>{if(!t.activity)localStorage.removeItem(V.TOKEN),localStorage.removeItem(V.SESSION_ID),t.sessionReason==="DAY_LOGOUT"?L.error("为了保障数据安全，系统每天4点自动登出，请重新登录"):L.error("系统已自动登出，请重新登录"),n!=null&&n.onLoginExpired?n.onLoginExpired():window.location.reload();else if(t.sessionReason==="RESOURCE_CHANGES"){if(n!=null&&n.onResourceChanged){n.onResourceChanged();return}window.location.reload()}}).catch(t=>{console.error("Heartbeat check failed:",t)})}function hn(){st!==null&&(clearInterval(st),st=null)}function gn(){const r=localStorage.getItem(V.SESSION_ID);localStorage.removeItem(V.TOKEN),localStorage.removeItem(V.SESSION_ID),at=!1,r&&an({sessionId:r})}function fn(r){let i;if(typeof r=="string"?i=document.querySelector(r):i=r,!i){console.error(`容器元素未找到: ${r}`);return}const n=i.querySelector("login-form");n&&n.remove();const t=document.querySelector('link[href*="/js/captcha"]'),e=document.querySelector('script[src*="/js/captcha"]');t&&t.remove(),e&&e.remove();const o=document.createElement("login-form");i.appendChild(o);const s=document.createElement("link");s.href="/js/captcha/index.css",s.rel="stylesheet",document.head.appendChild(s);const a=document.createElement("script");a.src="/js/captcha/index.js",document.body.appendChild(a)}function pn(){var n;const r=document.querySelector("login-form");if(!r)return;const i=(n=r.shadowRoot)==null?void 0:n.querySelector("qr-login");i&&i.hasAttribute("active")&&i.refreshQRCode()}return k.STORAGE_KEYS=V,k.init=dn,k.logout=gn,k.mount=fn,k.refreshQRCode=pn,Object.defineProperty(k,Symbol.toStringTag,{value:"Module"}),k}({});

window.YKLogin = YKLogin
