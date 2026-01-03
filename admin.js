import { auth, db, doc, getDoc, setDoc, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "./firebase-init.js";

const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const settingsForm = document.getElementById('settingsForm');
const logoutBtn = document.getElementById('logoutBtn');
const saveLoader = document.getElementById('saveLoader');
const saveStatus = document.getElementById('saveStatus');

// 1. Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        loginOverlay.style.display = 'none';
        loadSettings();
    } else {
        // User is signed out
        loginOverlay.style.display = 'flex';
    }
});

// 2. Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("Login Failed: " + error.message);
    }
});

// 3. Handle Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// 4. Load Settings from Firestore
async function loadSettings() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Populate Fields
            document.getElementById('enablePaystack').checked = data.enablePaystack || false;
            document.getElementById('supportLink').value = data.supportLink || '';
            document.getElementById('bankName').value = data.bankName || '';
            document.getElementById('accountNumber').value = data.accountNumber || '';
            document.getElementById('accountName').value = data.accountName || '';
        } else {
            console.log("No settings document found. Creating one on save.");
        }
    } catch (error) {
        console.error("Error loading settings:", error);
        alert("Error loading settings. Check console.");
    }
}

// 5. Save Settings to Firestore
settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveLoader.style.display = 'block';

    const settingsData = {
        enablePaystack: document.getElementById('enablePaystack').checked,
        supportLink: document.getElementById('supportLink').value,
        bankName: document.getElementById('bankName').value,
        accountNumber: document.getElementById('accountNumber').value,
        accountName: document.getElementById('accountName').value,
        lastUpdated: new Date()
    };

    try {
        await setDoc(doc(db, "settings", "global"), settingsData);
        
        // Show Success Feedback
        saveStatus.style.opacity = '1';
        setTimeout(() => {
            saveStatus.style.opacity = '0';
        }, 3000);

    } catch (error) {
        console.error("Error saving settings:", error);
        alert("Error saving settings: " + error.message);
    } finally {
        saveLoader.style.display = 'none';
    }
});