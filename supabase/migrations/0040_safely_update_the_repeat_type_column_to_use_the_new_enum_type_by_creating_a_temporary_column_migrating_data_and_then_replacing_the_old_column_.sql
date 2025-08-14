-- Step 1: Create a new enum type if it doesn't exist, or add 'monthly' if missing.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'repeat_type_enum') THEN
        CREATE TYPE public.repeat_type_enum AS ENUM ('no_repeat', 'daily', 'weekly', 'monthly', 'custom');
    ELSE
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'repeat_type_enum') AND enumlabel = 'monthly') THEN
            ALTER TYPE public.repeat_type_enum ADD VALUE 'monthly' AFTER 'weekly';
        END IF;
    END IF;
END $$;

-- Step 2: Add a new temporary column with the new enum type
ALTER TABLE public.booking_repeats
ADD COLUMN repeat_type_new public.repeat_type_enum;

-- Step 3: Copy data from the old column to the new column, handling invalid values
-- Any value in the old 'repeat_type' (text) that is not a valid enum label
-- will be converted to 'no_repeat' during the cast.
UPDATE public.booking_repeats
SET repeat_type_new =
    CASE
        WHEN repeat_type IN ('no_repeat', 'daily', 'weekly', 'monthly', 'custom') THEN repeat_type::public.repeat_type_enum
        ELSE 'no_repeat'::public.repeat_type_enum
    END;

-- Step 4: Drop the old column
ALTER TABLE public.booking_repeats
DROP COLUMN repeat_type;

-- Step 5: Rename the new column to the old column's name
ALTER TABLE public.booking_repeats
RENAME COLUMN repeat_type_new TO repeat_type;