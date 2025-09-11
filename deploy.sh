#!/bin/bash
# 🚀 AI Image Generator - Deploy Script
# Automatizza build e deploy Docker

set -e  # Exit on any error

echo "🐳 AI Image Generator - Docker Deploy Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
BUILD_CACHE="--no-cache"
COMPOSE_FILE="docker-compose.dev.yml"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --use-cache)
            BUILD_CACHE=""
            shift
            ;;
        -p|--production)
            ENVIRONMENT="production"
            COMPOSE_FILE="docker-compose.yml"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --env ENV        Set environment (development|production)"
            echo "  -p, --production     Use production configuration"
            echo "  --use-cache          Use Docker build cache"
            echo "  -h, --help           Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Set compose file based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    COMPOSE_FILE="docker-compose.yml"
    echo -e "${BLUE}📦 Production mode selected${NC}"
else
    COMPOSE_FILE="docker-compose.dev.yml"
    echo -e "${YELLOW}🛠️  Development mode selected${NC}"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please create .env file with your API keys:"
    echo "GEMINI_API_KEY=your_key_here"
    echo "OPENAI_API_KEY=your_key_here"
    echo "STABILITY_API_KEY=your_key_here"
    echo "IMAGEN3_PROJECT_ID=your_project_id"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running!${NC}"
    echo "Please start Docker and try again."
    exit 1
fi

echo -e "${BLUE}🔍 Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}📋 Compose file: $COMPOSE_FILE${NC}"

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f $COMPOSE_FILE down || true

# Build the image
echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker-compose -f $COMPOSE_FILE build $BUILD_CACHE

# Start the services
echo -e "${GREEN}🚀 Starting services...${NC}"
docker-compose -f $COMPOSE_FILE up -d

# Wait for health check
echo -e "${YELLOW}⏳ Waiting for health check...${NC}"
sleep 10

# Check if service is healthy
if docker-compose -f $COMPOSE_FILE ps | grep -q "healthy"; then
    echo -e "${GREEN}✅ Service is healthy and running!${NC}"
    echo -e "${GREEN}🌐 Access the application at: http://localhost:3008${NC}"
else
    echo -e "${YELLOW}⚠️  Service started but health check pending...${NC}"
    echo -e "${BLUE}📋 Check logs: docker-compose -f $COMPOSE_FILE logs${NC}"
fi

# Show running containers
echo -e "${BLUE}📦 Running containers:${NC}"
docker-compose -f $COMPOSE_FILE ps

echo -e "${GREEN}✅ Deploy completed!${NC}"
echo ""
echo "Useful commands:"
echo "  View logs:      docker-compose -f $COMPOSE_FILE logs -f"
echo "  Stop services:  docker-compose -f $COMPOSE_FILE down"
echo "  Restart:        docker-compose -f $COMPOSE_FILE restart"
echo "  Shell access:   docker-compose -f $COMPOSE_FILE exec app sh"
