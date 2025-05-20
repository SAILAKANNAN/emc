const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// MongoDB connection
mongoose.connect('mongodb+srv://kannasri141:kanna2006@cluste00.49upwsc.mongodb.net/?retryWrites=true&w=majority&appName=Cluste00', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define schemas
const userSchema = new mongoose.Schema({
    email: String,
    phone: String,
    password: String,
    state: String,
    district: String,
    areaName: String,
    pincode: String,
    cart: [{
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        mrp: Number,
        discount: Number,
        mainImage: String, // This will now store base64 data
        quantity: Number,
        size: String,
        color: String,
        brand: String,
        category: String
    }]
});

const productSchema = new mongoose.Schema({
    name: String,
    category: String,
    brand: String,
    sku: String,
    productCode: String,
    price: Number,
    mrp: Number,
    discount: Number,
    stock: Number,
    lowStockAlert: Number,
    deliveryCharge: Number,
    freeDelivery: Boolean,
    sizes: [String],
    colors: [String],
    variants: [String],
    mainImage: { // Store base64 image data with metadata
        data: String, // base64 encoded
        contentType: String,
        originalName: String
    },
    additionalImages: [{ // Array of base64 images
        data: String,
        contentType: String,
        originalName: String
    }],
    shortDescription: String,
    fullDescription: String,
    keyFeatures: [String],
    material: String,
    dimensions: String,
    weight: String,
    warranty: String,
    tags: [String],
    status: String,
    launchDate: Date,
    returnPolicy: String,
    bankOffers: String,
    specialOffer: String
});

const orderSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    userDetails: {
        email: String,
        phone: String,
        address: {
            state: String,
            district: String,
            areaName: String,
            pincode: String
        }
    },
    products: [{
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        mrp: Number,
        discount: Number,
        quantity: Number,
        size: String,
        color: String,
        mainImage: String, // base64 data
        brand: String,
        category: String
    }],
    totalAmount: Number,
    upiTransactionId: String,
    orderDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' }
});

// Create models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads (we'll process files to base64 instead of saving to disk)
const upload = multer({
    storage: multer.memoryStorage(), // Store files in memory as Buffer
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit per file
    }
});

// Session management (simplified for demo)
let currentUser = null;
let adminLoggedIn = false;

// Helper function to process uploaded files to base64
const processUploadedFile = (file) => {
    if (!file) return null;
    return {
        data: file.buffer.toString('base64'),
        contentType: file.mimetype,
        originalName: file.originalname
    };
};

// Routes
app.get('/', (req, res) => {
    res.send(`
        <h1>Welcome to E-commerce Site</h1>
        <a href="/login">Login</a> | <a href="/register">Register</a>
        ${adminLoggedIn ? '| ' : ''}
    `);
});

// Registration routes (unchanged from previous version)
app.get('/register', (req, res) => {
    res.send(`
        <h1>Registration - Step 1</h1>
        <form action="/register-step1" method="post">
            Email: <input type="email" name="email" required><br>
            Phone: <input type="text" name="phone" required><br>
            Password: <input type="password" name="password" required><br>
            <button type="submit">Next</button>
        </form>
    `);
});

app.post('/register-step1', async (req, res) => {
    const { email, phone, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
        return res.send('User with this email or phone already exists. <a href="/register">Try again</a>');
    }
    
    res.send(`
        <h1>Registration - Step 2</h1>
        <form action="/register-step2" method="post">
            <input type="hidden" name="email" value="${email}">
            <input type="hidden" name="phone" value="${phone}">
            <input type="hidden" name="password" value="${password}">
            
            State: <input type="text" name="state" required><br>
            District: <input type="text" name="district" required><br>
            Area Name: <input type="text" name="areaName" required><br>
            Pincode: <input type="text" name="pincode" required><br>
            <button type="submit">Register</button>
        </form>
    `);
});

app.post('/register-step2', async (req, res) => {
    const { email, phone, password, state, district, areaName, pincode } = req.body;
    
    try {
        const newUser = new User({
            email,
            phone,
            password,
            state,
            district,
            areaName,
            pincode,
            cart: []
        });
        
        await newUser.save();
        res.send('Registration successful! <a href="/login">Login now</a>');
    } catch (err) {
        res.send('Registration failed. <a href="/register">Try again</a>');
    }
});

