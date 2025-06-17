# Start from the official LTS Node image.
FROM node:22 AS builder

WORKDIR /usr/src/app

# Install Vault CLI for Kubernetes authentication
RUN apt-get update && \
    apt-get install -y wget unzip && \
    wget https://releases.hashicorp.com/vault/1.19.5/vault_1.19.5_linux_amd64.zip && \
    unzip vault_1.19.5_linux_amd64.zip && \
    mv vault /usr/local/bin/ && \
    chmod +x /usr/local/bin/vault && \
    rm vault_1.19.5_linux_amd64.zip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy the package files and download the dependencies.
# This is done before installing dependencies or copying code to leverage Docker cache layers.
COPY package*.json ./

# Copy the source code from the current directory to the working directory inside the container.
COPY . .

RUN npm run build

ENTRYPOINT [ "npm" ]

# Continue with the official LTS Node image to create a build artifact.
FROM node:22

WORKDIR /usr/src/app

# Copy application files from the base stage
COPY --from=builder /usr/src/app .

# Install only production dependencies from the lock file.
RUN npm ci --silent --production

EXPOSE 8080

# Define the entry point for the docker image.
# This is the command that will be run when the container starts.
ENTRYPOINT [ "npm" ]
CMD [ "run", "start" ]
