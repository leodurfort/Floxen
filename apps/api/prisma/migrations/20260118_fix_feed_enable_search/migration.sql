-- Fix feedEnableSearch for synced products
-- 
-- Problem: Products discovered with feedEnableSearch=false retain that value
-- after being selected and synced. This migration updates all synced, selected
-- products to use their shop's defaultEnableSearch setting.

UPDATE products p
SET feed_enable_search = s.default_enable_search
FROM shops s
WHERE p.shop_id = s.id
  AND p.is_selected = true
  AND p.sync_state = 'synced'
  AND p.feed_enable_search = false;