// Login routes (unchanged from previous version)
app.get('/login', (req, res) => {
    res.send(`
        <h1>Login</h1>
        <form action="/login" method="post">
            Email/Phone: <input type="text" name="username" required><br>
            Password: <input type="password" name="password" required><br>
            <button type="submit">Login</button>
        </form>
        <a href="/">Back to Home</a>
    `);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'kanna' && password === 'kanna') {
        adminLoggedIn = true;
        return res.redirect('/admin');
    }
    
    const user = await User.findOne({ 
        $or: [{ email: username }, { phone: username }],
        password: password
    });
    
    if (user) {
        currentUser = user;
        res.redirect('/home');
    } else {
        res.send('Invalid credentials. <a href="/login">Try again</a>');
    }
});

// Home page with search functionality
app.get('/home', async (req, res) => {
    if (!currentUser) return res.redirect('/login');
    
    const searchQuery = req.query.search || '';
    let products;
    
    if (searchQuery) {
        // Use regex to search for products containing the search term (case insensitive)
        products = await Product.find({
            name: { $regex: searchQuery, $options: 'i' }
        });
    } else {
        products = await Product.find();
    }
    
    let productsHtml = '';
    products.forEach(product => {
        // Create data URL for the main image
        const mainImageSrc = `data:${product.mainImage.contentType};base64,${product.mainImage.data}`;
        
        productsHtml += `
            <div style="border:1px solid #ccc; padding:10px; margin:10px; display:inline-block;">
                <img src="${mainImageSrc}" width="100"><br>
                ${product.name}<br>
                ₹${product.price} <strike>₹${product.mrp}</strike> (${product.discount}% off)<br>
                <a href="/viewproduct/${product._id}">View Product</a>
            </div>
        `;
    });
    
    res.send(`
        <style>
            .search-container {
                margin: 20px 0;
            }
            .search-container input {
                padding: 8px;
                width: 300px;
            }
        </style>
        
        <h1>Welcome, ${currentUser.email}</h1>
        <a href="/cart">View Cart</a> | <a href="/logout">Logout</a>
        
        <div class="search-container">
            <form action="/home" method="get">
                <input type="text" name="search" placeholder="Search products..." value="${searchQuery}">
                <button type="submit">Search</button>
                ${searchQuery ? '<a href="/home">Clear Search</a>' : ''}
            </form>
        </div>
        
        <h2>Products</h2>
        ${products.length > 0 ? productsHtml : '<p>No products found matching your search.</p>'}
    `);
});

