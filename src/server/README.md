# Cursor Projects Manager - Backend

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres123@10.66.7.5:5432/business-deregistration?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-change-this-key-to-something-very-random"
JWT_EXPIRE="7d"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173"

# Port Allocation
PORT_ALLOCATION_MIN=1000
PORT_ALLOCATION_MAX=2000
PORT_ALLOCATION_DEFAULT_COUNT=10
PORT_ALLOCATION_MAX_PER_PROJECT=50
PORT_ALLOCATION_MAX_RETRIES=3
PORT_ALLOCATION_RETRY_DELAY_MS=100
```

## Development Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Run database migrations (if needed)
npm run db:migrate

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Open Prisma Studio
npm run db:studio
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Projects
- `GET /api/projects` - Get all projects for current user
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project (supports updating port remarks)
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/details` - Get project with tasks and AI executions
- `POST /api/projects/:id/allocate-ports` - Allocate ports for a project

#### Port Allocation
The port allocation system allows projects to automatically allocate unique ports within a configurable range (default: 1000-2000). Each project can allocate up to 50 ports by default.

**Allocate Ports Request:**
```json
POST /api/projects/:id/allocate-ports
{
  "count": 10
}
```

**Response:**
```json
{
  "code": 200,
  "msg": "成功分配10个端口",
  "data": [
    {
      "port": 1000,
      "remark": "",
      "allocatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Project already has allocated ports, invalid count, or insufficient available ports
- `404 Not Found`: Project not found
- `409 Conflict`: Insufficient ports available in the allocation range

**Update Port Remarks:**
```json
PUT /api/projects/:id
{
  "ports": [
    {
      "port": 1000,
      "remark": "Frontend port",
      "allocatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Tasks
- `GET /api/tasks/project/:projectId` - Get tasks for a project
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/order` - Update task order (drag & drop)

### AI Status (Project-based)
- `PUT /api/projects/:id/ai-status` - Update AI execution status for a project
- `GET /api/projects/ai-status/running` - Get projects with running AI executions

## Port Allocation System

The backend includes an automatic port allocation system that ensures unique port assignments across all projects. Key features:

- **Atomic Allocation**: Uses database transactions to prevent concurrent allocation conflicts
- **Sequential Assignment**: Ports are allocated sequentially from the minimum port number
- **Configurable Range**: Default range is 1000-2000, configurable via environment variables
- **Project Limits**: Each project can allocate up to 50 ports by default
- **Remark Support**: Each allocated port can have a custom remark/note

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT_ALLOCATION_MIN` | 1000 | Minimum port number for allocation |
| `PORT_ALLOCATION_MAX` | 2000 | Maximum port number for allocation |
| `PORT_ALLOCATION_DEFAULT_COUNT` | 10 | Default number of ports to allocate |
| `PORT_ALLOCATION_MAX_PER_PROJECT` | 50 | Maximum ports per project |
| `PORT_ALLOCATION_MAX_RETRIES` | 3 | Max retries for concurrent allocation conflicts |
| `PORT_ALLOCATION_RETRY_DELAY_MS` | 100 | Delay between retry attempts |

### Database Schema

The system uses two database entities:
- `PortAllocation`: Tracks which ports are allocated to which projects
- `Project.ports`: JSON field storing allocated ports with remarks and timestamps

## WebSocket Events

### Client to Server
- `ai-status-update` - Broadcast AI status updates

### Server to Client
- `ai-status-updated` - Receive AI status updates
