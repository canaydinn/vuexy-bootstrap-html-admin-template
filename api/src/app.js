const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const apiRouter = require('./routes');

const app = express();

app.use(cors({
  origin: 'http://localhost:4000', // geliştirirken
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API
app.use('/api', apiRouter);

// Vuexy statik dosyaları
app.use(express.static(path.join(__dirname, '../../admin')));

// SPA tarzı değilsek bunu şimdilik kullanma; belirli html sayfalarına direkt gideceğiz.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../../admin/html/vertical-menu-template/index.html'));
// });

module.exports = app;
