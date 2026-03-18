require('dotenv').config();
const { pool } = require('../src/db.js');

async function seed() {
    const newServices = [
        {name: 'Engagement Makeup', desc: 'Soft, dewy finish perfect for ring ceremonies.', price: 8000, img: 'images/service-4.jpg'},
        {name: 'Pre-Wedding Shoot', desc: 'Long-lasting, photo-ready makeup resisting outdoor elements.', price: 10000, img: 'images/service-5.jpg'},
        {name: 'Reception Airbrush Glam', desc: 'Bold expressive eyes and flawless airbrush for night camera flashes.', price: 15000, img: 'images/service-6.jpg'},
        {name: 'Haldi / Mehendi Fresh Look', desc: 'Lightweight, sweat-proof base with vibrant colorful vibes.', price: 6000, img: 'images/service-7.jpg'},
        {name: 'Premium Family Guest', desc: 'Luxury HD makeup tailored for the brides close family members.', price: 5000, img: 'images/service-8.jpg'}
    ];

    try {
        for (let s of newServices) {
            const res = await pool.query('SELECT id FROM services WHERE name = $1', [s.name]);
            if (res.rows.length === 0) {
                await pool.query(
                    'INSERT INTO services (name, description, price, discount_percent, image_url) VALUES ($1, $2, $3, 0, $4)',
                    [s.name, s.desc, s.price, s.img]
                );
                console.log(`Inserted: ${s.name}`);
            } else {
                console.log(`Skipped existing: ${s.name}`);
            }
        }
    } catch(err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
seed();