// View product (updated for base64 images)
app.get('/viewproduct/:id', async (req, res) => {
    if (!currentUser) return res.redirect('/login');
    
    const product = await Product.findById(req.params.id);
    if (!product) return res.send('Product not found');
    
    // Create data URLs for all images
    const mainImageSrc = `data:${product.mainImage.contentType};base64,${product.mainImage.data}`;
    const additionalImagesSrc = product.additionalImages.map(img => 
        `data:${img.contentType};base64,${img.data}`
    );
    
    res.send(`
        <style>
            .product-container {
                display: flex;
                margin: 20px;
            }
            .product-images {
                width: 40%;
            }
            .product-details {
                width: 60%;
                padding-left: 20px;
            }
            .additional-images {
                display: flex;
                margin-top: 10px;
            }
            .additional-images img {
                width: 80px;
                margin-right: 10px;
            }
            .product-info {
                margin-bottom: 20px;
            }
        </style>
        
        <h1>${product.name}</h1>
        <div class="product-container">
            <div class="product-images">
                <img src="${mainImageSrc}" width="300"><br>
                <div class="additional-images">
                    ${additionalImagesSrc.map(src => `<img src="${src}">`).join('')}
                </div>
            </div>
            <div class="product-details">
                <div class="product-info">
                    <h2>₹${product.price} <strike>₹${product.mrp}</strike> (${product.discount}% off)</h2>
                    <p>${product.stock} in stock</p>
                    <p>Brand: ${product.brand}</p>
                    <p>Category: ${product.category}</p>
                    ${product.sizes.length > 0 ? `<p>Sizes: ${product.sizes.join(', ')}</p>` : ''}
                    ${product.colors.length > 0 ? `<p>Colors: ${product.colors.join(', ')}</p>` : ''}
                </div>
                
                <form action="/addtocart/${product._id}" method="post">
                    ${product.sizes.length > 0 ? `
                        Size: <select name="size">
                            ${product.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                        </select><br>
                    ` : ''}
                    
                    ${product.colors.length > 0 ? `
                        Color: <select name="color">
                            ${product.colors.map(color => `<option value="${color}">${color}</option>`).join('')}
                        </select><br>
                    ` : ''}
                    
                    Quantity: <input type="number" name="quantity" value="1" min="1" max="${product.stock}"><br>
                    <button type="submit">Add to Cart</button>
                </form>
                <form action="/buynow/${product._id}" method="post">
                    ${product.sizes.length > 0 ? `
                        Size: <select name="size">
                            ${product.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                        </select><br>
                    ` : ''}
                    
                    ${product.colors.length > 0 ? `
                        Color: <select name="color">
                            ${product.colors.map(color => `<option value="${color}">${color}</option>`).join('')}
                        </select><br>
                    ` : ''}
                    
                    Quantity: <input type="number" name="quantity" value="1" min="1" max="${product.stock}"><br>
                    <button type="submit">Buy Now</button>
                </form>
                
                <div class="product-specs">
                    <h3>Product Details</h3>
                    <p>${product.fullDescription}</p>
                    
                    <h3>Key Features</h3>
                    <ul>
                        ${product.keyFeatures.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                    
                    ${product.material ? `<p><strong>Material:</strong> ${product.material}</p>` : ''}
                    ${product.dimensions ? `<p><strong>Dimensions:</strong> ${product.dimensions}</p>` : ''}
                    ${product.weight ? `<p><strong>Weight:</strong> ${product.weight}</p>` : ''}
                    ${product.warranty ? `<p><strong>Warranty:</strong> ${product.warranty}</p>` : ''}
                </div>
            </div>
        </div>
        <a href="/home">Back to Home</a>
    `);
});

// Add to cart (updated for base64 images)
app.post('/addtocart/:id', async (req, res) => {
    if (!currentUser) return res.redirect('/login');
    
    const productId = req.params.id;
    const { quantity, size, color } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) return res.send('Product not found');
    
    const user = await User.findById(currentUser._id);
    const existingItem = user.cart.find(item => 
        item.productId.toString() === productId && 
        item.size === (size || '') && 
        item.color === (color || '')
    );
    
    if (existingItem) {
        existingItem.quantity += parseInt(quantity);
    } else {
        // Store the base64 image data in the cart
        user.cart.push({
            productId,
            name: product.name,
            price: product.price,
            mrp: product.mrp,
            discount: product.discount,
            mainImage: `data:${product.mainImage.contentType};base64,${product.mainImage.data}`,
            quantity: parseInt(quantity),
            size: size || '',
            color: color || '',
            brand: product.brand,
            category: product.category
        });
    }
    
    await user.save();
    currentUser = user;
    res.redirect('/cart');
});

// Cart page (updated for base64 images)
app.get('/cart', async (req, res) => {
    if (!currentUser) return res.redirect('/login');
    
    const user = await User.findById(currentUser._id);
    let cartHtml = '';
    let total = 0;
    
    user.cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        cartHtml += `
            <div style="border:1px solid #ccc; padding:10px; margin:10px; display:flex;">
                <div style="margin-right:20px;">
                    <img src="${item.mainImage}" width="100">
                </div>
                <div>
                    <h3>${item.name}</h3>
                    <p>Brand: ${item.brand}</p>
                    <p>Price: ₹${item.price} x ${item.quantity} = ₹${itemTotal}</p>
                    ${item.size ? `<p>Size: ${item.size}</p>` : ''}
                    ${item.color ? `<p>Color: ${item.color}</p>` : ''}
                    <p>${item.discount}% off (MRP: ₹${item.mrp})</p>
                    <a href="/removefromcart/${item._id}">Remove</a>
                </div>
            </div>
        `;
    });
    
    res.send(`
        <h1>Your Cart</h1>
        ${cartHtml}
        <div style="border-top:2px solid #000; padding:10px;">
            <h3>Total: ₹${total}</h3>
            <form action="/checkout" method="post">
                <button type="submit">Proceed to Checkout</button>
            </form>
        </div>
        <a href="/home">Continue Shopping</a>
    `);
});

