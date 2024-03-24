.DEFAULT_GOAL := help

.PHONY: help
help: # Show help for each of the Makefile recipes.
	@grep -E '^[a-zA-Z0-9 -]+:.*#'  Makefile | sort | while read -r l; do printf "\033[1;32m$$(echo $$l | cut -f 1 -d':')\033[00m:$$(echo $$l | cut -f 2- -d'#')\n"; done


.PHONY: demo
demo: # Starts the CommonAPI in a demo mode. Feeding mocked data.
	export DEMO=true && npm run start

.PHONY: format
format: # Formats the code.
	npm run format

.PHONY: up
local-up: # Starts the app.
	npm run start

.PHONY: show-envs
show-envs: # Shows the environment variables that are set.
	@(env | grep 'COMMON_API_' || true)
