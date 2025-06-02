# NestJS Automated JWT Authentication

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<p align="center">A fully automated server-side authentication system built with NestJS and JWT.</p>

<p align="center">
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
  <a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
</p>

## Overview

This project implements a fully server-side authentication system using NestJS and JSON Web Tokens (JWT). Unlike traditional JWT implementations that require client-side token management, this solution automates the access and refresh token handling process.

### Key Features

- **Automated token refresh**: No need for the client to manually request a refresh token
- **Secure HTTP-only cookies**: Protects tokens from XSS attacks
- **Role-based access control**: Admin and user-level permissions
- **Password reset workflow**: Complete with email notifications
- **Token management**: Automatic cleanup of expired tokens
- **Rate limiting**: Protection against brute-force attacks
- **Session management**: Users are limited to 3 active sessions
- **Google OAuth integration**: Simplified social login with Google

## Tech Stack

- **NestJS**: Progressive Node.js framework
- **Mongoose**: MongoDB object modeling for Node.js
- **JWT**: JSON Web Tokens for authentication
- **Bcrypt**: Secure password hashing
- **Fastify**: Fast HTTP server
- **Handlebars**: Email templating
- **Passport.js**: Authentication middleware for Google OAuth

## Architecture

The authentication flow works as follows:

1. **Login**: User provides credentials and receives access and refresh tokens
2. **Token Usage**: Access token is sent with each request via Authorization header
3. **Automatic Refresh**: When the access token expires, the system automatically uses the refresh token to issue a new one
4. **Security**: Refresh tokens are stored in HTTP-only cookies and hashed in the database

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- MongoDB database

### Installation

```bash
# Install dependencies
$ npm install
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```
# Application
PORT=3001
ORIGIN=http://localhost:3000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_PASSWORD_SECRET=your_jwt_password_secret_key
COOKIE_SECRET=your_cookie_secret_key

# Database
MONGODB_URI=mongodb://localhost:27017/auth_db

# Mail
MAILER_TRANSPORT=smtp://localhost:1025
MAILER_DEFAULT_FROM=noreply@example.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
```

### Running the Application

```bash
# Development mode
$ npm run start:dev

# Production mode
$ npm run start:prod
```

### Testing

```bash
# Unit tests
$ npm run test

# E2E tests
$ npm run test:e2e

# Test coverage
$ npm run test:cov
```

## API Endpoints

### Authentication

- **POST /auth/login** - Authenticate user and get tokens
- **POST /auth/logout** - Invalidate refresh token
- **POST /auth/refresh** - Refresh access token (automatic)
- **POST /auth/password-reset** - Request password reset link
- **POST /auth/reset-password** - Confirm password reset with token
- **GET /auth/google** - Initiate Google OAuth authentication
- **GET /auth/google/callback** - Google OAuth callback handler

### Users

- **GET /users** - Get all users (admin only)
- **GET /users/:id** - Get user by ID
- **POST /users** - Create new user
- **PATCH /users/:id** - Update user
- **DELETE /users/:id** - Delete user

## Security Considerations

This implementation includes several security features:

- **HTTP-only cookies** for refresh tokens to prevent XSS attacks
- **Refresh token rotation** to prevent token reuse
- **Rate limiting** to prevent brute force attacks
- **Session limits** to prevent token stealing
- **Token expiration** with automatic cleanup
- **Password hashing** using bcrypt
- **OAuth state verification** to prevent CSRF attacks during Google authentication

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is [MIT licensed](LICENSE).