// Remove from cart (unchanged)
app.get('/removefromcart/:id', async (req, res) => {
    if (!currentUser) return res.redirect('/login');
    
    const user = await User.findById(currentUser._id);
    user.cart = user.cart.filter(item => item._id.toString() !== req.params.id);
    
    await user.save();
    currentUser = user;
    res.redirect('/cart');
});

// Buy now (updated for base64 images)
app.post('/buynow/:id', async (req, res) => {
    if (!currentUser) return res.redirect('/login');
    
    const productId = req.params.id;
    const { quantity, size, color } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) return res.send('Product not found');
    
    // Create a temporary cart with just this product
    const user = await User.findById(currentUser._id);
    user.cart = [{
        productId,
        name: product.name,
        price: product.price,
        mrp: product.mrp,
        discount: product.discount,
        mainImage: `data:${product.mainImage.contentType};base64,${product.mainImage.data}`,
        quantity: parseInt(quantity),
        size: size || '',
        color: color || '',
        brand: product.brand,
        category: product.category
    }];
    
    await user.save();
    currentUser = user;
    res.redirect('/checkout');
});

// Checkout (unchanged)
app.get('/checkout', async (req, res) => {
    if (!currentUser) return res.redirect('/login');
    
    const user = await User.findById(currentUser._id);
    let total = 0;
    
    user.cart.forEach(item => {
        total += item.price * item.quantity;
    });
    
    res.send(`
        <style>
            .checkout-container {
                display: flex;
                justify-content: space-between;
            }
            .address-section, .payment-section {
                width: 48%;
                padding: 15px;
                border: 1px solid #ccc;
                border-radius: 5px;
            }
            .qr-code {
                text-align: center;
                margin: 20px 0;
            }
        </style>
        
        <h1>Checkout</h1>
        <div class="checkout-container">
            <div class="address-section">
                <h2>Delivery Address</h2>
                <p>${currentUser.areaName}, ${currentUser.district}</p>
                <p>${currentUser.state} - ${currentUser.pincode}</p>
                <p>Phone: ${currentUser.phone}</p>
            </div>
            
            <div class="payment-section">
                <h2>Order Summary</h2>
                ${user.cart.map(item => `
                    <div style="display:flex; margin-bottom:10px;">
                        <img src="${item.mainImage}" width="50" style="margin-right:10px;">
                        <div>
                            <p>${item.name}</p>
                            <p>₹${item.price} x ${item.quantity}</p>
                            ${item.size ? `<p>Size: ${item.size}</p>` : ''}
                            ${item.color ? `<p>Color: ${item.color}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
                <hr>
                <h3>Total Amount: ₹${total}</h3>
            </div>
        </div>
        
        <div class="payment-method">
            <h2>Payment</h2>
            <p>Scan this QR code to pay:</p>
            <div class="qr-code">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=merchant@upi&pn=E-commerce&am=${total}" alt="QR Code"><br>
                <p>Or send payment to UPI ID: merchant@upi</p>
            </div>
            
            <form action="/completeorder" method="post">
                Enter 12-digit UPI Transaction ID: <input type="text" name="upiId" pattern="[0-9]{12}" required><br>
                <button type="submit">Complete Order</button>
            </form>
        </div>
        <a href="/cart">Back to Cart</a>
    `);
});

// Complete order (unchanged)
app.post('/completeorder', async (req, res) => {
    if (!currentUser) return res.redirect('/login');
    
    const user = await User.findById(currentUser._id);
    let total = 0;
    const products = [];
    
    user.cart.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 0;
        total += price * quantity;
        
        products.push({
            productId: item.productId,
            name: item.name,
            price: price,
            mrp: item.mrp,
            discount: item.discount,
            quantity: quantity,
            size: item.size,
            color: item.color,
            mainImage: item.mainImage,
            brand: item.brand,
            category: item.category
        });
    });
    
    const order = new Order({
        userId: currentUser._id,
        userDetails: {
            email: currentUser.email,
            phone: currentUser.phone,
            address: {
                state: currentUser.state,
                district: currentUser.district,
                areaName: currentUser.areaName,
                pincode: currentUser.pincode
            }
        },
        products,
        totalAmount: total,
        upiTransactionId: req.body.upiId
    });
    
    await order.save();
    
    // Clear cart
    user.cart = [];
    await user.save();
    currentUser = user;
    
    res.send(`
        <h1>Order Placed Successfully!</h1>
        <div style="border:1px solid #ccc; padding:20px; margin:20px;">
            <h2>Order Details</h2>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Amount Paid:</strong> ₹${total}</p>
            <p><strong>Transaction ID:</strong> ${req.body.upiId}</p>
            <p><strong>Delivery Address:</strong> ${order.userDetails.address.areaName}, ${order.userDetails.address.district}, ${order.userDetails.address.state} - ${order.userDetails.address.pincode}</p>
            
            <h3>Products Ordered:</h3>
            ${order.products.map(product => `
                <div style="display:flex; margin-bottom:10px;">
                    <img src="${product.mainImage}" width="50" style="margin-right:10px;">
                    <div>
                        <p>${product.name}</p>
                        <p>₹${product.price} x ${product.quantity}</p>
                        ${product.size ? `<p>Size: ${product.size}</p>` : ''}
                        ${product.color ? `<p>Color: ${product.color}</p>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        <a href="/home">Back to Home</a>
    `);
});

