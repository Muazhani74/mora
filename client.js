import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    limit
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDM4qK_Bo8U9ADoBgzA4Ubu5STHrXecl7s",
    authDomain: "omarrbaber.firebaseapp.com",
    projectId: "omarrbaber",
    storageBucket: "omarrbaber.firebasestorage.app",
    messagingSenderId: "830448258818",
    appId: "1:830448258818:web:b39528998e456d75617c1b",
    measurementId: "G-F697YYHPJ9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Elements
const bookingForm = document.getElementById("bookingForm");
const message = document.getElementById("message");
const currentCustomer = document.getElementById("currentCustomer");
const queueList = document.getElementById("queueList");
const myTicket = document.getElementById("myTicket");
const myTicketNumber = document.getElementById("myTicketNumber");
const myTicketStatus = document.getElementById("myTicketStatus");

// How many upcoming names to show in the public list
const VISIBLE_QUEUE_NAMES = 3;
const STORAGE_KEY = "mora_booking_id";

// Show Message
function showMessage(text, isSuccess = true) {
    message.textContent = text;
    message.style.color = isSuccess ? '#c6f6d5' : '#fed7d7';
    setTimeout(() => {
        message.textContent = '';
        message.style.color = '';
    }, 6000);
}

// Book Appointment
bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const service = document.getElementById("service").value;

    if (!name || !phone || !service) {
        showMessage('⚠️ يرجى تعبئة جميع الحقول', false);
        return;
    }

    try {
        const docRef = await addDoc(collection(db, "queue"), {
            name,
            phone,
            service,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
        });
        // Remember this booking on this device so we can show a live ticket number
        localStorage.setItem(STORAGE_KEY, docRef.id);
        sawMyBookingThisSession = false;
        showMessage('✅ تم حجز موعدك بنجاح! تابع رقمك في قائمة الانتظار تحت.', true);
        bookingForm.reset();
        document.getElementById('queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error("Booking Error:", error);
        showMessage('❌ حدث خطأ، حاول مرة أخرى.', false);
    }
});

// ===== My Ticket (personal queue position) =====
let sawMyBookingThisSession = false;

function updateMyTicket(allCustomers) {
    if (!myTicket) return;
    const myId = localStorage.getItem(STORAGE_KEY);

    if (!myId) {
        myTicket.style.display = "none";
        return;
    }

    const idx = allCustomers.findIndex(c => c.id === myId);

    if (idx === -1) {
        // Booking no longer in the queue: either already served, or an old id from before
        if (sawMyBookingThisSession) {
            myTicket.style.display = "flex";
            myTicketNumber.textContent = "✅";
            myTicketStatus.textContent = "تم الانتهاء من دورك، مبروك الإطلالة الجديدة!";
            setTimeout(() => {
                myTicket.style.display = "none";
            }, 8000);
        } else {
            myTicket.style.display = "none";
        }
        localStorage.removeItem(STORAGE_KEY);
        return;
    }

    sawMyBookingThisSession = true;
    myTicket.style.display = "flex";
    myTicketNumber.textContent = `#${idx + 1}`;

    if (idx === 0) {
        myTicketStatus.textContent = "دورك دلوقتي! 🎉";
    } else {
        myTicketStatus.textContent = `متبقي قبلك ${idx} ${idx === 1 ? 'شخص' : 'أشخاص'}`;
    }
}

// Real-time Queue
const q = query(collection(db, "queue"), orderBy("timestamp"), limit(50));

onSnapshot(q, (snapshot) => {
    const allCustomers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    // Update Current Customer
    if (allCustomers.length > 0) {
        const current = allCustomers[0];
        currentCustomer.textContent = `${current.name} - ${current.service}`;
    } else {
        currentCustomer.textContent = 'لا أحد في الانتظار';
    }

    // Update personal ticket first (uses the full list regardless of display cap)
    updateMyTicket(allCustomers);

    // Update Queue List — show only the next few names, summarize the rest
    queueList.innerHTML = "";

    if (allCustomers.length <= 1) {
        queueList.innerHTML = `
            <li class="empty-queue">
                <i class="fas fa-ticket-alt"></i>
                <span>لا يوجد عملاء في الانتظار</span>
            </li>
        `;
        return;
    }

    const upcoming = allCustomers.slice(1);
    const visible = upcoming.slice(0, VISIBLE_QUEUE_NAMES);

    visible.forEach((customer, index) => {
        const li = document.createElement("li");
        const number = index + 2;
        li.innerHTML = `
            <span class="queue-number">#${number}</span>
            <span class="queue-name-item">${customer.name}</span>
            <span class="queue-service">${customer.service}</span>
        `;
        queueList.appendChild(li);
    });

    const remaining = upcoming.length - visible.length;
    if (remaining > 0) {
        const li = document.createElement("li");
        li.className = "queue-more";
        li.innerHTML = `<span>و ${remaining} ${remaining === 1 ? 'شخص تاني' : 'أشخاص تانيين'} في الانتظار</span>`;
        queueList.appendChild(li);
    }
});