.DEFAULT_GOAL := help

.PHONY: help
help: # Show help for each of the Makefile recipes.
	@grep -E '^[a-zA-Z0-9 -]+:.*#'  Makefile | sort | while read -r l; do printf "\033[1;32m$$(echo $$l | cut -f 1 -d':')\033[00m:$$(echo $$l | cut -f 2- -d'#')\n"; done


.PHONY: demo
demo: # Starts the CommonAPI in a demo mode. Feeding mocked data.
	export COMMON_API_ENABLE_DEMO_MODE=true && npm run start

.PHONY: format
format: # Formats the code.
	npm run format

.PHONY: local-up
local-up: # Starts the app.
	@npm run start

.PHONY: dev-up
dev-up: # Starts the app using dev environment GraphQL db.
	export NODE_APP_INSTANCE=dev && npm run start

.PHONY: local-prod
local-prod: # Starts the app using prod environment GraphQL db.
	export NODE_APP_INSTANCE=prod && npm run start

.PHONY: show-envs
show-envs: # Shows the environment variables that are set.
	@(env | grep 'COMMON_API_' || true)
