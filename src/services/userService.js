const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const dataDir = path.join(__dirname, '..', '..', 'data');
const usersFilePath = path.join(dataDir, 'users.json');

// Ensure data directory exists
const ensureDataDirectory = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Get users from data/users.json
const getUsers = () => {
  ensureDataDirectory();
  try {
    if (!fs.existsSync(usersFilePath)) {
      fs.writeFileSync(usersFilePath, JSON.stringify([]));
      return [];
    }
    const usersData = fs.readFileSync(usersFilePath);
    if (usersData.length === 0) {
      return [];
    }
    return JSON.parse(usersData);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

// Save users to data/users.json
const saveUsers = (users) => {
  ensureDataDirectory();
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users file:', error);
  }
};

// Initialize users.json if it doesn't exist or is empty
const initializeUsersFile = () => {
  ensureDataDirectory();
  if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([]));
  } else {
    const fileData = fs.readFileSync(usersFilePath);
    if (fileData.length === 0) {
      fs.writeFileSync(usersFilePath, JSON.stringify([]));
    }
  }
};

initializeUsersFile();

// Add a new user
const addUser = async (user) => {
  const users = getUsers();
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const newUser = { email: user.email, password: hashedPassword };
  users.push(newUser);
  saveUsers(users);
  return newUser;
};

// Find a user by email
const findUserByEmail = (email) => {
  const users = getUsers();
  return users.find(user => user.email === email);
};

// Verify password
const verifyPassword = async (submittedPassword, storedPasswordHash) => {
  return await bcrypt.compare(submittedPassword, storedPasswordHash);
};

module.exports = {
  getUsers,
  saveUsers,
  addUser,
  findUserByEmail,
  verifyPassword,
};