// Logout (unchanged)
app.get('/logout', (req, res) => {
    currentUser = null;
    adminLoggedIn = false;
    res.redirect('/');
});

// Admin routes (updated for base64 images)
app.get('/admin', (req, res) => {
    if (!adminLoggedIn) return res.redirect('/login');
    
    res.send(`
        <h1>Admin Panel</h1>
        <ul>
            <li><a href="/admin/users">Users</a></li>
            <li><a href="/admin/orders">Orders</a></li>
            <li><a href="/admin/products">Products</a></li>
            <li><a href="/admin/addproduct">Add Product</a></li>
            <li><a href="/logout">Logout</a></li>
        </ul>
    `);
});

// Admin - Users (unchanged)
app.get('/admin/users', async (req, res) => {
    if (!adminLoggedIn) return res.redirect('/login');
    
    const users = await User.find();
    let usersHtml = '';
    
    users.forEach(user => {
        usersHtml += `
            <div style="border:1px solid #ccc; padding:10px; margin:10px;">
                <p>Email: ${user.email}</p>
                <p>Phone: ${user.phone}</p>
                <a href="/admin/userdetails/${user._id}">View Details</a>
            </div>
        `;
    });
    
    res.send(`
        <h1>Users</h1>
        ${usersHtml}
        <a href="/admin">Back to Admin Panel</a>
    `);
});

// Admin - User Details (unchanged)
app.get('/admin/userdetails/:id', async (req, res) => {
    if (!adminLoggedIn) return res.redirect('/login');
    
    const user = await User.findById(req.params.id);
    if (!user) return res.send('User not found');
    
    res.send(`
        <h1>User Details</h1>
        <p>Email: ${user.email}</p>
        <p>Phone: ${user.phone}</p>
        <p>Address: ${user.areaName}, ${user.district}, ${user.state} - ${user.pincode}</p>
        <a href="/admin/users">Back to Users</a>
    `);
});

// Admin - Orders (updated for base64 images)
app.get('/admin/orders', async (req, res) => {
    if (!adminLoggedIn) return res.redirect('/login');
    
    const orders = await Order.find();
    let ordersHtml = '';
    
    orders.forEach(order => {
        let productsHtml = order.products.map(item => `
            <div style="display:flex; margin-bottom:10px;">
                <img src="${item.mainImage}" width="50" style="margin-right:10px;">
                <div>
                    <p>${item.name}</p>
                    <p>₹${item.price} x ${item.quantity}</p>
                    ${item.size ? `<p>Size: ${item.size}</p>` : ''}
                    ${item.color ? `<p>Color: ${item.color}</p>` : ''}
                </div>
            </div>
        `).join('');
        
        ordersHtml += `
            <div style="border:1px solid #ccc; padding:10px; margin:10px;">
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Customer:</strong> ${order.userDetails.email}</p>
                <p><strong>Phone:</strong> ${order.userDetails.phone}</p>
                <p><strong>Address:</strong> ${order.userDetails.address.areaName}, ${order.userDetails.address.district}, ${order.userDetails.address.state} - ${order.userDetails.address.pincode}</p>
                
                <h3>Products:</h3>
                ${productsHtml}
                
                <p><strong>Total:</strong> ₹${order.totalAmount}</p>
                <p><strong>Transaction ID:</strong> ${order.upiTransactionId}</p>
                <p><strong>Date:</strong> ${order.orderDate}</p>
                <p><strong>Status:</strong> ${order.status}</p>
            </div>
        `;
    });
    
    res.send(`
        <h1>Orders</h1>
        ${ordersHtml}
        <a href="/admin">Back to Admin Panel</a>
    `);
});

