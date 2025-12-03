# Tarkov Tracker by Yama

A modern, cloud-synchronized companion web application for **Escape from Tarkov**. 

This application helps players track items needed for Quests and Hideout upgrades, check live prices, visualize quest progression chains, and **sync progress in real-time with a squad**.

## 🚀 Features

### 1. Multiplayer Squad Sync (Real-time)
* **Squad System:** Create private rooms or join the "General Lobby".
* **Live Updates:** See your friends' hideout levels and quest progress instantly.
* **Smart Alerts:** When searching for an item (e.g., "Salewa"), the app alerts you if a squadmate needs it.
* **Auth:** Supports Google and Email/Password login via Firebase.

### 2. Item Tracker
* **Quest & Hideout Tracking:** Calculates exactly how many items you still need based on your current progress.
* **Dynamic filtering:** Automatically hides items for completed quests or built hideout stations.
* **FIR Indicators:** Clearly marks items that must be "Found In Raid".

### 3. Smart Price Checker
* **Live Data:** Fetches real-time prices from the `tarkov.dev` API.
* **Profit Calculator:** Automatically compares Trader vs. Flea Market prices to recommend the best sell option.
* **Detailed Breakdown:** Shows exactly *which* quest or module requires the item.

### 4. Interactive Quest Graph
* **Visual Flowchart:** Uses `React Flow` to visualize quest chains and prerequisites.
* **Management:** Click nodes to toggle completion status (syncs with the Tracker automatically).
* **Ghost Nodes:** Shows requirements from other traders to visualize cross-trader dependencies.

---

## 🛠️ Tech Stack

* **Frontend:** React + Vite
* **Styling:** Custom CSS (Dark Mode)
* **State Management:** Custom Firebase Hooks (`useFirebaseSync`)
* **Database & Auth:** Firebase (Firestore & Authentication)
* **API:** [tarkov.dev](https://tarkov.dev/) GraphQL API
* **Visualization:** React Flow + Dagre
* **Hosting:** Cloudflare Pages

---

## ⚙️ Installation & Local Development

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Yamatino/TarkovTracker.git](https://github.com/Yamatino/TarkovTracker.git)
    cd TarkovTracker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Firebase:**
    * Create a project at [firebase.google.com](https://console.firebase.google.com/).
    * Enable **Authentication** (Google & Email providers).
    * Enable **Firestore Database**.
    * Create a file `src/firebaseConfig.js` and paste your keys:
    ```javascript
    // src/firebaseConfig.js
    import { initializeApp } from "firebase/app";
    import { getFirestore } from "firebase/firestore";
    import { getAuth, GoogleAuthProvider } from "firebase/auth";

    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT.appspot.com",
      messagingSenderId: "...",
      appId: "..."
    };

    const app = initializeApp(firebaseConfig);
    export const db = getFirestore(app);
    export const auth = getAuth(app);
    export const googleProvider = new GoogleAuthProvider();
    ```

4.  **Run the app:**
    ```bash
    npm run dev
    ```

---

## ☁️ Deployment (Cloudflare Pages)

This project is optimized for **Cloudflare Pages**.

1.  Push your code to GitHub.
2.  Log in to the Cloudflare Dashboard > **Workers & Pages**.
3.  **Connect to Git** and select this repository.
4.  **Build Settings:**
    * **Framework:** Vite
    * **Build command:** `npm run build`
    * **Output directory:** `dist`
    * **Root directory:** `tarkovtracker` (if your files are in a subfolder)
5.  **Deploy.**

**Note:** Don't forget to add your Cloudflare domain (e.g., `https://tarkovtracker.pages.dev`) to the **Authorized Domains** list in your Firebase Console (Authentication > Settings).

---

## 📝 License

This project utilizes data provided by [tarkov.dev](https://tarkov.dev/). Game content and assets are trademarks of Battlestate Games.
