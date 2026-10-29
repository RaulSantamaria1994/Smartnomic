-- Especificación 004 (RF-403): las categorías pasan de guardar un emoji a guardar un
-- identificador del catálogo de iconos (packages/domain/src/categoryIcons.ts). Los emoji
-- conocidos van a su equivalente (sin el selector de variante U+FE0F ni espacios) y
-- cualquier otro valor al genérico 'tag'. Solo toca filas que aún no tienen un
-- identificador, así que repetirla no cambia nada. La tabla repite EMOJI_TO_CATEGORY_ICON
-- y la lista, CATEGORY_ICONS; test/migrations.test.ts comprueba que coinciden.
UPDATE categories
SET icon = CASE replace(trim(icon), chr(65039), '')
    WHEN '💼' THEN 'salary'
    WHEN '💰' THEN 'cash'
    WHEN '🏠' THEN 'home'
    WHEN '💡' THEN 'utilities'
    WHEN '🛒' THEN 'groceries'
    WHEN '🚗' THEN 'car'
    WHEN '🩺' THEN 'health'
    WHEN '🎓' THEN 'education'
    WHEN '🎉' THEN 'leisure'
    WHEN '👕' THEN 'clothes'
    WHEN '📺' THEN 'subscriptions'
    WHEN '🛡' THEN 'insurance'
    WHEN '📦' THEN 'other'
    WHEN '🏷' THEN 'tag'
    WHEN '🐶' THEN 'pet'
    WHEN '🐱' THEN 'pet'
    WHEN '✈' THEN 'travel'
    WHEN '🍽' THEN 'restaurant'
    WHEN '⛽' THEN 'fuel'
    WHEN '💊' THEN 'pharmacy'
    WHEN '🎁' THEN 'gift'
    WHEN '🚌' THEN 'bus'
    ELSE 'tag'
  END
WHERE icon NOT IN ('salary', 'cash', 'savings', 'gift', 'investment', 'aid', 'home', 'utilities', 'groceries', 'car', 'health', 'education', 'leisure', 'clothes', 'subscriptions', 'insurance', 'other', 'tag', 'restaurant', 'coffee', 'bus', 'fuel', 'travel', 'pet', 'baby', 'kids', 'sport', 'pharmacy', 'water', 'gas', 'internet', 'phone', 'repairs', 'furniture', 'cleaning', 'books', 'games', 'music', 'bank', 'card', 'taxes', 'donations', 'haircut', 'garden');
