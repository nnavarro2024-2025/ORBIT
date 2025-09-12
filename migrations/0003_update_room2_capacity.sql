-- Update Collaborative Learning Room 2 capacity from 10 to 8
UPDATE facilities 
SET capacity = 8, description = 'Computer lab with workstations'
WHERE name = 'Collaraborative Learning Room 2';