// Admin - Products (updated for base64 images)
app.get('/admin/products', async (req, res) => {
    if (!adminLoggedIn) return res.redirect('/login');
    
    const products = await Product.find();
    let productsHtml = '';
    
    products.forEach(product => {
        const mainImageSrc = `data:${product.mainImage.contentType};base64,${product.mainImage.data}`;
        
        productsHtml += `
            <div style="border:1px solid #ccc; padding:10px; margin:10px;">
                <img src="${mainImageSrc}" width="50"><br>
                <p>${product.name} (${product.brand})</p>
                <p>Price: ₹${product.price} | Stock: ${product.stock}</p>
                <a href="/admin/editproduct/${product._id}">Edit</a> | 
                <a href="/admin/deleteproduct/${product._id}" onclick="return confirm('Are you sure?')">Delete</a>
            </div>
        `;
    });
    
    res.send(`
        <h1>Products</h1>
        ${productsHtml}
        <a href="/admin/addproduct">Add New Product</a><br>
        <a href="/admin">Back to Admin Panel</a>
    `);
});

// Admin - Add Product (updated for base64 images)
app.get('/admin/addproduct', (req, res) => {
    if (!adminLoggedIn) return res.redirect('/login');
    
    res.send(`
        <h1>Add Product</h1>
        <form action="/admin/addproduct" method="post" enctype="multipart/form-data">
            <h2>Basic Product Information</h2>
            Product Name: <input type="text" name="name" required><br>
            Category: <input type="text" name="category" required><br>
            Brand: <input type="text" name="brand" required><br>
            SKU/ID: <input type="text" name="sku" required><br>
            Product Code: <input type="text" name="productCode"><br>
            
            <h2>💰 Pricing & Availability</h2>
            Price: <input type="number" name="price" required><br>
            MRP: <input type="number" name="mrp" required><br>
            Discount: <input type="number" name="discount" required><br>
            Stock Quantity: <input type="number" name="stock" required><br>
            Low Stock Alert: <input type="number" name="lowStockAlert"><br>
            Delivery Charge: <input type="number" name="deliveryCharge" value="0"><br>
            Free Delivery: <input type="checkbox" name="freeDelivery"><br>
            
            <h2>📦 Product Variants</h2>
            Available Sizes (comma separated): <input type="text" name="sizes"><br>
            Available Colors (comma separated): <input type="text" name="colors"><br>
            Other Variants (comma separated): <input type="text" name="variants"><br>
            
            <h2>🖼️ Images</h2>
            Main Product Image: <input type="file" name="mainImage" required><br>
            Additional Images: <input type="file" name="additionalImages" multiple><br>
            
            <h2>📃 Description & Specifications</h2>
            Short Description: <textarea name="shortDescription" required></textarea><br>
            Full Description: <textarea name="fullDescription" required></textarea><br>
            Key Features (comma separated): <textarea name="keyFeatures" required></textarea><br>
            Material: <input type="text" name="material"><br>
            Dimensions: <input type="text" name="dimensions"><br>
            Weight: <input type="text" name="weight"><br>
            Warranty Info: <input type="text" name="warranty"><br>
            
            <h2>🔧 Additional Information (Optional)</h2>
            Tags (comma separated): <input type="text" name="tags"><br>
            Product Status: <select name="status">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
            </select><br>
            Launch Date: <input type="date" name="launchDate"><br>
            Return Policy: <input type="text" name="returnPolicy"><br>
            Bank Offers: <input type="text" name="bankOffers"><br>
            Special Offer: <input type="text" name="specialOffer"><br>
            
            <button type="submit">Add Product</button>
        </form>
        <a href="/admin/products">Back to Products</a>
    `);
});

