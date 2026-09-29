require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/products.routes');
const categoryRoutes = require('./routes/categories.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/orders.routes');
const userRoutes = require('./routes/users.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const addressRoutes = require('./routes/addresses.routes');
const reviewRoutes = require('./routes/reviews.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const uploadRoutes = require('./routes/upload.routes');
const promoRoutes = require('./routes/promo.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const withdrawalRoutes = require('./routes/withdrawals.routes');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Serves uploaded product images at http://localhost:5000/uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'AgriMarket API is running.' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api', dashboardRoutes); // exposes /api/admin/dashboard and /api/farmer/dashboard
app.use('/api/upload', uploadRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api', withdrawalRoutes); // exposes /api/farmer/wallet and /api/admin/withdrawals

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AgriMarket API listening on http://localhost:${PORT}`);
});
