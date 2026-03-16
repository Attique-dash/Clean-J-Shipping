module.exports = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Determine the correct API docs URL based on environment
    const host = req.headers.host || 'localhost:5000';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isLocalhost ? 'http' : 'https';
    
    // Use the actual host from the request — works for both local and Vercel
    const apiDocsUrl = `${protocol}://${host}/api-docs`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warehouse API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css">
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }
        .swagger-ui .topbar { background-color: #2c3e50; }
        .swagger-ui .info .title { color: #2c3e50; }
        .swagger-ui .btn.authorize { background-color: #27ae60; border-color: #27ae60; }
        .swagger-ui .btn.execute { background-color: #3498db; border-color: #3498db; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js" crossorigin></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: "${apiDocsUrl}",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                tryItOutEnabled: true,
                defaultModelsExpandDepth: 3,
                defaultModelExpandDepth: 3,
                docExpansion: 'list',
                operationsSorter: 'alpha',
                tagsSorter: 'alpha',
                supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
                // Override the server URL so "Try it out" uses the current host
                requestInterceptor: function(request) {
                    // Replace localhost URLs with the current host
                    if (request.url && request.url.includes('localhost')) {
                        const currentOrigin = window.location.origin;
                        request.url = request.url.replace(/https?:\\/\\/localhost:\\d+/, currentOrigin);
                    }
                    return request;
                }
            });
        };
    </script>
</body>
</html>`;

    res.status(200).send(html);
  } catch (error) {
    console.error('Error serving Swagger UI:', error);
    res.status(500).json({ error: 'Failed to load API documentation' });
  }
};