app.post('/admin/addproduct', upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'additionalImages', maxCount: 5 }
]), async (req, res) => {
    if (!adminLoggedIn) return res.redirect('/login');
    
    try {
        const {
            name, category, brand, sku, productCode,
            price, mrp, discount, stock, lowStockAlert, deliveryCharge, freeDelivery,
            sizes, colors, variants,
            shortDescription, fullDescription, keyFeatures, material, dimensions, weight, warranty,
            tags, status, launchDate, returnPolicy, bankOffers, specialOffer
        } = req.body;
        
        // Process uploaded files to base64
        const mainImage = processUploadedFile(req.files.mainImage[0]);
        
        let additionalImages = [];
        if (req.files.additionalImages) {
            additionalImages = req.files.additionalImages.map(file => processUploadedFile(file));
        }
        
        const newProduct = new Product({
            name, category, brand, sku, productCode,
            price: parseFloat(price),
            mrp: parseFloat(mrp),
            discount: parseFloat(discount),
            stock: parseInt(stock),
            lowStockAlert: lowStockAlert ? parseInt(lowStockAlert) : 0,
            deliveryCharge: parseFloat(deliveryCharge || 0),
            freeDelivery: freeDelivery === 'on',
            sizes: sizes ? sizes.split(',').map(s => s.trim()) : [],
            colors: colors ? colors.split(',').map(c => c.trim()) : [],
            variants: variants ? variants.split(',').map(v => v.trim()) : [],
            mainImage,
            additionalImages,
            shortDescription, fullDescription,
            keyFeatures: keyFeatures.split(',').map(f => f.trim()),
            material, dimensions, weight, warranty,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            status: status || 'Active',
            launchDate: launchDate ? new Date(launchDate) : null,
            returnPolicy, bankOffers, specialOffer
        });
        
        await newProduct.save();
        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        res.send('Error adding product. <a href="/admin/addproduct">Try again</a>');
    }
});

// Admin - Edit Product (updated for base64 images)
app.get('/admin/editproduct/:id', async (req, res) => {
    if (!adminLoggedIn) return res.redirect('/login');
    
    const product = await Product.findById(req.params.id);
    if (!product) return res.send('Product not found');
    
    // Create data URLs for images to display them
    const mainImageSrc = `data:${product.mainImage.contentType};base64,${product.mainImage.data}`;
    const additionalImagesSrc = product.additionalImages.map(img => 
        `data:${img.contentType};base64,${img.data}`
    );
    
    res.send(`
        <h1>Edit Product</h1>
        <form action="/admin/updateproduct/${product._id}" method="post" enctype="multipart/form-data">
            <h2>Basic Product Information</h2>
            Product Name: <input type="text" name="name" value="${product.name}" required><br>
            Category: <input type="text" name="category" value="${product.category}" required><br>
            Brand: <input type="text" name="brand" value="${product.brand}" required><br>
            SKU/ID: <input type="text" name="sku" value="${product.sku}" required><br>
            Product Code: <input type="text" name="productCode" value="${product.productCode || ''}"><br>
            
            <h2>💰 Pricing & Availability</h2>
            Price: <input type="number" name="price" value="${product.price}" required><br>
            MRP: <input type="number" name="mrp" value="${product.mrp}" required><br>
            Discount: <input type="number" name="discount" value="${product.discount}" required><br>
            Stock Quantity: <input type="number" name="stock" value="${product.stock}" required><br>
            Low Stock Alert: <input type="number" name="lowStockAlert" value="${product.lowStockAlert || 0}"><br>
            Delivery Charge: <input type="number" name="deliveryCharge" value="${product.deliveryCharge || 0}"><br>
            Free Delivery: <input type="checkbox" name="freeDelivery" ${product.freeDelivery ? 'checked' : ''}><br>
            
            <h2>📦 Product Variants</h2>
            Available Sizes: <input type="text" name="sizes" value="${product.sizes.join(', ')}"><br>
            Available Colors: <input type="text" name="colors" value="${product.colors.join(', ')}"><br>
            Other Variants: <input type="text" name="variants" value="${product.variants.join(', ')}"><br>
            
            <h2>🖼️ Images</h2>
            Current Main Image: <img src="${mainImageSrc}" width="50"><br>
            Change Main Image: <input type="file" name="mainImage"><br>
            Current Additional Images: ${additionalImagesSrc.map(src => `<img src="${src}" width="30">`).join('')}<br>
            Add More Images: <input type="file" name="additionalImages" multiple><br>
            
            <h2>📃 Description & Specifications</h2>
            Short Description: <textarea name="shortDescription" required>${product.shortDescription}</textarea><br>
            Full Description: <textarea name="fullDescription" required>${product.fullDescription}</textarea><br>
            Key Features: <textarea name="keyFeatures" required>${product.keyFeatures.join(', ')}</textarea><br>
            Material: <input type="text" name="material" value="${product.material || ''}"><br>
            Dimensions: <input type="text" name="dimensions" value="${product.dimensions || ''}"><br>
            Weight: <input type="text" name="weight" value="${product.weight || ''}"><br>
            Warranty Info: <input type="text" name="warranty" value="${product.warranty || ''}"><br>
            
            <h2>🔧 Additional Information (Optional)</h2>
            Tags: <input type="text" name="tags" value="${product.tags.join(', ')}"><br>
            Product Status: <select name="status">
                <option value="Active" ${product.status === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Inactive" ${product.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
            </select><br>
            Launch Date: <input type="date" name="launchDate" value="${product.launchDate ? product.launchDate.toISOString().split('T')[0] : ''}"><br>
            Return Policy: <input type="text" name="returnPolicy" value="${product.returnPolicy || ''}"><br>
            Bank Offers: <input type="text" name="bankOffers" value="${product.bankOffers || ''}"><br>
            Special Offer: <input type="text" name="specialOffer" value="${product.specialOffer || ''}"><br>
            
            <button type="submit">Update Product</button>
        </form>
        <a href="/admin/products">Back to Products</a>
    `);
});

