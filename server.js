const express = require('express');
const app = express();
const db = require('./database/db-init');
const PORT = process.env.PORT || 8200;
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
dotenv.config();
 
app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

app.listen(PORT, () => {
    console.log(`Your Blue.Space server is running on port ${PORT} and on the http://localhost:${PORT}/ URL`);
})