import { auth, db, doc, setDoc, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "./firebase-init.js";

/**
 * Monitor Auth State
 * Keeps localStorage in sync for pages that rely on it (like payment.html/packages.html)
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.uid);
    } else {
        // We generally don't clear localStorage immediately on page load 
        // to prevent UI flashing, but for strict security you could:
        // localStorage.removeItem('userEmail');
    }
});

/**
 * Register a new user
 * Creates Auth User -> Saves Details to Firestore -> Updates LocalStorage
 */
export async function registerUser(email, password, fullName, username) {
    try {
        // 1. Create Authentication User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Save User Profile to Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            fullName: fullName,
            username: username,
            email: email,
            createdAt: new Date(),
            package: null, // Will be updated after payment
            paymentStatus: 'pending'
        });

        // 3. Sync LocalStorage immediately for the next page
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userFullName', fullName);
        localStorage.setItem('userUsername', username);

        return user;
    } catch (error) {
        console.error("Registration Error:", error);
        throw error; // Re-throw to be handled by the UI
    }
}

/**
 * Login existing user
 */
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Sync LocalStorage
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.uid);

        return user;
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
}

/**
 * Logout user
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.clear();
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Logout Error:", error);
    }
}
