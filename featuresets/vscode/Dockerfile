FROM docker.io/node:22-alpine
ARG VSCODE_VERSION
RUN apk add -u krb5-dev libx11-dev libxkbfile-dev libsecret-dev git build-base python3
RUN git clone --depth 1 https://github.com/microsoft/vscode.git -b $VSCODE_VERSION
WORKDIR /vscode
RUN npm i
RUN npm run gulp vscode-web-min
