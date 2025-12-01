.DEFAULT_GOAL := help
.PHONY: help validate build deploy demo

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "%-15s %s\n", $$1, $$2}'

validate: ## Validate templates and configuration
	cd src/runtime && node --test
	cd src/generator && node --test
	cd src/deploy && node --test

build: ## Build Confluence automation artifacts from templates
	cd src/generator && npm install
	node src/generator

deploy: ## Deploy generated definitions to Confluence Cloud
	node src/deploy

demo: ## Run end-to-end demo (simulates a page event through the full pipeline)
	node src/demo
