DOCKER_CMD 	?= $(shell command -v podman || command -v docker)
VSCODE_VERSION = 1.103.2

serve: vscode
	python3 -m http.server 8001
.PHONY: serve

vscode:
	$(DOCKER_CMD) build --build-arg VSCODE_VERSION=$(VSCODE_VERSION) -t vscode-web .
	@CIDFILE=$$(mktemp); \
	$(DOCKER_CMD) create --cidfile $$CIDFILE vscode-web; \
	CONTAINER_ID=$$(cat $$CIDFILE); \
	mkdir -p ./assets; \
	$(DOCKER_CMD) cp $$CONTAINER_ID:/vscode-web/. ./vscode; \
	$(DOCKER_CMD) rm -f $$CONTAINER_ID; \
	rm -f $$CIDFILE; \
	echo "Artifacts extracted and container cleaned up."
