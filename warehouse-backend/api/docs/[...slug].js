const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const slug = req.query.slug;
    const filePath = path.join(__dirname, '../../node_modules/swagger-ui-dist', slug);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).send('File not found');
      return;
    }
    
    // Set correct MIME type based on file extension
    const ext = path.extname(filePath);
    const mimeTypes = {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Send file
    const fileContent = fs.readFileSync(filePath);
    res.send(fileContent);
  } catch (error) {
    console.error('Error serving static file:', error);
    res.status(500).send('Internal server error');
  }
};
