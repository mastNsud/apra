// Fetch Config
async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        
        const socialContainer = document.getElementById('social-container');
        socialContainer.innerHTML = `
            <a href="${config.SOCIAL_INSTAGRAM}" target="_blank"><i class="fab fa-instagram"></i></a>
            <a href="${config.SOCIAL_FACEBOOK}" target="_blank"><i class="fab fa-facebook-f"></i></a>
            <a href="${config.SOCIAL_TELEGRAM}" target="_blank"><i class="fab fa-telegram-plane"></i></a>
            <a href="${config.SOCIAL_YOUTUBE}" target="_blank"><i class="fab fa-youtube"></i></a>
        `;
    } catch (e) {
        console.error("Failed to load config", e);
    }
}

// Modal Logic
const modal = document.getElementById('booking-modal');
function openBookingModal() {
    modal.classList.remove('hidden');
    document.getElementById('booking-success').classList.add('hidden');
    document.getElementById('booking-form').style.display = 'flex';
}
function closeBookingModal() {
    modal.classList.add('hidden');
}

// Estimator
function scrollToEstimator() {
    document.getElementById('estimator').scrollIntoView({ behavior: 'smooth' });
}

function calculateEstimate() {
    const type = document.getElementById('est-type').value;
    const funcs = parseInt(document.getElementById('est-functions').value);
    
    let base = type === 'bridal' ? 500 : (type === 'party' ? 150 : 300);
    let estimate = base * funcs;
    
    const resultEl = document.getElementById('est-result');
    resultEl.classList.remove('hidden');
    resultEl.querySelector('span').textContent = '$' + estimate + (funcs > 1 ? ' (Package Deal Possible)' : '');
}

// Booking Submit
async function submitBooking(e) {
    e.preventDefault();
    
    const data = {
        lead_name: document.getElementById('b-name').value,
        phone: document.getElementById('b-phone').value,
        email: document.getElementById('b-email').value,
        appointment_date: document.getElementById('b-date').value,
        time_slot: document.getElementById('b-time').value,
    };
    
    try {
        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            document.getElementById('booking-form').style.display = 'none';
            document.getElementById('booking-success').classList.remove('hidden');
            document.getElementById('booking-form').reset();
        } else {
            alert('Failed to submit appointment. Please try again.');
        }
    } catch(err) {
        alert('Connection error.');
    }
}

// Init
window.addEventListener('DOMContentLoaded', loadConfig);
