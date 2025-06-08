# 💬 gptforum
OpenAI chat completion on Discord Forums (succeeder of [pmh-only/djs-gpt-forum](https://github.com/pmh-only/djs-gpt-forum))

## Demonstration Video
https://github.com/user-attachments/assets/b3d6fd18-0196-41fe-a81a-709ebebaad8a

## Features
* Automatically detects new forum threads and uses OpenAI chat completion to generate a response.
* Supports multiple OpenAI models. (e.g. `gpt-4o`, `o4-mini`, etc.)
* Automatically slices long responses into multiple messages.
* Displays consumed tokens in the response.
* Ignores messages that are not OP (Original Poster) replies.

## How to Use
This project provides Container Images for easy deployment. You can run it using Docker or Podman.

### 0. Prerequisites
* Docker or Podman installed on your machine.
* A Discord bot token with permissions to read and send messages in the specified channel.
* An OpenAI API key with access to the desired models.
* A MySQL database for storing forum data.

### 1. Prepare Environment Variables
Create a `.env` file in the root directory of the project with the following content:

```dotenv
OPENAI_API_KEY=<your_openai_api_key>
DISCORD_TOKEN=<your_discord_bot_token>
DISCORD_CHANNEL=<your_discord_channel_id>
DATABASE_URL=mysql://<user>:<password>@<host>:<port>/<database_name>
```

for example:

```dotenv
OPENAI_API_KEY=sk-1234567890abcdefg
DISCORD_TOKEN=MTExMTExMTExMTExMTExMTEx.GH1234.5678abcdefghijklmno
DISCORD_CHANNEL=123456789012345678
DATABASE_URL=mysql://gptforum:gptforum@localhost:3306/gptforum
```

### 2. Migrate Database with migrator image
You can use the `gptforum-migrator` image to migrate the database schema. Run the following command:

```bash
docker run --rm --env-file .env ghcr.io/pmh-only/gptforum-migrator:next
```

### 3. Run the Bot
You can run the bot using the `gptforum` image. Use the following command:

```bash
docker run --rm --env-file .env ghcr.io/pmh-only/gptforum:next
```

## Kubernetes Deployment
You can deploy the bot on Kubernetes using init containers for database migration and a main container for the bot. Here is an example `Deployment` manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gptforum
spec:
  replicas: 1
  selector:
    matchLabels:
      app: gptforum
  template:
    metadata:
      labels:
        app: gptforum
    spec:
      initContainers:
      - name: migrator
        image: ghcr.io/pmh-only/gptforum-migrator:next
        envFrom:
        - secretRef:
            name: gptforum-env
      containers:
      - name: gptforum
        image: ghcr.io/pmh-only/gptforum:next
        envFrom:
        - secretRef:
            name: gptforum-env
```

You need to create a Kubernetes `Secret` named `gptforum-env` with the environment variables defined in the `.env` file.

> you can simply import the `.env` file into a Kubernetes `Secret` using the following command:
> ```bash
> kubectl create secret generic gptforum-env --from-env-file=.env
> ```

## License
&copy; 2025. Minhyeok Park (@pmh-only) <pmh_only@pmh.codes>

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
