const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Crypt Dashboard running on port ${PORT}`);
});
