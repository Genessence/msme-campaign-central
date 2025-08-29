# MSME Campaign Central - FastAPI Backend

A modern Python FastAPI backend for the MSME Campaign Central system.

## Quick Start

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings and configuration
│   ├── database.py          # Database connection setup
│   └── api/
│       ├── __init__.py
│       ├── deps.py          # Dependencies (auth, db)
│       └── v1/
│           ├── __init__.py
│           ├── api.py       # API router setup
│           └── endpoints/
│               ├── __init__.py
│               ├── auth.py
│               ├── campaigns.py
│               ├── vendors.py
│               ├── templates.py
│               └── analytics.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py      # JWT, password hashing
│   │   └── config.py        # Core configuration
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── vendor.py
│   │   ├── campaign.py
│   │   └── response.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py          # Pydantic schemas
│   │   ├── vendor.py
│   │   ├── campaign.py
│   │   └── response.py
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── base.py          # Base CRUD operations
│   │   ├── user.py
│   │   ├── vendor.py
│   │   └── campaign.py
│   └── services/
│       ├── __init__.py
│       ├── email.py         # Email service
│       ├── whatsapp.py      # WhatsApp service
│       ├── campaign.py      # Campaign execution
│       └── auth.py          # Authentication service
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   └── test_campaigns.py
├── alembic/                 # Database migrations
├── requirements.txt
├── .env.example
└── README.md
```

## Features

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Migrations**: Alembic for database versioning
- **Validation**: Pydantic for request/response validation
- **Documentation**: Auto-generated OpenAPI/Swagger docs
- **Testing**: Pytest with async support
- **Background Tasks**: Celery with Redis
- **Email**: SendGrid/SMTP integration
- **WhatsApp**: Business API integration
- **File Upload**: Secure file handling with validation
- **Monitoring**: Structured logging and health checks

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - User logout

### Vendors
- `GET /api/v1/vendors/` - List vendors (paginated)
- `POST /api/v1/vendors/` - Create vendor
- `GET /api/v1/vendors/{id}` - Get vendor details
- `PUT /api/v1/vendors/{id}` - Update vendor
- `DELETE /api/v1/vendors/{id}` - Delete vendor
- `POST /api/v1/vendors/bulk-import` - Bulk import from CSV

### Campaigns
- `GET /api/v1/campaigns/` - List campaigns
- `POST /api/v1/campaigns/` - Create campaign
- `GET /api/v1/campaigns/{id}` - Get campaign details
- `PUT /api/v1/campaigns/{id}` - Update campaign
- `POST /api/v1/campaigns/{id}/execute` - Execute campaign
- `GET /api/v1/campaigns/{id}/status` - Get execution status
- `GET /api/v1/campaigns/{id}/analytics` - Campaign analytics

### Templates
- `GET /api/v1/templates/email` - List email templates
- `POST /api/v1/templates/email` - Create email template
- `GET /api/v1/templates/whatsapp` - List WhatsApp templates
- `POST /api/v1/templates/whatsapp` - Create WhatsApp template

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard metrics
- `GET /api/v1/analytics/campaigns/{id}/report` - Campaign report
- `GET /api/v1/analytics/export` - Export data

## Development

### Running Tests
```bash
pytest
pytest --cov=app tests/  # With coverage
```

### Database Migrations
```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Code Quality
```bash
black app/  # Format code
isort app/  # Sort imports
flake8 app/ # Lint code
mypy app/   # Type checking
```

## Deployment

### Docker
```bash
docker build -t msme-backend .
docker run -p 8000:8000 msme-backend
```

### Production
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Configuration

Key environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT signing key
- `SENDGRID_API_KEY` - Email service
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp Business API
- `REDIS_URL` - Background tasks queue
- `SUPABASE_URL` - Optional: Supabase integration
- `SUPABASE_SERVICE_ROLE_KEY` - Optional: Supabase admin access
