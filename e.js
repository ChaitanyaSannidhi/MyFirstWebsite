const express = require('express');
const bodyParser = require('body-parser');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const app = express();
const serviceAccount = require("./key.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'f1')));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('login');
});

app.get('/signup', (req, res) => {
  res.render('signup'); 
});

app.get('/welcome', (req, res) => {
  res.render('welcome');
});

app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.collection('users').add({
      username,
      email,
      password: hashedPassword
    });
    res.redirect('/');
  } catch (error) {
    console.error('An error occurred while signing up:', error);
    res.status(500).send('Error signing up');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      res.redirect('/signup');
      return;
    }

    let validPassword = false;
    let username = '';
    snapshot.forEach(doc => {
      const user = doc.data();
      if (bcrypt.compareSync(password, user.password)) {
        validPassword = true;
        username = user.username;
      }
    });

    if (validPassword) {
      res.render('weatherForm', { username });
    } else {
      res.send('Invalid credentials');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).send('An error occurred while logging in');
  }
});

app.get('/weather', (req, res) => {
  res.render('weatherForm');
});

app.post('/weather', async (req, res) => {
  const city = req.body.city;
  const apiKey = '19ff3ca1330f49eca33171502243006'; // Replace with your actual API key
  const apiUrl = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}`;

  try {
    const response = await axios.get(apiUrl);
    const weatherData = response.data;
    res.render('weatherResult', { weather: weatherData });
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).send('Error fetching weather data');
  }
});

app.listen(10000, () => { 
  console.log('Server is running on port 10000');
});