app.post('/admin/updateproduct/:id', upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'additionalImages', maxCount: 5 }
]), async (req, res) => {
    if (!adminLoggedIn) return res.redirect('/login');
    
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.send('Product not found');
        
        const {
            name, category, brand, sku, productCode,
            price, mrp, discount, stock, lowStockAlert, deliveryCharge, freeDelivery,
            sizes, colors, variants,
            shortDescription, fullDescription, keyFeatures, material, dimensions, weight, warranty,
            tags, status, launchDate, returnPolicy, bankOffers, specialOffer
        } = req.body;
        
        // Update product fields
        product.name = name;
        product.category = category;
        product.brand = brand;
        product.sku = sku;
        product.productCode = productCode;
        product.price = parseFloat(price);
        product.mrp = parseFloat(mrp);
        product.discount = parseFloat(discount);
        product.stock = parseInt(stock);
        product.lowStockAlert = lowStockAlert ? parseInt(lowStockAlert) : 0;
        product.deliveryCharge = parseFloat(deliveryCharge || 0);
        product.freeDelivery = freeDelivery === 'on';
        product.sizes = sizes ? sizes.split(',').map(s => s.trim()) : [];
        product.colors = colors ? colors.split(',').map(c => c.trim()) : [];
        product.variants = variants ? variants.split(',').map(v => v.trim()) : [];
        product.shortDescription = shortDescription;
        product.fullDescription = fullDescription;
        product.keyFeatures = keyFeatures.split(',').map(f => f.trim());
        product.material = material;
        product.dimensions = dimensions;
        product.weight = weight;
        product.warranty = warranty;
        product.tags = tags ? tags.split(',').map(t => t.trim()) : [];
        product.status = status || 'Active';
        product.launchDate = launchDate ? new Date(launchDate) : null;
        product.returnPolicy = returnPolicy;
        product.bankOffers = bankOffers;
        product.specialOffer = specialOffer;
        
        // Update images if new ones are uploaded
        if (req.files.mainImage) {
            product.mainImage = processUploadedFile(req.files.mainImage[0]);
        }
        if (req.files.additionalImages) {
            const newAdditionalImages = req.files.additionalImages.map(file => processUploadedFile(file));
            product.additionalImages = product.additionalImages.concat(newAdditionalImages);
        }
        
        await product.save();
        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        res.send('Error updating product. <a href="/admin/products">Back to products</a>');
    }
});

// Admin - Delete Product (unchanged)
app.get('/admin/deleteproduct/:id', async (req, res) => {
    if (!adminLoggedIn) return res.redirect('/login');
    
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        res.send('Error deleting product. <a href="/admin/products">Back to products</a>');
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
