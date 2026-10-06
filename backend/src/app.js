require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const swaggerSpec = require('./docs/swagger.json');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static Uploads Folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Interactive API Documentation Endpoint
app.get('/api-docs', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// API Routes
app.use('/api/v1', routes);

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
