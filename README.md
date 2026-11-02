# RANVEER THE SUBJECT EATER

*One boy. Too many books. Zero homework.*

A 2D side-scrolling jetpack shooter in a single file: `index.html`. It uses HTML5 Canvas, vanilla JS and Web Audio, and needs no internet once saved.

**Play:** open `index.html` in any modern browser (Chrome on Android works; landscape is best).

- 5 levels, each with enemy waves followed by a Science Book Monster and then a Maths Book Monster (10 boss fights)
- 6 textbook enemy types plus AI drones, each with its own attacks
- 3 weapons: Student Blaster, Musical Blaster (unlocked after Level 1), Paint Stroke Cannon (unlocked after Level 3)
- An upgrade after every boss, power-ups, a local high score and Continue
- The death video is embedded in the HTML and plays when Ranveer dies

Controls: A/D or ←/→ to move · Space to jump · W/↑ for the jetpack · J or mouse to shoot · K or 1/2/3 to switch weapons · Esc to pause · M to mute. On-screen buttons on touch devices.

## My AI Twin (`ai.html`)

A separate chatbot that copies your personality. It runs on Google Gemini.

1. Open `ai.html` in a browser.
2. Fill in **About me**: how you talk, what you like, catchphrases, and a few real messages you've sent. Real messages help the most.
3. In **Settings**, paste a Google AI Studio API key (free from https://aistudio.google.com/apikey). Press **Load models** to check it works, then choose a model.
4. Chat with your AI twin.

The key, your personality and the chat are saved only in that browser's local storage. Never put your API key in the code or commit it to GitHub.
