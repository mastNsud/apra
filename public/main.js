// Global State
let allServices = [];
let selectedServiceIds = new Set();
let baseTotal = 0;
let finalTotal = 0;
let discountApplied = 0;
let maxGlobalDiscount = 0;
let luckUsed = false;

// Fetch Config
async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        
        const socialContainer = document.getElementById('social-container');
        if(socialContainer) {
            socialContainer.innerHTML = `
                <a href="${config.SOCIAL_INSTAGRAM}" target="_blank"><i class="fab fa-instagram"></i></a>
                <a href="${config.SOCIAL_FACEBOOK}" target="_blank"><i class="fab fa-facebook-f"></i></a>
                <a href="${config.SOCIAL_TELEGRAM}" target="_blank"><i class="fab fa-telegram-plane"></i></a>
                <a href="${config.SOCIAL_YOUTUBE}" target="_blank"><i class="fab fa-youtube"></i></a>
            `;
        }
    } catch (e) {
        console.error("Failed to load config", e);
    }
}

async function fetchDynamicServices() {
    try {
        const res = await fetch('/api/services');
        allServices = await res.json();
        
        const sRes = await fetch('/api/services/settings');
        const sData = await sRes.json();
        maxGlobalDiscount = sData.global_discount_max || 10;
        
        renderServices();
    } catch (e) {
        console.error("Failed to load services", e);
    }
}

function renderServices() {
    const container = document.getElementById('services-container');
    if (!container) return;
    container.innerHTML = '';
    
    allServices.forEach(s => {
        const el = document.createElement('div');
        el.className = 'service-option';
        el.id = 'srv-opt-' + s.id;
        el.onclick = () => toggleService(s.id);
        
        el.innerHTML = `
            <span class="service-title">${s.name}</span>
            <span class="service-price">₹${s.price}</span>
            <span class="service-desc">${s.description}</span>
        `;
        container.appendChild(el);
    });
}

function toggleService(id) {
    if (luckUsed) {
        alert("You cannot change services after spinning the discount wheel! Resetting discount.");
        luckUsed = false;
        discountApplied = 0;
        document.getElementById('discount-banner').classList.add('hidden');
        document.getElementById('try-luck-btn').disabled = false;
        document.getElementById('try-luck-btn').innerText = "Spin to Win a Discount! 🎁";
    }

    const el = document.getElementById('srv-opt-' + id);
    if (selectedServiceIds.has(id)) {
        selectedServiceIds.delete(id);
        el.classList.remove('selected');
    } else {
        selectedServiceIds.add(id);
        el.classList.add('selected');
    }
    recalculateTotal();
}

function recalculateTotal() {
    baseTotal = 0;
    allServices.forEach(s => {
        if (selectedServiceIds.has(s.id)) {
            baseTotal += parseInt(s.price);
            // Apply single service internal discount if it exists and no luck used
            if(!luckUsed && s.discount_percent > 0) {
               baseTotal -= parseInt(s.price) * (s.discount_percent/100);
            }
        }
    });
    
    finalTotal = baseTotal;
    if (luckUsed && discountApplied > 0) {
        finalTotal = Math.floor(baseTotal * (1 - discountApplied / 100));
    }
    
    document.getElementById('total-price').innerText = finalTotal;
    
    const submitBtn = document.getElementById('btn-submit-booking');
    if (selectedServiceIds.size > 0) {
        submitBtn.disabled = false;
        submitBtn.innerText = "Confirm Request for ₹" + finalTotal;
    } else {
        submitBtn.disabled = true;
        submitBtn.innerText = "Select Services to Book";
    }
}

function tryLuck() {
    if (selectedServiceIds.size === 0) {
        alert("Please select at least one service first!");
        return;
    }
    
    const minD = Math.min(3, maxGlobalDiscount);
    discountApplied = Math.floor(Math.random() * (maxGlobalDiscount - minD + 1)) + minD;
    
    luckUsed = true;
    document.getElementById('try-luck-btn').disabled = true;
    document.getElementById('try-luck-btn').innerText = "Voucher Applied!";
    
    document.getElementById('discount-percent').innerText = discountApplied;
    document.getElementById('discount-banner').classList.remove('hidden');
    
    recalculateTotal();
}

async function submitFlowBooking(e) {
    e.preventDefault();
    if (selectedServiceIds.size === 0) return;
    
    const bookedNames = allServices
        .filter(s => selectedServiceIds.has(s.id))
        .map(s => s.name)
        .join(', ');

    const data = {
        lead_name: document.getElementById('bf-name').value,
        phone: document.getElementById('bf-phone').value,
        email: document.getElementById('bf-email').value,
        appointment_date: document.getElementById('bf-date').value,
        time_slot: document.getElementById('bf-time').value,
        services_booked: bookedNames,
        total_price: finalTotal,
        discount_applied: discountApplied
    };
    
    try {
        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            document.querySelector('.booking-form').style.display = 'none';
            document.getElementById('booking-success').classList.remove('hidden');
        } else {
            alert('Failed to submit appointment. Please try again.');
        }
    } catch(err) {
        alert('Connection error.');
    }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    fetchDynamicServices();
});
