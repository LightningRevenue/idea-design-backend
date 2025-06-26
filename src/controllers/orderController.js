const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Crearea unei comenzi noi
exports.createOrder = async (req, res) => {
  try {
    console.log('Creare comandă nouă');
    console.log('Request body:', req.body);
    console.log('Authenticated user:', req.user);
    
    const { 
      orderItems, 
      shippingAddress, 
      paymentMethod, 
      itemsPrice, 
      shippingPrice, 
      totalPrice,
      orderNotes,
      userId: bodyUserId  // Extract userId from request body if present
    } = req.body;
    
    // Verifică dacă există produse în comandă
    if (!orderItems || orderItems.length === 0) {
      console.error('Nu există produse în comandă');
      return res.status(400).json({ success: false, message: 'Nu există produse în comandă' });
    }
    
    // Obține ID-ul utilizatorului (dacă există) sau guestId
    // 1. Verifică mai întâi token-ul de autentificare (req.user._id)
    // 2. Apoi verifică dacă există un ID de utilizator în corpul cererii (pentru backward compatibility)
    // 3. Dacă nu există nici unul, folosește guestId
    const userId = req.user?._id || req.user?.id || bodyUserId;
    const guestId = req.body.guestId;
    
    console.log('Creare comandă pentru - userId din token:', req.user?._id);
    console.log('Creare comandă pentru - userId din body:', bodyUserId);
    console.log('Creare comandă pentru - userId final:', userId);
    console.log('Creare comandă pentru - guestId:', guestId);
    
    // Verifică disponibilitatea stocului și actualizează informațiile de reducere pentru fiecare produs
    const processedOrderItems = [];
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          message: `Produsul cu ID-ul ${item.product} nu a fost găsit` 
        });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Nu există stoc suficient pentru ${product.name}. Disponibil: ${product.stock}` 
        });
      }

      // Procesează informațiile de reducere
      const processedItem = {
        product: item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        hasActiveDiscount: product.hasActiveDiscount || false,
        discountedPrice: product.hasActiveDiscount ? product.discountedPrice : undefined,
        discountPercentageDisplay: product.hasActiveDiscount ? product.discountPercentageDisplay : 0
      };
      
      processedOrderItems.push(processedItem);
    }
    
    // Recalculează prețurile cu reduceri aplicate
    const calculatedItemsPrice = processedOrderItems.reduce((acc, item) => {
      const priceToUse = item.hasActiveDiscount ? item.discountedPrice : item.price;
      return acc + (priceToUse * item.quantity);
    }, 0);
    
    const calculatedShippingPrice = calculatedItemsPrice > 200 ? 0 : 20;
    const calculatedTotalPrice = calculatedItemsPrice + calculatedShippingPrice;
    
    console.log('Prețuri calculate pe backend:');
    console.log('Items price (cu reduceri):', calculatedItemsPrice);
    console.log('Shipping price:', calculatedShippingPrice);
    console.log('Total price:', calculatedTotalPrice);
    
    // Creează comanda cu prețurile recalculate
    const order = new Order({
      user: userId || undefined,
      guestId: userId ? undefined : guestId,
      orderItems: processedOrderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: calculatedItemsPrice,
      shippingPrice: calculatedShippingPrice,
      totalPrice: calculatedTotalPrice,
      orderNotes,
      isPaid: paymentMethod === 'card', // marcat ca plătit doar dacă metoda de plată este card
      paidAt: paymentMethod === 'card' ? Date.now() : undefined
    });
    
    // Salvează comanda în baza de date
    const createdOrder = await order.save();
    console.log('Comandă salvată în baza de date cu ID:', createdOrder._id);
    console.log('Comando asociată utilizatorului:', createdOrder.user || 'Guest');
    
    // Actualizează stocul pentru fiecare produs
    for (const item of processedOrderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }
    
    // Golește coșul utilizatorului după plasarea comenzii
    if (userId || guestId) {
      let cart;
      if (userId) {
        cart = await Cart.findOne({ user: userId });
      } else if (guestId) {
        cart = await Cart.findOne({ guestId });
      }
      
      if (cart) {
        cart.items = [];
        await cart.save();
        console.log('Coș golit după plasarea comenzii');
      }
    }
    
    console.log('Comandă creată cu succes:', createdOrder._id);
    res.status(201).json({ 
      success: true, 
      message: 'Comandă plasată cu succes', 
      order: createdOrder 
    });
    
  } catch (err) {
    console.error('Eroare la crearea comenzii:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Obține toate comenzile unui utilizator
exports.getMyOrders = async (req, res) => {
  try {
    console.log('Request user object:', req.user);
    console.log('Request query:', req.query);
    
    // Extrage user ID-ul din obiectul user (poate fi _id sau id)
    const userId = req.user?._id || req.user?.id;
    const guestId = req.query.guestId;
    
    console.log('Extracted userId from token:', userId);
    console.log('Extracted guestId from query:', guestId);
    
    // Dacă nu avem nici un ID de utilizator și nici guestId, returnăm eroare
    if (!userId && !guestId) {
      console.error('Missing userId and guestId');
      return res.status(400).json({ success: false, message: 'ID utilizator sau guestId necesar' });
    }
    
    // Construim filtrul pentru a găsi comenzile
    let filter = {};
    if (userId) {
      console.log('Searching for user orders with userId:', userId);
      filter.user = userId;
    } else {
      console.log('Searching for guest orders with guestId:', guestId);
      filter.guestId = guestId;
    }
    
    console.log('Using MongoDB filter:', filter);
    
    // Găsim comenzile și le sortăm după data creării (descendent - cele mai noi primele)
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    console.log(`Found ${orders.length} orders for ${userId ? 'user' : 'guest'}`);
    
    if (orders.length === 0) {
      console.log('No orders found with filter:', filter);
    } else {
      console.log('Orders found, returning to client');
    }
    
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Eroare la obținerea comenzilor:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Obține o comandă specifică după ID
exports.getOrderById = async (req, res) => {
  try {
    console.log('getOrderById called with params:', req.params);
    console.log('User object from request:', req.user);
    
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    
    if (!order) {
      console.log(`Order not found with ID ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Comanda nu a fost găsită' });
    }
    
    // Verifică dacă utilizatorul curent este proprietarul comenzii sau admin
    const userId = req.user?._id;
    const guestId = req.query.guestId;
    const isAdmin = req.user?.isAdmin === true || req.user?.role === 'admin';
    
    console.log('Order access check: userId =', userId, 'isAdmin =', isAdmin, 'guestId =', guestId);
    console.log('Order belongs to:', order.user?._id || order.guestId);
    
    if ((order.user && order.user.toString() !== userId?.toString()) && 
        (order.guestId !== guestId) && 
        (!isAdmin)) {
      console.log('Access denied to order');
      return res.status(403).json({ success: false, message: 'Nu aveți permisiunea de a vedea această comandă' });
    }
    
    console.log('Access granted to order, returning data');
    res.json({ success: true, order });
  } catch (err) {
    console.error('Eroare la obținerea comenzii:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Obține o comandă specifică după ID pentru pagina de confirmare
// Această rută este publică pentru a permite vizualizarea comenzii imediat după plasare
exports.getOrderByIdFromConfirmation = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Comanda nu a fost găsită' });
    }
    
    // Pentru pagina de confirmare, permitem accesul fără autentificare
    // Dar verificăm timestamp-ul comenzii - permitem acces doar la comenzi recente (< 60 minute)
    const orderCreationTime = new Date(order.createdAt).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - orderCreationTime; // în milisecunde
    const oneHour = 60 * 60 * 1000; // 60 minute în milisecunde
    
    if (timeDifference > oneHour) {
      // Pentru comenzi mai vechi de o oră, aplicăm verificările normale de permisiune
      const userId = req.user?._id;
      const guestId = req.query.guestId;
      
      if ((order.user && order.user.toString() !== userId?.toString()) && 
          (order.guestId !== guestId) && 
          (!req.user?.isAdmin)) {
        return res.status(403).json({ success: false, message: 'Nu aveți permisiunea de a vedea această comandă' });
      }
    }
    
    res.json({ success: true, order });
  } catch (err) {
    console.error('Eroare la obținerea comenzii pentru confirmare:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Actualizează statusul comenzii (doar pentru admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status necesar' });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Comanda nu a fost găsită' });
    }
    
    order.status = status;
    
    // Actualizează alte câmpuri în funcție de status
    if (status === 'livrată') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }
    
    const updatedOrder = await order.save();
    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error('Eroare la actualizarea statusului comenzii:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Marchează comanda ca plătită
exports.updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Comanda nu a fost găsită' });
    }
    
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address
    };
    
    const updatedOrder = await order.save();
    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error('Eroare la actualizarea statusului de plată:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Obține toate comenzile (doar pentru admin)
exports.getAllOrders = async (req, res) => {
  try {
    // Check if we should filter by userId
    const userId = req.query.userId;
    
    // Create the filter object
    let filter = {};
    if (userId) {
      filter.user = userId;
    }
    
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Eroare la obținerea comenzilor:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}; 