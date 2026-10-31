/**
 * Makes the horizontal rail usable with a mouse, a trackpad, touch and
 * the keyboard, without hijacking vertical page scroll.
 */
export function initRails() {
  document.querySelectorAll("[data-rail]").forEach((rail) => {
    let pointerId = null;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onPointerDown = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScroll = rail.scrollLeft;
      moved = false;
      rail.setPointerCapture?.(pointerId);
    };

    const onPointerMove = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const distance = event.clientX - startX;
      if (!moved && Math.abs(distance) > 5) {
        moved = true;
        rail.classList.add("is-dragging");
      }
      if (!moved) return;
      rail.scrollLeft = startScroll - distance;
    };

    const end = (event) => {
      if (pointerId === null || (event && event.pointerId !== pointerId)) return;
      if (rail.hasPointerCapture?.(pointerId)) rail.releasePointerCapture(pointerId);
      pointerId = null;
      rail.classList.remove("is-dragging");
      // Let the click settle before re-enabling child targets.
      if (moved) {
        rail.addEventListener(
          "click",
          (clickEvent) => {
            clickEvent.preventDefault();
            clickEvent.stopPropagation();
          },
          { capture: true, once: true },
        );
      }
    };

    rail.addEventListener("pointerdown", onPointerDown);
    rail.addEventListener("pointermove", onPointerMove);
    rail.addEventListener("pointerup", end);
    rail.addEventListener("pointercancel", end);
    rail.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") end(event);
    });

    rail.addEventListener("keydown", (event) => {
      const amount = Math.min(rail.clientWidth * 0.72, 520);
      if (event.key === "ArrowRight") {
        event.preventDefault();
        rail.scrollBy({ left: amount, behavior: "smooth" });
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        rail.scrollBy({ left: -amount, behavior: "smooth" });
      } else if (event.key === "Home") {
        event.preventDefault();
        rail.scrollTo({ left: 0, behavior: "smooth" });
      } else if (event.key === "End") {
        event.preventDefault();
        rail.scrollTo({ left: rail.scrollWidth, behavior: "smooth" });
      }
    });
  });
}
