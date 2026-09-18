/* Budget decorative work independently of combat timers and input handling. */
(() => {
    'use strict';
    const mobile = matchMedia('(pointer: coarse), (max-width: 1100px) and (max-height: 700px)').matches;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const light = mobile || reducedMotion;
    document.documentElement.classList.toggle('light-effects', light);
    window.WuxingPerformance = {
        light,
        dpr: Math.min(window.devicePixelRatio || 1, light ? 1.5 : 2),
        particles: (full, compact) => reducedMotion ? Math.min(compact, 300) : mobile ? compact : full,
        // Decorative canvases run at 30 fps on phones; gameplay remains unthrottled.
        animate(draw) {
            const interval = 1000 / (reducedMotion ? 15 : mobile ? 30 : 60);
            let frame = 0, last = null, drawn = null;
            const tick = time => {
                frame = 0;
                if (document.hidden) return;
                if (last === null || time - last >= interval - 0.5) {
                    const delta = drawn === null ? 1 : Math.min(3, (time - drawn) / (1000 / 60));
                    last = last === null ? time : last + Math.max(1, Math.floor((time - last + 0.5) / interval)) * interval;
                    drawn = time;
                    draw(time, delta);
                }
                frame = requestAnimationFrame(tick);
            };
            const stop = () => { cancelAnimationFrame(frame); frame = 0; last = drawn = null; };
            const start = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); };
            document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
            window.addEventListener('pagehide', stop);
            window.addEventListener('pageshow', start);
            start();
        }
    };
})();
