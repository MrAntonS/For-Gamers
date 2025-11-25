# Frontend Pages Documentation

This document outlines the available frontend pages and their corresponding components in the application.

## 1. Home Page
- **Route:** `/`
- **Component:** `Hero` (`src/components/Hero.tsx`)
- **Description:** The landing page of the application, featuring a hero section to welcome users.

## 2. All Deals
- **Route:** `/deals`
- **Component:** `ProductList` (`src/components/ProductList.tsx`)
- **Description:** Displays a comprehensive list of all available deals, including both games and hardware. Users can browse through various discounted items.

## 3. Game Deals
- **Route:** `/deals/games`
- **Component:** `GameDeals` (`src/components/GameDeals.tsx`)
- **Description:** A specialized page dedicated to game deals. It filters the product list to show only video games on sale.

## 4. Hardware Deals
- **Route:** `/deals/hardware`
- **Component:** `HardwareDeals` (`src/components/HardwareDeals.tsx`)
- **Description:** A specialized page dedicated to hardware deals. It filters the product list to show only gaming hardware (GPUs, consoles, accessories, etc.) on sale.

## 5. MinMax Analysis Tool
- **Route:** `/minmax`
- **Component:** `MinMaxTab` (`src/components/MinMaxTab.tsx`)
- **Description:** An interactive tool that allows users to select multiple games they wish to play. Based on the selection, the tool calculates and recommends the minimum hardware specifications (GPU, CPU, RAM) required to run all selected games at a target performance level (e.g., 1440p 60fps).
