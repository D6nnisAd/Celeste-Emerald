import { db, addDoc, collection } from "./firebase-init.js";

async function initTracker() {
    try {
        const currentUrl = window.location.href;
        const pathName = window.location.pathname;

        // --- 1. DUPLICATE VISIT CHECK ---
        // We use sessionStorage (clears when tab closes). 
        // If user refreshes or goes back to this page in same session, we do NOT count it.
        const storageKey = `celeste_tracked_${pathName}`;
        if (sessionStorage.getItem(storageKey)) {
            console.log("Page already visited in this session. Skipping log.");
            return; 
        }

        // --- 2. IDENTIFY PAGE TYPE (For faster Admin Counting) ---
        let pageType = 'Other';
        if (pathName.includes('register.html')) pageType = 'Register';
        else if (pathName.includes('packages.html') || pathName.includes('payment.html')) pageType = 'Checkout';
        else if (pathName.includes('index.html') || pathName === '/') pageType = 'Home';

        // --- 3. IDENTIFY VISITOR ---
        let visitorId = localStorage.getItem('celeste_visitor_id');
        let isReturning = false;

        if (!visitorId) {
            // Generate a random ID for new users
            visitorId = 'vis_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            localStorage.setItem('celeste_visitor_id', visitorId);
        } else {
            isReturning = true;
        }

        const referrer = document.referrer || 'Direct/None';
        const userAgent = navigator.userAgent;
        const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(userAgent);

        // --- 4. PREPARE PAYLOAD ---
        const logData = {
            page_name: document.title,
            page_type: pageType, // New field for efficient counting
            url: currentUrl,
            timestamp: new Date(),
            referrer: referrer,
            visitor_id: visitorId,
            status: isReturning ? 'Returning' : 'New',
            user_agent: userAgent,
            is_bot: isBot,
            screen_width: window.innerWidth
        };

        // --- 5. SEND TO FIRESTORE ---
        const logsRef = collection(db, "analytics_logs");
        await addDoc(logsRef, logData);
        
        // Mark as tracked for this session so we don't count it again
        sessionStorage.setItem(storageKey, 'true');
        
        console.log("Tracking event logged for:", visitorId);

    } catch (error) {
        console.warn("Tracker failed silently:", error);
    }
}

// Run immediately
initTracker();