# Backend API Documentation

This document outlines the available backend API endpoints provided by the Flask application.

## Authentication API

### 1. Sign Up
- **Endpoint:** `POST /api/auth/signup`
- **Blueprint:** `auth_bp`
- **Description:** Creates a new user account and establishes a session.
- **Request Body:**
    ```json
    {
        "username": "string (3-30 chars)",
        "email": "string",
        "password": "string (min 8 chars)"
    }
    ```
- **Response:** JSON object containing:
    - `message`: Success message
    - `user`: Object with `id`, `username`, and `email`
- **Error Responses:**
    - `400 Bad Request`: Missing or invalid fields
    - `409 Conflict`: Email or username already exists

### 2. Login
- **Endpoint:** `POST /api/auth/login`
- **Blueprint:** `auth_bp`
- **Description:** Authenticates an existing user and establishes a session.
- **Request Body:**
    ```json
    {
        "email": "string",
        "password": "string"
    }
    ```
- **Response:** JSON object containing:
    - `message`: Success message
    - `user`: Object with `id`, `username`, and `email`
- **Error Responses:**
    - `400 Bad Request`: Missing fields
    - `401 Unauthorized`: Invalid credentials

### 3. Logout
- **Endpoint:** `POST /api/auth/logout`
- **Blueprint:** `auth_bp`
- **Description:** Clears the current user session.
- **Response:** JSON object with success message.

### 4. Get Session
- **Endpoint:** `GET /api/auth/session`
- **Blueprint:** `auth_bp`
- **Description:** Returns the current session status.
- **Response:** JSON object containing:
    - `authenticated`: Boolean indicating if user is logged in
    - `user`: User object if authenticated, null otherwise

## Products API

### 1. Get All Products
- **Endpoint:** `GET /api/products`
- **Blueprint:** `products_bp`
- **Description:** Retrieves a list of all available products, including both games and hardware. Supports filtering by category and search.
- **Query Parameters:**
    - `page` (optional): Page number for pagination (default: 1)
    - `limit` (optional): Number of items per page (default: 48)
    - `category` (optional): Filter by category ("Game" or "Hardware")
    - `search` (optional): Search query to filter products by name, description, or brand
- **Response:** JSON object containing:
    - `products`: Array of product objects
    - `total_products`: Total number of products matching the query
    - `total_pages`: Total number of pages
    - `current_page`: Current page number
- **Product Object Properties:**
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

### 2. Search Products
- **Endpoint:** `GET /api/products?search=<query>`
- **Description:** Search for products by name, description, or brand. The search is case-insensitive.
- **Example:** `/api/products?search=cyberpunk` - Returns all products containing "cyberpunk" in name, description, or brand.
- **Combined Filters:** Search can be combined with category filter:
    - `/api/products?search=rtx&category=Hardware` - Search for "rtx" in hardware only

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
