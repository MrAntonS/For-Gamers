# Backend API Documentation

This document outlines the available backend API endpoints provided by the Flask application.

## Products API

### 1. Get All Products
- **Endpoint:** `GET /api/products`
- **Blueprint:** `products_bp`
- **Description:** Retrieves a list of all available products, including both games and hardware.
- **Response:** JSON array of product objects. Each object contains:
    - `id`: Unique identifier
    - `name`: Product name
    - `price`: Current price
    - `originalPrice`: Original price before discount
    - `image`: URL to product image
    - `category`: "Game" or "Hardware"
    - `discount`: Discount percentage string (e.g., "-50%")
    - `rating`: Product rating (0-5)
    - `brand`: Manufacturer or Publisher
    - `description`: Product description

## MinMax Analysis API

### 1. Get Games List
- **Endpoint:** `GET /api/games/list`
- **Blueprint:** `minmax_bp`
- **Description:** Retrieves a list of games available for selection in the MinMax Analysis tool.
- **Response:** JSON array of game objects. Each object contains:
    - `id`: Unique identifier
    - `name`: Game name
    - `category`: Game genre
    - `image`: URL to game cover image

### 2. Recommend Setup
- **Endpoint:** `POST /api/minmax/recommend`
- **Blueprint:** `minmax_bp`
- **Description:** Calculates the recommended hardware setup based on a list of selected games. It determines the minimum GPU, CPU, and Memory required to run the most demanding game in the selection.
- **Request Body:**
    ```json
    {
        "game_ids": [1, 2, 3]
    }
    ```
    - `game_ids`: Array of integers representing the IDs of the selected games.
- **Response:** JSON object containing:
    - `recommended_gpu`: Object with `name`, `score`, and `price`.
    - `recommended_cpu`: Object with `name`, `score`, and `price`.
    - `recommended_memory`: Object with `name`, `score`, and `price`.
    - `selected_games_count`: Total number of games selected.
    - `most_demanding_game`: Details of the game that drove the recommendation.
    - `selected_games`: List of selected games with their individual requirements.
- **Error Responses:**
    - `400 Bad Request`: If `game_ids` is missing, not a list, empty, or contains non-integers.
    - `404 Not Found`: If no valid games are found or if no suitable hardware is found in the database.
