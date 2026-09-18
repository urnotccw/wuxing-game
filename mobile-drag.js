/* Pointer-based card dragging; game rules remain in battle.html. */
(() => {
    'use strict';
    const hand = document.getElementById('handArea');
    const grid = document.getElementById('formationGrid');
    const input = window.WuxingBattleInput;
    if (!hand || !grid || !input || !window.PointerEvent) return;

    let gesture = null, frame = 0, suppressClickUntil = 0;
    const compact = () => window.WuxingMobile?.compact;
    const slotIndex = slot => [...grid.children].indexOf(slot);

    function targetAt(x, y) {
        const slot = document.elementFromPoint(x, y)?.closest('.formation-slot');
        return slot && grid.contains(slot) ? slot : null;
    }
    function clearTarget() {
        if (gesture?.target) gesture.target.classList.remove('mobile-drop-target', 'mobile-drop-blocked');
    }
    function paint() {
        frame = 0;
        const g = gesture;
        if (!g?.dragging) return;
        g.ghost.style.transform = `translate3d(${g.x - g.offsetX}px, ${g.y - g.offsetY}px, 0)`;
        const target = targetAt(g.x, g.y);
        if (target !== g.target) {
            clearTarget();
            g.target = target;
            if (target) target.classList.add(input.canDrop(g.index, slotIndex(target)) ? 'mobile-drop-target' : 'mobile-drop-blocked');
        }
    }
    function startDrag() {
        const g = gesture;
        g.dragging = true;
        hand.setPointerCapture(g.pointerId);
        g.ghost = g.source.cloneNode(true);
        g.ghost.removeAttribute('id');
        g.ghost.className = 'mobile-card-ghost';
        g.ghost.draggable = false;
        g.ghost.setAttribute('aria-hidden', 'true');
        g.ghost.style.width = g.rect.width + 'px';
        g.ghost.style.height = g.rect.height + 'px';
        document.body.append(g.ghost);
        g.source.classList.add('mobile-drag-source');
        document.body.classList.add('mobile-card-dragging');
        window.hideCardTooltip?.();
        for (const slot of grid.children) {
            slot.classList.toggle('mobile-drop-available', input.canDrop(g.index, slotIndex(slot)));
        }
    }
    function finish(event, cancel = false) {
        const g = gesture;
        if (!g || (event?.pointerId !== undefined && event.pointerId !== g.pointerId)) return;
        if (event?.clientX !== undefined) { g.x = event.clientX; g.y = event.clientY; }
        cancelAnimationFrame(frame); frame = 0;
        const target = !cancel && g.dragging ? targetAt(g.x, g.y) : null;
        const destination = target ? slotIndex(target) : -1;
        const accepted = destination >= 0 && input.canDrop(g.index, destination);
        clearTarget();
        gesture = null;
        g.source.classList.remove('mobile-drag-source');
        document.body.classList.remove('mobile-card-dragging');
        for (const slot of grid.children) slot.classList.remove('mobile-drop-available');
        if (hand.hasPointerCapture(g.pointerId)) hand.releasePointerCapture(g.pointerId);
        if (!g.dragging) return; // A tap continues through the existing click handler.
        event?.preventDefault?.();
        suppressClickUntil = performance.now() + 400;
        if (accepted) {
            g.ghost.remove();
            input.drop(g.index, destination);
        } else if (cancel || matchMedia('(prefers-reduced-motion: reduce)').matches) {
            g.ghost.remove();
        } else {
            const back = g.ghost.animate([
                { transform: `translate3d(${g.x - g.offsetX}px, ${g.y - g.offsetY}px, 0)`, opacity: 1 },
                { transform: `translate3d(${g.rect.left}px, ${g.rect.top}px, 0)`, opacity: 0 }
            ], { duration: 150, easing: 'cubic-bezier(.16, 1, .3, 1)' });
            back.finished.then(() => g.ghost.remove(), () => g.ghost.remove());
        }
    }
    hand.addEventListener('pointerdown', event => {
        if (!compact() || gesture || event.isPrimary === false || event.button !== 0) return;
        const source = event.target.closest('.hand-card');
        if (!source || source.parentElement !== hand) return;
        const index = [...hand.children].indexOf(source);
        if (!input.canDrag(index)) return;
        const rect = source.getBoundingClientRect();
        gesture = { source, index, pointerId: event.pointerId, rect,
            startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
            offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top + (event.pointerType === 'touch' ? 24 : 0),
            dragging: false, ghost: null, target: null };
        // Capture only after movement; an ordinary tap must still click its original card.
    });
    document.addEventListener('pointermove', event => {
        const g = gesture;
        if (!g || event.pointerId !== g.pointerId) return;
        g.x = event.clientX; g.y = event.clientY;
        if (!g.dragging && Math.hypot(g.x - g.startX, g.y - g.startY) >= 6) startDrag();
        if (!g.dragging) return;
        event.preventDefault();
        if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: false });
    document.addEventListener('pointerup', event => finish(event));
    document.addEventListener('pointercancel', event => finish(event, true));
    hand.addEventListener('lostpointercapture', event => {
        // Touch initially captures the card implicitly. Its bubbling loss when
        // capture moves to the hand is expected, not an interrupted gesture.
        if (event.target === hand) finish(event, true);
    });
    hand.addEventListener('dragstart', event => { if (compact()) event.preventDefault(); });
    hand.addEventListener('contextmenu', event => { if (compact()) event.preventDefault(); });
    document.addEventListener('click', event => {
        if (event.detail && performance.now() < suppressClickUntil &&
            (hand.contains(event.target) || grid.contains(event.target))) {
            event.preventDefault(); event.stopImmediatePropagation();
            suppressClickUntil = 0;
        }
    }, true);
    window.addEventListener('resize', () => finish(null, true));
    window.addEventListener('pagehide', () => finish(null, true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) finish(null, true); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') finish(null, true); });
})();
