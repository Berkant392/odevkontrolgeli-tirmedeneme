// src/utils/scrollLock.js

let lockCount = 0;

/**
 * Adds a scroll lock. When the first lock is added, body scroll is disabled.
 */
export const lockScroll = () => {
  lockCount++;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
};

/**
 * Removes a scroll lock. When the last lock is removed, body scroll is re-enabled.
 */
export const unlockScroll = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
};
