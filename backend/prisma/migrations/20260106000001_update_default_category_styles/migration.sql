-- Update project category
UPDATE "categories" 
SET color = '#9EC3FF', emoji = '🎯'
WHERE name = 'project' 
  AND (color = '#3B82F6' OR color IS NULL);

-- Update delegated category
UPDATE "categories" 
SET color = '#DCB8FF', emoji = '👥'
WHERE name = 'delegated' 
  AND (color = '#8B5CF6' OR color IS NULL);

-- Update ongoing category
UPDATE "categories" 
SET color = '#74D898', emoji = '🔄'
WHERE name = 'ongoing' 
  AND (color = '#10B981' OR color IS NULL);

-- Update watching category
UPDATE "categories" 
SET color = '#B5BAC5', emoji = '👀'
WHERE name = 'watching' 
  AND (color = '#6B7280' OR color IS NULL);
