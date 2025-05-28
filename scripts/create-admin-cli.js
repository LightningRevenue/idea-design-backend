// backend/scripts/create-admin-cli.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); // Adjusted path to .env at the project root
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin'); // Adjusted path to Admin model
const readline = require('readline');

// Function to connect to DB
async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI is not defined in your .env file.');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
}

// Function to prompt for input
function getAdminDetails() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Enter admin username: ', (username) => {
      rl.question('Enter admin email: ', (email) => {
        rl.question('Enter admin password: ', (password) => {
          rl.close();
          resolve({ username, email, password });
        });
      });
    });
  });
}

async function main() {
  await connectDB();

  console.log('Please provide the details for the new admin user.');
  const { username, email, password } = await getAdminDetails();

  if (!username || !email || !password) {
    console.error('Error: Username, email, and password are required.');
    return;
  }

  try {
    const newAdmin = new Admin({ username, email, password });
    await newAdmin.save(); // Mongoose pre-save hook should hash password
    console.log(`Admin user "${username}" created successfully!`);
  } catch (err) {
    console.error('Error creating admin user:');
    if (err.code === 11000) { // Duplicate key error
      if (err.keyPattern && err.keyPattern.username) {
        console.error(`  - Username "${username}" already exists.`);
      } else if (err.keyPattern && err.keyPattern.email) {
        console.error(`  - Email "${email}" already exists.`);
      } else {
        console.error('  - Duplicate key error on username or email.');
      }
    } else if (err.errors) { // Validation errors
        for (const field in err.errors) {
            console.error(`  - ${err.errors[field].message}`);
        }
    }
    else {
      console.error('  - An unexpected error occurred:', err.message);
    }
  }
}

main()
  .catch(err => {
    console.error('Script failed unexpectedly:', err);
  })
  .finally(() => {
    mongoose.disconnect().then(() => {
      console.log('MongoDB Disconnected.');
    }).catch(err => {
      console.error('Error disconnecting MongoDB:', err);
    });
  });