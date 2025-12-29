"""
Background worker process for fetching Steam and eBay deals.
This should be run as a separate process alongside Gunicorn workers.

Usage:
    python background_worker.py
"""

import os
import sys
import time
import logging
from datetime import datetime

# Setup logging before importing app
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s [%(name)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

def run_background_tasks():
    """
    Main background task loop.
    Continuously fetches games from Steam and hardware from eBay.
    """
    from app import create_app
    from services.steam_service import (
        fetch_cheapshark_deals, 
        update_game_details_systematically,
        verify_and_update_stale_deals,
        reactivate_deals_from_cheapshark
    )
    from services.ebay_service import (
        fetch_all_hardware_deals,
        deactivate_old_hardware_listings
    )
    
    app = create_app()
    
    with app.app_context():
        first_run = True
        run_count = 0
        
        logger.info("Background worker started")
        
        while True:
            try:
                logger.info("Running background fetch (Steam + eBay)...")
                
                # Fetch more pages on first run to populate DB
                pages = 50 if first_run else 5
                
                # === STEAM GAME DEALS ===
                
                # 1. Fetch deals from CheapShark (this will also reactivate any deals that come back)
                try:
                    logger.info("Fetching CheapShark deals...")
                    fetch_cheapshark_deals(pages=pages)
                except Exception as e:
                    logger.error(f"Error in CheapShark fetch: {e}", exc_info=True)

                # 2. Update details for games that miss them
                try:
                    logger.info("Updating game details...")
                    update_game_details_systematically(limit=100)
                except Exception as e:
                    logger.error(f"Error in Steam details update: {e}", exc_info=True)
                
                # 3. Verify stale deals directly on Steam (check 10 deals per run)
                # This catches deals that expired between CheapShark updates
                try:
                    logger.info("Verifying stale deals...")
                    verify_and_update_stale_deals(hours_threshold=12, batch_size=10)
                except Exception as e:
                    logger.error(f"Error verifying stale deals: {e}", exc_info=True)
                
                # 4. Every 6th run (~1 hour), check if any inactive games have new deals
                run_count += 1
                if run_count % 6 == 0:
                    try:
                        logger.info("Reactivating deals from CheapShark...")
                        reactivate_deals_from_cheapshark()
                    except Exception as e:
                        logger.error(f"Error reactivating deals: {e}", exc_info=True)
                
                # === EBAY HARDWARE DEALS ===
                
                # 5. Fetch hardware deals from eBay
                # On first run, fetch more items to populate the database
                # On subsequent runs, fetch fewer items to keep deals fresh
                try:
                    items_per_cat = 20 if first_run else 5
                    logger.info(f"Fetching eBay hardware ({items_per_cat} items per category)...")
                    fetch_all_hardware_deals(items_per_category=items_per_cat)
                except Exception as e:
                    logger.error(f"Error fetching eBay hardware: {e}", exc_info=True)
                
                # 6. Every 3rd run (~30 minutes), deactivate old eBay listings
                if run_count % 3 == 0:
                    try:
                        logger.info("Deactivating old hardware listings...")
                        deactivate_old_hardware_listings(hours_threshold=48)
                    except Exception as e:
                        logger.error(f"Error deactivating old hardware: {e}", exc_info=True)
                
                first_run = False
                
                # Sleep for 10 minutes
                logger.info("Background fetch complete. Sleeping for 10 minutes...")
                time.sleep(600)
                
            except KeyboardInterrupt:
                logger.info("Background worker stopped by user")
                break
            except Exception as e:
                logger.error(f"Unexpected error in background worker: {e}", exc_info=True)
                # Sleep a bit before retrying to avoid rapid failure loops
                time.sleep(60)

if __name__ == "__main__":
    try:
        run_background_tasks()
    except Exception as e:
        logger.error(f"Fatal error in background worker: {e}", exc_info=True)
        sys.exit(1)
