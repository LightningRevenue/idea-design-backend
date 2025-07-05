const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../src/models/Product');

async function migrateBrandToNull() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all products where brand is an empty string
        const productsToUpdate = await Product.find({
            $or: [
                { brand: '' },
                { brand: { $exists: true, $eq: '' } }
            ]
        });

        console.log(`Found ${productsToUpdate.length} products with empty brand strings`);

        // Update all products with empty brand to null
        const updateResult = await Product.updateMany(
            {
                $or: [
                    { brand: '' },
                    { brand: { $exists: true, $eq: '' } }
                ]
            },
            { $set: { brand: null } }
        );

        console.log(`Updated ${updateResult.modifiedCount} products`);

        // Verify the update
        const remainingEmptyBrands = await Product.find({
            $or: [
                { brand: '' },
                { brand: { $exists: true, $eq: '' } }
            ]
        });

        if (remainingEmptyBrands.length > 0) {
            console.log('Warning: Some products still have empty brand strings:');
            console.log(remainingEmptyBrands.map(p => ({ id: p._id, name: p.name })));
        } else {
            console.log('All empty brand strings have been successfully converted to null');
        }

        // Show all unique brand values in the database
        const uniqueBrands = await Product.distinct('brand');
        console.log('\nCurrent unique brand values in database:');
        console.log(uniqueBrands);

    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the migration
migrateBrandToNull(); 