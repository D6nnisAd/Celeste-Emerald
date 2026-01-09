import { auth, db, doc, getDoc, setDoc, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, query, orderBy, limit, getDocs, where, getCountFromServer, setPersistence, browserLocalPersistence } from "./firebase-init.js";

const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const settingsForm = document.getElementById('settingsForm');
const logoutBtn = document.getElementById('logoutBtn');
const saveLoader = document.getElementById('saveLoader');
const saveStatus = document.getElementById('saveStatus');

// Nav Elements
const navSettings = document.getElementById('nav-settings');
const navAnalytics = document.getElementById('nav-analytics');
const viewSettings = document.getElementById('view-settings');
const viewAnalytics = document.getElementById('view-analytics');
const pageTitle = document.getElementById('pageTitle');

// 1. Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log("Admin Logged In:", user.email);
        loginOverlay.style.display = 'none';
        loadSettings();
        startAnalyticsLoop();
    } else {
        // User is signed out
        console.log("Admin Logged Out");
        loginOverlay.style.display = 'flex';
        stopAnalyticsLoop();
    }
});

// 2. Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const btn = loginForm.querySelector('button');

    try {
        btn.innerText = "Verifying...";
        btn.disabled = true;

        // Force local persistence (Keep user logged in)
        await setPersistence(auth, browserLocalPersistence);
        
        // Attempt sign in
        await signInWithEmailAndPassword(auth, email, password);
        
        // Note: We don't need to manually hide overlay here because 
        // onAuthStateChanged will trigger immediately after success.
        
    } catch (error) {
        alert("Login Failed: " + error.message);
        btn.innerText = "Login";
        btn.disabled = false;
        console.error("Auth Error:", error);
    }
});

// 3. Handle Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// 4. Navigation Logic
navSettings.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('settings');
});

navAnalytics.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('analytics');
});

function switchTab(tab) {
    if (tab === 'settings') {
        navSettings.classList.add('active');
        navAnalytics.classList.remove('active');
        viewSettings.classList.remove('d-none');
        viewAnalytics.classList.add('d-none');
        pageTitle.innerText = "Global Settings";
    } else {
        navSettings.classList.remove('active');
        navAnalytics.classList.add('active');
        viewSettings.classList.add('d-none');
        viewAnalytics.classList.remove('d-none');
        pageTitle.innerText = "Traffic Analytics";
        fetchAnalytics(); // Fetch immediately on switch
    }
}

// 5. Load Settings
async function loadSettings() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('enablePaystack').checked = data.enablePaystack || false;
            document.getElementById('supportLink').value = data.supportLink || '';
            document.getElementById('bankName').value = data.bankName || '';
            document.getElementById('accountNumber').value = data.accountNumber || '';
            document.getElementById('accountName').value = data.accountName || '';
        }
    } catch (error) {
        console.error("Error loading settings:", error);
    }
}

// 6. Save Settings
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
        saveStatus.style.opacity = '1';
        setTimeout(() => {
            saveStatus.style.opacity = '0';
        }, 3000);
    } catch (error) {
        alert("Error saving: " + error.message);
    } finally {
        saveLoader.style.display = 'none';
    }
});

// ----------------------------------------------------
// ANALYTICS LOGIC
// ----------------------------------------------------
let analyticsInterval;

function startAnalyticsLoop() {
    // Fetch immediately
    fetchAnalytics();
    // Set interval to 10 seconds for real-time updates
    analyticsInterval = setInterval(() => {
        if (viewAnalytics.classList.contains('d-none')) return;
        fetchAnalytics();
    }, 10000);
}

function stopAnalyticsLoop() {
    clearInterval(analyticsInterval);
}

async function fetchAnalytics() {
    const tableBody = document.getElementById('analytics-table-body');
    const updateLabel = document.getElementById('last-updated');
    const coll = collection(db, "analytics_logs");
    
    updateLabel.innerText = "Counting...";

    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // --- PARALLEL SERVER-SIDE COUNTING (FAST & SCALABLE) ---
        // using getCountFromServer() allows us to count 1M+ docs without downloading them.
        
        // 1. Total Hits (All Time)
        const pTotal = getCountFromServer(coll);
        
        // 2. New Visitors (All Time - Unique Devices)
        const qNewUsers = query(coll, where("status", "==", "New"));
        const pNewUsers = getCountFromServer(qNewUsers);

        // 3. Hits Today
        const qToday = query(coll, where("timestamp", ">=", startOfDay));
        const pHitsToday = getCountFromServer(qToday);

        // 4. Register Starts (All Time - or you can add timestamp filter for today)
        const qRegister = query(coll, where("page_type", "==", "Register"));
        const pRegister = getCountFromServer(qRegister);

        // 5. Checkout Initiated (All Time)
        const qCheckout = query(coll, where("page_type", "==", "Checkout"));
        const pCheckout = getCountFromServer(qCheckout);

        // Execute all counts in parallel
        const [snapTotal, snapNewUsers, snapToday, snapRegister, snapCheckout] = await Promise.all([
            pTotal, pNewUsers, pHitsToday, pRegister, pCheckout
        ]);

        // Update UI
        document.getElementById('stat-total').innerText = snapTotal.data().count.toLocaleString();
        document.getElementById('stat-new-users').innerText = snapNewUsers.data().count.toLocaleString();
        document.getElementById('stat-today').innerText = snapToday.data().count.toLocaleString();
        document.getElementById('stat-register').innerText = snapRegister.data().count.toLocaleString();
        document.getElementById('stat-checkout').innerText = snapCheckout.data().count.toLocaleString();

        // --- RECENT LOGS TABLE (Last 50) ---
        const qTable = query(coll, orderBy("timestamp", "desc"), limit(50));
        const querySnapshot = await getDocs(qTable);
        
        tableBody.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const log = doc.data();
            const dateObj = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
            const timeStr = dateObj.toLocaleTimeString();
            const dateStr = dateObj.toLocaleDateString();
            
            const badgeClass = log.status === 'New' ? 'badge-status-new' : 'badge-status-returning';
            
            const row = `
                <tr>
                    <td>
                        <div class="fw-bold text-white">${timeStr}</div>
                        <div class="small text-white-50">${dateStr}</div>
                    </td>
                    <td>${log.page_type ? log.page_type : cleanPageName(log.page_name)}</td>
                    <td><span class="badge ${badgeClass} rounded-pill">${log.status}</span></td>
                    <td class="text-white-50 small" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.referrer}</td>
                    <td class="small font-monospace text-white-50">${log.visitor_id.substring(0, 8)}...</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        updateLabel.innerText = "Live";

    } catch (error) {
        console.error("Analytics Error:", error);
        updateLabel.innerText = "Error";
        
        // Specific error handling for missing indexes (common with compound queries)
        if (error.message.includes("requires an index")) {
            console.log("Creating index link: ", error.message);
        }
    }
}

function cleanPageName(title) {
    if (!title) return 'Unknown';
    if (title.includes('Create Account')) return 'Register';
    if (title.includes('Packages')) return 'Checkout';
    if (title.includes('Celeste')) return 'Home';
    return title;
}