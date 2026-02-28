# DispatchPrime

This is my template for creating full stack programs quickly. The first app I am going to write will be a day-to-day dispatch and shipping process manager for Westmore Carriers.

##  Useful Notes

### MONGO with Docker

The following is the command to start the docker container holding the mongo database that I am using for prototype.
Eventually this will be part of a larger docker/kubernetes setup.

#### Initial Setup
`docker run -d --name my-mongodb -p 27017:27017 -v mongodb_data:/data/db mongo`

#### After System Restart
If the system is restarted or Docker is reset, the container will need to be started:
`docker start my-mongodb`

You can check the container status with:
`docker ps -a | grep mongodb`

A useful command to get database information:
`docker exec -it my-mongodb mongosh`

## Project Structure

- **Backend**: Node.js/TypeScript API using FeathersJS framework
- **Frontend**: Vue.js 3 application with Vuetify UI components

## Backend

Built with FeathersJS, a framework for building APIs and real-time applications.

### Features
- **Framework**: FeathersJS with Koa.js
- **Database**: MongoDB with authentication
- **Transport**: REST API and WebSocket support
- **Schema**: TypeBox for validation
- **Authentication**: Local and OAuth authentication support
- **Language**: TypeScript

### Services
- Users service with authentication

### Development
```bash
cd backend
npm install
npm run dev
```

### Testing
```bash
npm test
```

## Frontend

Vue.js 3 application with modern tooling.

### Features
- **Framework**: Vue.js 3 with Composition API
- **UI Library**: Vuetify 3 with Material Design Icons
- **State Management**: Pinia
- **Build Tool**: Vite
- **Router**: Vue Router with file-based routing
- **TypeScript**: Full TypeScript support

### Development
```bash
cd frontend
npm install
npm run dev
```

### Build
```bash
npm run build
```

## Client Library Linking

FeathersJS can generate a client library that allows the frontend to connect to the backend services. To set this up:

### Backend Client Generation
```bash
cd backend
npm run bundle:client  # Compiles TypeScript and creates packaged client
npm link               # Makes backend package available for linking
```

### Frontend Client Integration
```bash
cd frontend
npm link backend       # Creates symlink to backend client in node_modules
```

This creates a symlink at `frontend/node_modules/backend` that points to the compiled backend client, allowing the frontend to import and use backend services directly.

## Getting Started

1. Install dependencies for both backend and frontend
2. Set up MongoDB database using Docker (see command above)
3. Configure environment variables
4. Generate and link the client library (see Client Library Linking section)
5. Start backend server
6. Start frontend development server

## Current Status

The project is in active development with authentication features being implemented on the `authWork` branch.

## Mongodbsh from docker image
`docker exec -it my-mongodb mongosh`