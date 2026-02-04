# Warehouse Backend API

A comprehensive warehouse management system backend built with Node.js, Express, TypeScript, and MongoDB.

## Features

- 📦 Package management and tracking
- 👥 Customer management
- 📊 Inventory tracking and analytics
- 🔐 Secure authentication with JWT
- 📧 Email notifications
- 🚀 Rate limiting and security middleware
- 📝 Comprehensive API documentation
- 🧪 Full test coverage

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **Validation**: Express Validator
- **Testing**: Jest & Supertest
- **Logging**: Winston

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 5.0+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp warehouse-env.example .env
   ```
   Edit the `.env` file with your configuration.

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

See `warehouse-env.example` for all available environment variables.

## API Documentation

### Warehouse Endpoints

- `GET /api/warehouse/packages` - List all packages
- `POST /api/warehouse/packages` - Create new package
- `GET /api/warehouse/packages/:id` - Get package details
- `PUT /api/warehouse/packages/:id` - Update package
- `DELETE /api/warehouse/packages/:id` - Delete package

### Customer Endpoints

- `GET /api/customer/packages` - Get customer packages
- `POST /api/customer/shipping` - Add shipping address
- `GET /api/customer/profile` - Get customer profile

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with sample data

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT
