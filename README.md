# BrandGuard AR

BrandGuard AR is an AI-powered, mobile-ready web application for thebrand.ai that transforms any smartphone into a real-time brand compliance scanner. Utilizing Augmented Reality (AR) visualization concepts and the Google Gemini Vision API, it provides instant, actionable audits for physical brand assets.

When finalized and integrated natively into Android via Flutter, the application will leverage Google ML Kit for on-device analysis.

## Live Demo
Check out the live application hosted on Vercel: **[https://brand-gaurd-ar.vercel.app/](https://brand-gaurd-ar.vercel.app/)**

## How to Use the Web App

The application serves as an active brand guardian, allowing you to easily ensure that franchisees are correctly applying your brand guidelines across menus, signs, and packaging.

1. **Launch the App:** Open the application in your web browser. If you are using a mobile device for a live scan, ensure the site is hosted on a secure `https://` connection to allow camera access.
2. **Configure the AI:**
   - To utilize the real-time AI analysis, you will need a free Google Gemini Vision API Key.
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Sign in with a Google account.
   - Click "Create API key" and generate a new key.
   - In the BrandGuard AR web application, click the "API Settings" button (gear icon in the top right).
   - Paste your generated key and save.
   - *Note: If no key is provided, the app will run in a fallback Demonstration Mode using mocked data.*
3. **Configure Brand Rules:**
   - Navigate to the "Brand Rules" tab in the sidebar.
   - Select an existing preset (e.g., Safaricom, Coca-Cola) or click "New Brand" to define custom guidelines.
   - Specify required colors (hex values), prohibited colors, typography, logo descriptions, and textual compliance rules.
4. **Initiate a Scan:**
   - Go to the "Brand Scanner" tab.
   - Click "Start Scan" to open your device camera, or use the "Upload" button to analyze an existing image from your gallery.
   - Point the camera at a physical asset, such as a franchisee's store menu or billboard.
   - Click the "Capture & Analyze" shutter button.
5. **Review AR Visualization:**
   - The AI engine will analyze the image against the active brand rules.
   - The application will momentarily project a visual AR overlay onto the captured image:
     - A green halo for passing elements.
     - A yellow flag for minor warnings.
     - A red highlight for unapproved usage (e.g., off-brand colors or competitor elements).
6. **Analyze the Compliance Report:**
   - The app will automatically redirect you to the "Compliance Report" tab.
   - Here you will see an Overall Match Score, a breakdown of extracted dominant colors, and specific suggestions on how to fix failing elements.
   - You can download this report or navigate to the "Audit History" tab to view past scans pinned to a geographic map.

## Setup & Deployment Instructions

### Local Development

Because the application requires access to the device camera, it must be run within a secure context.

1. Navigate to the project root directory in your terminal.
2. Start a local web server:
   - Using Python: `python3 -m http.server 8000`
   - Using Node: `npx serve .`
3. Open your browser and go to `http://localhost:8000` (or `http://127.0.0.1:8000`).

### Live Server Deployment

To host this for others to use on a live server:

1. **Web Hosting**: Upload all files (including `index.html`, the `css` folder, and the `js` folder) to any standard web hosting provider (such as Vercel, Netlify, GitHub Pages, or a traditional cPanel host).
2. **SSL Certificate**: Ensure your live server provides an SSL certificate. The site must be accessed via `https://` for modern mobile browsers to allow camera access.
3. **Usage**: Once hosted, users simply navigate to your live URL on their mobile devices. They will be prompted by their browser to allow camera permissions upon starting a scan.

## Project Structure

- `index.html`: The main web application interface.
- `css/style.css`: All application styling and UI rules.
- `js/app.js`: Main application logic, navigation, and event handling.
- `js/scanner.js`: Handles camera access, image capture, color extraction, and drawing AR overlays.
- `js/ai-engine.js`: Connects to the Google Gemini Vision API to analyze captured images against brand rules.
- `js/brands.js`: Manages built-in presets and user-created custom brand configurations.
- `js/report.js`: Generates detailed post-scan compliance reports.
- `js/scan-history.js`: Manages local storage for audit histories, timestamps, and thumbnail generation.
