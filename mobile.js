/* Responsive helpers only; all battle state remains owned by battle.html. */
(() => {
    'use strict';
    const compact = window.matchMedia('(max-width: 1100px) and (max-height: 700px), (pointer: coarse) and (orientation: landscape) and (max-height: 900px)');
    const dialog = document.createElement('dialog');
    dialog.className = 'mobile-dialog';
    dialog.setAttribute('aria-labelledby', 'mobileDialogTitle');
    dialog.innerHTML = '<div class="mobile-dialog-header"><h2 id="mobileDialogTitle"></h2><button class="mobile-dialog-close" type="button">关闭</button></div><div class="mobile-dialog-body"></div><nav class="mobile-dialog-pages" aria-label="说明翻页"><button type="button" data-step="-1">上一页</button><span aria-live="polite"></span><button type="button" data-step="1">下一页</button></nav>';
    document.body.append(dialog);
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    let pages = [], pageIndex = 0;
    const panelBody = dialog.querySelector('.mobile-dialog-body');
    const pager = dialog.querySelector('.mobile-dialog-pages');
    function renderPage() {
        panelBody.replaceChildren(...pages[pageIndex].map(node => node.cloneNode(true)));
        pager.querySelector('span').textContent = `${pageIndex + 1} / ${pages.length}`;
        pager.querySelector('[data-step="-1"]').disabled = pageIndex === 0;
        pager.querySelector('[data-step="1"]').disabled = pageIndex === pages.length - 1;
    }
    pager.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
        pageIndex += Number(button.dataset.step);
        renderPage();
    }));
    window.WuxingMobile = {
        get compact() { return compact.matches; },
        showPanel(title, source) {
            if (!source) return;
            dialog.querySelector('h2').textContent = title;
            const copy = document.createElement('div');
            copy.innerHTML = source.innerHTML;
            copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
            panelBody.replaceChildren();
            pager.hidden = false;
            dialog.showModal();
            pages = [[]]; pageIndex = 0;
            for (const node of [...copy.childNodes].filter(n => n.nodeType === 1 || n.textContent.trim())) {
                panelBody.append(node.cloneNode(true));
                if (panelBody.scrollHeight > panelBody.clientHeight + 1 && pages.at(-1).length) {
                    pages.push([]);
                    panelBody.replaceChildren(node.cloneNode(true));
                }
                pages.at(-1).push(node);
            }
            renderPage();
        }
    };
    compact.addEventListener('change', () => { if (dialog.open) dialog.close(); });

    // Browser chrome changes the usable height even when the device has not rotated.
    let viewportFrame = 0;
    function updateViewport() {
        viewportFrame = 0;
        const viewport = window.visualViewport;
        // Do not undo the user's pinch zoom by reflowing around the zoomed viewport.
        if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
        const height = Math.round(Math.min(window.innerHeight, viewport?.height || window.innerHeight));
        document.documentElement.style.setProperty('--screen-height', height + 'px');
        document.body.classList.toggle('short-landscape', innerWidth > height && height <= 300);
    }
    function scheduleViewport() {
        if (!viewportFrame) viewportFrame = requestAnimationFrame(updateViewport);
    }
    window.addEventListener('resize', scheduleViewport);
    window.visualViewport?.addEventListener('resize', scheduleViewport);
    updateViewport();

    const fullscreenButton = document.createElement('button');
    fullscreenButton.type = 'button';
    fullscreenButton.className = 'fullscreen-btn';
    document.body.append(fullscreenButton);
    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
    const canFullscreen = () => !!(
        (document.documentElement.requestFullscreen && document.fullscreenEnabled !== false) ||
        (document.documentElement.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false)
    );
    let orientationLocked = false;
    function updateFullscreenButton() {
        const active = !!fullscreenElement();
        fullscreenButton.textContent = active ? '退出全屏' : (canFullscreen() ? '全屏' : '全屏说明');
        fullscreenButton.setAttribute('aria-pressed', String(active));
        fullscreenButton.title = active ? '退出全屏（也可按 Esc）' : '隐藏浏览器地址栏';
        if (!active && orientationLocked) {
            screen.orientation?.unlock?.();
            orientationLocked = false;
        }
        scheduleViewport();
    }
    function showFullscreenHelp() {
        const help = document.createElement('div');
        help.innerHTML = '<p>当前浏览器未允许网页全屏。可以从手机主屏幕独立打开游戏，减少浏览器栏占用。</p><p><strong>iPhone / iPad：</strong>用 Safari 打开游戏，点“分享” → “添加到主屏幕”；如有“作为网页 App 打开”，请开启。</p><p><strong>Android：</strong>打开浏览器菜单，选择“安装应用”或“添加到主屏幕”（名称因浏览器而异）。</p><p>添加后，请点主屏幕上的游戏图标进入。切换到独立窗口会开启新的游戏会话。</p>';
        window.WuxingMobile.showPanel('全屏游玩', help);
    }
    fullscreenButton.addEventListener('click', async event => {
        event.stopPropagation();
        try {
            if (fullscreenElement()) {
                const exit = document.exitFullscreen || document.webkitExitFullscreen;
                if (exit) await exit.call(document);
            } else if (canFullscreen()) {
                const root = document.documentElement;
                if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
                else await root.webkitRequestFullscreen();
                // Orientation lock is optional; unsupported browsers still get fullscreen.
                if (matchMedia('(pointer: coarse)').matches && screen.orientation?.lock) {
                    try { await screen.orientation.lock('landscape'); orientationLocked = true; } catch (_) {}
                }
            } else {
                showFullscreenHelp();
            }
        } catch (_) {
            showFullscreenHelp();
        } finally {
            updateFullscreenButton();
        }
    });
    document.addEventListener('fullscreenchange', updateFullscreenButton);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
    updateFullscreenButton();

    // Card collections use explicit pages on phones, so no vertical swipe is needed.
    for (const [panelSelector, gridSelector, size] of [['.deck-panel', '.deck-list', 5], ['.atlas-modal', '.atlas-grid', 4]]) {
        const panel = document.querySelector(panelSelector);
        const grid = panel?.querySelector(gridSelector);
        if (!grid) continue;
        const controls = document.createElement('nav');
        controls.className = 'mobile-collection-pages';
        controls.setAttribute('aria-label', '卡牌翻页');
        controls.innerHTML = '<button type="button" data-step="-1">上一页</button><span aria-live="polite"></span><button type="button" data-step="1">下一页</button>';
        grid.after(controls);
        let index = 0;
        const render = () => {
            const cards = [...grid.children];
            const count = Math.max(1, Math.ceil(cards.length / size));
            index = Math.min(index, count - 1);
            cards.forEach((card, i) => card.classList.toggle('mobile-page-hidden', compact.matches && Math.floor(i / size) !== index));
            controls.querySelector('span').textContent = `${index + 1} / ${count}`;
            controls.querySelector('[data-step="-1"]').disabled = index === 0;
            controls.querySelector('[data-step="1"]').disabled = index === count - 1;
        };
        controls.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { index += Number(button.dataset.step); render(); }));
        new MutationObserver(() => { index = 0; render(); }).observe(grid, {childList: true});
        compact.addEventListener('change', render);
        render();
    }

    document.querySelectorAll('.event-narrative, .event-text').forEach(story => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'mobile-only mobile-story-btn';
        button.textContent = '查看故事';
        button.addEventListener('click', () => window.WuxingMobile.showPanel('星宿故事', story));
        story.after(button);
    });

    const notice = document.createElement('section');
    notice.className = 'rotate-notice';
    notice.setAttribute('aria-label', '横屏提示');
    notice.innerHTML = '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="12" y="24" width="56" height="32" rx="5"/><path d="M60 35v10M22 14a28 28 0 0 1 39 1m-1-9 2 10-10-1M58 66a28 28 0 0 1-39-1m1 9-2-10 10 1"/></svg><h2>横屏，展开星阵</h2><p>将手机横过来，让阵法、手牌和对手同时呈现。</p><button type="button">继续竖屏浏览</button>';
    notice.querySelector('button').addEventListener('click', e => {
        e.stopPropagation();
        document.body.classList.add('orientation-dismissed');
    });
    notice.addEventListener('click', e => e.stopPropagation());
    document.body.append(notice);
    window.matchMedia('(orientation: landscape)').addEventListener('change', e => {
        if (e.matches) document.body.classList.remove('orientation-dismissed');
    });

    // Existing deck toggles and close controls were div/span click targets.
    document.querySelectorAll('.deck-toggle, .deck-close, .choice-btn:not(button)').forEach(el => {
        el.setAttribute('role', 'button');
        el.tabIndex = 0;
        if (el.classList.contains('deck-close')) el.setAttribute('aria-label', '关闭牌库');
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
        });
    });
})();
