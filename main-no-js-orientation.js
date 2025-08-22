// Copy of main.js with orientation detection disabled
// This will help us test if the JavaScript is causing the blank screen issue

// -------- Orientation Lock System --------
function initOrientationLock() {
    console.log('Orientation lock disabled for testing');
    // Disabled for testing - let CSS handle orientation detection
}

window.addEventListener('DOMContentLoaded', ()=>{
  showGame(false);
  mainMenu.style.display='flex';
  initAudioToggle();
  initMobileAudio();
  initBackgroundAudioControl();
  initOrientationLock(); // This now does nothing
});
