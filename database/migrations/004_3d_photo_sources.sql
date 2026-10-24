-- Private, rights-attested image references for future photogrammetry.
-- This is NOT an automatic GPU reconstruction service.
CREATE TABLE IF NOT EXISTS product_3d_source_photos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 model_id uuid NOT NULL REFERENCES product_3d_models(id) ON DELETE CASCADE,
 file_key text NOT NULL UNIQUE,
 sha256 char(64) NOT NULL,
 media_type text NOT NULL CHECK (media_type IN ('image/jpeg','image/png')),
 width_px integer NOT NULL CHECK(width_px BETWEEN 1 AND 7000),
 height_px integer NOT NULL CHECK(height_px BETWEEN 1 AND 7000),
 source_notes text NOT NULL,
 rights_confirmed boolean NOT NULL DEFAULT FALSE,
 uploaded_by uuid NOT NULL REFERENCES admin_users(id),
 uploaded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(model_id,sha256)
);
CREATE INDEX IF NOT EXISTS model_photo_lookup ON product_3d_source_photos(model_id,uploaded_at DESC);
