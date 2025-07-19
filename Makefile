# Proofreader Writer - Development Makefile

.PHONY: help dev build start lint clean install stop

# Default target
help: ## Show this help message
	@echo "Proofreader Writer Development Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pnpm install

dev: ## Start development server
	@echo "🚀 Starting development server..."
	@echo "📄 Upstage Document Parser ready"
	@echo "🤖 Solar LLM integration active"
	@echo ""
	@if [ ! -f .env.local ] && [ ! -f .env ]; then \
		echo "⚠️  Warning: No .env file found. Make sure to set UPSTAGE_API_KEY"; \
		echo ""; \
	fi
	pnpm dev

build: ## Build for production
	@echo "🔨 Building for production..."
	pnpm build

start: ## Start production server
	@echo "🌟 Starting production server..."
	pnpm start

lint: ## Run linter
	@echo "🔍 Running linter..."
	pnpm lint

clean: ## Clean dependencies and build files
	@echo "🧹 Cleaning project..."
	rm -rf node_modules
	rm -rf .next
	rm -rf dist

stop: ## Stop development server (if running in background)
	@echo "🛑 Stopping any running development servers..."
	@pkill -f "next dev" || true

restart: stop dev ## Restart development server

setup: install ## Initial project setup
	@echo "⚙️  Setting up proofreader-writer project..."
	@echo ""
	@echo "✅ Dependencies installed"
	@echo ""
	@echo "📝 Next steps:"
	@echo "  1. Create .env file with UPSTAGE_API_KEY"
	@echo "  2. Configure Firebase settings"
	@echo "  3. Run 'make dev' to start development"
	@echo ""

check-env: ## Check if required environment variables are set
	@echo "🔍 Checking environment variables..."
	@ENV_FILE=""; \
	if [ -f .env.local ]; then ENV_FILE=".env.local"; \
	elif [ -f .env ]; then ENV_FILE=".env"; \
	fi; \
	if [ -n "$$ENV_FILE" ]; then \
		echo "📄 Found environment file: $$ENV_FILE"; \
		if grep -q "UPSTAGE_API_KEY" "$$ENV_FILE"; then \
			echo "✅ UPSTAGE_API_KEY found"; \
		else \
			echo "❌ UPSTAGE_API_KEY not found"; \
		fi; \
		if grep -q "FIREBASE" "$$ENV_FILE"; then \
			echo "✅ Firebase configuration found"; \
		else \
			echo "❌ Firebase configuration not found"; \
		fi; \
	else \
		echo "❌ No .env or .env.local file found"; \
	fi

# Docker commands (optional)
docker-build: ## Build Docker image
	docker build -t proofreader-writer .

docker-run: ## Run Docker container
	docker run -p 3000:3000 proofreader-writer

# Development helpers
logs: ## Show development logs
	@echo "📋 Recent development logs:"
	@tail -f .next/server/trace || echo "No trace file found"

# Firebase commands
firebase-setup: ## Show Firebase setup guide and run setup script
	@./setup-firebase.sh

firebase-test: ## Test Firebase configuration
	@echo "🔥 Testing Firebase configuration..."
	@node scripts/firebase-test.js

firebase-complete: ## Complete Firebase setup with service account JSON
	@echo "Usage: make firebase-complete JSON=/path/to/service-account.json"
	@if [ -z "$(JSON)" ]; then \
		echo "❌ Please provide the path to your service account JSON file:"; \
		echo "   make firebase-complete JSON=~/Downloads/your-service-account.json"; \
	else \
		./complete-firebase-setup.sh "$(JSON)"; \
	fi

firebase-console: ## Open Firebase Console for your project
	@open "https://console.firebase.google.com/project/proofreader-writer-1752894578/"

firebase-env-template: ## Generate environment template
	@echo "🔧 Creating .env.local template..."
	@echo "# Copy this template to .env.local and fill in your values" > .env.template
	@echo "" >> .env.template
	@echo "# Firebase Web Config (from Firebase Console > Project Settings)" >> .env.template
	@echo "NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here" >> .env.template
	@echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com" >> .env.template
	@echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id" >> .env.template
	@echo "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com" >> .env.template
	@echo "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id" >> .env.template
	@echo "NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id" >> .env.template
	@echo "" >> .env.template
	@echo "# Firebase Admin (from Service Account JSON)" >> .env.template
	@echo "FIREBASE_PROJECT_ID=your-project-id" >> .env.template
	@echo "FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com" >> .env.template
	@echo 'FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_private_key_content\n-----END PRIVATE KEY-----"' >> .env.template
	@echo "" >> .env.template
	@echo "# Upstage API Key" >> .env.template
	@echo "UPSTAGE_API_KEY=up_your_upstage_key_here" >> .env.template
	@echo "✅ Template created: .env.template"

# Quick commands
q: dev ## Quick start (alias for dev) 