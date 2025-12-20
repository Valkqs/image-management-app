# Image Management Application

A full-stack web application for managing and organizing images with AI-powered features. Built as a course project for B/S Architecture Software Design.

## Overview

This image management system provides a comprehensive solution for uploading, organizing, searching, and managing personal image collections. It features intelligent AI-powered tagging, EXIF data extraction, and natural language search capabilities through MCP (Model Context Protocol) integration.

## Features

### Core Features

- **User Authentication**
  - User registration and login with JWT-based authentication
  - Email validation and unique username/email enforcement
  - Secure password hashing

- **Image Management**
  - Upload images via web browser (PC and mobile)
  - Automatic thumbnail generation
  - Image deletion with confirmation
  - Image editing capabilities (crop, color adjustments)

- **EXIF Data Extraction**
  - Automatic extraction of camera information (make, model)
  - Resolution and metadata capture
  - GPS location data (latitude, longitude)
  - Photo capture timestamp

- **Tag System**
  - Custom user-defined tags
  - AI-generated tags for automatic categorization
  - Tag-based image organization and filtering

- **Search & Discovery**
  - Multi-criteria search (tags, camera, date, etc.)
  - AI-powered natural language search via MCP
  - Filter by shooting month, camera manufacturer, and more

- **User Interface**
  - Responsive design for desktop, tablet, and mobile
  - Modern UI built with Tailwind CSS
  - Image gallery with modal view
  - Toast notifications for user feedback

### AI Features

- **AI Tag Analysis**
  - Automatic image analysis using external AI models
  - Async processing after upload
  - Manual trigger for re-analysis
  - Intelligent tag extraction (scenery, people, animals, etc.)

- **MCP Integration**
  - Natural language image search
  - Conversational interface for image retrieval
  - Integration with large language models

## Tech Stack

### Backend
- **Language**: Go 1.25.1
- **Framework**: Gin
- **Database**: MySQL
- **ORM**: GORM
- **Authentication**: JWT** for stateless auth
- **Image Processing**: EXIF extraction, thumbnail generation

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios

### Infrastructure
- **Database**: MySQL with utf8mb4 encoding
- **File Storage**: Local filesystem for images and thumbnails
- **AI Services**: External API integration (e.g., Gemini, ModelScope)

## Project Structure

```
image-management-app/
├── backend/                 # Go backend application
│   ├── cmd/
│   │   └── main/           # Application entry point
│   ├── internal/
│   │   ├── database/       # Database connection
│   │   ├── handler/        # HTTP handlers
│   │   ├── middleware/     # Auth middleware
│   │   ├── model/          # Data models
│   │   ├── service/        # Business logic (AI service)
│   │   └── utils/          # Utilities (JWT, password)
│   ├── database/
│   │   └── schema.sql      # Database schema
│   └── uploads/            # Image storage
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── pages/         # Page components
│   └── public/            # Static assets
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Go 1.25.1 or later
- Node.js and pnpm (or npm/yarn)
- MySQL 5.7+ or 8.0+
- Git

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
go mod download
```

3. Set up the database:
   - Create a MySQL database
   - Run the schema script: `database/schema.sql`

4. Configure environment variables (see `ENVIRONMENT_VARIABLES.md`):
   - Database connection string
   - JWT secret key
   - AI service API keys
   - Server port

5. Run the backend:
```bash
go run cmd/main/main.go
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure API endpoint in `src/api/client.ts`

4. Run the development server:
```bash
pnpm dev
```

5. Build for production:
```bash
pnpm build
```

## API Documentation

See `api.md` for detailed API endpoint documentation.

## Database Schema

The application uses MySQL with the following main tables:
- `users` - User accounts
- `images` - Image metadata
- `tags` - Image tags (user and AI-generated)

See `backend/database/schema.sql` for the complete schema.

## Environment Configuration

Refer to `backend/ENVIRONMENT_VARIABLES.md` for required environment variables and configuration.

## Development Notes

This project was developed as a comprehensive learning exercise covering:
- Full-stack development with modern technologies
- RESTful API design
- JWT authentication
- AI integration and MCP protocol
- Responsive web design
- Database design and optimization

## License

This project is developed for educational purposes as part of a course assignment.

## Author

Developed as a course project for B/S Architecture Software Design at Zhejiang University.

