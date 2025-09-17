# Distributed RPC Worker Service

This project sets up a distributed system where HTTP workers communicate through RabbitMQ and Redis to process tasks like calculations or string transformations.

## Features

- Multiple HTTP workers for better scalability.
- Uses RabbitMQ for communication between workers (RPC).
- Supports task processing like summing numbers or converting text to uppercase.
- Workers are fault-tolerant; if one fails, another replaces it automatically.

## Requirements

- Node.js (v14 or higher)
- Docker (for RabbitMQ and Redis)
- RabbitMQ
- Redis

## Setup

1. Clone the repository:
   https://github.com/AvaniBaheti/RabbitMq-RPC.git

2. Install dependencies:
   npm install

3. Set up environment variables:  
   Create a `.env` file in the root with the following:

        AMQP_URL=amqp://localhost:5672
        
        REDIS_URL=redis://localhost:6379
        
        RPC_REQUEST_QUEUE=rpc.requests
        
        RPC_REPLY_QUEUE=rpc.replies
        
        RPC_TIMEOUT_MS=10000
        
        PORT=3000

4. Set up Docker containers for RabbitMQ and Redis:  
   Run the following to start RabbitMQ and Redis:

      docker-compose up

5. Start the app:

      npm run worker

      npm run dev
   
   This will start the server with workers based on the available CPU cores.

## API Endpoints

### `POST /compute`

This endpoint takes a JSON payload and performs computation.

#### Request Example

1. For upper case:

        curl -X POST http://localhost:3000/compute \
         -H "Content-Type: application/json" \
         -d '{
        "action": "sum",
        "n": 1000
        }'

2. For sum of n numbers:

        curl -X POST http://localhost:3000/compute \
         -H "Content-Type: application/json" \
         -d '{
        "action": "uppercase",
        "text": "hello world"
        }'
